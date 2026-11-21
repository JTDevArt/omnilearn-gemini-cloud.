import assert from 'node:assert/strict';

const {chromium} = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:3159';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const url = base + '/dashboard?view=home';

try {
  const page = await browser.newPage({viewport:{width:360,height:800},reducedMotion:'reduce'});
  let accountStatus;
  await page.route('**/api/account/status', route => { accountStatus = route; });
  await page.route(/\/api\/health\?/, () => {});
  const accountRequest = page.waitForRequest('**/api/account/status');
  await page.goto(url, {waitUntil:'commit'});
  await accountRequest;
  const splash = page.locator('#appStartup');
  await splash.getByRole('status').getByText('Membuka ruang belajar…',{exact:true}).waitFor();
  assert.equal(await splash.evaluate(element=>element.getAnimations({subtree:true}).length),0);
  assert.equal(await page.getByRole('button',{name:'Buka atau tutup sidebar'}).isVisible(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await accountStatus.fulfill({json:{configured:false}});
  await splash.waitFor({state:'hidden'});
  await page.locator('.home-composer').waitFor();
  await page.close();

  const stalled = await browser.newPage();
  await stalled.clock.install();
  await stalled.route('**/product.js', () => {});
  await stalled.goto(url,{waitUntil:'commit'});
  await stalled.waitForFunction(()=>!!window.OmniAppStartup);
  await stalled.clock.fastForward(12001);
  const retry = stalled.getByRole('link',{name:'Muat ulang',exact:true});
  await retry.waitFor();
  await stalled.unroute('**/product.js');
  await retry.click();
  await stalled.locator('.home-composer').waitFor();
  assert.equal(await stalled.locator('#appStartup').isVisible(),false);
  await stalled.close();

  for (const method of ['() =>', 'async () =>']) {
    const failed = await browser.newPage();
    await failed.route('**/dashboard-shell.js', route => route.fulfill({
      contentType:'application/javascript',
      body:`window.OmniDashboard = {render: ${method} {throw new Error('Startup fixture');}};`,
    }));
    await failed.goto(url);
    await failed.getByText('Ruang belajar gagal dibuka. Muat ulang untuk mencoba lagi.',{exact:true}).waitFor();
    assert.equal(await failed.getByRole('link',{name:'Muat ulang',exact:true}).isVisible(),true);
    await failed.close();
  }
  console.log('Startup passed: delayed initialization, no provider wait, reduced motion, timeout/reload, and sync/async renderer failure.');
} finally {
  await browser.close();
}
