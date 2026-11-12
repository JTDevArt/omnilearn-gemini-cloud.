import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const asset = file => readFileSync(new URL('../public/'+file,import.meta.url),'utf8');
const html=asset('design-preview.html');
const css=asset('design-preview.css');
const script=asset('design-preview.js');

test('design prototype is isolated and loads its own local CSS and JS',()=>{
  assert.match(html, /href="\/design-preview\.css"/);
  assert.match(html, /src="\/design-preview\.js"/);
  assert.match(html, /id="sideNav"/);
  assert.match(html, /id="page"/);
  assert.match(script, /const storageKey = 'omnilearn-design-preview-v1'/);
  assert.doesNotMatch(script, /window\.OmniProduct\s*=/);
  assert.doesNotMatch(script, /\/api\/chat|\/api\/upload/);
});
test('all key showcase pages and requested navigational routes exist',()=>{
  for(const view of ['landing','home','dashboard','notes','subjects','streaks',
    'exams','lesson','profile','updates','leaderboard','pinned']) {
    assert.ok(script.includes("['"+view+"',"),view+' should appear in navigation');
  }
  for(const key of ['renderLanding','renderHome','renderDashboard','renderNotes',
    'renderSubjects','renderStreaks','renderExams','renderLesson','renderProfile',
    'renderUpdates','renderLeaderboard','renderPinned']) {
    assert.ok(script.includes('function '+key+'(') || script.includes('async function '+key+'('),
      key+' should be implemented');
  }
});
test('responsive and reduced-motion styles included',()=>{
  assert.match(css, /max-width:720px/);
  assert.match(css, /max-width:480px/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /data-theme="light"/);
});
test('prototype is transparent about sample metrics and real-service limitations',()=>{
  for(const phrase of ['CONTOH DATA','bukan','Tidak mengirim','tidak mengirim','aplikasi asli']){
    assert.ok((script+' '+html).toLocaleLowerCase().includes(phrase.toLocaleLowerCase()));
  }
});
