const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
let server,browser,page;
const report={status:'BLOCKED',checks:[],screenshots:[],failures:[],fixtures:'Synthetic source and manual exam; no live inference.'};
const output=path.resolve('visual-qa');
async function run(){
 await fs.mkdir(output,{recursive:true});
 server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',NODE_ENV:'test',GEMINI_API_KEY:'TEST_ONLY_NOT_A_REAL_KEY'},stdio:['ignore','pipe','pipe']});
 const base=await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Server startup timeout')),15000);server.stdout.on('data',chunk=>{const port=String(chunk).match(/listening on port (\d+)/)?.[1];if(port){clearTimeout(timeout);resolve('http://127.0.0.1:'+port);}});server.once('exit',code=>reject(Error('Server exit '+code)));});
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce',colorScheme:'dark'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));let inference=0;
 await page.route(/\/api\/(chat|generate|source\/analyze|exam\/grade)/,route=>{inference++;return route.fulfill({status:503,json:{error:'No inference in UI verification'}});});
 await page.goto(base+'/dashboard?view=home');await page.locator('.home-composer').waitFor();
 const id=await page.evaluate(async()=>{const s=OmniProduct.addSource({name:'scan_fixture.pdf',text:'Lambung mengolah makanan. Usus menyerap zat gizi.',meta:{extractionMode:'fixture'}});s.lessonTitle='Sistem Pencernaan';s.subject='Biologi';await OmniProduct.persistAsync();OmniProduct.selectSource(s.id);return s.id;});
 await page.evaluate(()=>OmniProduct.navigate('exams'));await page.locator('.exam-builder').waitFor();
 assert.equal(await page.getByRole('combobox',{name:'Sumber ujian',exact:true}).locator('option:checked').textContent(),'Sistem Pencernaan');
 await page.getByRole('textbox',{name:'Pertanyaan',exact:true}).fill('Organ yang mengolah makanan?');
 await page.getByRole('textbox',{name:'Pilihan jawaban',exact:true}).fill('Lambung\nParu-paru');
 await page.getByRole('textbox',{name:'Kunci jawaban',exact:true}).fill('A');
 await page.getByRole('button',{name:'Tambahkan soal',exact:true}).click();
 await page.getByRole('button',{name:'Mulai ujian',exact:true}).click();await page.getByRole('radio',{name:'Lambung',exact:true}).check();
 await page.evaluate(()=>OmniProduct.persistAsync());await page.reload();await page.getByRole('button',{name:/Ujian.*Lanjutkan/}).click();
 assert.equal(await page.getByRole('radio',{name:'Lambung',exact:true}).isChecked(),true);
 page.once('dialog',dialog=>dialog.accept());await page.getByRole('button',{name:'Kumpulkan',exact:true}).click();
 assert.match(await page.locator('.exam-attempt').textContent(),/1 \/ 1 poin/);
 assert.equal(await page.evaluate(id=>OmniProduct.getSource(id).exams[0].sourceId,id),id);
 await page.getByRole('button',{name:'Kembali ke daftar',exact:true}).click();
 for(const theme of ['dark','light'])for(const width of [1440,1024,768,390,360]){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>OmniTheme.setPreference(theme),theme);
  for(const view of ['subjects','exams','streaks','leaderboard','profile','notes','updates']){
   await page.evaluate(view=>OmniProduct.navigate(view),view);await page.locator('.product-panel h1').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${view} ${width} ${theme}`);
   report.checks.push({view,width,theme,overflow:false});
  }
 }
 if(process.env.QA_SKIP_SCREENSHOTS!=='1' && process.env.QA_CAPTURE_LANDING_ONLY!=='1'){
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>OmniTheme.setPreference('dark'));
  for(const view of ['subjects','exams','streaks','profile','leaderboard']){
   await page.evaluate(view=>OmniProduct.navigate(view),view);await page.locator('.product-panel h1').waitFor();await page.evaluate(()=>scrollTo(0,0));
   const name='v104-'+view+'.png';await page.screenshot({path:path.join(output,name),animations:'disabled'});report.screenshots.push(name);
  }
 }
 await page.goto(base);await page.locator('.landing-hero').waitFor();
 for(const theme of ['dark','light'])for(const width of [1440,1280,1024,768,390,360]){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>OmniTheme.setPreference(theme),theme);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.locator('.landing-product-preview img').evaluate(i=>i.complete&&i.naturalWidth>0),true);
  assert.equal(await page.locator('.landing-preview-composer').getAttribute('href'),'/dashboard?view=home');
  report.checks.push({view:'landing',width,theme,overflow:false});
 }
 await page.locator('.landing-faq summary').nth(3).click();assert.match(await page.locator('.landing-faq details').nth(3).textContent(),/browser perangkat/);
 assert.equal(await page.locator('#productDemo').getAttribute('autoplay'),null);
 assert.equal(await page.locator('#productDemo').getAttribute('loop'),null);
 assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
 if(process.env.QA_SKIP_SCREENSHOTS!=='1'){
  await page.evaluate(()=>OmniTheme.setPreference('dark'));
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.evaluate(()=>scrollTo(0,0));
   const name='v104-landing-'+width+'.png';await page.screenshot({path:path.join(output,name),animations:'disabled'});report.screenshots.push(name);
  }
 }
 assert.equal(inference,0);assert.deepEqual(errors,[]);
 report.status='ASSERTIONS_PASSED_VISUAL_REVIEW_PENDING';report.exam='PASS manual question, answer persistence on reload, source-bound score 1/1.';
}
run().catch(async e=>{report.status='FAIL';report.failures.push(e.stack);if(page)await page.screenshot({path:path.join(output,'remaining-failure.png')}).catch(()=>{});process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'REMAINING-STATUS.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));});
