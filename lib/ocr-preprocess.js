import sharp from 'sharp';
sharp.cache({ memory: 32, files: 0, items: 32 });
sharp.concurrency(1);
export function estimateSkew({ data, width, height }) {
  const points = [];
  for (let y = 0; y < height; y += 2)
    for (let x = 0; x < width; x += 2)
      if (data[y * width + x] < 100)
        points.push([x - width / 2, y - height / 2]);
  if (points.length < 150 || points.length > width * height * 0.35)
    return { angle: 0, status: 'insufficient-text-like-pixels' };
  function score(angle) {
    const rad = (angle * Math.PI) / 180,
      rows = new Float64Array(height + width + 4),
      offset = (height + width) / 2;
    for (const [x, y] of points) {
      const row = Math.round(Math.sin(rad) * x + Math.cos(rad) * y + offset);
      if (row >= 0 && row < rows.length) rows[row]++;
    }
    let total = 0;
    for (const count of rows) total += count * count;
    return total;
  }
  const baseline = score(0);
  let best = baseline,
    angle = 0;
  for (let candidate = -6; candidate <= 6; candidate += 0.5) {
    const current = score(candidate);
    if (current > best) {
      best = current;
      angle = candidate;
    }
  }
  return best > baseline * 1.08 && Math.abs(angle) >= 0.5
    ? { angle, status: 'projection-estimate' }
    : { angle: 0, status: 'no-clear-skew' };
}
export async function preprocessOcrImage(buffer, { denoise = false } = {}) {
  const original = await sharp(buffer, {
    limitInputPixels: 40000000,
    failOn: 'error',
  }).metadata();
  const oriented = await sharp(buffer, {
    limitInputPixels: 40000000,
    failOn: 'error',
  })
    .rotate()
    .flatten({ background: '#ffffff' })
    .resize({
      width: 3000,
      height: 3000,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();
  const sample = await sharp(oriented)
    .resize({
      width: 512,
      height: 768,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const skew = estimateSkew({
    data: sample.data,
    width: sample.info.width,
    height: sample.info.height,
  });
  let pipeline = sharp(oriented)
    .rotate(skew.angle, { background: '#ffffff' })
    .normalize();
  if (denoise) pipeline = pipeline.median(3);
  const output = await pipeline.png({ compressionLevel: 9 }).toBuffer();
  if (output.length > 15 * 1024 * 1024)
    return {
      buffer,
      mimeType: original.format === 'jpeg' ? 'image/jpeg' : 'image/png',
      preprocessing: {
        status: 'original-retained',
        reason: 'processed-image-too-large',
        ocrConfidence: null,
      },
    };
  return {
    buffer: output,
    mimeType: 'image/png',
    preprocessing: {
      status: 'preprocessed',
      orientation:
        original.orientation && original.orientation !== 1
          ? 'exif-corrected'
          : 'unchanged',
      deskewDegrees: skew.angle,
      deskewMethod: skew.status,
      denoised: denoise,
      contrast: 'normalized',
      resolutionBound: 3000,
      ocrConfidence: null,
      confidenceNote:
        'Gemini does not supply calibrated OCR confidence. Deskew is a pixel projection estimate, not an OCR confidence score.',
    },
  };
}
