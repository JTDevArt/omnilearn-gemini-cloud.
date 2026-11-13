const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

const output = path.resolve('visual-qa');
const report = {status:'BLOCKED',build:process.env.GITHUB_SHA || 'local',screenshots:[],checks:[],failures:[]};
let server, browser, page;

async function startServer() {
  server = spawn(process.execPath,['server.js'],{
    env:{...process.env,PORT:'0',NODE_ENV:'test',GEMINI_API_KEY:'TEST_ONLY_NOT_A_REAL_KEY'},
    stdio:['ignore','pipe','pipe'],
  });
  return new Promise((resolve,reject)=>{
    const timer = setTimeout(()=>reject(new Error('Fixture server startup timed out')),15000);
    server.once('exit',code=>{clearTimeout(timer);reject(new Error('Fixture server exited '+code));});
    server.stdout.on('data',chunk=>{
      const port = String(chunk).match(/listening on port (\d+)/)?.[1];
      if(port){clearTimeout(timer);resolve('http://127.0.0.1:'+port);}
    });
  });
}

async function open(base,view) {
  await page.goto(base+'/dashboard?view='+view);
  await page.locator(view==='home'?'.home-composer':'.dashboard-focus [data-clock]').waitFor();
  if(view==='home') await page.locator('.home-hero img').evaluate(image=>image.decode());
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>scrollTo(0,0));
}

async function checkLayout(view,width,theme) {
  const measurements = await page.evaluate(()=>{
    const box = selector=>{
      const node=document.querySelector(selector),rect=node?.getBoundingClientRect();
      return rect?{x:rect.x,y:rect.y,width:rect.width,height:rect.height,bottom:rect.bottom}:null;
    };
    const input=document.querySelector('.home-composer textarea');
    return {
      overflow:document.documentElement.scrollWidth>innerWidth,
      overflowingElements:[...document.querySelectorAll('main *')].filter(node=>{
        const r=node.getBoundingClientRect();return r.width>0 && (r.right>innerWidth+1 || r.left< -1);
      }).map(node=>node.tagName+'.'+node.className).slice(0,8),
      mascot:box('.home-hero img'),header:box('.product-top'),composer:box('.home-composer'),
      send:box('.home-composer [type=submit]'),level:box('.dashboard-level'),timer:box('.dashboard-focus'),
      inputBorder:input?getComputedStyle(input).borderTopWidth:null,
      imageLoaded:document.querySelector('.home-hero img')?.naturalWidth>0,
      theme:document.documentElement.dataset.theme,scrollY,
      profileLines:(()=>{const range=document.createRange();range.selectNodeContents(document.querySelector('.master-profile'));return range.getClientRects().length;})(),
    };
  });
  assert.equal(measurements.theme,theme);
  assert.equal(measurements.profileLines,1,'Profile text must remain on one line');
  assert.equal(measurements.overflow,false,JSON.stringify(measurements));
  assert.deepEqual(measurements.overflowingElements,[],JSON.stringify(measurements));
  if(view==='home') {
    assert.equal(measurements.inputBorder,'0px','Textarea must not create a nested border');
    assert.equal(measurements.imageLoaded,true,'Mascot must load');
    assert.ok(measurements.mascot.y>=measurements.header.bottom,'Mascot must not sit beneath the header');
    assert.ok(measurements.send.bottom<=900,'Send action must fit initial viewport');
    assert.equal(await page.locator('.home-session>.master-section').count(),0);
  } else if(width>=1024) {
    assert.ok(Math.abs(measurements.level.y-measurements.timer.y)<2,'Level and timer must share a row');
    assert.ok(measurements.timer.x>measurements.level.x,'Timer belongs in right column');
  }
  report.checks.push({view,width,theme,...measurements});
}

