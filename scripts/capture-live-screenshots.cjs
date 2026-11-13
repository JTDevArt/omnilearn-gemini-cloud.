/* Captures public, anonymous live-site screenshots only.
   No credentials, cookies, production edits or AI requests. */
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const base = 'https://omnilearnid.ai.studio';
const routes = [
  ['01-ai-home', '/dashboard?view=home', 1440],
  ['02-dashboard', '/dashboard?view=dashboard', 1440],
  ['03-ai-home-mobile', '/dashboard?view=home', 390]
];
const target = path.join(process.cwd(), 'live-ui-screenshots');
const results = [];

async function run() {
  await fs.mkdir(target, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    for (const [name, route, width] of routes) {
      const page = await browser.newPage({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        colorScheme: 'dark',
        locale: 'id-ID',
        reducedMotion: 'reduce'
      });
      const record = { name, route, viewport: {width, height:900}, checkedAt: new Date().toISOString() };
      try {
        const response = await page.goto(base + route, {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        record.httpStatus = response?.status() ?? null;
        await page.waitForTimeout(1400);
        await page.evaluate(() => document.fonts.ready).catch(() => {});
        record.finalUrl = page.url();
        record.title = await page.title();
        const bodyText = (await page.locator('body').innerText({ timeout: 8000 })).trim();
        record.visibleTextExcerpt = bodyText.slice(0, 280);
        const looksBroken = /Cannot GET\s|ERR_CONNECTION|This site can.t be reached|404 Not Found/i.test(bodyText);
        const looksLikeAuth = /sign in|log in|masuk dengan google|silakan masuk|please sign in/i.test(bodyText) &&
          bodyText.length < 1500;
        const sameOrigin = new URL(record.finalUrl).origin === new URL(base).origin;
        record.status = looksBroken || (record.httpStatus !== null && record.httpStatus >= 400) ?
          'error_page' : !sameOrigin || looksLikeAuth ? 'login_or_redirect' :
          bodyText.length < 40 ? 'incomplete_or_empty' : 'rendered_anonymous';
        await page.screenshot({ path: path.join(target, name + '.png'), fullPage: true, animations: 'disabled', timeout: 15000 });
      } catch (error) {
        record.status = 'navigation_or_capture_failed';
        record.error = String(error?.message || error).slice(0, 500);
        try {
          await page.screenshot({ path: path.join(target, name + '-error.png'), timeout: 8000 });
        } catch {}
      } finally {
        results.push(record);
        console.log(JSON.stringify(record));
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await fs.writeFile(path.join(target, 'STATUS.json'), JSON.stringify({
      note: 'Screenshots are from an unauthenticated Chromium session against the public live host. They are NOT evidence of signed-in UI. No application data or credentials were used.',
      testedOrigin: base,
      screenshotPolicy: 'Three views: Home desktop, Dashboard desktop, Home mobile. Other checks belong to verify-home-visual.cjs.',
      results
    }, null, 2));
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
