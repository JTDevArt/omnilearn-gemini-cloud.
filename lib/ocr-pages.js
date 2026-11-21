export function isBlankOcrPage(text) {
  return /^\[(?:blank(?: page)?|halaman kosong)\]$/i.test(String(text || '').trim());
}

export function hasReadableOcrText(text) {
  return /[\p{L}\p{N}]/u.test(String(text || '')
    .replace(/\[(?:Halaman|Page)\s+\d+\]/gi, '')
    .replace(/\[(?:blank(?: page)?|unreadable(?: page)?|unclear|halaman kosong(?: atau teks tidak terbaca)?)\]/gi, ''));
}

export function parseOcrPagesMap(output, targetPages, { allowUnmarkedSingle = true } = {}) {
  const text = String(output || '').trim(), result = new Map();
  const seenPages = new Set();
  const matches = [...text.matchAll(/\[(?:Halaman|Page)\s+(\d+)\]\s*([\s\S]*?)(?=\[(?:Halaman|Page)\s+\d+\]|$)/gi)];
  for (const match of matches) {
    const page = Number(match[1]);
    if (!targetPages.includes(page) || seenPages.has(page))
      throw Object.assign(new Error('OCR mengembalikan nomor halaman di luar permintaan atau berulang.'), {status:422,code:'INVALID_OCR_OUTPUT',stage:'pdf-ocr'});
    seenPages.add(page);
    if (match[2].trim()) result.set(page, match[2].trim());
  }
  if (allowUnmarkedSingle && !matches.length && targetPages.length === 1 && text) result.set(targetPages[0], text);
  return result;
}
