import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
async function fixture(mode) {
  let output='';
  const child=spawn(process.execPath,['--import',fileURLToPath(new URL('./fixtures/reliability-preload.mjs',import.meta.url)),'server.js'], {
    env:{...process.env,PORT:'0',GEMINI_API_KEY:'TEST_ONLY_FIXTURE_KEY',OMNILEARN_TEST_PROVIDER_MODE:mode},stdio:['ignore','pipe','pipe'],
  });
  child.stdout.on('data',chunk=>{output+=chunk;});
  child.stderr.on('data',()=>{});
  try {
    const base=await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Fixture startup timed out')),15000);
      child.once('exit',()=>{clearTimeout(timer);reject(new Error('Fixture exited'));});
      child.stdout.on('data',chunk=>{const port=String(chunk).match(/listening on port (\d+)/)?.[1];if(port){clearTimeout(timer);resolve(`http://127.0.0.1:${port}`);}});
    });
    return {child,base,calls:()=>output.split('[reliability-fixture] invocation').length-1};
  } catch(error){child.kill();throw error;}
}
test('real routes and official SDK preserve safe failure classification and bounded transport calls', async t=>{
  for (const [mode,status,code,kind,calls] of [
    ['auth',500,'GEMINI_AUTH_ERROR','authentication',1],
    ['daily',429,'GEMINI_DAILY_QUOTA','daily-quota',1],
    ['rate',429,'GEMINI_RATE_LIMIT','rate-limit',1],
    ['network',500,'GEMINI_NETWORK_ERROR','network',2],
    ['empty',422,'INVALID_AI_OUTPUT','invalid-response',2],
    ['citation',422,'INVALID_AI_OUTPUT','invalid-response',2],
    ['malformed',422,'INVALID_AI_OUTPUT',null,2],
    ['success',200,null,null,2],
  ]) await t.test(mode,async()=>{
    const f=await fixture(mode);
    try {
      const route=mode==='malformed'?'/api/study':'/api/chat';
      const body=mode==='malformed'?{task:'cards',count:1,topic:'Geometry',sessionId:'http-test'}:{message:'Explain a radius',sessionId:'http-test'};
      for(let i=0;i<2;i++) {
        const response=await fetch(f.base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
        const data=await response.json();
        assert.equal(response.status,status,JSON.stringify(data));
        assert.ok(!JSON.stringify(data).includes('DO_NOT_LEAK_PROVIDER_DETAIL'));
        assert.ok(!JSON.stringify(data).includes('TEST_ONLY_FIXTURE_KEY'));
        if(code) assert.equal(data.code,code);
        if(kind) assert.equal(data.failureKind,kind);
        if(['daily','rate'].includes(mode)) assert.ok(data.retryAt>Date.now());
        if(mode==='success') {assert.equal(data.model,'gemini-3.1-flash-lite');assert.equal(data.fallbackUsed,true);assert.equal(data.cacheHit,i===1);}
      }
      assert.equal(f.calls(),calls);
    } finally {f.child.kill();}
  });
});
