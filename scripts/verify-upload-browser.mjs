const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base=process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:3106';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
try {
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.goto(base+'/dashboard');await page.waitForFunction(()=>!!window.OmniProduct);
await page.evaluate(()=>OmniUploads.enqueue([new File(['A radius connects the centre and boundary.'],'lesson.txt',{type:'text/plain'})]));
await page.getByText('Teks dan file asli tersimpan. Tinjau sebelum analisis AI.',{exact:true}).waitFor();
assert.equal(await page.evaluate(()=>OmniProduct.snapshot().sources[0].hasOriginal),true);
await page.route('**/api/upload',r=>r.fulfill({status:503,json:{error:'Fixture unavailable',code:'GEMINI_UNAVAILABLE'}}));
await page.evaluate(()=>OmniUploads.enqueue([new File(['Keep this original after an extraction failure.'],'retry.txt',{type:'text/plain'})]));
assert.equal(await page.getByRole('button',{name:'Coba lagi',exact:true}).count(),1);
await page.reload();await page.waitForFunction(()=>!!window.OmniProduct);
assert.equal(await page.evaluate(async()=>{const s=OmniProduct.snapshot().sources.find(s=>s.name==='retry.txt');return (await OmniLocalLibrary.readFile(s.id,1)).text();}),'Keep this original after an extraction failure.');
await page.unroute('**/api/upload');await page.getByRole('button',{name:'Coba lagi',exact:true}).click();
await page.getByText('Teks dan file asli tersimpan. Tinjau sebelum analisis AI.',{exact:true}).waitFor();assert.deepEqual(errors,[]);
console.log('Upload browser passed: extraction, original retention, refresh and retry.');
} finally {await browser.close();}
