// UI fixtures verify notices/recovery, not live Gemini availability or quality.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:3104';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
try {
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dialog=>dialog.accept());
  await page.route('**/api/chat',route=>route.fulfill({json:{answer:'Fixture tutor answer.',model:'fixture-fallback',fallbackUsed:true,cacheHit:false}}));
  await page.goto(`${base}/dashboard`);
  await page.locator('.master-composer textarea').fill('Explain a radius');
  await page.locator('.master-composer button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#chatFeedback')?.textContent.includes('Model: fixture-fallback'));
  assert.equal(await page.locator('#chatFeedback').isVisible(),true);
  assert.match(await page.locator('#chatFeedback').textContent(),/Model cadangan digunakan/);
  const retryAt=Date.now()+3600000;
  await page.route('**/api/source/analyze',route=>route.fulfill({status:429,json:{error:'Kuota harian fixture tercapai.',code:'GEMINI_DAILY_QUOTA',failureKind:'daily-quota',retryable:true,retryAt,stage:'source-analysis',requestId:'fixture'}}));
  await page.evaluate(async()=>{
    OmniProduct.addSource({name:'Keep this lesson.txt',text:'A radius joins the centre and boundary of a circle.'});
    await OmniProduct.saveOriginal(new File(['Original lesson bytes'],'Keep this lesson.txt',{type:'text/plain'}));
    OmniProduct.navigate('dashboard');
  });
  await page.locator('.master-composer textarea').fill('Explain my document');
  await page.locator('.master-composer button[type=submit]').click();
  await page.waitForFunction(()=>OmniProduct.pendingTasks().length===1);
  const task=await page.evaluate(()=>OmniProduct.pendingTasks()[0]);
  assert.equal(task.retryAt,retryAt);assert.equal(task.failureKind,'daily-quota');
  await page.evaluate(async()=>{await OmniProduct.persistAsync();OmniProduct.navigate('recovery');});
  await page.getByRole('heading',{name:'Permintaan tersimpan',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Coba kembali',exact:true}).isDisabled(),true);
  await page.reload();
  await page.getByRole('heading',{name:'Permintaan tersimpan',exact:true}).waitFor();
  const retained=await page.evaluate(async()=>{
    const source=OmniProduct.snapshot().sources[0];
    return {name:source.name,original:await(await OmniLocalLibrary.readFile(source.id,source.version)).text(),tasks:OmniProduct.pendingTasks().length};
  });
  assert.deepEqual(retained,{name:'Keep this lesson.txt',original:'Original lesson bytes',tasks:1});
  assert.deepEqual(errors,[]);
  console.log('AI browser checks passed: visible actual fallback model, retry time, disabled premature retry, source/original/recovery after reload.');
} finally {await browser.close();}
