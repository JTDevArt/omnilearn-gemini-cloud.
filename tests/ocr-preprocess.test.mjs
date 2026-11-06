import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { preprocessOcrImage, estimateSkew } from '../lib/ocr-preprocess.js';
import { pageExtractionQuality } from '../lib/pdf-preprocess.js';
test('image preprocessing respects resolution limits, rotates EXIF and reports no invented OCR confidence', async () => {
  const input = await sharp({
    create: { width: 80, height: 120, channels: 3, background: '#fff' },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer();
  const result = await preprocessOcrImage(input);
  const metadata = await sharp(result.buffer).metadata();
  assert.equal(metadata.width, 120);
  assert.equal(metadata.height, 80);
  assert.equal(result.preprocessing.orientation, 'exif-corrected');
  assert.equal(result.preprocessing.ocrConfidence, null);
});
test('projection skew estimation finds a tilted text-like line pattern', () => {
  const width = 220,
    height = 160,
    data = new Uint8Array(width * height).fill(255);
  for (let line = 25; line < 135; line += 20)
    for (let x = 20; x < 200; x++)
      if (x % 15 < 11) {
        const y = Math.round(line + Math.tan((3 * Math.PI) / 180) * x);
        data[y * width + x] = 0;
        data[(y + 1) * width + x] = 0;
      }
  const result = estimateSkew({ data, width, height });
  assert.ok(Math.abs(result.angle + 3) <= 1, JSON.stringify(result));
});
test('page quality flags sparse, uncertain and repeated text without numerical confidence', () => {
  const repeated =
    'A real page containing enough meaningful text to distinguish repeated extraction from a short heading.';
  const quality = pageExtractionQuality(
    [
      '[Halaman 1] ' + repeated,
      '[Halaman 2] ' + repeated,
      '[Halaman 3] [unclear]',
    ],
    [3]
  );
  assert.ok(quality[1].flags.includes('possible-duplicate'));
  assert.ok(quality[2].flags.includes('uncertain-text'));
  assert.equal(quality[2].ocrConfidence, null);
});
