import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { preprocessOcrImage } from './ocr-preprocess.js';
const execute = promisify(execFile);
export async function pdfPageCount(buffer, signal) {
  const directory = await mkdtemp(path.join(tmpdir(), 'omnilearn-info-'));
  try {
    const input = path.join(directory, 'source.pdf');
    await writeFile(input, buffer, {mode:0o600});
    const {stdout} = await execute('pdfinfo', [input], {timeout:10000, maxBuffer:65536, signal});
    const count = Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
    if (!Number.isInteger(count) || count < 1 || count > 10000) throw new Error('Unknown page count');
    return count;
  } finally { await rm(directory, {recursive:true,force:true}); }
}
export async function pdfOcrImages(buffer, pages, signal) {
  if (
    !Array.isArray(pages) ||
    !pages.length ||
    pages.length > 4 ||
    pages.some((p) => !Number.isInteger(p) || p < 1 || p > 10000)
  )
    throw new Error('OCR page range is invalid.');
  const directory = await mkdtemp(path.join(tmpdir(), 'omnilearn-ocr-'));
  try {
    const input = path.join(directory, 'source.pdf');
    await writeFile(input, buffer, { mode: 0o600 });
    const output = [];
    for (const page of pages) {
      signal?.throwIfAborted();
      const prefix = path.join(directory, `page-${page}`);
      await execute(
        'pdftoppm',
        [
          '-f',
          String(page),
          '-l',
          String(page),
          '-singlefile',
          '-scale-to',
          '2200',
          '-png',
          input,
          prefix,
        ],
        { timeout: 12000, maxBuffer: 65536, windowsHide: true, signal }
      );
      const image = await preprocessOcrImage(await readFile(prefix + '.png'), {
        denoise: process.env.OCR_DENOISE === 'true',
      });
      output.push({ page, ...image });
    }
    return output;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
export function pageExtractionQuality(pageTexts, scannedPages = []) {
  const seen = new Map();
  return pageTexts.map((text, index) => {
    const normalized = String(text || '')
        .replace(/\[(?:Halaman|Page)\s+\d+\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim(),
      flags = [];
    if (normalized.replace(/\s/g, '').length < 20)
      flags.push('sparse-or-unreadable');
    if (/\[unclear\]|tidak terbaca|unreadable|�/i.test(normalized))
      flags.push('uncertain-text');
    if (normalized.length > 60 && seen.has(normalized))
      flags.push('possible-duplicate');
    else if (normalized) seen.set(normalized, index + 1);
    return {
      page: index + 1,
      method: scannedPages.includes(index + 1) ? 'ocr' : 'native-text',
      status: flags.length ? 'review-needed' : 'text-present',
      flags,
      ocrConfidence: null,
    };
  });
}
