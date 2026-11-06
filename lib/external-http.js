export const integrationError = (
  message,
  code = 'INTEGRATION_UNAVAILABLE',
  status = 503
) => Object.assign(new Error(message), { status, code, stage: 'integration' });
export async function boundedFetch(
  url,
  {
    fetcher = fetch,
    signal,
    maxBytes = 2 * 1024 * 1024,
    timeoutMs = 15000,
    ...options
  } = {}
) {
  let response;
  try {
    response = await fetcher(url, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.any([
        AbortSignal.timeout(timeoutMs),
        ...(signal ? [signal] : []),
      ]),
    });
  } catch {
    throw integrationError(
      'Layanan eksternal tidak dapat dihubungi. Coba lagi nanti.',
      'UPSTREAM_NETWORK'
    );
  }
  if (Number(response.headers.get('content-length')) > maxBytes)
    throw integrationError(
      'Respons layanan terlalu besar.',
      'UPSTREAM_TOO_LARGE',
      413
    );
  const reader = response.body?.getReader();
  if (!reader)
    throw integrationError('Respons layanan kosong.', 'UPSTREAM_EMPTY');
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw integrationError(
          'Respons layanan terlalu besar.',
          'UPSTREAM_TOO_LARGE',
          413
        );
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error.code) throw error;
    throw integrationError('Respons layanan terputus.', 'UPSTREAM_NETWORK');
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  const text = new TextDecoder().decode(bytes);
  return {
    status: response.status,
    ok: response.ok,
    text,
    headers: response.headers,
    json() {
      try {
        return JSON.parse(text);
      } catch {
        throw integrationError(
          'Format respons layanan tidak valid.',
          'UPSTREAM_INVALID_RESPONSE',
          502
        );
      }
    },
  };
}
