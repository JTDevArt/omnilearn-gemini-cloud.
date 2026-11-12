import test from 'node:test';
import assert from 'node:assert/strict';
import {runTextPilot} from '../lib/text-provider-pilot.js';
const options={enabled:true,apiKey:'fixture-only',task:'chat',messages:[{role:'user',content:'Synthetic classroom example'}]};
const response=(content='OK',finish_reason='stop')=>new Response(JSON.stringify({choices:[{message:{content},finish_reason}],usage:{total_tokens:5}}));
test('pilot is off by default and rejects images, oversized messages and unsupported tasks before network',async()=>{
  let calls=0;const fetchImpl=()=>{calls++;return response();};
  for(const patch of [{enabled:false},{task:'ocr'},{messages:[{role:'user',content:[]}]},{messages:[{role:'user',content:'x'.repeat(17000)}]},{json:true}])await assert.rejects(runTextPilot({...options,fetchImpl,...patch}));
  assert.equal(calls,0);
});
test('pilot uses fixed HTTPS endpoint, server credential and actual provider metadata',async()=>{
  const result=await runTextPilot({...options,fetchImpl:async(url,request)=>{assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(request.redirect,'error');assert.equal(JSON.parse(request.body).stream,false);return response();}});
  assert.equal(result.provider,'groq');assert.equal(result.actualModel,'openai/gpt-oss-20b');assert.equal(result.usage.totalTokens,5);
});
test('pilot validates JSON, rejects truncation and never falls back on authentication or rate limits',async()=>{
  await assert.rejects(runTextPilot({...options,json:true,validate:v=>assert.ok(v.questions),fetchImpl:async()=>response('{}')}));
  await assert.rejects(runTextPilot({...options,fetchImpl:async()=>response('partial','length')}));
  for(const status of [401,403,429]){
    let fallback=0;
    await assert.rejects(runTextPilot({...options,allowFallback:true,geminiFallback:()=>{fallback++;},fetchImpl:async()=>new Response('secret',{status})}));
    assert.equal(fallback,0);
  }
});
test('explicit transient fallback is bounded and cancellation does not replay',async()=>{
  const result=await runTextPilot({...options,allowFallback:true,fetchImpl:async()=>new Response('',{status:503}),geminiFallback:async()=>({text:'Fallback',actualModel:'fixture-gemini'})});
  assert.equal(result.provider,'gemini');assert.equal(result.fallbackUsed,true);
  const controller=new AbortController();controller.abort();
  await assert.rejects(runTextPilot({...options,signal:controller.signal,fetchImpl:()=>{throw Error('must not call');}}));
});
