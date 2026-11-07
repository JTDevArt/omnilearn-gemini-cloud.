import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { normalizeConceptMapData, formatConceptMapToMarkdown } from '../lib/learning-engine.js';
import { validateStudyResult } from '../lib/ai-policy.js';
const legacyMap = { centralTopic: 'Circles', summary: 'Round shapes', language: 'en', branches: [
  { title: 'Diameter', relationToCenter: 'has', explanation: 'Twice the radius.', example: 'Diameter = 2r',
    subconcepts: [{title: 'Radius', detail: 'Distance to the centre.', causeEffect: 'LEGACY CAUSAL TEXT', example: 'r = 3cm'}] }
], relationships: [] };
test('legacy causal fields are dropped from normalized maps and Markdown', () => {
  const normalized = normalizeConceptMapData(legacyMap);
  assert.ok(normalized);
  assert.equal('causeEffect' in normalized.branches[0].subconcepts[0], false);
  const markdown = formatConceptMapToMarkdown(legacyMap, 'en');
  assert.ok(!markdown.includes('LEGACY CAUSAL TEXT'));
  assert.ok(!markdown.includes('Cause and effect'));
  assert.ok(markdown.includes('Diameter'));
});
test('invalid structured answers cannot count as successful results', () => {
  assert.equal(validateStudyResult('map', null, 10), false);
  assert.equal(validateStudyResult('map', {centralTopic: 'x', branches: []}), false);
  assert.equal(normalizeConceptMapData({centralTopic:'x',branches:[{}]}), null);
  assert.equal(validateStudyResult('quiz', { questions: [{}] }, 5), false);
  assert.equal(validateStudyResult('cards', { cards: [{}] }, 1), false);
});
test('cached map rendering omits causal fields and uses the result language', () => {
  const script = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  const extract = (start,end) => script.slice(script.indexOf(start),script.indexOf(end,script.indexOf(start)));
  const output = { classList: {remove(){}}, innerHTML:'',querySelectorAll:()=>[] };
  const ctx = vm.createContext({toolOutput:output, conceptMapState:legacyMap, $:()=>null,renderMarkdownToSafeHtml:v=>v || ''});
  vm.runInContext(extract('function escapeHtml','function renderMarkdownToSafeHtml')+extract('function renderInteractiveConceptMap','function getTabCacheKey'),ctx);
  ctx.renderInteractiveConceptMap();
  assert.ok(!output.innerHTML.includes('LEGACY CAUSAL TEXT'));
  assert.ok(!output.innerHTML.includes('Sebab'));
  assert.ok(!output.innerHTML.includes('Contoh'));
  assert.ok(output.innerHTML.includes('Example'));
  assert.ok(output.innerHTML.includes('Expand All'));
});
