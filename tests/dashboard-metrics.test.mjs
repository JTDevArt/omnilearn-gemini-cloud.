import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardMetrics} from '../public/dashboard-metrics.js';
test('dashboard displays only real subjects, notes, submitted exams and Jakarta activity',()=>{
  const now=Date.parse('2026-11-12T17:00:00Z');
  const result=dashboardMetrics([{subject:'Biologi',notes:'catatan',exams:[{}, {submittedAt:12}]}],{subjects:['Biologi','Kimia']},{events:[{day:'2026-11-13',type:'quiz'}]},now);
  assert.equal(result.subjects,2);assert.equal(result.notes,1);assert.equal(result.exams,1);
  assert.equal(result.week.at(-1).day,'2026-11-13');assert.equal(result.week.at(-1).count,1);
  assert.equal(dashboardMetrics([],{}, {events:[]},now).exams,0);
});
