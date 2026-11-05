// One deadline covers all candidates, including providers that ignore cancellation.
export async function runProviderRequest({ models, invoke, timeoutMs, signal, now = Date.now }) {
  const controller = new AbortController();
  const deadline = now() + timeoutMs;
  const timeoutError = Object.assign(new Error('Gemini request timeout'), { status: 504 });
  const onAbort = () => controller.abort(signal.reason || new Error('Request cancelled'));
  if (signal?.aborted) onAbort();
  else signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(timeoutError), timeoutMs);
  let rejectAbort;
  const cancelled = new Promise((_, reject) => { rejectAbort = reject; });
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
        try {
          const result = await invoke(model, remainingMs, controller.signal);
          controller.signal.throwIfAborted();
          return { result, model };
        } catch (error) {
          controller.signal.throwIfAborted();
          lastError = error;
          // Authentication, invalid configuration and unknown errors must fail fast.
          if (![404, 429, 503].includes(Number(error.status))) throw error;
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
