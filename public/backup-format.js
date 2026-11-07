import { validateGraph } from './mindmap-model.js';
import { validateExam } from './exam-engine.js';
export const BACKUP_SCHEMA = 'omnilearn-backup/1';
const MAX_JSON = 8 * 1024 * 1024,
  MAX_FILE = 15 * 1024 * 1024,
  MAX_EXPANDED = 100 * 1024 * 1024;
const object = (v) => v && typeof v === 'object' && !Array.isArray(v);
export async function sha256(bytes) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest(
        'SHA-256',
        typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes
      )
    ),
  ]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
function safeTree(value, depth = 0) {
  if (depth > 35) throw new Error('Data cadangan terlalu dalam.');
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key))
        throw new Error('Properti berbahaya dalam cadangan.');
      safeTree(value[key], depth + 1);
    }
  }
}
export function validateLibrary(raw) {
  if (
    !object(raw) ||
    raw.schemaVersion !== 1 ||
    !Array.isArray(raw.sources) ||
    raw.sources.length > 200
  )
    throw new Error('Skema pustaka tidak didukung.');
  if (new TextEncoder().encode(JSON.stringify(raw)).byteLength > MAX_JSON)
    throw new Error('Manifest pustaka melebihi batas 8 MiB.');
  safeTree(raw);
  const ids = new Set();
  function source(s, archived = false) {
    if (
      !object(s) ||
      typeof s.id !== 'string' ||
      !s.id ||
      s.id.length > 180 ||
      typeof s.name !== 'string' ||
      s.name.length > 500 ||
      typeof s.text !== 'string' ||
      s.text.length > 50000 ||
      !Number.isSafeInteger(s.version) ||
      s.version < 1 ||
      s.version > 1000000
    )
      throw new Error('Metadata atau teks sumber tidak valid.');
    if (!archived) {
      if (ids.has(s.id)) throw new Error('ID sumber berulang.');
      ids.add(s.id);
    }
    for (const key of ['notes', 'subject'])
      if (
        s[key] !== undefined &&
        (typeof s[key] !== 'string' || s[key].length > 1000000)
      )
        throw new Error('Catatan sumber tidak valid.');
    for (const key of ['pinned', 'hasOriginal'])
      if (s[key] !== undefined && typeof s[key] !== 'boolean')
        throw new Error('Status sumber tidak valid.');
    if (s.meta !== undefined && !object(s.meta))
      throw new Error('Metadata sumber tidak valid.');
    for (const key of ['createdAt', 'updatedAt'])
      if (s[key] !== undefined && (!Number.isFinite(s[key]) || s[key] < 0))
        throw new Error('Tanggal sumber tidak valid.');
    if (
      s.chat !== undefined &&
      (!Array.isArray(s.chat) ||
        s.chat.some(
          (m) =>
            !object(m) ||
            !['user', 'assistant'].includes(m.role) ||
            typeof m.content !== 'string'
        ))
    )
      throw new Error('Riwayat chat tidak valid.');
    if (
      s.deck !== undefined &&
      (!Array.isArray(s.deck) ||
        s.deck.length > 1000 ||
        s.deck.some(
          (c) =>
            !object(c) ||
            typeof c.front !== 'string' ||
            typeof c.back !== 'string'
        ))
    )
      throw new Error('Kartu tidak valid.');
    if (
      s.journey !== undefined &&
      (!object(s.journey) ||
        !Array.isArray(s.journey.chapters) ||
        s.journey.chapters.some(
          (c) =>
            !object(c) ||
            typeof c.id !== 'string' ||
            typeof c.title !== 'string' ||
            !object(c.practice)
        ))
    )
      throw new Error('Jalur belajar tidak valid.');
    if (
      s.blueprint !== undefined &&
      (!object(s.blueprint) ||
        !Array.isArray(s.blueprint.concepts) ||
        !object(s.blueprint.quality) ||
        s.blueprint.concepts.some(
          (c) =>
            typeof c.name !== 'string' ||
            !object(c.evidence) ||
            typeof c.evidence.quote !== 'string'
        ))
    )
      throw new Error('Blueprint tidak valid.');
    if (s.generated !== undefined) {
      if (!object(s.generated))
        throw new Error('Arsip alat belajar tidak valid.');
      for (const entry of Object.values(s.generated)) {
        if (!object(entry)) throw new Error('Hasil alat belajar tidak valid.');
        if (entry.conceptMapState) {
          const map = entry.conceptMapState;
          if (
            typeof map.centralTopic !== 'string' ||
            !Array.isArray(map.branches) ||
            map.branches.some(
              (b) =>
                typeof b.title !== 'string' || !Array.isArray(b.subconcepts)
            )
          )
            throw new Error('Mindmap tidak valid.');
          if (map.editorGraph) validateGraph(map.editorGraph);
        }
        const quiz = entry.quizState || entry.quizV4;
        if (
          quiz &&
          (!Array.isArray(quiz.questions) ||
            quiz.questions.length > 100 ||
            quiz.questions.some((q) => typeof q.question !== 'string'))
        )
          throw new Error('Kuis tidak valid.');
      }
    }
    if (s.exams !== undefined) {
      if (!Array.isArray(s.exams) || s.exams.length > 200)
        throw new Error('Riwayat ujian tidak valid.');
      s.exams.forEach(validateExam);
    }
    if (s.versions !== undefined) {
      if (archived || !Array.isArray(s.versions) || s.versions.length > 100)
        throw new Error('Arsip versi terlalu besar atau bersarang.');
      if (
        new Set(s.versions.map((v) => v.version)).size !== s.versions.length ||
        s.versions.some((v) => v.version >= s.version || v.id !== s.id)
      )
        throw new Error('Identitas atau urutan versi sumber tidak valid.');
      s.versions.forEach((v) => source(v, true));
    }
  }
  raw.sources.forEach((s) => source(s));
  if (raw.profile !== undefined && !object(raw.profile))
    throw new Error('Profil tidak valid.');
  if (raw.profile) {
    for (const key of ['name', 'education', 'subject', 'goal', 'teachingMode', 'language'])
      if (raw.profile[key] !== undefined &&
          (typeof raw.profile[key] !== 'string' || raw.profile[key].length > 1000))
        throw new Error('Preferensi profil tidak valid.');
    if (raw.profile.subjects !== undefined &&
        (!Array.isArray(raw.profile.subjects) || raw.profile.subjects.length > 1000 ||
         raw.profile.subjects.some(s => typeof s !== 'string' || s.length > 100)))
      throw new Error('Daftar mata pelajaran tidak valid.');
  }
  if (raw.pendingTasks !== undefined && (!Array.isArray(raw.pendingTasks) ||
      raw.pendingTasks.some(task => !object(task) || typeof task.id !== 'string' ||
        !['/api/chat', '/api/study'].includes(task.route) || !object(task.body))))
    throw new Error('Permintaan tersimpan tidak valid.');
  if (
    raw.activity !== undefined &&
    (!object(raw.activity) || !Array.isArray(raw.activity.events))
  )
    throw new Error('Statistik tidak valid.');
  if (
    raw.stickyNotes !== undefined &&
    (!Array.isArray(raw.stickyNotes) ||
      raw.stickyNotes.some((n) => !object(n) || typeof n.text !== 'string'))
  )
    throw new Error('Catatan tempel tidak valid.');
  return structuredClone(raw);
}
async function boundedEntry(entry, limit) {
  if (entry._data?.uncompressedSize > limit)
    throw new Error('Ukuran arsip melebihi batas.');
  return new Promise((resolve, reject) => {
    let size = 0,
      done = false;
    const chunks = [],
      stream = entry.internalStream('uint8array');
    stream
      .on('data', (chunk) => {
        if (done) return;
        size += chunk.length;
        if (size > limit) {
          done = true;
          stream.pause();
          reject(new Error('Ekspansi arsip melebihi batas.'));
          return;
        }
        chunks.push(chunk);
      })
      .on('error', reject)
      .on('end', () => {
        if (done) return;
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) {
          bytes.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(bytes);
      })
      .resume();
  });
}
export async function exportBackup({
  JSZip,
  snapshot,
  readFile,
  onProgress = () => {},
}) {
  const library = validateLibrary(snapshot),
    zip = new JSZip(),
    manifest = {
      format: BACKUP_SCHEMA,
      createdAt: new Date().toISOString(),
      files: [],
    };
  const libraryBytes = new TextEncoder().encode(JSON.stringify(library));
  zip.file('library.json', libraryBytes);
  manifest.librarySha256 = await sha256(libraryBytes);
  let expanded = libraryBytes.length;
  for (const [i, source] of library.sources.entries()) {
    for (const version of [...(source.versions || []), source]) {
      if (!version.hasOriginal) continue;
      const file = await readFile(source.id, version.version);
      if (!file) {
        manifest.files.push({
          sourceId: source.id,
          version: version.version,
          missing: true,
        });
        continue;
      }
      if (file.size > MAX_FILE || (expanded += file.size) > MAX_EXPANDED)
        throw new Error(
          'Cadangan terlalu besar. Ekspor sumber dalam kelompok lebih kecil.'
        );
      const bytes = new Uint8Array(await file.arrayBuffer()),
        path = `originals/${i}-${version.version}.bin`;
      zip.file(path, bytes);
      manifest.files.push({
        path,
        sourceId: source.id,
        version: version.version,
        name: file.name || source.name,
        mimeType: file.type || 'application/octet-stream',
        bytes: bytes.length,
        sha256: await sha256(bytes),
      });
    }
    onProgress({ completed: i + 1, total: library.sources.length });
  }
  zip.file('manifest.json', JSON.stringify(manifest));
  return zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 3 },
  });
}
export async function importBackup({ JSZip, bytes, onProgress = () => {} }) {
  if (bytes.byteLength > 64 * 1024 * 1024)
    throw new Error('Cadangan ZIP maksimal 64 MiB.');
  const zip = await JSZip.loadAsync(bytes),
    entries = Object.values(zip.files);
  if (entries.length > 1000) throw new Error('Terlalu banyak entri arsip.');
  for (const entry of entries) {
    const name = entry.unsafeOriginalName || entry.name;
    if (
      name.includes('\\') ||
      name.startsWith('/') ||
      name.split('/').includes('..') ||
      name !== entry.name ||
      (Number(entry.unixPermissions) & 0o170000) === 0o120000
    )
      throw new Error('Jalur arsip tidak aman.');
  }
  const manifestFile = zip.file('manifest.json'),
    libraryFile = zip.file('library.json');
  if (!manifestFile || !libraryFile)
    throw new Error('Manifest cadangan tidak ditemukan.');
  const manifest = JSON.parse(
    new TextDecoder().decode(await boundedEntry(manifestFile, 512 * 1024))
  );
  safeTree(manifest);
  if (
    manifest.format !== BACKUP_SCHEMA ||
    !Array.isArray(manifest.files) ||
    manifest.files.length > 500
  )
    throw new Error('Format cadangan tidak didukung.');
  const libraryBytes = await boundedEntry(libraryFile, MAX_JSON);
  if ((await sha256(libraryBytes)) !== manifest.librarySha256)
    throw new Error('Checksum pustaka tidak cocok.');
  const snapshot = validateLibrary(
      JSON.parse(new TextDecoder().decode(libraryBytes))
    ),
    files = [],
    paths = new Set(['manifest.json', 'library.json']);
  let expanded = libraryBytes.length;
  for (const [i, record] of manifest.files.entries()) {
    const source = snapshot.sources.find((s) => s.id === record.sourceId),
      version =
        source &&
        [source, ...(source.versions || [])].find(
          (v) => v.version === record.version
        );
    if (!source || !version)
      throw new Error('Referensi file tidak cocok dengan sumber.');
    if (record.missing) continue;
    if (
      !/^originals\/\d+-\d+\.bin$/.test(record.path) ||
      paths.has(record.path) ||
      typeof record.name !== 'string' ||
      record.name.length > 500 ||
      typeof record.mimeType !== 'string' ||
      record.mimeType.length > 200
    )
      throw new Error('Manifest file tidak valid.');
    paths.add(record.path);
    const entry = zip.file(record.path);
    if (!entry) throw new Error('File asli hilang dari arsip.');
    const data = await boundedEntry(
      entry,
      Math.min(MAX_FILE, MAX_EXPANDED - expanded)
    );
    expanded += data.length;
    if (data.length !== record.bytes || (await sha256(data)) !== record.sha256)
      throw new Error('Checksum file asli tidak cocok.');
    files.push({ ...record, data });
    onProgress({ completed: i + 1, total: manifest.files.length });
  }
  if (entries.some((entry) => !entry.dir && !paths.has(entry.name)))
    throw new Error('Arsip berisi file yang tidak dideklarasikan.');
  return { snapshot, files, manifest };
}
export function mergeImported(current, incoming, policy = 'copy') {
  validateLibrary(current);
  validateLibrary(incoming);
  if (!['copy', 'skip'].includes(policy))
    throw new Error('Kebijakan impor tidak valid.');
  const merged = structuredClone(current),
    mapping = new Map();
  for (const source of incoming.sources) {
    const conflict = merged.sources.find((s) => s.id === source.id);
    if (conflict && policy === 'skip') continue;
    const next = structuredClone(source),
      id = conflict ? crypto.randomUUID() : source.id;
    mapping.set(source.id, id);
    next.id = id;
    if (conflict) next.name += ' (salinan impor)';
    function rebind(s) {
      if (s.blueprint) s.blueprint.sourceId = id;
      for (const exam of s.exams || []) exam.sourceId = id;
      if (s.generated)
        s.generated = Object.fromEntries(
          Object.entries(s.generated).map(([key, value]) => [
            key.replace(`mat:${source.id}:`, `mat:${id}:`),
            value,
          ])
        );
      s.id = id;
      for (const version of s.versions || []) rebind(version);
    }
    rebind(next);
    merged.sources.push(next);
  }
  validateLibrary(merged);
  return { snapshot: merged, mapping };
}
export function restoredSource(current, version) {
  if (!version || !Number.isInteger(version.version))
    throw new Error('Versi sumber tidak valid.');
  const { versions, ...active } = structuredClone(current),
    { versions: ignored, ...previous } = structuredClone(version),
    next = {
      ...previous,
      id: current.id,
      name: current.name,
      version: current.version + 1,
      notes: current.notes || '',
      versions: [
        ...(current.versions || []),
        { ...active, archivedAt: Date.now() },
      ],
      restoredFromVersion: version.version,
      updatedAt: Date.now(),
    };
  if (next.blueprint) next.blueprint.sourceVersion = next.version;
  if (next.generated)
    next.generated = Object.fromEntries(
      Object.entries(next.generated).map(([key, value]) => [
        key.replace(`:r${version.version}:`, `:r${next.version}:`),
        value,
      ])
    );
  validateLibrary({ schemaVersion: 1, sources: [next] });
  return next;
}
