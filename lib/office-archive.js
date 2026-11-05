import JSZip from 'jszip';
const MAX_EXPANDED = 30 * 1024 * 1024;
function invalid() { return Object.assign(new Error('Arsip dokumen rusak atau terlalu besar setelah dibuka.'), { status: 413, code: 'ARCHIVE_LIMIT', stage: 'office-validate' }); }
export async function loadOfficeArchive(buffer) {
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) throw invalid();
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.values(zip.files).filter(file => !file.dir);
  if (files.length > 2000) throw invalid();
  let declared = 0, expanded = 0;
  for (const file of files) {
    declared += file._data?.uncompressedSize || 0;
    if (declared > MAX_EXPANDED) throw invalid();
  }
  for (const file of files) {
    await new Promise((resolve, reject) => {
      const stream = file.nodeStream('nodebuffer');
      stream.on('data', chunk => { expanded += chunk.length; if (expanded > MAX_EXPANDED) stream.destroy(invalid()); });
      stream.on('error', reject); stream.on('end', resolve);
    });
  }
  return zip;
}
