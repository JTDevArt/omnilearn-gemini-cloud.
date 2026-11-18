import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

async function start() {
  const child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: '0', GEMINI_API_KEY: 'TEST_ONLY_FIXTURE_KEY' }, stdio: ['ignore', 'pipe', 'ignore'],
  });
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('startup timeout')), 15000);
    child.once('exit', () => reject(new Error('server exited')));
    child.stdout.on('data', c => { const p = String(c).match(/listening on port (\d+)/)?.[1]; if (p) { clearTimeout(timer); resolve(`http://127.0.0.1:${p}`); } });
  });
  return { child, base };
}
const post = (base, headers) => fetch(`${base}/api/chat`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{}' });

test('origin check: same host and forwarded host pass, foreign origin gets JSON 403', async () => {
  const { child, base } = await start();
  try {
    const host = new URL(base).host;
    assert.equal((await post(base, { origin: `http://${host}` })).status, 400);
    assert.equal((await post(base, { origin: 'https://app.example.test', 'x-forwarded-host': 'app.example.test' })).status, 400);
    const bad = await post(base, { origin: 'https://evil.example' });
    assert.equal(bad.status, 403);
    assert.match(bad.headers.get('content-type'), /json/);
    assert.equal((await bad.json()).code, 'CROSS_SITE_REQUEST');
  } finally { child.kill(); }
});
