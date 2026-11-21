// UI fixtures verify notices/recovery, not live Gemini availability or quality.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:3104';
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium',args:['--no-sandbox']});
try {
  const page=await browser.newPage();const errors=[];
  page.setDefaultTimeout(8000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('dialog',dialog=>dialog.accept());
  let holdHealth = false, heldHealth, chatPosts = 0;
  await page.route(/\/api\/health\?/, route => {
    if (holdHealth) { heldHealth = route; return; }
    return route.fulfill({json:{ready:true}});
  });
  await page.route('**/api/chat',route=>{
    chatPosts++;
    return route.fulfill({json:{answer:'Fixture tutor answer.',model:'fixture-fallback',fallbackUsed:true,cacheHit:false}});
  });
  await page.goto(`${base}/dashboard?view=home`);
  await page.locator('#homeQuestion').fill('Explain a radius');
  holdHealth = true;
  const preflight = page.waitForRequest(/\/api\/health\?/);
  await page.locator('.home-composer button[type=submit]').click();
  await preflight;
  await page.getByText('Menyusun penjelasan…',{exact:true}).waitFor();
  await page.locator('#cancelChat').click();
  await page.getByText('Jawaban dibatalkan. Pertanyaanmu tetap tersedia.',{exact:true}).waitFor({timeout:1500});
  assert.equal(chatPosts,0);
  holdHealth = false;
  await heldHealth?.abort().catch(()=>{});
  await page.locator('#retryChat').click();
  await page.getByText('Fixture tutor answer.',{exact:true}).waitFor();
  assert.equal(await page.locator('#chatFeedback').isVisible(),true);
  assert.match(await page.locator('#chatFeedback').textContent(),/Jawaban siap/);
  assert.doesNotMatch(await page.locator('body').innerText(),/fixture-fallback/);
  assert.equal(chatPosts,1);
  holdHealth = true;
  const bounded = await page.evaluate(async()=>{
    try {
      await safeRequestJson('/api/chat',{method:'POST',body:'{}'},{timeoutMs:150});
    } catch (error) {
      return {kind:error.kind,timeout:error.isTimeout};
    }
  });
  assert.deepEqual(bounded,{kind:'timeout',timeout:true});
  assert.equal(chatPosts,1);
  holdHealth = false;
  await heldHealth?.abort().catch(()=>{});
  await page.evaluate(()=>OmniProduct.navigate('recovery'));
  const details = page.locator('details').filter({hasText:'Diagnostik layanan'});
  await details.locator('summary').click();
  assert.match(await details.innerText(),/Model: fixture-fallback/);
  const retryAt=Date.now()+3600000;
  await page.route('**/api/source/analyze',route=>route.fulfill({status:429,json:{error:'Kuota harian fixture tercapai.',code:'GEMINI_DAILY_QUOTA',failureKind:'daily-quota',retryable:true,retryAt,stage:'source-analysis',requestId:'fixture'}}));
  await page.evaluate(async()=>{
    OmniProduct.addSource({name:'Keep this lesson.txt',text:'A radius joins the centre and boundary of a circle.'});
    await OmniProduct.saveOriginal(new File(['Original lesson bytes'],'Keep this lesson.txt',{type:'text/plain'}));
    OmniProduct.navigate('home');
  });
  await page.locator('#homeQuestion').fill('Explain my document');
  await page.locator('.home-composer button[type=submit]').click();
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
  await page.unroute('**/api/source/analyze');
  await page.route('**/api/source/analyze',route=>route.fulfill({json:{blueprint:{title:'Geometry',topics:[]}}}));
  let heldStudy;
  await page.route('**/api/study',route=>{heldStudy=route;});
  for (const [view,trigger,copy] of [
    ['quiz',page.locator('#regenQuizBtn'),'Menyusun soal dan kunci jawaban…'],
    ['cards',page.locator('#regenCardsBtn'),'Memilih konsep dan menyusun kartu…'],
    ['map',page.getByRole('button',{name:'Buat mindmap',exact:true}),'Menyusun konsep dan hubungannya…'],
  ]) {
    await page.evaluate(view=>OmniProduct.navigate(view),view);
    const study = page.waitForRequest('**/api/study');
    await trigger.click();
    await study;
    await page.getByText(copy,{exact:true}).waitFor();
    await page.getByRole('button',{name:'Batalkan pembuatan',exact:true}).press('Enter');
    await page.locator('#toolOutput .study-loading').waitFor({state:'hidden'});
    await heldStudy?.abort().catch(()=>{});
    assert.equal(await page.evaluate(()=>OmniProduct.pendingTasks().length),1);
  }
  assert.deepEqual(errors,[]);
  console.log('AI browser checks passed: bounded and cancellable preflight, single POST on retry, model in diagnostics, retry cooldown, retained original/recovery, and quiz/card/map cancellation.');
} finally {await browser.close();}