async function run() {
  await fs.mkdir(output,{recursive:true});
  const base=await startServer();
  browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:{width:1440,height:900},deviceScaleFactor:1,colorScheme:'dark',locale:'id-ID',reducedMotion:'reduce'});
  const errors=[];
  page=await context.newPage();
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>localStorage.setItem('omnilearn-theme','dark'));
  let inferenceCalls=0;
  await page.route(/\/api\/(chat|generate|source\/analyze)(\?|$)/,route=>{
    inferenceCalls++;
    return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Synthetic provider unavailable',code:'AI_DEFERRED'})});
  });
  await open(base,'home');
  assert.equal((await (await page.request.get(base+'/api/health')).json()).uiBuild,'algorithmic-v9.1-1');
  for(const theme of ['dark','light']) {
    for(const width of [1440,1280,1024,820,768,390,360]) {
      await page.setViewportSize({width,height:900});
      await page.evaluate(value=>OmniTheme.setPreference(value),theme);
      for(const view of ['home','dashboard']) {
        await page.evaluate(value=>OmniProduct.navigate(value),view);
        await page.locator(view==='home'?'.home-composer':'.dashboard-focus [data-clock]').waitFor();
        if(view==='home') await page.locator('.home-hero img').evaluate(image=>image.decode());
        await checkLayout(view,width,theme);
      }
    }
  }
  assert.equal(inferenceCalls,0,'Layout/theme navigation must not spend AI quota');

  await page.setViewportSize({width:390,height:900});
  await page.locator('#productMenu').click();
  assert.equal(await page.locator('#productMenu').getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#productMenu').getAttribute('aria-expanded'),'false');
  await page.evaluate(()=>OmniProduct.navigate('home'));
  const input=page.locator('#homeQuestion');
  await input.fill('Synthetic study question retained after an unavailable provider.');
  await input.focus();
  assert.equal(await input.evaluate(node=>getComputedStyle(node).outlineStyle),'none');
  assert.equal(await page.locator('.home-composer').evaluate(node=>getComputedStyle(node).outlineStyle),'solid');
  await page.locator('.home-composer [type=submit]').click();
  await page.getByText('Synthetic provider unavailable',{exact:false}).first().waitFor();
  assert.notEqual(await input.inputValue(),'','Failed requests must preserve draft');
  await input.fill('Draft for navigation and refresh');
  await page.evaluate(()=>OmniProduct.navigate('dashboard'));
  await page.locator('.dashboard-focus').waitFor();
  await page.locator('[data-timer=start]').click();
  await page.locator('[data-timer=pause]').click();
  assert.equal(await page.locator('[data-timer=start]').isEnabled(),true);
  await page.locator('[data-timer=reset]').click();
  await page.goBack();
  await page.locator('.home-composer').waitFor();
  assert.equal(await input.inputValue(),'Draft for navigation and refresh');
  await page.reload();
  await page.locator('.home-composer').waitFor();
  assert.equal(await input.inputValue(),'Draft for navigation and refresh');
  await page.locator('.home-secondary-tools summary').click();
  await page.locator('[data-paste-material]').click();
  await page.locator('dialog').waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('dialog[open]').count(),0);
  assert.equal(await page.locator('[data-paste-material]').evaluate(node=>node===document.activeElement),true);
  const chooser=page.waitForEvent('filechooser');
  await page.locator('.home-composer [data-upload]').click();
  await (await chooser).setFiles([]);
  assert.equal(await page.locator('.home-composer').isVisible(),true,'Canceling the file picker must keep Home visible');
  await page.locator('.home-composer [data-transcript]').click();
  await page.locator('.transcript-form').waitFor();
  await page.keyboard.press('Escape');
  await page.evaluate(()=>OmniProduct.navigate('home'));
  await page.locator('.home-composer').waitFor();
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  assert.deepEqual(errors,[]);
  report.interactions='PASS: draft on failure/navigation/refresh, drawer Escape, timer start/pause/reset, paste dialog Escape/focus restoration, upload picker, YouTube transcript, reduced motion, no inference on navigation. Provider error is a fixture; microphone/live AI not tested.';
  await context.close();

  const clean=await browser.newContext({deviceScaleFactor:1,colorScheme:'dark',locale:'id-ID',reducedMotion:'reduce'});
  page=await clean.newPage();
  await page.addInitScript(()=>localStorage.setItem('omnilearn-theme','dark'));
  const captures=process.env.QA_SKIP_SCREENSHOTS==='1'?[]:[['01-home-desktop','home',1440],['02-dashboard-desktop','dashboard',1440],['03-home-mobile','home',390]];
  for(const [name,view,width] of captures) {
    await page.setViewportSize({width,height:900});
    await open(base,view);
    await page.screenshot({path:path.join(output,name+'.png'),animations:'disabled'});
    report.screenshots.push({file:name+'.png',view,width,height:900,theme:'dark',scrollY:0});
  }
  report.status='ASSERTIONS_PASSED_VISUAL_REVIEW_PENDING';
}

run().catch(async error=>{
  report.status=browser?'FAIL':'BLOCKED';
  report.failures.push(error.stack || String(error));
  if(page && !page.isClosed()) {
    try {await page.screenshot({path:path.join(output,'assertion-failure.png')});} catch {}
  }
  process.exitCode=1;
}).finally(async()=>{
  await browser?.close();
  server?.kill();
  await fs.mkdir(output,{recursive:true});
  await fs.writeFile(path.join(output,'STATUS.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
});
