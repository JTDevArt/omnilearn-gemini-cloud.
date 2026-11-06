import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { MEDIA_TYPES, validateMedia } from '../lib/media-input.js';
import { IMAGE_TYPES, validateImage, extractXlsx } from '../lib/material-input.js';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64');
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0, 11, 8, 0, 1, 0, 1, 1, 1, 0x11, 0, 0xff, 0xd9]);
const webm = Buffer.from('1a45dfa3874282847765626d18538067ff', 'hex');

async function workbook(options = {}) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types><Override ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>');
  zip.file('xl/workbook.xml', '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Second &amp; first" sheetId="2" r:id="rId2"/><sheet name="Empty" sheetId="1" r:id="rId1"/></sheets></workbook>');
  zip.file('xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet2.xml"/></Relationships>');
  zip.file('xl/sharedStrings.xml', '<sst><si><r><t>Solar </t></r><r><t>energy</t></r></si><si><t>&lt;safe&gt; &#x1F31E;</t></si></sst>');
  zip.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData/></worksheet>');
  zip.file('xl/worksheets/sheet2.xml', '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="inlineStr"><is><t>Formula &amp; value</t></is></c><c r="C1"><f>1+2</f><v>3</v></c><c r="D1" t="b"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>1</v></c><c r="B2"><f>WEBSERVICE("https://example.invalid")</f></c></row></sheetData></worksheet>');
  for (const [name, value] of Object.entries(options)) {
    if (value === null) zip.remove(name);
    else zip.file(name, value);
  }
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

test('PNG/JPEG validation uses image headers and dimensions, not the filename', () => {
  assert.deepEqual(Object.keys(IMAGE_TYPES), ['.png', '.jpg', '.jpeg']);
  assert.equal(validateImage(png, '.png'), 'image/png');
  assert.equal(validateImage(jpeg, '.jpg'), 'image/jpeg');
  assert.equal(validateImage(jpeg, '.jpeg'), 'image/jpeg');
  assert.equal(validateImage(png, '.svg'), null);
  assert.throws(() => validateImage(Buffer.from('<svg>not a png</svg>'), '.png'), error => error.code === 'INVALID_IMAGE');
  assert.throws(() => validateImage(png, '.jpg'), error => error.code === 'INVALID_IMAGE');
  assert.throws(() => validateImage(Buffer.from([0xff, 0xd8, 0xff]), '.jpg'), error => error.code === 'INVALID_IMAGE');
  const oversized = Buffer.from(png);
  oversized.writeUInt32BE(100_000, 16);
  assert.throws(() => validateImage(oversized, '.png'), error => error.code === 'INVALID_IMAGE');
});

test('M4A/WebM validate signatures; an explicit audio hint preserves recorded audio MIME', () => {
  assert.equal(validateMedia(Buffer.from('xxxxftypM4A '), '.m4a'), 'audio/mp4');
  assert.equal(validateMedia(webm, '.webm'), 'video/webm');
  assert.equal(validateMedia(webm, '.webm', 'audio/webm;codecs=opus'), 'audio/webm');
  assert.equal(validateMedia(webm, '.webm', 'audio/wav'), 'video/webm');
  assert.throws(() => validateMedia(Buffer.from('xxxxftypavif'), '.mp4'), error => error.code === 'INVALID_MEDIA');
  assert.throws(() => validateMedia(Buffer.from('M4A plain text'), '.m4a'), error => error.code === 'INVALID_MEDIA');
  assert.throws(() => validateMedia(Buffer.from('1a45dfa38b4282886d6174726f736b61', 'hex'), '.webm'), error => error.code === 'INVALID_MEDIA');
  assert.equal(MEDIA_TYPES['.avi'], undefined);
});

