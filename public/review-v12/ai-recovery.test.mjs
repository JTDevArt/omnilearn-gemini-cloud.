import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const parser = readFileSync(new URL('../ai-response.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const extract = (start,end) => app.slice(app.indexOf(start), app.indexOf(end,app.indexOf(start)));
const context = vm.createContext({window:{setTimeout,clearTimeout}, Headers, AbortController});
vm.runInContext(parser, context);
const api = context.window.OmniAIResponse;

test('JSON success stays JSON, including +json media types', async () => {
  const result = await api.read(new Response('{"answer":"Penjelasan uji"}', {headers:{'Content-Type':'application/problem+json'}}));
  assert.equal(result.answer,'Penjelasan uji');
});

for (const [status,kind] of [[401,'signin'],[403,'access'],[429,'limit'],[503,'unavailable']]) {
  test('HTML '+status+' is classified without exposing its body or request ID in the message', async () => {
    const response = new Response('<html><script>secretFixture()</script>Denied</html>', {status,headers:{'Content-Type':'text/html','X-Request-Id':'fixture-request-id'}});
    await assert.rejects(api.read(response), error => {
      assert.equal(error.kind,kind); assert.equal(error.status,status);
      assert.equal(error.requestId,'fixture-request-id');
      assert.doesNotMatch(error.message,/secretFixture|<html|fixture-request-id/);
      return true;
    });
    assert.equal(response.bodyUsed,true);
  });
}

test('rate limiting preserves a Retry-After hint', async () => {
  const before = Date.now();
  await assert.rejects(api.read(new Response('{}',{status:429,headers:{'Content-Type':'application/json','Retry-After':'30'}})), error => {
    assert.ok(error.retryAt>=before+30000 && error.retryAt<Date.now()+30100); return true;
  });
});

test('invalid JSON gets a controlled unexpected-response error', async () => {
  await assert.rejects(api.read(new Response('{oops',{headers:{'Content-Type':'application/json'}})), error => error.kind==='unexpected');
});

test('source evidence failures keep their code and require an explicit choice', async () => {
  await assert.rejects(api.read(new Response(JSON.stringify({code:'SOURCE_EVIDENCE_MISMATCH',error:'Bukti gagal (ID: internal-id)'}),{status:422,headers:{'Content-Type':'application/json'}})), error => {
    assert.equal(error.kind,'source'); assert.equal(error.code,'SOURCE_EVIDENCE_MISMATCH');
    assert.doesNotMatch(error.message,/internal-id/); return true;
  });
});

test('untrusted JSON error markup is not offered as a visible reason', () => {
  assert.equal(api.failure({status:500,data:{error:'<img src=x onerror=bad()>'}}).reason,'');
});

test('malformed JSON diagnostic fields do not break status classification', () => {
  const error = api.failure({status:403,data:{code:{toString:null},requestId:{toString:null}},requestId:'safe-fixture'});
  assert.equal(error.kind,'access');assert.equal(error.requestId,'safe-fixture');
});

test('a malformed successful chat result never invents an HTTP error status', async () => {
  const ctx=vm.createContext({$:()=>({value:'auto'}),document:{querySelector:()=>null},sessionId:'fixture',
    window:{OmniAIResponse:api,OmniProduct:{chatRequestContext:()=>({material:'',history:[]})}},safeRequestJson:async()=>({answer:null})});
  vm.runInContext(extract('async function askAI','function isConceptMapCommand'),ctx);
  await assert.rejects(ctx.askAI('Uji jawaban'),error=>error.code==='INVALID_AI_OUTPUT'&&error.kind==='unexpected'&&error.status===0);
});

test('timeout and caller cancellation are distinct', () => {
  const timeout = api.transport({name:'AbortError'},'timeout-fixture');
  assert.equal(timeout.kind,'timeout'); assert.equal(timeout.isCancelled,false);
  const cancel = api.transport({isCancelled:true},'cancel-fixture');
  assert.equal(cancel.kind,'cancelled'); assert.equal(cancel.isTimeout,false);
});

for (const mode of ['html403','invalidJson','network','timeout']) {
  test('actual request function never replays a failed POST: '+mode, async () => {
    let calls = 0, fallbackCalls = 0;
    const window = {setTimeout,clearTimeout};
    const ctx = vm.createContext({window,Headers,AbortController,sessionId:'fixture-session',
      generateClientRequestId:()=> 'fixture-request',warmAuthAndHealthCheck:async()=>true,
      getCleanFetch:()=>async(_url,options)=>{
        calls++;
        if(mode==='network')throw new TypeError('Synthetic network failure');
        if(mode==='timeout')return new Promise((_resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true}));
        return mode==='html403'?new Response('<html>Denied</html>',{status:403,headers:{'Content-Type':'text/html'}}):new Response('invalid',{headers:{'Content-Type':'application/json'}});
      },requestViaXhr:async()=>{fallbackCalls++;},
    });
    vm.runInContext(parser,ctx);
    vm.runInContext(extract('async function safeRequestJson','async function askAI'),ctx);
    await assert.rejects(ctx.safeRequestJson('/api/chat',{method:'POST'},{timeoutMs:10}));
    assert.equal(calls,1);assert.equal(fallbackCalls,0);
  });
}

for (const scope of ['general','document']) {
  test('actual chat function routes '+scope+' context without silently choosing another source', async () => {
    let analyses=0,payload;
    const requestContext={scope,history:[],material:scope==='document'?'Biologi: lambung mengolah makanan.':'',materialId:scope==='document'?'biology-fixture':'',materialName:scope==='document'?'Sistem Pencernaan':'',learningContext:{chapter:null}};
    const ctx=vm.createContext({$:()=>({value:'auto'}),sessionId:'fixture-session',
      materialText:'Unrelated private PDF',materialId:'unrelated',materialName:'unrelated.pdf',chatHistory:[],
      document:{querySelector:()=>null},
      window:{OmniAIResponse:api,OmniProduct:{chatRequestContext:()=>requestContext,ensureAnalysis:async()=>{analyses++;}}},
      safeRequestJson:async(_url,options)=>{payload=JSON.parse(options.body);return{answer:'Jawaban uji'};},
    });
    vm.runInContext(extract('async function askAI','function isConceptMapCommand'),ctx);
    await ctx.askAI('Jelaskan teori relativitas Einstein');
    assert.equal(analyses,scope==='document'?1:0);assert.equal(payload.material,requestContext.material);
    assert.equal(payload.materialId,requestContext.materialId);assert.doesNotMatch(JSON.stringify(payload),/Unrelated private PDF|unrelated.pdf/);
  });
}
