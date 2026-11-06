// One deadline covers all candidates, including providers that ignore cancellation.
export async function runProviderRequest({
  models,
  invoke,
  timeoutMs,
  signal,
  now = Date.now,
  attemptTimeoutMs = 20000,
  onFailure
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
      for (const model of [...new Set(models)].slice(0, 2)) {
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
          onFailure?.(model, error);
          // Authentication, invalid configuration and unknown errors must fail fast.
          if (![404, 429, 503, 504].includes(Number(error.status))) throw error;
        } finally {
          clearTimeout(attemptTimer);
          attempt.signal.removeEventListener('abort', cancelAttempt);
          controller.signal.removeEventListener('abort', onParentAbort);
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
