import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProviderManager, classifyAiFailure } from '../lib/provider-manager.js';
import { runProviderRequest } from '../lib/provider-request.js';
import { thinkingConfigForModel } from '../lib/provider-models.js';
import { providerFailureError } from '../lib/provider-errors.js';
test('SDK payloads distinguish failures, honor RetryInfo/Retry-After, and sanitize details', () => {
  for (const [error, kind] of [
    [{status:400,message:'API_KEY_INVALID secret-fixture'}, 'authentication'],
    [{status:500,code:'MISSING_SECRET'}, 'authentication'],
    [{status:404}, 'model-unavailable'], [{status:429,message:'quota PerDay'}, 'daily-quota'],
    [{status:429}, 'rate-limit'], [{message:'fetch failed'}, 'network'],
    [{status:503}, 'unavailable'], [{status:504}, 'timeout'],
    [{status:422,code:'EMPTY_AI_RESPONSE'}, 'invalid-response'],
    [{name:'AbortError'}, 'cancelled'], [{status:400}, 'invalid-request'],
  ]) {
    const failure = classifyAiFailure(error);
    assert.equal(failure.kind, kind);
    assert.ok(!providerFailureError(failure, 'test').message.includes('secret-fixture'));
  }
  const sdk = {status:429, message:JSON.stringify({error:{code:429, details:[
    {'@type':'type.googleapis.com/google.rpc.QuotaFailure', violations:[{quotaId:'GenerateRequestsPerDay'}]},
    {'@type':'type.googleapis.com/google.rpc.RetryInfo', retryDelay:'7200.5s'}]}})};
  assert.equal(classifyAiFailure(sdk).cooldownMs, 7200500);
  assert.equal(classifyAiFailure(sdk).kind, 'daily-quota');
  assert.equal(classifyAiFailure({status:503,headers:new Headers({'Retry-After':'12'})}).retryDelayMs,12000);
  assert.equal(classifyAiFailure({status:503,headers:{'retry-after':new Date(20000).toUTCString()}},1000).retryDelayMs,19000);
  assert.equal(classifyAiFailure({status:429,details:[{'@type':'google.rpc.RetryInfo',retryDelay:{seconds:2,nanos:500000000}}]}).cooldownMs,2500);
});
test('quota stops model switching and blocks all stages until the advertised deadline', async () => {
  let clock = 1000, calls = 0;
  const manager = new ProviderManager({primary:'p',fallback:'f',now:()=>clock});
  const invoke = async () => {calls++; throw {status:429, message:'daily quota retryDelay: "7200s"'};};
  await assert.rejects(manager.run({stage:'chat',invoke}), e => e.code==='GEMINI_DAILY_QUOTA' && e.retryAt===7201000);
  await assert.rejects(manager.run({stage:'pdf-ocr',invoke}), e => e.code==='GEMINI_DAILY_QUOTA');
  assert.equal(calls,1);
  assert.equal(manager.status().models[0].state,'quota-cooldown');
  clock = 7201001;
  assert.equal((await manager.run({stage:'chat',invoke:async()=> 'ok'})).result,'ok');
});
test('a quota reported concurrently prevents an already-scheduled fallback call', async () => {
  const manager=new ProviderManager({primary:'p',fallback:'f'});const calls=[];
  const first=manager.run({stage:'chat',invoke:async model=>{calls.push('first:'+model);throw {status:503};}});
  const rejected=assert.rejects(first,e=>e.failureKind==='daily-quota');
  await new Promise(resolve=>setImmediate(resolve));
  await assert.rejects(manager.run({stage:'pdf-ocr',invoke:async model=>{calls.push('second:'+model);throw {status:429,message:'daily quota'};}}),e=>e.failureKind==='daily-quota');
  await rejected;
  assert.deepEqual(calls,['first:p','second:gemini-3-flash-preview']);
});
test('transient fallback backoff is exponential, bounded and inside the shared deadline', async () => {
  for (const failures of [1,2,8]) {
    let clock=0; const delays=[], calls=[];
    const result = await runProviderRequest({models:['p','f'], timeoutMs:10000, now:()=>clock, random:()=>0.5,
      onFailure:()=>failures, sleep:async ms=>{delays.push(ms);clock+=ms;},
      invoke:async model=>{calls.push(model);if(model==='p')throw {status:503}; return 'ok';}});
    assert.equal(result.model,'f'); assert.deepEqual(calls,['p','f']);
    assert.equal(delays[0], Math.min(2000,250*2**(failures-1)));
  }
  let calls=0;
  await assert.rejects(runProviderRequest({models:['p','f'],timeoutMs:1000,
    invoke:async()=>{calls++;throw {status:503,headers:{'retry-after':'60'}};}}));
  assert.equal(calls,1);
  const controller = new AbortController();
  await assert.rejects(runProviderRequest({models:['p','f'],timeoutMs:1000,signal:controller.signal,
    invoke:async()=>{throw {status:503};},sleep:async(_ms,signal)=>{controller.abort(new Error('cancelled during backoff'));signal.throwIfAborted();}}), /cancelled during backoff/);
});
test('failed models cool down exponentially and successful retry resets the circuit', async () => {
  let clock=0,calls=0;
  const manager=new ProviderManager({primary:'p',fallback:'',now:()=>clock});
  const invoke=async()=>{calls++;throw {status:503};};
  await assert.rejects(manager.run({stage:'chat',invoke}));
  assert.equal(manager.status().models[0].retryAt,15000);
  await assert.rejects(manager.run({stage:'chat',invoke})); assert.equal(calls,1);
  clock=15001; await assert.rejects(manager.run({stage:'chat',invoke}));
  assert.equal(manager.status().models[0].retryAt,45001);
  clock=45002; await manager.run({stage:'chat',invoke:async()=> 'ok'});
  assert.equal(manager.status().models[0].retryAt,null);
});
test('model admission separates speech/embedding and uses compatible thinking parameters', () => {
  const manager=new ProviderManager({primary:'text-embedding-004',fallback:'gemini-2.5-flash',multimodalFallback:'gemini-3-flash-preview'});
  assert.deepEqual(manager.candidates('chat'),['gemini-2.5-flash']);
  assert.deepEqual(manager.candidates('image-ocr'),['gemini-3-flash-preview']);
  assert.deepEqual(manager.candidates('speech'),['gemini-2.5-flash-preview-tts']);
  assert.deepEqual(thinkingConfigForModel('gemini-2.5-pro','LOW'),{thinkingConfig:{thinkingBudget:1024}});
  assert.deepEqual(thinkingConfigForModel('gemini-2.0-flash','LOW'),{});
  assert.deepEqual(thinkingConfigForModel('gemini-3-flash-preview','HIGH'),{thinkingConfig:{thinkingLevel:'HIGH'}});
});
test('cache keys include scope and cancelled consumers never receive cached success', async () => {
  const manager=new ProviderManager({primary:'p',fallback:''}); let calls=0;
  const options={stage:'chat',key:'same',cacheSuccess:true,invoke:async()=>++calls};
  await manager.run({...options,scope:'alice'});
  assert.equal((await manager.run({...options,scope:'bob'})).result,2);
  const controller=new AbortController();controller.abort(new Error('cancelled'));
  await assert.rejects(manager.run({...options,scope:'alice',signal:controller.signal}),/cancelled/);
  assert.equal(calls,2);
});
test('last-consumer cancellation does not poison an immediate retry or its deduplication', async () => {
  const manager=new ProviderManager({primary:'p',fallback:''});
  let calls=0, release;
  const options={stage:'chat',key:'retry',scope:'alice',invoke:async(_model,_ms,signal)=>{
    calls++;
    if(calls===1) return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));
    return new Promise(resolve=>{release=resolve;});
  }};
  const controller=new AbortController(); const first=manager.run({...options,signal:controller.signal});
  const rejected=assert.rejects(first);
  await new Promise(resolve=>setImmediate(resolve));controller.abort();await rejected;
  const second=manager.run(options); await new Promise(resolve=>setImmediate(resolve));
  const third=manager.run(options);release('ok');
  assert.equal((await second).result,'ok');assert.equal((await third).result,'ok');assert.equal(calls,2);
});
test('daily quota and temporary rate limits have distinct circuit deadlines', () => {
  assert.equal(
    classifyAiFailure({
      status: 429,
      message: 'PerDay quota retryDelay: "7200s"',
    }).cooldownMs,
    7200000
  );
  assert.equal(
    classifyAiFailure({ status: 429, message: 'rate limit' }).kind,
    'rate-limit'
  );
  assert.equal(classifyAiFailure({ status: 403 }).kind, 'authentication');
  assert.equal(
    classifyAiFailure({ message: 'fetch failed' }).kind,
    'network'
  );
});
test('exhausted models are not re-probed; every fallback retains actual model identity', async () => {
  const manager = new ProviderManager({
      primary: 'primary',
      fallback: 'fallback',
    }),
    calls = [];
  const invoke = async (model) => {
    calls.push(model);
    if (model === 'primary')
      throw Object.assign(new Error('model not found'), { status: 404 });
    return 'valid';
  };
  const result = await manager.run({ stage: 'study', invoke });
  assert.equal(result.model, 'fallback');
  assert.equal(result.fallbackUsed, true);
  await manager.run({ stage: 'study', invoke });
  assert.deepEqual(calls, ['primary', 'fallback', 'fallback']);
  await assert.rejects(
    manager.run({
      stage: 'study',
      invoke: async () => {
        throw Object.assign(new Error('model not found'), { status: 404 });
      },
    })
  );
  let probed = false;
  await assert.rejects(
    manager.run({
      stage: 'study',
      invoke: async () => {
        probed = true;
      },
    }),
    (error) => error.code === 'GEMINI_MODEL_UNAVAILABLE'
  );
  assert.equal(probed, false);
});
test('authentication errors fail fast and block credential retries', async () => {
  const manager = new ProviderManager({ primary: 'p', fallback: 'f' });
  let calls = 0;
  await assert.rejects(
    manager.run({
      stage: 'chat',
      invoke: async () => {
        calls++;
        throw Object.assign(new Error('bad credentials'), { status: 403 });
      },
    })
  );
  await assert.rejects(
    manager.run({
      stage: 'chat',
      invoke: async () => {
        calls++;
      },
    }),
    (error) => error.code === 'GEMINI_AUTH_ERROR'
  );
  assert.equal(calls, 1);
});
test('queue is bounded, queued cancellation is safe, and duplicate requests share one generation', async () => {
  const manager = new ProviderManager({
    primary: 'p',
    fallback: '',
    concurrency: 1,
    maxQueue: 1,
  });
  let release,
    calls = 0;
  const first = manager.run({
    stage: 'chat',
    key: 'session-a',
    cacheSuccess: true,
    invoke: async () => {
      calls++;
      await new Promise((resolve) => {
        release = resolve;
      });
      return 'ok';
    },
  });
  const duplicate = manager.run({
    stage: 'chat',
    key: 'session-a',
    invoke: async () => {
      throw Error('duplicate');
    },
  });
  await new Promise((resolve) => setImmediate(resolve));
  const controller = new AbortController(),
    queued = manager.run({
      stage: 'chat',
      signal: controller.signal,
      invoke: async () => 'queued',
    }),
    rejected = assert.rejects(queued);
  await new Promise((resolve) => setImmediate(resolve));
  await assert.rejects(
    manager.run({ stage: 'chat', invoke: async () => 'overflow' }),
    (error) => error.code === 'AI_QUEUE_FULL'
  );
  controller.abort(new Error('cancelled'));
  await rejected;
  release();
  await Promise.all([first, duplicate]);
  assert.equal(calls, 1);
  assert.equal(manager.active, 0);
  assert.equal(
    (
      await manager.run({
        stage: 'chat',
        key: 'session-a',
        invoke: async () => {
          throw Error('cached');
        },
      })
    ).cacheHit,
    true
  );
});
