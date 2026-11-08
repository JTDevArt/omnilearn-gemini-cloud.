import test from 'node:test';
import assert from 'node:assert/strict';
import {chapterEdit} from '../public/lesson-editor.js';
import {normalizeJourney,buildJourneyPrompt} from '../lib/learning-v4.js';
const values={title:' Cells ',objective:'Understand cells',explanation:'Cells form life.',example:'',formula:'',recap:'Cells are basic units.',question:'What is a cell?',answer:'A basic unit.',practiceExplanation:'From the source.',sourceReferences:'[Page 1]\n[Page 1]'};
test('lesson edits require meaningful content and exact original source markers',()=>{
 const result=chapterEdit(values,'[Page 1] Cells form life.');
 assert.equal(result.title,'Cells');assert.deepEqual(result.sourceReferences,['[Page 1]']);
 assert.equal(result.recap,values.recap);assert.equal(result.practice.explanation,values.practiceExplanation);
 assert.throws(()=>chapterEdit({...values,explanation:'  '},'[Page 1]'),/Isi judul/);
 assert.throws(()=>chapterEdit({...values,sourceReferences:'[Page 9]'},'[Page 1]'),/penanda/);
});
test('generated lesson normalization retains recap while excluding invented references',()=>{
 const chapter=chapterEdit(values,'[Page 1]');
 const normalized=normalizeJourney({title:'Cells',chapters:[{...chapter,sourceReferences:['[Page 1]','[Page 9]']}]},'[Page 1] Cells form life.');
 assert.equal(normalized.chapters[0].recap,values.recap);assert.deepEqual(normalized.chapters[0].sourceReferences,['[Page 1]']);
 assert.match(buildJourneyPrompt({source:'Cells form life.'}),/brief source-grounded recap/);
});
