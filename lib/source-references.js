// This validates page identifiers, not whether a citation entails a generated claim.
export function validateSourceReferences(output, source, stage = 'source-references') {
  const pages = text => [...String(text || '').matchAll(/\[(?:Halaman|Page)\s+(\d+)\]/gi)].map(m => Number(m[1]));
  const allowed = new Set(pages(source));
  if (pages(output).some(page => !allowed.has(page)))
    throw Object.assign(new Error('Rujukan halaman hasil AI tidak ada dalam konteks sumber. Hasil belum disimpan.'), {
      status:422, code:'INVALID_AI_OUTPUT', stage, failureKind:'invalid-response', retryable:false,
    });
  return output;
}
