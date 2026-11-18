import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const window = {};
vm.runInNewContext(readFileSync(new URL('../public/ai-response.js',import.meta.url),'utf8'), {window});
const {failure, read} = window.OmniAIResponse;

test('failure details distinguish denied requests, key errors, timeouts, partial sources and bad results', () => {
  for (const [status, code, expected] of [
    [403,'CROSS_SITE_REQUEST','origin'],
    [403,'UPLOAD_FORBIDDEN','access'],
    [500,'GEMINI_AUTH_ERROR','provider-auth'],
    [500,'GEMINI_TIMEOUT','timeout'],
    [422,'PARTIAL_SOURCE','source'],
    [422,'INVALID_AI_OUTPUT','result'],
    [503,'GEMINI_UNAVAILABLE','unavailable'],
  ]) assert.equal(failure({status,data:{code}}).kind,expected);
  assert.equal(failure({status:413,data:{code:'FILE_TOO_LARGE',error:'Batas unggahan 4 MB.'}}).message,'Batas unggahan 4 MB.');
});

test('non-JSON authorization failures omit upstream HTML', async () => {
  const response = new Response('<html>DO_NOT_RENDER</html>', {status:403,headers:{'Content-Type':'text/html'}});
  await assert.rejects(read(response), error => error.status === 403 && !error.message.includes('DO_NOT_RENDER'));
});
