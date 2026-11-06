import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ProviderManager, classifyAiFailure } from '../lib/provider-manager.js';
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
    'network-or-unavailable'
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
      throw Object.assign(new Error('PerDay daily quota'), { status: 429 });
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
        throw Object.assign(new Error('rate limit'), { status: 429 });
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
    (error) => error.code === 'AI_DEFERRED'
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