test('XLSX extracts all worksheets in workbook order with shared strings and cached cell values', async () => {
  const result = await extractXlsx(await workbook());
  assert.equal(result.pageCount, 2);
  assert.equal(result.extractionMode, 'xlsx-cells');
  assert.equal(result.ocrUsed, false);
  assert.match(result.text, /^\[Sheet 1: Second & first\]/);
  assert.match(result.text, /A1: Solar energy \| B1: Formula & value \| C1: 3 \| D1: TRUE/);
  assert.match(result.text, /A2: <safe> 🌞/);
  assert.match(result.text, /1 formula\(s\) without cached values; not evaluated/);
  assert.match(result.text, /\[Sheet 2: Empty\]\n\[Empty sheet\]/);
  assert.doesNotMatch(result.text, /WEBSERVICE|https:\/\/example.invalid|1\+2/);
});

test('XLSX rejects fake, encrypted, malformed, or incomplete archives', async () => {
  await assert.rejects(extractXlsx(Buffer.from('not a zip')), error => error.code === 'INVALID_XLSX');
  await assert.rejects(extractXlsx(Buffer.from('504b0304deadbeef', 'hex')), error => error.code === 'INVALID_XLSX');
  const encrypted = Buffer.from(await workbook());
  // The ZIP local-file encrypted bit; JSZip must reject rather than attempt a password.
  encrypted.writeUInt16LE(encrypted.readUInt16LE(6) | 1, 6);
  await assert.rejects(extractXlsx(encrypted), error => error.code === 'INVALID_XLSX');
  await assert.rejects(extractXlsx(await workbook({ 'xl/worksheets/sheet2.xml': null })), error => error.code === 'INVALID_XLSX');
  await assert.rejects(extractXlsx(await workbook({ 'xl/workbook.xml': '<workbook>broken' })), error => error.code === 'INVALID_XLSX');
  await assert.rejects(extractXlsx(await workbook({ 'xl/worksheets/sheet2.xml': '<worksheet><sheetData><row><c><v>broken</v></row></sheetData></worksheet>' })), error => error.code === 'INVALID_XLSX');
  await assert.rejects(extractXlsx(await workbook({ 'xl/sharedStrings.xml': '<!DOCTYPE sst [<!ENTITY x SYSTEM "file:///etc/passwd">]><sst/>' })), error => error.code === 'INVALID_XLSX');
});

test('XLSX rejects macros, external/traversing worksheets and invalid shared-string references', async () => {
  await assert.rejects(extractXlsx(await workbook({ 'xl/vbaProject.bin': Buffer.from('macro') })), error => error.code === 'INVALID_XLSX');
  for (const target of ['https://example.invalid/sheet.xml', '../../sheet.xml']) {
    const rels = `<Relationships><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="${target}"/></Relationships>`;
    await assert.rejects(extractXlsx(await workbook({ 'xl/_rels/workbook.xml.rels': rels })), error => error.code === 'INVALID_XLSX');
  }
  const invalid = '<worksheet><sheetData><row><c r="A1" t="s"><v>99</v></c></row></sheetData></worksheet>';
  await assert.rejects(extractXlsx(await workbook({ 'xl/worksheets/sheet2.xml': invalid })), error => error.code === 'INVALID_XLSX');
});

test('XLSX inherits the bounded Office archive expansion guard', async () => {
  await assert.rejects(extractXlsx(await workbook({ 'xl/unused.xml': Buffer.alloc(31 * 1024 * 1024) })), error => error.code === 'ARCHIVE_LIMIT');
});

test('XLSX bounds repeated shared-string expansion rather than allocating unbounded output', async () => {
  const strings = `<sst><si><t>${'A'.repeat(4096)}</t></si></sst>`;
  const sheet = `<worksheet><sheetData><row>${'<c t="s"><v>0</v></c>'.repeat(8000)}</row></sheetData></worksheet>`;
  await assert.rejects(extractXlsx(await workbook({ 'xl/sharedStrings.xml': strings, 'xl/worksheets/sheet2.xml': sheet })), error => error.code === 'ARCHIVE_LIMIT' && error.stage === 'xlsx-extract');
});
