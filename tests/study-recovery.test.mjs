import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {validateLibrary} from '../public/backup-format.js';
import {chapterEdit} from '../public/lesson-editor.js';

function browserCode(file, start, end, globals) {
  const code = readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
  const offset = code.indexOf(start);
  assert.ok(offset >= 0 && code.indexOf(end, offset) > offset);
  const context = vm.createContext(globals);
  vm.runInContext(code.slice(offset, code.indexOf(end, offset)), context);
  return context;
}

test('changing the typed topic selects a different general study result', () => {
  const chatInput = {value: 'Fotosintesis'};
  const ctx = browserCode('app.js', 'function getTabCacheKey', 'function restoreCachedTabView', {
    chatInput, materialText: '', materialVersion: 1, $: () => ({textContent:'', value:''}),
    document: {querySelector: () => null},
  });
  const first = ctx.getTabCacheKey('quiz');
  chatInput.value = 'Relativitas';
  assert.notEqual(ctx.getTabCacheKey('quiz'), first);
});

test('reopening a tool after reload uses its saved result without starting AI', () => {
  const saved = {markdown: 'Rangkuman dari sumber', quizState: {currentIndex: 2}};
  const restores = [];
  const ctx = browserCode('app.js', 'function selectTab', "document.querySelectorAll('.tab').forEach(button => button.addEventListener", {
    busy:false, uploadInFlight:false, activeTab:'chat', tabViewCache: new Map(),
    getTabCacheKey: () => 'key', restoreCachedTabView: (entry, task) => restores.push([entry, task]),
    window: {OmniProduct: {getSavedTool: () => saved}},
    $: () => null, quizOptions: {classList:{toggle(){}}}, taskOptions: {classList:{toggle(){}}},
    document: {querySelectorAll: () => []},
  });
  ctx.selectTab('quiz');
  assert.deepEqual(restores, [[saved, 'quiz']]);
});

test('a document deck never inherits cards or reviews from general practice', () => {
  const cards = [{front:'Biologi',back:'Materi'}];
  let shown;
  const ctx = browserCode('product.js', 'function renderDeck', 'window.OmniProduct =', {
    window:{OmniWorkbench:{installFlashcards: (_, options) => { shown = options; }}},
    toolOutput:{}, sources:[{id:'biology'}], materialId:'biology',
    freeDeck:[{front:'Other topic',back:'Other answer'}], freeReviews:{old:true},
  });
  ctx.renderDeck(cards);
  assert.equal(shown.cards, cards);
  assert.equal(Object.keys(shown.reviews).length, 0);
});

test('a selected document without extracted text cannot silently produce a general AI answer', async () => {
  let calls = 0;
  const ctx = browserCode('app.js', 'async function askAI', 'function isConceptMapCommand', {
    window: {OmniProduct: {chatRequestContext: () => ({scope:'document',material:'',materialId:'scan'}),ensureAnalysis: async () => {throw new Error('Tinjau teks sumber');}}},
    document: {querySelector:()=>null}, $:()=>({value:'auto'}), sessionId:'test',
    safeRequestJson: async () => { calls++; return {answer:'Jawaban tanpa sumber'}; },
  });
  await assert.rejects(ctx.askAI({scope:'document',material:'',materialId:'scan',message:'Ringkas sumber ini'}, undefined, () => {}), /teks sumber/);
  assert.equal(calls, 0);
});

test('legacy chapters without practice survive backup restore and title edits', () => {
  const chapter = {id:'c1',title:'Lama',explanation:'Materi asal.'};
  const source = {id:'s1',version:1,name:'source.pdf',text:'Materi asal.',journey:{chapters:[chapter]}};
  const restored = validateLibrary({schemaVersion:1, sources:[source]}).sources[0].journey.chapters[0];
  assert.deepEqual(restored, chapter);
  const edit = chapterEdit({...restored,title:'Baru'}, source.text);
  assert.equal(edit.title,'Baru');
  assert.equal(edit.practice,undefined);
  assert.throws(() => chapterEdit({...restored,question:'Q'},source.text), /latihan/i);
});
