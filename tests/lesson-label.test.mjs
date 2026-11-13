import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonTitle,saveLessonTitle,titleSuggestion} from '../public/lesson-label.js';
test('lesson titles preserve user edits and never fall back to a file name',()=>{
  assert.equal(lessonTitle({name:'scan.pdf'}),'Materi belum diberi judul');
  assert.equal(lessonTitle({name:'scan.pdf',journey:{title:'Sistem Pencernaan'}}),'Sistem Pencernaan');
  assert.equal(lessonTitle({name:'scan.pdf',journey:{title:'scan.pdf'},lessonTitle:'Biologi'}),'Biologi');
  assert.equal(lessonTitle({name:'Biologi'}),'Biologi');
});
test('title suggestions use only a short literal extracted line and require user review',()=>{
  assert.equal(titleSuggestion('[Halaman 1]\nSistem Pencernaan\nPenjelasan'), 'Sistem Pencernaan');
  assert.equal(titleSuggestion('[Page 1]\nscan.pdf'), '');
  assert.equal(titleSuggestion('x'.repeat(101)), '');
  assert.equal(titleSuggestion(''), '');
});
test('title review saves the intended source and rolls back failed persistence',async()=>{
  const a={name:'a.pdf'},b={name:'b.pdf',lessonTitle:'Kimia'};
  await saveLessonTitle(a,'  Biologi  ',async()=>{});
  assert.equal(a.lessonTitle,'Biologi');assert.equal(b.lessonTitle,'Kimia');
  await assert.rejects(saveLessonTitle(b,'Baru',async()=>{throw Error('full');}));
  assert.equal(b.lessonTitle,'Kimia');
  await assert.rejects(saveLessonTitle(a,' ',async()=>{}));
});
