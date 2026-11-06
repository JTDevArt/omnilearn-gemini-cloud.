import path from 'node:path';
import { loadOfficeArchive } from './office-archive.js';

export const IMAGE_TYPES = Object.freeze({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' });
const MAX_IMAGE_PIXELS = 40_000_000;
const MAX_SHEETS = 2000;
const MAX_EXTRACTED_CHARACTERS = 30 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function imageError() {
  return Object.assign(new Error('Isi gambar rusak, terlalu besar, atau tidak sesuai format PNG/JPG.'), { status: 415, code: 'INVALID_IMAGE', stage: 'image-validate' });
}

function validDimensions(width, height) {
  return width > 0 && height > 0 && width <= 20_000 && height <= 20_000 && width * height <= MAX_IMAGE_PIXELS;
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff || buffer.lastIndexOf(Buffer.from([0xff, 0xd9])) < 0) return null;
  let offset = 2;
  while (offset + 4 <= buffer.length) {
    if (buffer[offset++] !== 0xff) return null;
    while (buffer[offset] === 0xff) offset++;
    const marker = buffer[offset++];
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) return null;
    const length = buffer.readUInt16BE(offset);
    if (length < 2 || offset + length > buffer.length) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      if (length < 8) return null;
      return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += length;
  }
  return null;
}

export function validateImage(buffer, extension) {
  const mime = IMAGE_TYPES[extension];
  if (!mime) return null;
  if (!Buffer.isBuffer(buffer)) throw imageError();
  let dimensions;
  if (extension === '.png') {
    if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE) || buffer.readUInt32BE(8) !== 13 || buffer.toString('ascii', 12, 16) !== 'IHDR') throw imageError();
    dimensions = { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } else dimensions = jpegDimensions(buffer);
  if (!dimensions || !validDimensions(dimensions.width, dimensions.height)) throw imageError();
  return mime;
}

function xlsxError(message = 'File XLSX rusak, terenkripsi, atau tidak dapat dibaca.') {
  return Object.assign(new Error(message), { status: 422, code: 'INVALID_XLSX', stage: 'xlsx-extract' });
}

function decodeXml(value) {
  return String(value).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code) => {
    if (code[0] !== '#') return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[code.toLowerCase()];
    const point = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    if (point < 1 || point > 0x10ffff || (point >= 0xd800 && point <= 0xdfff)) throw xlsxError('Entitas XML dalam XLSX tidak valid.');
    return String.fromCodePoint(point);
  });
}

