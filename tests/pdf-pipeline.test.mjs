import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { pdfFixture } from './fixtures/pdf-fixtures.mjs';
import JSZip from 'jszip';
import sharp from 'sharp';
let child, base;
before(async () => {
  child = spawn(
    process.execPath,
    [
      '--import',
      fileURLToPath(
        new URL('./fixtures/provider-preload.mjs', import.meta.url)
      ),
      'server.js',
    ],
    {
      env: {
        ...process.env,
        PORT: '0',
        GEMINI_API_KEY: 'TEST_ONLY_FIXTURE_KEY',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );
  let logs = '';
  child.stderr.on('data', (chunk) => {
    logs += chunk;
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('Fixture server did not start: ' + logs)),
      10000
    );
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error('Fixture server exited ' + code + ': ' + logs));
    });
    child.stdout.on('data', (chunk) => {
      const match = String(chunk).match(/listening on port (\d+)/);
      if (match) {
        base = `http://127.0.0.1:${match[1]}`;
        clearTimeout(timer);
        resolve();
      }
    });
  });
});
after(() => child?.kill());
async function upload(types) {
  const data = new FormData();
  data.append(
    'file',
    new Blob([await pdfFixture(types)], { type: 'application/pdf' }),
    'fixture.pdf'
  );
  const response = await fetch(base + '/api/upload?sync=1', {
    method: 'POST',
    body: data,
    headers: { 'X-Session-Id': 'pdf-fixture-user' },
  });
  const payload = await response.json();
  assert.equal(response.status, 200, JSON.stringify(payload));
  return payload;
}
test('native PDF extraction retains its actual text and avoids OCR', async () => {
  const result = await upload(['text']);
  assert.equal(result.ocrUsed, false);
  assert.match(result.text, /Native text/);
  assert.equal(result.pageCount, 1);
  assert.equal(result.actualModel, null);
});
test('scanned PDF routes through page preprocessing and official SDK transport fallback', async () => {
  const result = await upload(['scan']);
  assert.equal(result.ocrUsed, true);
  assert.equal(result.actualModel, 'gemini-3-flash-preview');
  assert.match(result.text, /deterministic test transport/);
  assert.equal(result.preprocessing[0].page, 1);
  assert.equal(result.preprocessing[0].ocrConfidence, null);
  assert.ok(
    ['preprocessed', 'original-pdf-fallback'].includes(
      result.preprocessing[0].status
    )
  );
});
test('mixed PDF keeps native page one and OCR page two in order', async () => {
  const result = await upload(['text', 'scan']);
  assert.equal(result.pageCount, 2);
  assert.equal(result.extractionMode, 'pdf-hybrid-ocr');
  assert.ok(
    result.text.indexOf('Native text') <
      result.text.indexOf('deterministic test transport')
  );
  assert.deepEqual(
    result.preprocessing.map((p) => p.page),
    [2]
  );
  assert.equal(result.pageQuality.length, 2);
});
async function sendFile(name,buffer,{session='upload-fixture',id='upload-'+name,sync=false}={}) {
  const form=new FormData();form.append('file',new Blob([buffer]),name);form.append('sessionId',session);
  const response=await fetch(base+'/api/upload'+(sync?'?sync=1':''),{method:'POST',headers:{'X-Session-Id':session,'X-Upload-Id':id},body:form});
  return {status:response.status,data:await response.json()};
}
test('async acceptance is idempotent, polling is repeatable, and sessions cannot read or cancel each other', async()=>{
  const bytes=Buffer.from('A radius joins the centre to the circle boundary.');
  const first=await sendFile('identity.txt',bytes),second=await sendFile('identity.txt',bytes);
  assert.equal(first.status,202);assert.equal(second.data.jobId,first.data.jobId);
  assert.equal((await sendFile('identity.txt',Buffer.from('Different source'))).status,409);
  const route=base+'/api/upload/status/'+first.data.jobId;
  assert.equal((await fetch(route,{headers:{'X-Session-Id':'another'}})).status,403);
  assert.equal((await fetch(base+'/api/upload/cancel/'+first.data.jobId,{method:'POST',headers:{'X-Session-Id':'another'}})).status,404);
  let result;
  for(let i=0;i<50;i++) {result=await(await fetch(route,{headers:{'X-Session-Id':'upload-fixture'}})).json();if(result.status==='completed')break;await new Promise(r=>setTimeout(r,20));}
  assert.equal(result.status,'completed');
  const repeated=await(await fetch(route,{headers:{'X-Session-Id':'upload-fixture'}})).json();
  assert.equal(repeated.materialId,result.materialId);assert.equal(repeated.text,bytes.toString());
  assert.equal((await fetch(base+'/api/upload/status/job-expired',{headers:{'X-Session-Id':'upload-fixture'}})).status,404);
});
test('cancel an active OCR job without publishing a late result',async()=>{
  const uploaded=await sendFile('cancel.pdf',await pdfFixture(['scan','scan','scan','scan']));
  const cancelled=await fetch(base+'/api/upload/cancel/'+uploaded.data.jobId,{method:'POST',headers:{'X-Session-Id':'upload-fixture'}});
  assert.equal((await cancelled.json()).status,'cancelled');
  await new Promise(r=>setTimeout(r,60));
  const status=await(await fetch(base+'/api/upload/status/'+uploaded.data.jobId,{headers:{'X-Session-Id':'upload-fixture'}})).json();
  assert.equal(status.status,'cancelled');assert.equal(status.text,undefined);
});
test('Office documents, TXT, PNG and JPEG use the real ingestion routes',async()=>{
  const doc=new JSZip();doc.file('[Content_Types].xml','<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  doc.file('_rels/.rels','<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  doc.file('word/document.xml','<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Dokumen bahasa Indonesia: luas dan keliling.</w:t></w:r></w:p></w:body></w:document>');
  const slides=new JSZip();slides.file('ppt/slides/slide1.xml','<a:t>Slide pertama: rumus luas.</a:t>');slides.file('ppt/slides/slide2.xml','<a:t>Slide kedua: contoh tabel.</a:t>');
  const book=new JSZip();book.file('[Content_Types].xml','<Types/>');book.file('xl/workbook.xml','<workbook><sheets><sheet name="Nilai" r:id="r1"/></sheets></workbook>');book.file('xl/_rels/workbook.xml.rels','<Relationships><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>');book.file('xl/worksheets/sheet1.xml','<worksheet><sheetData><row><c r="A1" t="inlineStr"><is><t>Nilai siswa</t></is></c><c r="B1"><v>98</v></c></row></sheetData></worksheet>');
  const png=await sharp({create:{width:80,height:100,channels:3,background:'white'}}).png().toBuffer();
  for(const [name,bytes,pattern] of [
    ['lesson.docx',await doc.generateAsync({type:'nodebuffer'}),/Dokumen bahasa Indonesia/],
    ['lesson.pptx',await slides.generateAsync({type:'nodebuffer'}),/Slide kedua/],
    ['lesson.xlsx',await book.generateAsync({type:'nodebuffer'}),/Nilai siswa/],
    ['lesson.txt',Buffer.from('Materi teks tanpa layanan AI.'),/tanpa layanan AI/],
    ['lesson.png',png,/deterministic test transport/],
    ['lesson.jpg',await sharp(png).jpeg().toBuffer(),/deterministic test transport/],
  ]) {const result=await sendFile(name,bytes,{sync:true});assert.equal(result.status,200,JSON.stringify(result.data));assert.match(result.data.text,pattern);}
});
test('MP3, WAV, MP4 and MOV reach the multimodal adapter after signature validation',async()=>{
  // Minimal container-signature fixtures test routing, not decoder fidelity.
  for(const [name,bytes] of [['speech.mp3','ID3 fixture'],['speech.wav','RIFF0000WAVEfixture'],['video.mp4','0000ftypisomfixture'],['video.mov','0000ftypqt  fixture']]) {
    const result=await sendFile(name,Buffer.from(bytes),{sync:true});assert.equal(result.status,200,JSON.stringify(result.data));
    assert.match(result.data.extractionMode,/gemini-(?:audio|video)/);
  }
});
