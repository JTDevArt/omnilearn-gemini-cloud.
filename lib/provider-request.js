import { classifyAiFailure } from './provider-errors.js';
function abortableDelay(ms, signal) {
  signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const done = () => { signal.removeEventListener('abort', abort); resolve(); };
    const timer = setTimeout(done, ms);
    const abort = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); reject(signal.reason); };
    signal.addEventListener('abort', abort, {once:true});
  });
}
// One deadline covers queue-adjusted work, backoff and providers ignoring cancellation.
export async function runProviderRequest({
  models,
  invoke,
  timeoutMs,
  signal,
  now = Date.now,
  attemptTimeoutMs = 20000,
  onFailure,
  backoffBaseMs = 250,
  random = Math.random,
  sleep = abortableDelay,
}) {
  const controller = new AbortController();
  const deadline = now() + timeoutMs;
  const timeoutError = Object.assign(new Error('Gemini request timeout'), {
    status: 504
  });
  const onAbort = () =>
    controller.abort(signal.reason || new Error('Request cancelled'));
  if (signal?.aborted) onAbort();
  else signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(timeoutError), timeoutMs);
  let rejectAbort;
  const cancelled = new Promise((_, reject) => {
    rejectAbort = reject;
  });
  const cancel = () => rejectAbort(controller.signal.reason);
  controller.signal.addEventListener('abort', cancel, { once: true });
  if (controller.signal.aborted) cancel();
  try {
    const work = async () => {
      let lastError;
      const candidates = [...new Set(models)].slice(0, 2);
      for (const [index, model] of candidates.entries()) {
        controller.signal.throwIfAborted();
        const remainingMs = deadline - now();
        if (remainingMs <= 0) throw timeoutError;
        const attempt = new AbortController();
        const onParentAbort = () => attempt.abort(controller.signal.reason);
        controller.signal.addEventListener('abort', onParentAbort, {
          once: true
        });
        const budget = Math.min(remainingMs, attemptTimeoutMs);
        const attemptTimer = setTimeout(
          () => attempt.abort(timeoutError),
          budget
        );
        let cancelAttempt;
        const abortedAttempt = new Promise((_, reject) => {
          cancelAttempt = () => reject(attempt.signal.reason);
          attempt.signal.addEventListener('abort', cancelAttempt, {
            once: true
          });
        });
        let failure, failures;
        try {
          const result = await Promise.race([
            invoke(model, budget, attempt.signal),
            abortedAttempt
          ]);
          controller.signal.throwIfAborted();
          return { result, model };
        } catch (error) {
          controller.signal.throwIfAborted();
          lastError = error;
          failure = classifyAiFailure(error, now());
          failures = onFailure?.(model, error) || 1;
          if (!failure.canFallback) throw error;
        } finally {
          clearTimeout(attemptTimer);
          attempt.signal.removeEventListener('abort', cancelAttempt);
          controller.signal.removeEventListener('abort', onParentAbort);
        }
        if (index + 1 < candidates.length) {
          // Exponential across consecutive model failures, capped and jittered.
          const backoff = failure.kind === 'model-unavailable' ? 0
            : Math.min(2000, backoffBaseMs * 2 ** Math.min(failures - 1, 5)) * (0.8 + random() * 0.4);
          const delay = Math.max(failure.retryDelayMs, Math.round(backoff));
          if (delay >= deadline - now()) throw lastError;
          if (delay) await sleep(delay, controller.signal);
        }
      }
      throw lastError || new Error('No Gemini model configured');
    };
    return await Promise.race([work(), cancelled]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
    controller.signal.removeEventListener('abort', cancel);
  }
}