function attributes(source) {
  const values = Object.create(null);
  for (const match of source.matchAll(/([\w:.-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) values[match[1]] = decodeXml(match[3]);
  return values;
}

function textRuns(xml) {
  return [...xml.matchAll(/<(?:\w+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?t\s*>/g)].map(match => decodeXml(match[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')))).join('');
}

function assertWellFormedXml(xml) {
  const stack = [];
  let offset = 0;
  let roots = 0;
  while (offset < xml.length) {
    const start = xml.indexOf('<', offset);
    if (start < 0) {
      if (!stack.length && xml.slice(offset).trim()) throw xlsxError('Struktur XML dalam XLSX tidak valid.');
      break;
    }
    if (!stack.length && xml.slice(offset, start).trim()) throw xlsxError('Struktur XML dalam XLSX tidak valid.');
    const special = xml.startsWith('<!--', start) ? ['-->', 4] : xml.startsWith('<?', start) ? ['?>', 2] : xml.startsWith('<![CDATA[', start) ? [']]>', 9] : null;
    if (special) {
      const end = xml.indexOf(special[0], start + special[1]);
      if (end < 0 || (special[1] === 9 && !stack.length)) throw xlsxError('Struktur XML dalam XLSX tidak valid.');
      offset = end + special[0].length;
      continue;
    }
    let end = start + 1;
    let quote = '';
    for (; end < xml.length; end++) {
      const char = xml[end];
      if (quote) { if (char === quote) quote = ''; }
      else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
      else if (char === '<') throw xlsxError('Struktur XML dalam XLSX tidak valid.');
    }
    if (end === xml.length) throw xlsxError('Struktur XML dalam XLSX tidak valid.');
    const token = xml.slice(start, end + 1);
    const name = token.match(/^<\/?([A-Za-z_][\w:.-]*)(?=\s|\/?\s*>)/)?.[1];
    if (!name) throw xlsxError('Struktur XML dalam XLSX tidak valid.');
    if (token.startsWith('</')) {
      if (stack.pop() !== name || !new RegExp(`^</${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*>$`).test(token)) throw xlsxError('Struktur XML dalam XLSX tidak valid.');
    } else {
      if (!stack.length && ++roots > 1) throw xlsxError('Struktur XML dalam XLSX tidak valid.');
      if (!/\/\s*>$/.test(token)) {
        stack.push(name);
        if (stack.length > 100) throw xlsxError('Struktur XML dalam XLSX terlalu dalam.');
      }
    }
    offset = end + 1;
  }
  if (stack.length || !roots) throw xlsxError('Struktur XML dalam XLSX tidak valid.');
}

function rejectEncryptedZip(buffer) {
  // Inspect both ZIP header copies; inconsistent flags must not bypass JSZip's check.
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0 || end + 22 > buffer.length) throw xlsxError();
  const count = buffer.readUInt16LE(end + 10);
  const directorySize = buffer.readUInt32LE(end + 12);
  let offset = buffer.readUInt32LE(end + 16);
  if (count === 0xffff || offset + directorySize > end) throw xlsxError();
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50) throw xlsxError();
    const flags = buffer.readUInt16LE(offset + 8);
    const local = buffer.readUInt32LE(offset + 42);
    if ((flags & 0x2041) || local + 30 > end || buffer.readUInt32LE(local) !== 0x04034b50 || (buffer.readUInt16LE(local + 6) & 0x2041)) throw xlsxError();
    offset += 46 + buffer.readUInt16LE(offset + 28) + buffer.readUInt16LE(offset + 30) + buffer.readUInt16LE(offset + 32);
  }
}

async function readXml(zip, name) {
  const file = zip.file(name);
  if (!file) throw xlsxError(`Bagian XLSX tidak ditemukan: ${name}.`);
  const xml = await file.async('string');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw xlsxError('Deklarasi entitas eksternal tidak diizinkan dalam XLSX.');
  assertWellFormedXml(xml);
  return xml;
}

function worksheetText(xml, sharedStrings, remainingCharacters) {
  if (!/<(?:\w+:)?worksheet(?:\s|>)/.test(xml) || !/<\/(?:\w+:)?worksheet\s*>/.test(xml)) throw xlsxError('Struktur worksheet XLSX tidak valid.');
  const rows = [];
  let uncachedFormulas = 0;
  let characters = 0;
  for (const row of xml.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row\s*>/g)) {
    const cells = [];
    for (const match of row[1].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/\s*>|>([\s\S]*?)<\/(?:\w+:)?c\s*>)/g)) {
      const attrs = attributes(match[1]);
      const body = match[2] || '';
      const cached = body.match(/<(?:\w+:)?v(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?v\s*>/);
      const hasFormula = /<(?:\w+:)?f(?:\s|>|\/)/.test(body);
      let value = '';
      if (hasFormula && !cached) uncachedFormulas++;
      if (attrs.t === 'inlineStr') value = textRuns(body);
      else if (cached) {
        value = decodeXml(cached[1]);
        if (attrs.t === 's') {
          if (!/^\d+$/.test(value) || Number(value) >= sharedStrings.length) throw xlsxError('Referensi shared string XLSX tidak valid.');
          value = sharedStrings[Number(value)];
        } else if (attrs.t === 'b') {
          if (!['0', '1'].includes(value)) throw xlsxError('Nilai boolean XLSX tidak valid.');
          value = value === '1' ? 'TRUE' : 'FALSE';
        }
      }
      if (value !== '') {
        characters += value.length + (attrs.r || '?').length + 5;
        if (characters > remainingCharacters) throw Object.assign(new Error('Teks hasil XLSX terlalu besar. Kurangi isi workbook.'), { status: 413, code: 'ARCHIVE_LIMIT', stage: 'xlsx-extract' });
        cells.push(`${attrs.r || '?'}: ${value.replace(/[\r\n\t]+/g, ' ')}`);
      }
    }
    if (cells.length) rows.push(cells.join(' | '));
  }
  if (uncachedFormulas) rows.push(`[${uncachedFormulas} formula(s) without cached values; not evaluated.]`);
  return rows.join('\n');
}

export async function extractXlsx(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) throw xlsxError();
  try {
    rejectEncryptedZip(buffer);
    const zip = await loadOfficeArchive(buffer);
    const types = await readXml(zip, '[Content_Types].xml');
    if (/macroEnabled|vbaProject/i.test(types) || Object.keys(zip.files).some(name => /(?:^|\/)vbaProject\.bin$/i.test(name))) throw xlsxError('Workbook dengan macro tidak didukung. Simpan sebagai XLSX tanpa macro.');
    const workbook = await readXml(zip, 'xl/workbook.xml');
    const rels = await readXml(zip, 'xl/_rels/workbook.xml.rels');
    if (!/<(?:\w+:)?workbook(?:\s|>)/.test(workbook) || !/<\/(?:\w+:)?workbook\s*>/.test(workbook)) throw xlsxError('Struktur workbook XLSX tidak valid.');
    const targets = new Map();
    for (const rel of rels.matchAll(/<(?:\w+:)?Relationship\b([^>]*?)\/?\s*>/g)) {
      const attrs = attributes(rel[1]);
      if (!attrs.Id || !attrs.Target || !attrs.Type?.endsWith('/worksheet')) continue;
      if (attrs.TargetMode?.toLowerCase() === 'external' || /[\\?#]|^[a-z][a-z\d+.-]*:/i.test(attrs.Target)) throw xlsxError('Worksheet eksternal tidak didukung.');
      const target = path.posix.normalize(attrs.Target.startsWith('/') ? attrs.Target.slice(1) : `xl/${attrs.Target}`);
      if (!target.startsWith('xl/') || !target.endsWith('.xml')) throw xlsxError('Lokasi worksheet XLSX tidak valid.');
      if (targets.has(attrs.Id)) throw xlsxError('Relasi worksheet XLSX duplikat.');
      targets.set(attrs.Id, target);
    }
    const sharedStrings = [];
    if (zip.file('xl/sharedStrings.xml')) {
      const strings = await readXml(zip, 'xl/sharedStrings.xml');
      for (const item of strings.matchAll(/<(?:\w+:)?si(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?si\s*>/g)) sharedStrings.push(textRuns(item[1]));
    }
    const sheets = [];
    const usedTargets = new Set();
    let extractedCharacters = 0;
    for (const sheet of workbook.matchAll(/<(?:\w+:)?sheet\b([^>]*?)\/?\s*>/g)) {
      const attrs = attributes(sheet[1]);
      const id = attrs['r:id'] || Object.entries(attrs).find(([name]) => name.endsWith(':id'))?.[1];
      const target = targets.get(id);
      if (!target) throw xlsxError('Relasi worksheet XLSX tidak ditemukan.');
      if (usedTargets.has(target) || sheets.length >= MAX_SHEETS) throw xlsxError('Daftar worksheet XLSX tidak valid atau terlalu besar.');
      usedTargets.add(target);
      const label = `[Sheet ${sheets.length + 1}: ${(attrs.name || 'Untitled').replace(/[\r\n]+/g, ' ')}]`;
      const text = worksheetText(await readXml(zip, target), sharedStrings, MAX_EXTRACTED_CHARACTERS - extractedCharacters - label.length - 100);
      const block = `${label}\n${text || '[Empty sheet]'}`;
      extractedCharacters += block.length + 2;
      if (extractedCharacters > MAX_EXTRACTED_CHARACTERS) throw Object.assign(new Error('Teks hasil XLSX terlalu besar. Kurangi isi workbook.'), { status: 413, code: 'ARCHIVE_LIMIT', stage: 'xlsx-extract' });
      sheets.push(block);
    }
    if (!sheets.length) throw xlsxError('Tidak ada worksheet yang dapat dibaca.');
    return { text: sheets.join('\n\n'), pageCount: sheets.length, extractionMode: 'xlsx-cells', ocrUsed: false };
  } catch (error) {
    if (error.code === 'INVALID_XLSX' || error.code === 'ARCHIVE_LIMIT') throw error;
    throw xlsxError();
  }
}
