import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const base=process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:3109';
try {
 const page=await browser.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://www.youtube-nocookie.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Player transport fixture</title>'}));
 await page.goto(base+'/dashboard?view=home'); await page.locator('.home-secondary-tools summary').click(); await page.locator('[data-paste-material]').click();
 await page.getByRole('dialog',{name:'Tempel materi'}).getByLabel('Judul',{exact:true}).fill('Biologi');
 await page.getByRole('dialog',{name:'Tempel materi'}).getByLabel('Teks sumber',{exact:true}).fill('Sel adalah unit dasar kehidupan. Sel memiliki membran.');
 await page.getByRole('button',{name:'Simpan materi',exact:true}).click();
 await page.locator('[data-resume]').waitFor();
 await page.evaluate(async()=>{const s=OmniProduct.getCurrentSource();s.subject='Biologi';s.journey={title:'Sel',chapters:[{id:'a',title:'Dasar',objective:'Kenali sel',explanation:'Sel adalah unit dasar.',practice:{question:'Apa itu sel?',answer:'Unit dasar',explanation:'Sesuai sumber'}},{id:'b',title:'Membran',objective:'Kenali membran',explanation:'Sel memiliki membran.',practice:{question:'Apa batas sel?',answer:'Membran',explanation:'Sesuai sumber'}}]};s.activeChapter='b';s.completedChapters=['a'];await OmniProduct.persistAsync();OmniProduct.navigate('home');});
 await page.locator('[data-resume]').click(); await page.getByRole('heading',{name:'Membran',exact:true}).waitFor();
 await page.evaluate(()=>OmniProduct.navigate('dashboard')); await page.locator('[data-timer=start]').click();
 await page.evaluate(()=>OmniProduct.persistAsync()); await page.reload(); await page.locator('[data-timer=pause]').click();
 assert.equal(await page.locator('[data-timer=start]').isEnabled(),true);
 await page.locator('[data-timer=break]').click(); assert.match(await page.locator('[data-clock]').textContent(),/05:00/);
 await page.evaluate(()=>OmniProduct.persistAsync()); await page.reload(); await page.getByRole('timer',{name:'Sisa waktu istirahat'}).waitFor(); assert.equal(await page.getByRole('timer',{name:'Sisa waktu istirahat'}).textContent(),'05:00');
 await page.locator('[data-timer=focus]').click(); await page.locator('[data-timer=start]').click(); await page.locator('[data-timer=reset]').click(); assert.match(await page.locator('[data-clock]').textContent(),/25:00/);
 await page.evaluate(async()=>{const s=OmniProduct.addSource({name:'Video fixture',text:'A video transcript for learning.',meta:{youtubeUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',watchSeconds:42}});await OmniProduct.persistAsync();OmniProduct.navigate('dashboard');});
 await page.locator('.dashboard-materials>summary').click();
 const frame=page.frameLocator('.master-video iframe'); await frame.locator('title').waitFor({state:'attached'});
 assert.match(await page.locator('.master-video iframe').getAttribute('src'),/start=42/);
 await page.evaluate(()=>window.postMessage({event:'infoDelivery',info:{currentTime:999,duration:1000}},location.origin));
 assert.equal(await page.evaluate(()=>OmniProduct.getCurrentSource().meta.watchSeconds),42);
 await frame.locator('html').evaluate(()=>parent.postMessage(JSON.stringify({event:'infoDelivery',info:{currentTime:84,duration:200}}),'*'));
 await page.waitForFunction(()=>OmniProduct.getCurrentSource().meta.watchSeconds===84);
 await page.evaluate(()=>OmniProduct.persistAsync()); await page.reload(); await page.locator('.dashboard-materials>summary').click(); await page.locator('.master-video iframe').waitFor(); assert.match(await page.locator('.master-video iframe').getAttribute('src'),/start=84/);
 for(const width of [1440,768,390,360]) {await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 assert.deepEqual(errors,[]);console.log('Home checks passed: paste/save, chapter resume, persistent focus/break timer, video origin validation and progress, mobile layout. YouTube transport is a fixture.');
} finally {await browser.close();}
