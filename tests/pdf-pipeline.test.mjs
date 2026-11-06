import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pdfFixture } from './fixtures/pdf-fixtures.mjs';
let child, base;
before(async () => {
  child = spawn(
    process.execPath,
    [
      '--import',
      fileURLToPath(
        new URL('./fixtures/provider-preload.mjs', import.meta.url)
      ),
      'server.js',
    ],
    {
      env: {
        ...process.env,
        PORT: '0',
        GEMINI_API_KEY: 'TEST_ONLY_FIXTURE_KEY',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  let logs = '';
  child.stderr.on('data', (chunk) => {
    logs += chunk;
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Fixture server did not start: ' + logs)),
      10000
    );
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('Fixture server exited ' + code + ': ' + logs));
    });
    child.stdout.on('data', (chunk) => {
      const match = String(chunk).match(/listening on port (\d+)/);
      if (match) {
        base = `http://127.0.0.1:${match[1]}`;
        clearTimeout(timer);
        resolve();
      }
    });
  });
});
after(() => child?.kill());
async function upload(types) {
  const data = new FormData();
  data.append(
    'file',
    new Blob([await pdfFixture(types)], { type: 'application/pdf' }),
    'fixture.pdf'
  );
  const response = await fetch(base + '/api/upload?sync=1', {
    method: 'POST',
    body: data,
    headers: { 'X-Session-Id': 'pdf-fixture-user' },
  });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload;
}
test('native PDF extraction retains its actual text and avoids OCR', async () => {
  const result = await upload(['text']);
  assert.equal(result.ocrUsed, false);
  assert.match(result.text, /Native text/);
  assert.equal(result.pageCount, 1);
  assert.equal(result.actualModel, null);
});
test('scanned PDF routes through page preprocessing and official SDK transport fallback', async () => {
  const result = await upload(['scan']);
  assert.equal(result.ocrUsed, true);
  assert.equal(result.actualModel, 'gemini-3-flash-preview');
  assert.match(result.text, /deterministic test transport/);
  assert.equal(result.preprocessing[0].page, 1);
  assert.equal(result.preprocessing[0].ocrConfidence, null);
  assert.ok(
    ['preprocessed', 'original-pdf-fallback'].includes(
      result.preprocessing[0].status
    )
  );
});
test('mixed PDF keeps native page one and OCR page two in order', async () => {
  const result = await upload(['text', 'scan']);
  assert.equal(result.pageCount, 2);
  assert.equal(result.extractionMode, 'pdf-hybrid-ocr');
  assert.ok(
    result.text.indexOf('Native text') <
      result.text.indexOf('deterministic test transport')
  );
  assert.deepEqual(
    result.preprocessing.map((p) => p.page),
    [2]
  );
  assert.equal(result.pageQuality.length, 2);
});
