import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { runProviderRequest } from '../lib/provider-request.js';

test('one stalled model leaves time for a fallback within the shared deadline', async()=>{
  const calls=[];
  const result=await runProviderRequest({models:['slow','fast'],timeoutMs:200,attemptTimeoutMs:20,invoke:async(model,_ms,signal)=>{calls.push({model,signal});if(model==='slow')return new Promise(()=>{});return 'fallback result';}});
  assert.equal(result.model,'fast');assert.equal(calls[0].signal.aborted,true);assert.equal(calls.length,2);
});

test('fallback receives only the remaining deadline and returns actual model', async () => {
  let clock = 0; const calls = [];
  const result = await runProviderRequest({ models: ['first', 'second', 'third'], timeoutMs: 1000, now: () => clock,
    invoke: async (model, ms) => { calls.push([model, ms]); if (model === 'first') { clock = 600; throw { status: 503 }; } return 'ok'; } });
  assert.deepEqual(calls, [['first', 1000], ['second', 400]]);
  assert.equal(result.model, 'second');
});
test('deadline cancels a provider even if it never resolves', async () => {
  let signal;
  await assert.rejects(runProviderRequest({ models: ['one'], timeoutMs: 25,
    invoke: async (_m, _ms, s) => { signal = s; return new Promise(() => {}); } }), e => e.status === 504);
  assert.equal(signal.aborted, true);
});
test('invalid credentials fail immediately; retryable failures stop at two attempts', async () => {
  for (const status of [403, 503]) {
    let calls = 0;
    await assert.rejects(runProviderRequest({ models: ['one', 'two', 'three'], timeoutMs: 1000,
      invoke: async () => { calls++; throw { status }; } }), e => e.status === status);
    assert.equal(calls, status === 403 ? 1 : 2);
  }
});
test('caller cancellation stops provider', async () => {
  const controller = new AbortController(); controller.abort(new Error('cancelled'));
  let calls = 0;
  await assert.rejects(runProviderRequest({ models: ['one'], timeoutMs: 1000, signal: controller.signal,
    invoke: async () => { calls++; } }), /cancelled/);
  assert.equal(calls, 0);
});
const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // Parse the actual browser script, including edits outside tested functions.
function extract(start, end) { return script.slice(script.indexOf(start), script.indexOf(end, script.indexOf(start))); }
test('concept map commands route correctly; conceptual questions stay in chat', () => {
  const ctx = vm.createContext({});
  vm.runInContext(extract('function isConceptMapCommand', 'async function sendChat'), ctx);
  for (const text of ['bikin peta konsep', 'tolong buatkan peta konsep dari materi ini', 'please create a concept map']) assert.equal(ctx.isConceptMapCommand(text), true);
  for (const text of ['apa itu peta konsep?', 'jelaskan cara membuat peta konsep', 'what is a concept map?']) assert.equal(ctx.isConceptMapCommand(text), false);
});
test('POST response parsing errors and transport errors never replay the operation', async () => {
  for (const mode of ['json', 'html', 'network']) {
    let calls = 0, retries = 0;
    const ctx = vm.createContext({ Headers, AbortController, Error, window: { setTimeout, clearTimeout }, sessionId: 'test',
      generateClientRequestId: () => 'request-test', warmAuthAndHealthCheck: async () => true,
      getCleanFetch: () => async () => { calls++; if (mode === 'network') throw new TypeError('network failure');
        return { headers: new Headers({ 'content-type': mode === 'json' ? 'application/json' : 'text/html' }), status: 200,
          text: async () => '<html>', json: async () => { throw new Error('invalid json'); } }; },
      requestViaXhr: async () => { retries++; } });
    vm.runInContext(extract('async function safeRequestJson', 'async function askAI'), ctx);
    await assert.rejects(ctx.safeRequestJson('/api/chat', { method: 'POST' }));
    assert.equal(calls, 1); assert.equal(retries, 0);
  }
});
test('concept-map titles and relations escape provider HTML', () => {
  const output = { classList: { remove() {} }, innerHTML: '', querySelectorAll: () => [] };
  const ctx = vm.createContext({ toolOutput: output, $: () => null, renderMarkdownToSafeHtml: () => '',
    conceptMapState: { centralTopic: '<img src=x onerror=alert(1)>', summary: '<script>bad</script>', branches: [
      { title: '<img onerror=bad>', relationToCenter: '<b>bad</b>', subconcepts: [{title:'<script>bad</script>',relation:'<img onerror=bad>'}] }
    ] } });
  vm.runInContext(extract('function escapeHtml', 'function renderMarkdownToSafeHtml') + extract('function renderInteractiveConceptMap', 'function getTabCacheKey'), ctx);
  ctx.renderInteractiveConceptMap();
  assert.ok(output.innerHTML.includes('&lt;img'));
  assert.ok(!output.innerHTML.includes('<script>'));
  assert.ok(!output.innerHTML.includes('<img'));
});
test('sendChat invokes the existing map workflow without submitting a chat request', async () => {
  const routes = []; let chatCalls = 0;
  const ctx = vm.createContext({ chatInput: { value: 'bikin peta konsep' }, busy: false, uploadInFlight: false,
    addMessage() {}, selectTab: (...args) => routes.push(args), askAI: () => { chatCalls++; } });
  vm.runInContext(extract('function isConceptMapCommand', 'const taskNames'), ctx);
  await ctx.sendChat({ preventDefault() {} });
  assert.deepEqual(routes, [['map', 'bikin peta konsep']]);
  assert.equal(chatCalls, 0);
});
test('Markdown stays plain escaped text if DOMPurify is unavailable', () => {
  const ctx = vm.createContext({ window: { marked: { parse: () => '<img src=x onerror=bad>' } } });
  vm.runInContext(extract('function escapeHtml', 'function setRenderedContent'), ctx);
  const html = ctx.renderMarkdownToSafeHtml('<img src=x onerror=bad>');
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
});
