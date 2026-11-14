const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const output=path.resolve('visual-qa');
const report={status:'BLOCKED',build:process.env.GITHUB_SHA || 'local',fixtures:'Two synthetic sources; no real Gemini or OCR requests.',checks:[],screenshots:[],failures:[]};
let server,browser,page;
async function start() {
  server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',NODE_ENV:'test',GEMINI_API_KEY:'TEST_ONLY_NOT_A_REAL_KEY'},stdio:['ignore','pipe','pipe']});
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Server startup timed out')),15000);
    server.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited '+code));});
    server.stdout.on('data',chunk=>{const port=String(chunk).match(/listening on port (\d+)/)?.[1];if(port){clearTimeout(timer);resolve('http://127.0.0.1:'+port);}});
  });
}
async function navigate(view) {
  await page.evaluate(view=>OmniProduct.navigate(view),view);
  await page.waitForFunction(view=>new URL(location.href).searchParams.get('view')===view,view);
  await page.locator(['journey','learn'].includes(view)?'.journey-workspace':'.study-title').waitFor();
}
async function overflow() {
  const outside=await page.evaluate(()=>[...document.querySelectorAll('main *')].filter(node=>{const r=node.getBoundingClientRect();return r.width && (r.right>innerWidth+1 || r.left< -1);}).map(node=>node.tagName+'.'+node.className));
  assert.deepEqual(outside,[]);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
}
async function shot(name) {
  if(process.env.QA_SKIP_SCREENSHOTS==='1') return;
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});
  report.screenshots.push({file:name+'.png',viewport:page.viewportSize(),route:new URL(page.url()).searchParams.get('view'),theme:'dark'});
}
async function run() {
  await fs.mkdir(output,{recursive:true});const base=await start();
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  page=await browser.newPage({viewport:{width:1440,height:900},colorScheme:'dark',reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let calls=0;
  await page.route('**/api/source/analyze',route=>{calls++;return route.fulfill({status:422,json:{error:'Bukti analisis tidak cocok dengan teks sumber. Hasil belum boleh digunakan.',code:'INVALID_BLUEPRINT',stage:'source-analysis'}});});
  await page.route('**/api/study',route=>{calls++;return route.fulfill({status:503,json:{error:'Study provider fixture unavailable'}});});
  await page.goto(base+'/dashboard?view=home');await page.locator('.home-composer').waitFor();
  const ids=await page.evaluate(async()=>{
    const make=(name,title,text,chapterTitle)=>{
      const source=OmniProduct.addSource({name,text,meta:{extractionMode:'test-fixture'}});
      source.lessonTitle=title;
      source.journey={title,chapters:[{id:'intro',title:chapterTitle,objective:'Tinjau konsep dalam sumber fixture.',explanation:text,practice:{question:'Jelaskan isi sumber.',answer:text,explanation:'Jawaban mengikuti sumber fixture.'}}]};
      source.activeChapter='intro';return source;
    };
    const first=make('scan_biologi.pdf','Sistem Pencernaan','Lambung mengolah makanan. Usus menyerap zat gizi.','Lambung dan usus');first.subject='Biologi';
    const second=make('scan_kimia.pdf','Ikatan Kimia','Ikatan ion melibatkan perpindahan elektron.','Ikatan ion');second.subject='Kimia';second.deck=[{front:'Apa yang berpindah pada ikatan ion?',back:'Elektron.'}];
    await OmniProduct.persistAsync();OmniProduct.selectSource(first.id);return [first.id,second.id];
  });
  // The source library must use reviewed lesson titles, never raw PDF filenames.
  await page.evaluate(()=>OmniProduct.navigate('sources'));
  await page.getByRole('heading',{name:'Pustaka sumbermu'}).waitFor();
  const sourceTitles=await page.locator('.source-card h3').allTextContents();
  assert.deepEqual(new Set(sourceTitles),new Set(['Sistem Pencernaan','Ikatan Kimia']));
  assert.equal(sourceTitles.some(title=>/scan_.*\\.pdf/i.test(title)),false);
  assert.match(await page.locator('.source-card').first().textContent(),/Sumber asli/);
  await page.evaluate(()=>OmniProduct.navigate('notes'));
  await page.locator('.notes-collection').waitFor();
  assert.equal(await page.locator('.note-title').count(),2);
  assert.equal(await page.locator('.master-preview').count(),0,'Library must lead with topic titles rather than raw text thumbnails');
  const search=page.getByRole('searchbox',{name:'Cari catatan',exact:true});
  await search.fill('elektron');
  assert.equal(await page.locator('.note-title').textContent(),'Ikatan Kimia');
  await search.fill('tidak-cocok');
  assert.match(await page.locator('.notes-collection .master-empty').textContent(),/Tidak ada materi yang cocok/);
  await search.fill('');
  await page.getByRole('combobox',{name:'Mata pelajaran',exact:true}).selectOption('Biologi');
  assert.equal(await page.locator('.note-title').textContent(),'Sistem Pencernaan');
  await page.getByRole('combobox',{name:'Mata pelajaran',exact:true}).selectOption('');
  for(const theme of ['dark','light']) for(const width of [1440,1280,1024,820,768,390,360]) {
    await page.setViewportSize({width,height:900});await page.evaluate(theme=>OmniTheme.setPreference(theme),theme);
    for(const layout of ['list','grid']) {await page.locator(`[data-layout=${layout}]`).click();await overflow();}
    report.checks.push({view:'notes',theme,width,layouts:2,overflow:false});
  }
  const biology=page.locator('.master-note').filter({has:page.getByRole('button',{name:'Sistem Pencernaan',exact:true})});
  await biology.locator('.note-actions>summary').click();
  await biology.locator('[data-pin-id]').click();
  await biology.locator('.note-pin').waitFor();
  await biology.locator('.note-actions>summary').click();
  page.once('dialog',dialog=>dialog.accept('Pencernaan manusia'));
  await biology.locator('[data-rename-id]').click();
  await page.getByRole('button',{name:'Pencernaan manusia',exact:true}).waitFor();
  await page.reload();await page.locator('.notes-collection').waitFor();
  assert.equal(await page.getByRole('button',{name:'Pencernaan manusia',exact:true}).count(),1);
  assert.equal(await page.locator('.note-pin').count(),1);
  await page.getByRole('button',{name:'Pencernaan manusia',exact:true}).click();
  await page.getByRole('heading',{name:'Lambung dan usus',exact:true}).waitFor();
  await page.evaluate(()=>OmniProduct.navigate('home'));await page.locator('.home-source-context').waitFor();
  assert.match(await page.locator('.home-source-context').textContent(),/Pencernaan manusia/);
  await page.locator('.home-source-context [data-open=learn]').click();
  await page.getByRole('heading',{name:'Lambung dan usus',exact:true}).waitFor();
  assert.equal(await page.locator('.journey-workspace .md-rendered').first().evaluate(node=>getComputedStyle(node).lineHeight),'27px');
  await page.evaluate(()=>OmniProduct.navigate('dashboard'));await page.locator('[data-review-due]').waitFor();
  await page.locator('[data-review-due]').click();
  await page.getByText('Apa yang berpindah pada ikatan ion?',{exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>OmniProduct.getCurrentSource().id),ids[1]);
  assert.equal(calls,0,'Library, reading and due-review navigation must reuse source data');
  await page.evaluate(async id=>{await OmniProduct.renameLesson(id,'Sistem Pencernaan');OmniProduct.selectSource(id);},ids[0]);
  await navigate('cards');
  await page.getByRole('heading',{name:'Sistem Pencernaan',exact:true}).waitFor();
  assert.equal(await page.locator('#chatForm').isVisible(),false);
  assert.equal(await page.locator('#dropzone').isVisible(),false);
  assert.equal(await page.locator('.study-chapters').isVisible(),true);
  assert.equal(await page.locator('.study-tools').isVisible(),true);
  await page.locator('#cardsCount').selectOption('12');
  await page.locator('#cardsCount').selectOption('10');
  assert.equal(calls,0,'Changing generation settings must not spend AI quota');
  for(const theme of ['dark','light']) for(const width of [1440,1280,1024,820,768,390,360]) {
    await page.setViewportSize({width,height:900});await page.evaluate(theme=>OmniTheme.setPreference(theme),theme);
    for(const view of ['cards','summary','quiz','map','plan','translate','chat']) {await navigate(view);await overflow();}
    report.checks.push({theme,width,views:7,overflow:false});
  }
  assert.equal(calls,0,'Tab navigation must not call AI');
  await page.setViewportSize({width:1440,height:900});await page.evaluate(()=>OmniTheme.setPreference('dark'));await navigate('cards');
  await page.locator('#regenCardsBtn').click();await page.locator('.study-error').waitFor();
  assert.equal(calls,1);
  assert.match(await page.locator('.study-error').textContent(),/Bukti analisis tidak cocok/);
  assert.match(await page.locator('.study-error').textContent(),/Periksa teks OCR/);
  await page.getByRole('button',{name:'Tinjau sumber',exact:true}).waitFor();
  assert.equal(await page.evaluate(id=>OmniProduct.getSource(id).text,ids[0]),'Lambung mengolah makanan. Usus menyerap zat gizi.');
  await shot('01-flashcard-source-error-desktop');
  await navigate('learn');await page.getByRole('heading',{name:'Lambung dan usus',exact:true}).waitFor();
  await shot('02-lesson-workspace-desktop');
  await page.evaluate(id=>OmniProduct.selectSource(id),ids[1]);await navigate('learn');
  await page.getByRole('heading',{name:'Ikatan ion',exact:true}).waitFor();
  assert.equal(await page.getByRole('heading',{name:'Lambung dan usus',exact:true}).count(),0);
  await page.setViewportSize({width:390,height:900});await navigate('cards');
  await page.getByText('Apa yang berpindah pada ikatan ion?',{exact:true}).waitFor();await overflow();
  const positions=await page.evaluate(()=>({content:document.querySelector('.study-workspace .content-panel').getBoundingClientRect().y,tools:document.querySelector('.study-tools').getBoundingClientRect().y}));
  assert.ok(positions.content<positions.tools,'Mobile study content must precede the tools panel');
  assert.equal(calls,1,'Saved flashcards must not regenerate');
  await page.evaluate(()=>OmniProduct.persistAsync());await page.reload();await page.getByText('Apa yang berpindah pada ikatan ion?',{exact:true}).waitFor();
  assert.equal(calls,1);await overflow();await shot('03-saved-flashcards-mobile');
  // A rejected journey analysis must retain the source and expose a persistent review path.
  await page.evaluate(id=>{
    const source=OmniProduct.getSource(id);
    delete source.journey;
    OmniProduct.selectSource(id);
    OmniProduct.navigate('journey');
  },ids[0]);
  await page.getByRole('button',{name:'Susun jalur dari materi ini'}).click();
  await page.locator('.study-error').waitFor();
  assert.match(await page.locator('.study-error').textContent(),/Kutipan hasil AI tidak cocok/);
  assert.equal(await page.getByRole('button',{name:'Periksa teks sumber'}).count(),1);
  assert.equal(await page.evaluate(id=>OmniProduct.getSource(id).text,ids[0]),'Lambung mengolah makanan. Usus menyerap zat gizi.');
  assert.deepEqual(errors,[]);
  report.status='ASSERTIONS_PASSED_VISUAL_REVIEW_PENDING';report.inferenceCalls=calls;
  report.behavior='PASS: seven tools × seven widths × two themes without AI, source-bound chapter/content isolation, original source retained after rejected analysis, saved deck on refresh, contextual chat, source review action and mobile overflow.';
}
run().catch(async error=>{report.status=browser?'FAIL':'BLOCKED';report.failures.push(error.stack || String(error));if(page&&!page.isClosed())try{await page.screenshot({path:path.join(output,'study-assertion-failure.png')});}catch{}process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'STUDY-STATUS.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));});
