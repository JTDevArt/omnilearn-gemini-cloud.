import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {loadOfficeArchive} from '../lib/office-archive.js';
test('valid office archive remains readable',async()=>{const z=new JSZip();z.file('word/document.xml','<text>hello</text>');const result=await loadOfficeArchive(await z.generateAsync({type:'nodebuffer'}));assert.equal(await result.file('word/document.xml').async('string'),'<text>hello</text>');});
test('invalid signatures and inflated archives are rejected',async()=>{await assert.rejects(loadOfficeArchive(Buffer.from('bad')),e=>e.code==='ARCHIVE_LIMIT');const z=new JSZip();z.file('huge.xml',Buffer.alloc(31*1024*1024));await assert.rejects(loadOfficeArchive(await z.generateAsync({type:'nodebuffer',compression:'DEFLATE'})),e=>e.code==='ARCHIVE_LIMIT');});
