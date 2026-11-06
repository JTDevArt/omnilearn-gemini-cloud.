export const MEDIA_TYPES = Object.freeze({
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm'
});

function isWebm(buffer) {
  if (buffer.length < 12 || buffer.readUInt32BE(0) !== 0x1a45dfa3) return false;
  // The EBML DocType identifies WebM; a Matroska file shares the same magic.
  const header = buffer.subarray(4, Math.min(buffer.length, 4096));
  const offset = header.indexOf(Buffer.from([0x42, 0x82]));
  if (offset < 0 || offset + 3 >= header.length) return false;
  const first = header[offset + 2];
  let width = 1;
  while (width <= 8 && !(first & (0x80 >> (width - 1)))) width++;
  if (width > 8 || offset + 2 + width > header.length) return false;
  let length = first & (0xff >> width);
  for (let index = 1; index < width; index++) length = length * 256 + header[offset + 2 + index];
  return length === 4 && header.subarray(offset + 2 + width, offset + 6 + width).toString('ascii') === 'webm';
}

function isMp4Container(buffer, extension) {
  if (buffer.length < 12 || buffer.toString('ascii', 4, 8) !== 'ftyp') return false;
  const brand = buffer.toString('latin1', 8, 12);
  // Reject image containers (AVIF/HEIC), despite their shared ISO BMFF signature.
  const brands = extension === '.m4a'
    ? ['M4A ', 'M4B ', 'isom', 'iso2', 'mp41', 'mp42', 'dash']
    : ['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'M4V ', 'M4VH', 'M4VP', 'qt  ', 'dash', 'MSNV'];
  return brands.includes(brand);
}

export function validateMedia(buffer, extension, mimeHint = '') {
  const mime = MEDIA_TYPES[extension];
  if (!mime) return null;
  const bytes = Buffer.isBuffer(buffer) ? buffer : Buffer.alloc(0);
  const ascii = bytes.subarray(0, 64).toString('latin1');
  const valid = extension === '.wav' ? ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE'
    : extension === '.mp3' ? ascii.startsWith('ID3') || (bytes[0] === 255 && (bytes[1] & 224) === 224)
    : extension === '.webm' ? isWebm(bytes) : isMp4Container(bytes, extension);
  if (!valid) throw Object.assign(new Error('Isi file tidak sesuai format audio/video yang dipilih.'), { status: 415, code: 'INVALID_MEDIA', stage: 'media-validate' });
  if (extension === '.webm' && String(mimeHint).split(';')[0].trim().toLowerCase() === 'audio/webm') return 'audio/webm';
  return mime;
}
