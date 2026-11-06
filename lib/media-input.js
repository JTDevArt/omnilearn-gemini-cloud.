export const MEDIA_TYPES = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.mov': 'video/quicktime' };
export function validateMedia(buffer, extension) {
  const mime = MEDIA_TYPES[extension];
  if (!mime) return null;
  const ascii = buffer.subarray(0, 64).toString('latin1');
  const valid = extension === '.wav' ? ascii.startsWith('RIFF') && ascii.slice(8,12) === 'WAVE'
    : extension === '.mp3' ? ascii.startsWith('ID3') || (buffer[0] === 255 && (buffer[1] & 224) === 224)
    : ascii.slice(4,8) === 'ftyp';
  if (!valid) throw Object.assign(new Error('Isi file tidak sesuai format audio/video yang dipilih.'), { status: 415, code: 'INVALID_MEDIA', stage: 'media-validate' });
  return mime;
}
