import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
const base=process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:3107';
const luminance=hex=>{const c=hex.trim().slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
try {const page=await browser.newPage();await page.goto(base+'/dashboard');await page.waitForFunction(()=>!!window.OmniProduct);
for(const theme of ['light','dark']) {
await page.evaluate(t=>OmniTheme.setPreference(t),theme);
const colors=await page.evaluate(()=>{const s=getComputedStyle(document.body);return Object.fromEntries(['text-primary','text-secondary','text-muted','surface','primary','on-primary'].map(k=>[k,s.getPropertyValue('--'+k)]));});
for(const [a,b] of [['text-primary','surface'],['text-secondary','surface'],['text-muted','surface'],['on-primary','primary']]){const l=[luminance(colors[a]),luminance(colors[b])].sort((a,b)=>b-a);assert.ok((l[0]+.05)/(l[1]+.05)>=4.5,theme+' '+a);}
}
await page.evaluate(()=>OmniTheme.setPreference('system'));await page.emulateMedia({colorScheme:'dark',reducedMotion:'reduce'});await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
assert.equal(await page.locator('button').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
for(const width of [1440,1280,1024,768,390,360]){await page.setViewportSize({width,height:900});await page.goto(base+'/');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
console.log('Design checks passed: semantic text contrast, system theme, reduced motion and landing widths.');
}finally{await browser.close();}
