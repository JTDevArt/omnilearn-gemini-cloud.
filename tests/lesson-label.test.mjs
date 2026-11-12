import test from 'node:test';
import assert from 'node:assert/strict';
import {lessonTitle} from '../public/lesson-label.js';
test('lesson titles preserve user edits and never fall back to a file name',()=>{
  assert.equal(lessonTitle({name:'scan.pdf'}),'Materi belum diberi judul');
  assert.equal(lessonTitle({name:'scan.pdf',journey:{title:'Sistem Pencernaan'}}),'Sistem Pencernaan');
  assert.equal(lessonTitle({name:'scan.pdf',journey:{title:'scan.pdf'},lessonTitle:'Biologi'}),'Biologi');
  assert.equal(lessonTitle({name:'Biologi'}),'Biologi');
});
