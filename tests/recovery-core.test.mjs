import { test } from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {
  graphFromMap,
  graphEdit,
  validateGraph,
} from '../public/mindmap-model.js';
import {
  validateExam,
  gradeQuestion,
  startExam,
  submitExam,
  remainingSeconds,
} from '../public/exam-engine.js';
import {
  exportBackup,
  importBackup,
  mergeImported,
  restoredSource,
  sha256,
} from '../public/backup-format.js';
import { BoundedWorkQueue } from '../lib/work-queue.js';
test('file decoding queue bounds concurrent work and queued buffers', async () => {
  const queue = new BoundedWorkQueue({ concurrency: 1, maxQueued: 1 });
  let finish;
  const a = queue.run(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const b = queue.run(() => 42);
  await assert.rejects(
    queue.run(() => 99),
    (error) => error.code === 'FILE_QUEUE_FULL'
  );
  await new Promise((resolve) => setImmediate(resolve));
  finish(1);
  assert.equal(await a, 1);
  assert.equal(await b, 42);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(queue.size, 0);
});
const source = {
  id: 'source-1',
  name: 'Circles',
  text: 'A circle has a radius and a diameter.',
  version: 1,
  notes: 'My notes',
  chat: [],
  generated: {},
};
const library = {
  schemaVersion: 1,
  sources: [source],
  profile: {},
  activity: { events: [] },
  stickyNotes: [],
};
test('mindmap preserves hierarchy and removes incident edges on subtree deletion', () => {
  let graph = graphFromMap({
    centralTopic: 'Circle',
    branches: [
      {
        title: 'Radius',
        explanation: 'Centre to boundary',
        subconcepts: [{ title: 'Length', detail: 'A measurement' }],
      },
    ],
  });
  graph = graphEdit(graph, {
    type: 'add',
    id: 'root',
    newId: 'diameter',
    title: 'Diameter',
  });
  graph = graphEdit(graph, {
    type: 'connect',
    from: 'diameter',
    to: 'branch-1-sub-1',
    label: 'related',
  });
  assert.throws(
    () =>
      graphEdit(graph, {
        type: 'move',
        id: 'branch-1',
        parentId: 'branch-1-sub-1',
      }),
    /siklus/
  );
  assert.throws(() => graphEdit(graph, { type: 'delete', id: 'root' }), /Akar/);
  graph = graphEdit(graph, { type: 'delete', id: 'branch-1' });
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.edges.length, 0);
  validateGraph(graph);
});
test('node moves, sibling order and edits remain immutable', () => {
  const graph = graphFromMap({ centralTopic: 'Root', branches: [] });
  const next = graphEdit(graph, {
    type: 'add',
    id: 'root',
    newId: 'a',
    title: 'A',
  });
  assert.equal(graph.nodes.length, 1);
  const b = graphEdit(next, {
    type: 'add',
    id: 'a',
    sibling: true,
    newId: 'b',
    title: 'B',
  });
  const moved = graphEdit(b, { type: 'reorder', id: 'b', direction: -1 });
  assert.deepEqual(
    moved.nodes.map((n) => n.id),
    ['root', 'b', 'a']
  );
  assert.throws(
    () => graphEdit(moved, { type: 'connect', from: 'a', to: 'a' }),
    /Hubungan/
  );
});
const numeric = validateExam({
  title: 'Numeric',
  durationSeconds: 60,
  questions: [
    {
      type: 'numeric',
      question: 'Length?',
      correctAnswer: 1.5,
      tolerance: 0.01,
      unit: 'm',
      unitAliases: ['meter'],
    },
  ],
}).questions[0];
test('numeric grading handles decimal commas, scientific notation, units and explicit tolerances', () => {
  assert.equal(gradeQuestion(numeric, '1,5 m').correct, true);
  assert.equal(gradeQuestion(numeric, '1.5e0 meter').correct, true);
  for (const value of [
    '1.52 m',
    '1.5 cm',
    '1.5',
    'Infinity m',
    '1,500.0 m',
    '1.5m extra',
  ])
    assert.equal(gradeQuestion(numeric, value).correct, false, value);
  assert.equal(
    gradeQuestion({ ...numeric, unitOptional: true }, '1.5').correct,
    true
  );
  assert.equal(
    gradeQuestion({ ...numeric, precision: 1, tolerance: 0 }, '1.49 m').correct,
    true
  );
});
test('exam deadlines survive serialization, objective scoring is deterministic, and essays remain pending', () => {
  const definition = {
    title: 'Exam',
    durationSeconds: 60,
    questions: [
      { id: 'a', type: 'truefalse', question: 'True?', correctAnswer: true },
      {
        id: 'b',
        type: 'essay',
        question: 'Explain',
        rubric: [{ criterion: 'Reasoning', maxScore: 4 }],
      },
    ],
  };
  const attempt = startExam(definition, { now: 1000 });
  attempt.answers = { a: true, b: 'An explanation' };
  assert.equal(remainingSeconds(JSON.parse(JSON.stringify(attempt)), 61000), 0);
  const submitted = submitExam(attempt, 61000);
  assert.equal(submitted.results[0].score, 1);
  assert.equal(submitted.results[1].status, 'pending');
  assert.equal(submitted.timedOut, true);
  assert.strictEqual(submitExam(submitted), submitted);
});
test('multipart question scores parts and malformed keys or ambiguous choices are rejected', () => {
  const definition = validateExam({
    title: 'Parts',
    durationSeconds: 60,
    questions: [
      {
        type: 'multipart',
        question: 'Parts',
        parts: [
          { type: 'short', question: 'Word?', acceptedAnswers: ['Radius'] },
          { type: 'truefalse', question: 'True?', correctAnswer: false },
        ],
      },
    ],
  });
  assert.equal(
    gradeQuestion(definition.questions[0], { 0: ' radius ', 1: false }).score,
    2
  );
  assert.throws(() =>
    validateExam({
      title: 'Bad',
      durationSeconds: 60,
      questions: [
        {
          type: 'multiple',
          question: 'Which?',
          options: ['A', 'a'],
          correctAnswer: 0,
        },
      ],
    })
  );
});
test('ZIP backup roundtrips original bytes, source data and verified checksums', async () => {
  const file = new File(['original bytes'], 'lesson.txt', {
      type: 'text/plain',
    }),
    snapshot = structuredClone(library);
  snapshot.sources[0].hasOriginal = true;
  const bytes = await exportBackup({
      JSZip,
      snapshot,
      readFile: async () => file,
    }),
    imported = await importBackup({ JSZip, bytes });
  assert.deepEqual(imported.snapshot, snapshot);
  assert.equal(
    new TextDecoder().decode(imported.files[0].data),
    'original bytes'
  );
  const zip = await JSZip.loadAsync(bytes);
  zip.file('library.json', '{}');
  await assert.rejects(
    importBackup({
      JSZip,
      bytes: await zip.generateAsync({ type: 'uint8array' }),
    }),
    /Checksum/
  );
});
test('backup import rejects traversal, executable extras and schema/prototype poison', async () => {
  const bytes = await exportBackup({
    JSZip,
    snapshot: library,
    readFile: async () => null,
  });
  const extra = await JSZip.loadAsync(bytes);
  extra.file('evil.js', 'alert(1)');
  await assert.rejects(
    importBackup({
      JSZip,
      bytes: await extra.generateAsync({ type: 'uint8array' }),
    }),
    /tidak dideklarasikan/
  );
  const poison = await JSZip.loadAsync(bytes);
  const data = '{"schemaVersion":1,"sources":[],"__proto__":{"polluted":true}}';
  poison.file('library.json', data);
  const manifest = JSON.parse(
    await poison.file('manifest.json').async('string')
  );
  manifest.librarySha256 = await sha256(data);
  poison.file('manifest.json', JSON.stringify(manifest));
  await assert.rejects(
    importBackup({
      JSZip,
      bytes: await poison.generateAsync({ type: 'uint8array' }),
    }),
    /berbahaya/
  );
  const traversal = await JSZip.loadAsync(bytes);
  traversal.file('../outside.txt', 'evil');
  await assert.rejects(
    importBackup({
      JSZip,
      bytes: await traversal.generateAsync({ type: 'uint8array' }),
    }),
    /aman/
  );
});
test('duplicate imports copy or skip without overwriting existing notes and restored versions preserve current history', () => {
  const incoming = structuredClone(library);
  incoming.sources[0].notes = 'Other notes';
  const copied = mergeImported(library, incoming);
  assert.equal(copied.snapshot.sources.length, 2);
  assert.equal(copied.snapshot.sources[0].notes, 'My notes');
  assert.notEqual(copied.snapshot.sources[1].id, 'source-1');
  assert.equal(
    mergeImported(library, incoming, 'skip').snapshot.sources.length,
    1
  );
  const current = {
    ...source,
    version: 2,
    text: 'Updated text',
    versions: [structuredClone(source)],
  };
  const restored = restoredSource(current, source);
  assert.equal(restored.version, 3);
  assert.equal(restored.text, source.text);
  assert.equal(restored.versions.at(-1).text, 'Updated text');
  assert.equal(restored.notes, 'My notes');
});
