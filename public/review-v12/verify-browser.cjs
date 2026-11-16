const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {chromium}=require('playwright');
const output=__dirname;
const report={status:'BLOCKED',checks:[],screenshots:[],failures:[],fixtures:'Synthetic sources and intercepted AI responses; no live provider calls.'};
let server,browser,page;

async function run(){
 server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',NODE_ENV:'test',GEMINI_API_KEY:'TEST_ONLY_NOT_A_REAL_KEY'},stdio:['ignore','pipe','pipe']});
 const base=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timeout')),15000);server.stdout.on('data',chunk=>{const port=String(chunk).match(/listening on port (\d+)/)?.[1];if(port){clearTimeout(timer);resolve('http://127.0.0.1:'+port);}});server.once('exit',code=>reject(Error('Server exited '+code)));});
 browser=await chromium.launch({headless:true});
 page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const pageErrors=[],assetErrors=[],consoleErrors=[];let checkingFrame=false,frameBlocked=false;
 page.on('pageerror',error=>pageErrors.push(error.message));
 page.on('console',message=>{if(message.type()!=='error')return;const text=message.text();if(checkingFrame&&/frame-src|Framing/i.test(text)){frameBlocked=true;return;}if(!/Failed to load resource/.test(text))consoleErrors.push(text);});
 page.on('response',response=>{if(response.status()>=400&&['script','stylesheet','font','image'].includes(response.request().resourceType()))assetErrors.push(response.url());});
 let scenario='success',analysisScenario='success',chatCalls=[],analysisCalls=0;
 const fixtureHtml='<html><head><title>403 Forbidden</title></head><body>Fixture session access denied.</body></html>';
 await page.route('**/api/source/analyze',route=>{analysisCalls++;return route.fulfill(analysisScenario==='mismatch'?{status:422,json:{code:'INVALID_BLUEPRINT',error:'Bukti sumber tidak cocok. (ID: hidden-source-fixture)',requestId:'hidden-source-fixture'}}:{json:{blueprint:{sourceVersion:route.request().postDataJSON().sourceVersion||1},contentHash:'fixture-hash',cacheHit:true}});});
 await page.route('**/api/chat',async route=>{
  const request=route.request();chatCalls.push({method:request.method(),url:request.url(),body:request.postDataJSON()});
  if(scenario==='delay'||scenario==='timeout'){await new Promise(resolve=>setTimeout(resolve,250));return route.fulfill({json:{answer:'Delayed fixture answer'}}).catch(()=>{});}
  if(scenario==='html403')return route.fulfill({status:403,contentType:'text/html',headers:{'X-Request-Id':'hidden-request-fixture'},body:fixtureHtml});
  if(scenario==='invalid')return route.fulfill({contentType:'application/json',body:'{invalid'});
  if(['401','429','503'].includes(scenario))return route.fulfill({status:Number(scenario),headers:{'Retry-After':'30'},json:{error:'Synthetic provider unavailable',requestId:'hidden-request-fixture'}});
  return route.fulfill({json:{answer:'Jawaban uji: cahaya membantu tumbuhan membentuk glukosa.'}});
 });
 await page.route(/\/api\/(study|exam\/grade|speech|research\/)/,route=>route.fulfill({status:503,json:{error:'Synthetic operation is not enabled in layout verification'}}));
 await page.goto(base+'/dashboard?view=home');await page.locator('.home-learning-layout').waitFor();
 const ids=await page.evaluate(async()=>{
  const make=(name,title,subject,text,chapter)=>{const source=OmniProduct.addSource({name,text,meta:{extractionMode:'test-fixture'}});source.lessonTitle=title;source.subject=subject;source.notes=text;source.journey={title,chapters:[{id:'intro',title:chapter,objective:'Tinjau sumber uji.',explanation:text,practice:{question:'Apa isi sumber?',answer:text,explanation:'Berdasarkan sumber uji.'}}]};source.activeChapter='intro';return source;};
  const biology=make('scan_biologi_FINAL.pdf','Sistem Pencernaan','Biologi','Lambung mengolah makanan. Usus menyerap zat gizi.','Lambung dan usus');
  biology.chat=[{role:'user',content:'Private document fixture'},{role:'assistant',content:'Private document answer'}];
  const chemistry=make('document(4).pdf','Ikatan Kimia','Kimia','Ikatan ion melibatkan perpindahan elektron.','Ikatan ion');
  biology.chat=[{role:'user',content:'Private document fixture'},{role:'assistant',content:'Private document answer'}];
  await OmniProduct.persistAsync();OmniProduct.selectSource(biology.id,true);return[biology.id,chemistry.id];
 });
 const home=async()=>{await page.evaluate(()=>OmniProduct.navigate('home'));await page.locator('.home-learning-layout').waitFor();};
 await home();await page.getByRole('button',{name:'Tanya umum',exact:true}).click();
 assert.equal(await page.evaluate(()=>OmniProduct.getCurrentSource().id),ids[0]);
 const ask=async question=>{await page.locator('#homeQuestion').fill(question);await page.locator('.home-composer [type=submit]').click();};
 let before=analysisCalls;
 await ask('Jelaskan teori relativitas Einstein');await page.getByText('Jawaban uji: cahaya membantu tumbuhan membentuk glukosa.',{exact:true}).waitFor();
 assert.equal(analysisCalls,before);assert.equal(chatCalls.at(-1).body.material,'');assert.equal(chatCalls.at(-1).body.materialId,'');
 assert.equal(chatCalls.at(-1).body.history.some(item=>item.content.includes('Private document')),false);
 assert.equal(await page.locator('#homeQuestion').inputValue(),'');
 await page.evaluate(()=>{for(let i=0;i<13;i++)OmniProduct.commitChatExchange('History fixture '+i,'History answer '+i);});
 await ask('Pertanyaan setelah riwayat penuh');await page.waitForFunction(()=>document.querySelector('#homeQuestion').value==='');
 assert.equal(chatCalls.at(-1).body.history.length,24);
 await page.getByRole('button',{name:'Berdasarkan materi',exact:true}).click();
 before=analysisCalls;await ask('Jelaskan fungsi lambung');await page.getByText('Jawaban uji: cahaya membantu tumbuhan membentuk glukosa.',{exact:true}).last().waitFor();
 assert.equal(analysisCalls,before+1);assert.equal(chatCalls.at(-1).body.materialId,ids[0]);assert.match(chatCalls.at(-1).body.material,/Lambung/);
 analysisScenario='mismatch';await home();
 const mismatchQuestion='Tolong periksa konsep dalam materi ini';before=chatCalls.length;
 await ask(mismatchQuestion);await page.locator('.ai-error').waitFor();
 assert.equal(chatCalls.length,before);assert.equal(await page.locator('#chatFeedback').textContent(),'');
 await page.getByRole('button',{name:'Pakai materi ini',exact:true}).click();
 assert.equal(await page.locator('#homeQuestion').inputValue(),mismatchQuestion);
 assert.equal(await page.evaluate(()=>OmniProduct.getCurrentSource().id),ids[0]);assert.equal(chatCalls.length,before);
 await ask(mismatchQuestion);await page.locator('.ai-error').waitFor();
 await page.getByRole('button',{name:'Jawab umum',exact:true}).click();await page.locator('.home-learning-layout').waitFor();
 assert.equal(await page.locator('#homeQuestion').inputValue(),mismatchQuestion);assert.equal(await page.evaluate(()=>OmniProduct.getCurrentSource().id),ids[0]);
 assert.equal(await page.evaluate(()=>OmniProduct.getChatScope()),'general');assert.equal(chatCalls.length,before);
 analysisScenario='success';
 for(const mode of ['html403','401','429','503','invalid']){
  scenario=mode;await home();const question='Pertanyaan uji '+mode;const calls=chatCalls.length;
  await ask(question);await page.locator('.ai-error').waitFor();
  assert.equal(chatCalls.length,calls+1);assert.equal(await page.locator('.ai-error').count(),1);assert.equal(await page.locator('#chatFeedback').textContent(),'');
  assert.equal(await page.locator('#homeQuestion').inputValue(),question);
  assert.doesNotMatch(await page.locator('.ai-error').innerText(),/hidden-request-fixture|<html>|Fixture session access/);
  assert.equal(await page.locator('.ai-error script,.ai-error img').count(),0);
  if(mode==='html403')report.responseEvidence={environment:'Synthetic proxy fixture; not the reported production incident',method:chatCalls.at(-1).method,url:chatCalls.at(-1).url,status:403,contentType:'text/html',first200Bytes:fixtureHtml.slice(0,200),geminiCalled:false};
 }
 scenario='timeout';await home();await page.evaluate(()=>{window.fixtureOriginalTimeout=window.setTimeout;window.setTimeout=(fn,ms,...args)=>window.fixtureOriginalTimeout(fn,ms===120000?20:ms,...args);});
 await ask('Pertanyaan uji timeout');await page.getByRole('heading',{name:'Belum ada jawaban',exact:true}).waitFor();
 await page.evaluate(()=>{window.setTimeout=window.fixtureOriginalTimeout;delete window.fixtureOriginalTimeout;});
 scenario='delay';await home();const requested=page.waitForRequest(request=>request.url().endsWith('/api/chat'));
 await ask('Pertanyaan yang dibatalkan');await requested;await page.locator('#cancelChat').click();
 await page.getByText('Jawaban dibatalkan. Pertanyaanmu tetap tersedia.',{exact:true}).waitFor();
 assert.equal(await page.locator('#homeQuestion').inputValue(),'Pertanyaan yang dibatalkan');
 await page.waitForFunction(()=>!document.querySelector('.home-composer [type=submit]').disabled);
 scenario='success';
 const originalChat=await page.evaluate(id=>OmniProduct.getSource(id).chat,ids[0]);
 await page.evaluate(()=>OmniProduct.clearVisibleChat());
 assert.deepEqual(await page.evaluate(id=>OmniProduct.getSource(id).chat,ids[0]),originalChat);
 await page.evaluate(async id=>{await OmniProduct.renameLesson(id,'Pencernaan manusia');await OmniProduct.persistAsync();},ids[0]);
 await page.reload();await page.locator('.home-learning-layout').waitFor();assert.ok((await page.locator('.home-library h3').allTextContents()).includes('Pencernaan manusia'));
 await page.getByRole('searchbox',{name:'Cari catatan',exact:true}).fill('Kimia');assert.deepEqual(await page.locator('.home-library h3').allTextContents(),['Ikatan Kimia']);
 await page.locator('.home-library [data-resume]').click();await page.getByRole('heading',{name:'Ikatan ion',exact:true}).waitFor();assert.equal(await page.evaluate(()=>OmniProduct.getCurrentSource().id),ids[1]);
 const navigate=async view=>{await page.evaluate(view=>OmniProduct.navigate(view),view);await page.locator(['quiz','cards','map','chat'].includes(view)?'.study-title':view==='journey'?'.journey-workspace':'.product-panel h1').first().waitFor();};
 for(const theme of ['light','dark'])for(const width of [375,390,768,1024,1440])for(const view of ['home','dashboard','journey']){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>OmniTheme.setPreference(theme),theme);await navigate(view);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,view+' '+width+' '+theme);
  if(view==='journey'&&width===390){const order=await page.evaluate(()=>({lesson:document.querySelector('.journey-workspace>article').getBoundingClientRect().top,nav:document.querySelector('.journey-workspace>nav').getBoundingClientRect().top}));assert.ok(order.lesson<order.nav);}
  report.checks.push({view,width,theme});
 }
 for(const theme of ['light','dark'])for(const width of [360,768,1280])for(const view of ['notes','subjects','exams','streaks','leaderboard','profile','updates','sources','quiz','cards','map','podcast']){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>OmniTheme.setPreference(theme),theme);await navigate(view);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,view+' '+width+' '+theme);report.checks.push({view,width,theme});
 }
 await page.goto(base+'/');await page.locator('.landing-hero').waitFor();
 for(const theme of ['light','dark'])for(const width of [375,768,1440]){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>OmniTheme.setPreference(theme),theme);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);report.checks.push({view:'landing',width,theme});
  if((width===1440&&theme==='dark')||(width===375&&theme==='light')){
   await page.locator('.landing-hero img').evaluate(image=>image.decode());await page.mouse.move(0,0);
   const name='landing-'+width+'-'+theme+'.png';await page.screenshot({path:path.join(output,name),animations:'disabled'});report.screenshots.push(name);
  }
 }
 await page.goto(base+'/dashboard?view=home');await page.locator('.home-learning-layout').waitFor();
 report.contrast=[];
 for(const theme of ['light','dark']){
  await page.evaluate(theme=>OmniTheme.setPreference(theme),theme);
  const pairs=await page.evaluate(()=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d',{willReadFrequently:true});
   const rgb=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3).map(v=>v/255);};
   const lum=rgb=>rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
   const color=token=>{const probe=document.createElement('span');probe.style.color='var('+token+')';document.body.append(probe);const result=rgb(getComputedStyle(probe).color);probe.remove();return result;};
   return [['--text','--bg'],['--text-muted','--surface'],['--text-muted','--surface2'],['--accent-ink','--surface'],['--accent-ink','--accent-soft'],['--on-primary','--accent'],['--success','--success-soft'],['--error','--error-soft'],['--xp-accent','--bg']].map(([text,background])=>{const a=lum(color(text)),b=lum(color(background));return{text,background,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});
  });
  report.contrast.push({theme,pairs});
  assert.ok(pairs.every(pair=>pair.ratio>=4.5),JSON.stringify({theme,pairs:pairs.filter(pair=>pair.ratio<4.5)}));
 }
 checkingFrame=true;await page.evaluate(()=>refreshAuthBridgeViaHiddenFrame(200));checkingFrame=false;
 report.authFrameCsp={blocked:frameBlocked,component:'server.js CSP frameSrc excludes same-origin auth recovery iframe',production403CauseConfirmed:false};
 assert.equal(frameBlocked,true);
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
 assert.deepEqual(pageErrors,[]);assert.deepEqual(assetErrors,[]);assert.deepEqual(consoleErrors,[]);
 for(const theme of ['light','dark'])for(const[view,width]of[['home',1440],['home',375],['dashboard',1440],['dashboard',375],['journey',1440],['journey',390]]){
  await page.setViewportSize({width,height:1000});await page.evaluate(theme=>OmniTheme.setPreference(theme),theme);await navigate(view);await page.evaluate(()=>document.fonts.ready);await page.evaluate(()=>scrollTo(0,0));
  if(view==='home')await page.locator('#homeQuestion').fill('');
  await page.evaluate(()=>document.activeElement?.blur());await page.mouse.move(0,0);
  const name=view+'-'+width+'-'+theme+'.png';await page.screenshot({path:path.join(output,name),animations:'disabled'});report.screenshots.push(name);
 }
 report.status='ASSERTIONS_PASSED_VISUAL_REVIEW_PENDING';report.aiCases=['JSON success','403 HTML','401','429','503','invalid JSON','timeout','user cancellation','source mismatch','general vs document privacy'];
 report.consoleErrors=consoleErrors;report.assetErrors=assetErrors;
}
run().catch(async error=>{report.status='FAIL';report.failures.push(error.stack);if(page)await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();await fs.writeFile(path.join(output,'browser-status.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:report.checks.length,screenshots:report.screenshots.length,failures:report.failures}));});
