import { runProviderRequest } from './provider-request.js';
import { classifyAiFailure, providerFailureError } from './provider-errors.js';
import { modelCompatible } from './provider-models.js';
export { classifyAiFailure } from './provider-errors.js';
export class ProviderManager {
  constructor({
    primary = 'gemini-3.8-flash',
    fallback = 'gemini-3.1-flash-lite',
    multimodalFallback = 'gemini-3-flash-preview',
    speech = 'gemini-2.5-flash-preview-tts',
    concurrency = 4,
    maxQueue = 24,
    now = Date.now,
  } = {}) {
    this.config = { primary, fallback, multimodalFallback, speech };
    for (const value of Object.values(this.config))
      if (value && !/^[\w.-]{1,100}$/.test(value))
        throw Object.assign(new Error('Model configuration is invalid.'), {
          code: 'INVALID_MODEL_CONFIG',
        });
    this.concurrency = concurrency;
    this.maxQueue = maxQueue;
    this.now = now;
    this.active = 0;
    this.queue = [];
    this.circuits = new Map();
    this.authUntil = 0;
    this.quotaUntil = 0;
    this.quotaFailure = null;
    this.pending = new Map();
    this.completed = new Map();
  }
  candidates(stage) {
    const { primary, fallback, multimodalFallback, speech } = this.config;
    return stage === 'speech'
      ? [speech].filter(model => modelCompatible(model, stage))
      : [
          ...new Set(
            [
              primary,
              /(?:pdf|image|media)/.test(stage) ? multimodalFallback : fallback,
            ].filter(model => modelCompatible(model, stage))
          ),
        ];
  }
  clearScope(scope) {
    for (const [key, value] of this.completed)
      if (value.scope === scope) this.completed.delete(key);
    for (const value of this.pending.values())
      if (value.scope === scope)
        value.controller.abort(new Error('Session cleared'));
  }
  status() {
    const now = this.now();
    return {
      primary: this.config.primary,
      models: [...new Set(Object.values(this.config).filter(Boolean))].map(
        (model) => ({
          model,
          compatible: modelCompatible(model, model === this.config.speech ? 'speech' : 'text'),
          state:
            this.authUntil > now ? 'authentication-blocked' : this.quotaUntil > now ? 'quota-cooldown' : (this.circuits.get(model)?.until || 0) > now
              ? 'cooldown'
              : 'available-to-attempt',
          retryAt: Math.max(this.authUntil, this.quotaUntil, this.circuits.get(model)?.until || 0) || null,
          reason: this.authUntil > now ? 'authentication' : this.quotaUntil > now ? this.quotaFailure?.kind : this.circuits.get(model)?.kind || null,
        })
      ),
      active: this.active,
      queued: this.queue.length,
      quotaBlockedUntil: this.quotaUntil > now ? this.quotaUntil : null,
      quotaReason: this.quotaUntil > now ? this.quotaFailure?.kind : null,
      authenticationBlockedUntil: this.authUntil > now ? this.authUntil : null,
    };
  }
  async slot(signal, waitMs) {
    signal?.throwIfAborted();
    if (this.active < this.concurrency) {
      this.active++;
      return;
    }
    if (this.queue.length >= this.maxQueue)
      throw Object.assign(
        new Error(
          'Antrean AI penuh. Permintaan belum diproses; coba lagi nanti.'
        ),
        { status: 429, code: 'AI_QUEUE_FULL', stage: 'provider-queue' }
      );
    await new Promise((resolve, reject) => {
      const item = {
        resolve: () => {
          cleanup();
          this.active++;
          resolve();
        },
      };
      const fail = () => {
        this.queue = this.queue.filter((q) => q !== item);
        cleanup();
        reject(
          signal?.aborted
            ? signal.reason
            : Object.assign(
                new Error(
                  'Waktu antrean AI habis. Permintaan dapat dicoba lagi.'
                ),
                {
                  status: 429,
                  code: 'AI_QUEUE_TIMEOUT',
                  stage: 'provider-queue',
                }
              )
        );
      };
      const timer = setTimeout(fail, waitMs),
        cleanup = () => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', fail);
        };
      signal?.addEventListener('abort', fail, { once: true });
      this.queue.push(item);
    });
  }
  release() {
    this.active--;
    this.queue.shift()?.resolve();
  }
  checkGates(stage) {
    const now = this.now();
    if (this.authUntil > now)
      throw providerFailureError({kind:'authentication', retryable:false}, stage, this.authUntil);
    if (this.quotaUntil > now)
      throw providerFailureError(this.quotaFailure, stage, this.quotaUntil);
  }
  async execute({
    stage,
    invoke,
    signal,
    timeoutMs = 40000,
    attemptTimeoutMs = 20000,
  }) {
    const started = this.now();
    await this.slot(signal, Math.min(5000, timeoutMs));
    try {
      signal?.throwIfAborted();
      const now = this.now();
      this.checkGates(stage);
      const candidates = this.candidates(stage);
      if (!candidates.length)
        throw providerFailureError({kind:'model-unavailable', retryable:false}, stage);
      const models = candidates.filter(model => (this.circuits.get(model)?.until || 0) <= now);
      if (!models.length) {
        const first = candidates.map(model => this.circuits.get(model)).sort((a,b) => a.until-b.until)[0];
        throw providerFailureError(first, stage, first.until);
      }
      const result = await runProviderRequest({
        models,
        timeoutMs: Math.max(1, timeoutMs - (this.now() - started)),
        attemptTimeoutMs,
        signal,
        now: this.now,
        invoke: (model, remaining, providerSignal) => {
          this.checkGates(stage);
          const circuit = this.circuits.get(model);
          if (circuit?.until > this.now()) throw providerFailureError(circuit, stage, circuit.until);
          return invoke(model, remaining, providerSignal);
        },
        onFailure: (model, error) => {
          // Another request may have opened a circuit during this request's backoff.
          if (error?.failureKind && error?.retryAt) return 1;
          const failure = classifyAiFailure(error, this.now());
          const failures = (this.circuits.get(model)?.failures || 0) + 1;
          const cooldown = Math.max(failure.retryDelayMs,
            Math.min(900000, failure.cooldownMs * 2 ** Math.min(failures - 1, 5)));
          if (failure.kind === 'authentication') this.authUntil = this.now() + failure.cooldownMs;
          else if (['daily-quota', 'rate-limit'].includes(failure.kind)) {
            this.quotaUntil = this.now() + failure.cooldownMs;
            this.quotaFailure = failure;
          } else if (failure.cooldownMs)
            this.circuits.set(model, {...failure, failures, until:this.now() + cooldown});
          return failures;
        },
      });
      this.circuits.delete(result.model);
      return {
        ...result,
        fallbackUsed:
          stage !== 'speech' && result.model !== this.config.primary,
      };
    } catch (error) {
      if (signal?.aborted) throw providerFailureError({kind:'cancelled', retryable:false}, stage);
      if (error?.code && error?.stage) throw error;
      const failure = classifyAiFailure(error, this.now());
      const deadlines = this.candidates(stage).map(model => this.circuits.get(model)?.until).filter(until => until > this.now());
      const retryAt = this.quotaUntil > this.now() ? this.quotaUntil
        : failure.kind === 'authentication' ? this.authUntil
        : failure.retryable && deadlines.length ? Math.min(...deadlines) : undefined;
      throw providerFailureError(failure, stage, retryAt);
    } finally {
      this.release();
    }
  }
  async run(options) {
    if (!options.key) return this.execute(options);
    options.signal?.throwIfAborted();
    const requestKey = JSON.stringify([options.scope || '', options.stage, options.key]);
    const now = this.now();
    for (const [key, value] of this.completed)
      if (value.until <= now) this.completed.delete(key);
    const cached = this.completed.get(requestKey);
    if (cached) return { ...cached.result, cacheHit: true };
    options.signal?.throwIfAborted();
    let pending = this.pending.get(requestKey);
    if (!pending || pending.controller.signal.aborted) {
      const controller = new AbortController();
      pending = { controller, users: 0, scope: options.scope };
      pending.promise = this.execute({ ...options, signal: controller.signal })
        .then((result) => {
          controller.signal.throwIfAborted();
          if (options.cacheSuccess) {
            this.completed.set(requestKey, {
              result,
              scope: options.scope,
              until: this.now() + 60000,
            });
            while (this.completed.size > 40)
              this.completed.delete(this.completed.keys().next().value);
          }
          return result;
        })
        .finally(() => { if (this.pending.get(requestKey) === pending) this.pending.delete(requestKey); });
      this.pending.set(requestKey, pending);
    }
    pending.users++;
    let abort;
    const cancelled = new Promise((_, reject) => {
      abort = () => reject(options.signal.reason);
      options.signal?.addEventListener('abort', abort, { once: true });
    });
    try {
      return await Promise.race([pending.promise, cancelled]);
    } finally {
      options.signal?.removeEventListener('abort', abort);
      if (--pending.users === 0 && this.pending.get(requestKey) === pending)
        pending.controller.abort(new Error('No active request consumers'));
    }
  }
}
