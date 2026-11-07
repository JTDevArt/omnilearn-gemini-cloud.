// Interpret SDK/HTTP errors once. Never expose raw provider messages or details.
export function classifyAiFailure(error, now = Date.now()) {
  if (error?.failureKind && Object.hasOwn(messages, error.failureKind)) {
    const delay = Math.max(0, (error.retryAt || 0) - now);
    return {kind:error.failureKind, retryable:error.retryable === true, canFallback:false, retryDelayMs:delay, cooldownMs:delay};
  }
  let payload = error?.error || error;
  try { const parsed = JSON.parse(error?.message); payload = parsed.error || parsed; } catch {}
  const message = `${error?.message || ''} ${payload?.message || ''} ${JSON.stringify(payload?.details || error?.details || [])}`;
  const status = Number(error?.status || payload?.code);
  const details = payload?.details || error?.details || [];
  const duration = Array.isArray(details) && details.find(d => /RetryInfo$/.test(d?.['@type'] || ''))?.retryDelay;
  let retryMs = typeof duration === 'object' && duration
    ? Number(duration.seconds || 0) * 1000 + Number(duration.nanos || 0) / 1e6
    : Number(String(duration || '').replace(/s$/, '')) * 1000;
  const legacyDelay = message.match(/retryDelay[^\d]*(\d+(?:\.\d+)?)s/);
  if (legacyDelay) retryMs = Math.max(retryMs || 0, Number(legacyDelay[1]) * 1000);
  const headers = error?.headers || error?.response?.headers;
  const header = headers?.get?.('retry-after') ?? headers?.['retry-after'];
  if (header !== undefined && header !== null) {
    const delay = /^\d+(\.\d+)?$/.test(String(header)) ? Number(header) * 1000 : Date.parse(header) - now;
    if (Number.isFinite(delay)) retryMs = Math.max(retryMs || 0, delay);
  }
  retryMs = Number.isFinite(retryMs) && retryMs > 0 ? Math.ceil(retryMs) : 0;
  const result = (kind, retryable, cooldownMs = 0, canFallback = false) => ({
    kind, retryable, canFallback, retryDelayMs: retryMs,
    cooldownMs: Math.max(cooldownMs, retryMs),
  });
  if (status === 504 || /DEADLINE_EXCEEDED|ETIMEDOUT|HeadersTimeoutError|timeout/i.test(message))
    return result('timeout', true, 30000, true);
  if (error?.name === 'AbortError' || error?.isCancelled || status === 499 || /^(?:Request cancelled|Cancelled|Session cleared|No active .*consumers)/i.test(error?.message || ''))
    return result('cancelled', false);
  if (error?.code === 'MISSING_SECRET' || [401,403].includes(status) || /API_KEY_INVALID|API key not valid|UNAUTHENTICATED|PERMISSION_DENIED/i.test(message))
    return result('authentication', false, 60000);
  if (status === 429 || /RESOURCE_EXHAUSTED/i.test(message)) {
    const daily = /PerDay|requests per day|per day limit|daily (?:quota|limit)/i.test(message);
    // Quotas may be project-wide. Do not switch models to evade a limit.
    return result(daily ? 'daily-quota' : 'rate-limit', true, retryMs || (daily ? 3600000 : 60000));
  }
  if (status === 404 || /MODEL_INCOMPATIBLE/.test(error?.code || '') || (status === 400 && /not supported for generateContent|model.*not (?:found|supported)/i.test(message)))
    return result('model-unavailable', true, 300000, true);
  if (/ECONNRESET|ENOTFOUND|EAI_AGAIN|fetch failed|socket hang up|network error/i.test(message) || /ECONNRESET|ENOTFOUND|EAI_AGAIN/.test(error?.cause?.code || ''))
    return result('network', true, 15000, true);
  if ([500,502,503].includes(status)) return result('unavailable', true, 15000, true);
  if (/SAFETY|blocked/i.test(message)) return result('safety', false);
  if (status === 422 || /INVALID_(?:BLUEPRINT|AI_OUTPUT)|OUTPUT_TRUNCATED|EMPTY_AI_RESPONSE/.test(error?.code || ''))
    return result('invalid-response', false);
  if (status === 400) return result('invalid-request', false);
  return result('provider-error', false);
}

const messages = {
  authentication: [500, 'GEMINI_AUTH_ERROR', 'Autentikasi Gemini gagal. Periksa kunci API dan izin model di server.'],
  'daily-quota': [429, 'GEMINI_DAILY_QUOTA', 'Kuota harian Gemini tercapai. Tunggu hingga kuota tersedia kembali.'],
  'rate-limit': [429, 'GEMINI_RATE_LIMIT', 'Batas laju Gemini tercapai. Coba kembali setelah jeda yang ditampilkan.'],
  'model-unavailable': [503, 'GEMINI_MODEL_UNAVAILABLE', 'Model Gemini yang dikonfigurasi tidak tersedia atau tidak mendukung tugas ini.'],
  network: [503, 'GEMINI_NETWORK_ERROR', 'Koneksi server ke Gemini terputus. Materi tetap tersimpan; coba kembali setelah jeda.'],
  unavailable: [503, 'GEMINI_UNAVAILABLE', 'Layanan Gemini sementara tidak tersedia. Coba kembali setelah jeda.'],
  timeout: [504, 'GEMINI_TIMEOUT', 'Waktu pemrosesan Gemini habis. Materi tetap tersimpan; coba kembali setelah jeda.'],
  cancelled: [499, 'REQUEST_CANCELLED', 'Permintaan dibatalkan.'],
  safety: [422, 'GEMINI_SAFETY_BLOCKED', 'Gemini tidak dapat memproses permintaan ini karena kebijakan konten.'],
  'invalid-response': [422, 'INVALID_AI_OUTPUT', 'Hasil Gemini kosong atau tidak valid. Hasil belum disimpan; coba permintaan baru.'],
  'invalid-request': [400, 'GEMINI_INVALID_REQUEST', 'Gemini menolak parameter permintaan. Periksa format atau konfigurasi tugas.'],
  'provider-error': [502, 'GEMINI_ERROR', 'Gemini gagal memproses permintaan. Materi tetap tersimpan.'],
};
export function providerFailureError(failure, stage, retryAt) {
  const [status, code, message] = messages[failure.kind] || messages['provider-error'];
  return Object.assign(new Error(message), {status, code, stage, failureKind:failure.kind,
    retryable:failure.retryable, ...(Number.isFinite(retryAt) ? {retryAt} : {}),
    ...(failure.kind === 'cancelled' ? {isCancelled:true} : {})});
}
