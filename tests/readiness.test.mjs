import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolveOutputLanguage } from '../lib/output-language.js';
let child;
let base;
before(async () => {
  child = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '0', GEMINI_API_KEY: '' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = '';
  child.stderr.on('data', b => { logs += b; });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Startup timeout: ' + logs)), 10000);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${logs}`)); });
    child.stdout.on('data', b => { const match = String(b).match(/listening on port (\d+)/); if (match) { base = `http://127.0.0.1:${match[1]}`; clearTimeout(timer); resolve(); } });
  });
});
after(() => child?.kill());
const post = (route, body, headers = {}) => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
test('language override reaches the shared resolver', () => {
  assert.equal(resolveOutputLanguage({requestedLanguage: 'en', materialText: 'Materi ini adalah tentang segitiga.'}).code, 'en');
});
test('serves application with MIME protection', async () => {
  const r = await fetch(base);
  assert.equal(r.status, 200);
  assert.match(await r.text(), /OmniLearn/);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
});
test('health reports missing credentials honestly', async () => {
  const r = await fetch(base + '/api/health');
  const health = await r.json();
  assert.equal(health.ready, false);
  assert.equal(health.version, 'concise-ai-v4');
  assert.match(r.headers.get('cache-control'), /no-store/);
});
test('invalid requests and missing provider credentials are rejected', async () => {
  assert.equal((await post('/api/study', { task: '__proto__' })).status, 400);
  assert.equal((await post('/api/chat', { message: '' })).status, 400);
  assert.equal((await post('/api/chat', { message: 'hello' })).status, 500);
});
test('TXT upload extracts content; unsupported files fail', async () => {
  const form = new FormData();
  form.append('file', new Blob(['Triangles have three sides.']), 'lesson.txt');
  const r = await fetch(base + '/api/upload?sync=1', { method: 'POST', body: form });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).text, 'Triangles have three sides.');
  const bad = new FormData(); bad.append('file', new Blob(['evil']), 'file.exe');
  assert.equal((await fetch(base + '/api/upload?sync=1', { method: 'POST', body: bad })).status, 415);
});
test('non-upload JSON has a smaller independent request budget',async()=>{
  const response=await post('/api/chat',{message:'x'.repeat(1100000)});
  assert.equal(response.status,413);
});
test('learning routes reject oversized material rather than silently analyzing a prefix', async () => {
  for (const [route, body] of [['/api/chat', {message:'Explain the source'}], ['/api/study', {task:'summary'}]]) {
    const response = await post(route, {...body, material:'x'.repeat(50001)});
    assert.equal(response.status, 413);
    assert.equal((await response.json()).code, 'SOURCE_TOO_LONG');
  }
});
