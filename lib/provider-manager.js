import { runProviderRequest } from './provider-request.js';
export function classifyAiFailure(error, now = Date.now()) {
  const message = String(error?.message || ''),
    status = Number(error?.status),
    retry = message.match(/retryDelay[^\d]*(\d+(?:\.\d+)?)s/);
  if (
    [401, 403].includes(status) ||
    /API_KEY_INVALID|API key not valid|UNAUTHENTICATED/i.test(message)
  )
    return { kind: 'authentication', retryable: false, cooldownMs: 60000 };
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(message)) {
    const daily = /PerDay|requests per day|per day limit|daily quota/i.test(
      message
    );
    return {
      kind: daily ? 'daily-quota' : 'rate-limit',
      retryable: true,
      cooldownMs: Math.max(
        1000,
        Math.min(
          86400000,
          retry ? Number(retry[1]) * 1000 : daily ? 3600000 : 60000
        )
      ),
    };
  }
  if (status === 404)
    return { kind: 'model-unavailable', retryable: true, cooldownMs: 300000 };
  if (status === 504 || /timeout|DEADLINE_EXCEEDED/i.test(message))
    return { kind: 'timeout', retryable: true, cooldownMs: 30000 };
  if (
    status === 503 ||
    /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|socket hang up/i.test(message)
  )
    return {
      kind: 'network-or-unavailable',
      retryable: true,
      cooldownMs: 15000,
    };
  return { kind: 'invalid-or-provider-error', retryable: false, cooldownMs: 0 };
}
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
    this.pending = new Map();
    this.completed = new Map();
  }
  candidates(stage) {
    const { primary, fallback, multimodalFallback, speech } = this.config;
    return stage === 'speech'
      ? [speech]
      : [
          ...new Set(
            [
              primary,
              /(?:pdf|image|media)/.test(stage) ? multimodalFallback : fallback,
            ].filter(Boolean)
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
          state:
            (this.circuits.get(model)?.until || 0) > now
              ? 'cooldown'
              : 'available-to-attempt',
          retryAt: this.circuits.get(model)?.until || null,
          reason: this.circuits.get(model)?.kind || null,
        })
      ),
      active: this.active,
      queued: this.queue.length,
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
      if (this.authUntil > now)
        throw Object.assign(
          new Error(
            'Autentikasi Gemini bermasalah. Periksa secret server; permintaan disimpan untuk dicoba kembali.'
          ),
          { status: 500, code: 'GEMINI_AUTH_ERROR', stage }
        );
      const models = this.candidates(stage).filter(
        (model) => (this.circuits.get(model)?.until || 0) <= now
      );
      if (!models.length) {
        const retryAt = Math.min(
          ...this.candidates(stage).map(
            (model) => this.circuits.get(model)?.until || now + 60000
          )
        );
        throw Object.assign(
          new Error(
            'Semua model yang dikonfigurasi sedang dibatasi atau belum tersedia. Coba kembali setelah jeda.'
          ),
          { status: 429, code: 'AI_DEFERRED', stage, retryAt }
        );
      }
      const result = await runProviderRequest({
        models,
        timeoutMs: Math.max(1, timeoutMs - (this.now() - started)),
        attemptTimeoutMs,
        signal,
        invoke: async (model, remaining, providerSignal) => {
          try {
            return await invoke(model, remaining, providerSignal);
          } catch (error) {
            const failure = classifyAiFailure(error, this.now());
            if (
              failure.kind === 'network-or-unavailable' &&
              !Number(error.status)
            )
              error.status = 503;
            throw error;
          }
        },
        onFailure: (model, error) => {
          const failure = classifyAiFailure(error, this.now());
          if (failure.kind === 'authentication')
            this.authUntil = this.now() + failure.cooldownMs;
          else if (failure.cooldownMs)
            this.circuits.set(model, {
              until: this.now() + failure.cooldownMs,
              kind: failure.kind,
            });
        },
      });
      this.circuits.delete(result.model);
      return {
        ...result,
        fallbackUsed:
          stage !== 'speech' && result.model !== this.config.primary,
      };
    } catch (error) {
      const models = this.candidates(stage);
      if (
        classifyAiFailure(error, this.now()).retryable &&
        models.every(
          (model) => (this.circuits.get(model)?.until || 0) > this.now()
        )
      )
        throw Object.assign(
          new Error(
            'Kuota atau layanan model belum tersedia. Permintaan dapat dicoba kembali setelah jeda.'
          ),
          {
            status: 429,
            code: 'AI_DEFERRED',
            stage,
            retryAt: Math.min(
              ...models.map((model) => this.circuits.get(model).until)
            ),
          }
        );
      throw error;
    } finally {
      this.release();
    }
  }
  async run(options) {
    if (!options.key) return this.execute(options);
    const now = this.now();
    for (const [key, value] of this.completed)
      if (value.until <= now) this.completed.delete(key);
    const cached = this.completed.get(options.key);
    if (cached) return { ...cached.result, cacheHit: true };
    options.signal?.throwIfAborted();
    let pending = this.pending.get(options.key);
    if (!pending) {
      const controller = new AbortController();
      pending = { controller, users: 0, scope: options.scope };
      pending.promise = this.execute({ ...options, signal: controller.signal })
        .then((result) => {
          if (options.cacheSuccess) {
            this.completed.set(options.key, {
              result,
              scope: options.scope,
              until: this.now() + 60000,
            });
            while (this.completed.size > 40)
              this.completed.delete(this.completed.keys().next().value);
          }
          return result;
        })
        .finally(() => this.pending.delete(options.key));
      this.pending.set(options.key, pending);
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
      if (--pending.users === 0 && this.pending.get(options.key) === pending)
        pending.controller.abort(new Error('No active request consumers'));
    }
  }
}
