export function parseOcrPagesMap(output, targetPages) {
  const text = String(output || '').trim(), result = new Map();
  const matches = [...text.matchAll(/\[(?:Halaman|Page)\s+(\d+)\]\s*([\s\S]*?)(?=\[(?:Halaman|Page)\s+\d+\]|$)/gi)];
  for (const match of matches) {
    const page = Number(match[1]);
    if (!targetPages.includes(page) || result.has(page))
      throw Object.assign(new Error('OCR mengembalikan nomor halaman di luar permintaan atau berulang.'), {status:422,code:'INVALID_OCR_OUTPUT',stage:'pdf-ocr'});
    if (match[2].trim()) result.set(page, match[2].trim());
  }
  if (!matches.length && targetPages.length === 1 && text) result.set(targetPages[0], text);
  return result;
}
