import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardMetrics} from '../public/dashboard-metrics.js';
import {reviewKey} from '../public/review-scheduler.js';
test('dashboard displays only real subjects, notes, submitted exams and Jakarta activity',()=>{
  const now=Date.parse('2026-11-12T17:00:00Z');
  const result=dashboardMetrics([{subject:'Biologi',notes:'catatan',exams:[{}, {submittedAt:12}]}],{subjects:['Biologi','Kimia']},{events:[{day:'2026-11-13',type:'quiz'}]},now);
  assert.equal(result.subjects,2);assert.equal(result.notes,1);assert.equal(result.exams,1);
  assert.equal(result.week.at(-1).day,'2026-11-13');assert.equal(result.week.at(-1).count,1);
  assert.equal(dashboardMetrics([],{}, {events:[]},now).exams,0);
});
test('dashboard review action targets a due source rather than the currently open material',()=>{
  const now=1000, card={front:'Question',back:'Answer'};
  const future={id:'future',deck:[card],reviews:{[reviewKey(card)]:{dueAt:2000}}};
  const due={id:'due',deck:[card]};
  assert.equal(dashboardMetrics([{id:'empty'},future,due],{}, {},now).reviewSourceId,'due');
  assert.equal(dashboardMetrics([future],{}, {},now).reviewSourceId,null);
  assert.equal(dashboardMetrics([future],{}, {},2000).reviewSourceId,'future');
});
