import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:3108';
try {const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto(base+'/dashboard');await page.waitForFunction(()=>!!window.OmniProduct);
assert.deepEqual(await page.locator('nav[aria-label="Menu utama"] a').evaluateAll(nodes=>nodes.map(n=>n.dataset.view)),['home','dashboard','subjects','notes','exams','streaks','leaderboard','updates','profile']);
await page.locator('#productMenu').click();assert.equal(await page.locator('.product-sidebar').evaluate(n=>n.inert),true);await page.locator('#productMenu').click();
for(const view of ['home','dashboard','subjects','notes','exams','streaks','leaderboard','updates','profile']) {await page.locator('nav[aria-label="Menu utama"] [data-view='+view+']').click();assert.equal(await page.locator('nav[aria-label="Menu utama"] [data-view='+view+']').getAttribute('aria-current'),'page');}
await page.goBack();await page.waitForFunction(()=>document.querySelector('[data-view=updates]').classList.contains('active'));
await page.goForward();await page.waitForFunction(()=>document.querySelector('[data-view=profile]').classList.contains('active'));
await page.setViewportSize({width:390,height:844});assert.equal(await page.locator('#productMenu').getAttribute('aria-expanded'),'false');assert.equal(await page.locator('.product-sidebar').evaluate(n=>n.inert),true);
await page.locator('#productMenu').click();assert.equal(await page.locator('.product-sidebar').getAttribute('aria-modal'),'true');
await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'shellLogout');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('menu-product')),true);
await page.keyboard.press('Escape');assert.equal(await page.locator('#productMenu').getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>document.activeElement.id),'productMenu');
await page.evaluate(()=>{OmniProduct.addSource({name:'Lesson',text:'This lesson explains a radius and diameter.'});OmniProduct.navigate('note-editor');});
assert.equal(await page.locator('.material-navigation [data-view=journey]').textContent(),'Belajar');assert.equal(await page.locator('.material-navigation [data-view=video]').isVisible(),false);
await page.locator('#noteEditor').fill('Keep my lesson notes.');await page.evaluate(()=>OmniProduct.persistAsync());
for(const view of ['notes','note-editor','sources','journey','sticky','podcast','recovery','settings','learn']){await page.evaluate(v=>OmniProduct.navigate(v),view);assert.ok(await page.locator('.product-panel').isVisible());}
await page.goto(base+'/dashboard?view=home');await page.locator('.master-composer').waitFor();
assert.equal(await page.evaluate(()=>OmniProduct.snapshot().sources.find(s=>s.name==='Lesson').notes),'Keep my lesson notes.');let uploadRoute;await page.route('**/api/upload',route=>{uploadRoute=route;});
await page.evaluate(()=>{void OmniUploads.enqueue([new File(['Background extraction lesson.'],'background.txt',{type:'text/plain'})]);});
await page.waitForFunction(()=>uploadInFlight);
await page.evaluate(()=>OmniProduct.navigate('profile'));await page.locator('input[name=name]').waitFor();
while(!uploadRoute)await new Promise(resolve=>setTimeout(resolve,10));
await uploadRoute.fulfill({json:{status:'completed',filename:'background.txt',text:'Background extraction lesson.',pageCount:1}});
await page.waitForFunction(()=>OmniProduct.snapshot().sources.some(s=>s.name==='background.txt' && s.meta.uploadState==='completed'));
assert.match(page.url(),/view=profile/);assert.deepEqual(errors,[]);
console.log('Navigation checks passed: nine primary routes, history, desktop collapse, inert mobile drawer, focus trap/return, contextual tools and old URL alias.');
}finally{await browser.close();}
