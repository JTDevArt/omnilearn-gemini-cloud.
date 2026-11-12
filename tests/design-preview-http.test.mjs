import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

async function startFixture() {
  let output = '';
  const child = spawn(process.execPath, ['server.js'], {
    env: {...process.env, NODE_ENV: 'test', PORT: '0',
      GEMINI_API_KEY: 'TEST_ONLY_NOT_A_REAL_KEY'},
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', chunk => {output += chunk;});
  let stderr = '';
  child.stderr.on('data', chunk => {stderr += chunk;});
  try {
    const url = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Preview server startup timeout: '+stderr)), 15000);
      const finish = (error, value) => {clearTimeout(timeout); error ? reject(error) : resolve(value);};
      child.once('exit', code => finish(new Error('Preview server exited: '+code+' '+stderr)));
      const inspect = () => {
        const port = output.match(/listening on port (\d+)/)?.[1];
        if (port) finish(null, 'http://127.0.0.1:'+port);
      };
      child.stdout.on('data', inspect);
      inspect();
    });
    return {child, url};
  } catch (error) {child.kill(); throw error;}
}

test('design preview routes and public assets respond over HTTP', async () => {
  const fixture = await startFixture();
  try {
    for (const name of ['/design-preview', '/design-preview.html']) {
      const response = await fetch(fixture.url+name);
      assert.equal(response.status, 200, name+' should return HTML');
      assert.match(response.headers.get('content-type') || '', /text\/html/);
      const html = await response.text();
      assert.match(html, /OmniLearn AI · Design Preview/);
      assert.match(html, /id="sideNav"/);
      assert.match(html, /design-preview\.js/);
    }
    for (const asset of ['/design-preview.css','/design-preview.js']) {
      const response = await fetch(fixture.url+asset);
      assert.equal(response.status, 200, asset+' is missing');
      assert.ok((await response.text()).length > 1000);
    }
  } finally {fixture.child.kill();}
});
