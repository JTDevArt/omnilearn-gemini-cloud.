// Run against a local development server. Uses an externally installed Playwright.
import assert from "node:assert/strict";
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const base = process.env.DASHBOARD_TEST_URL || "http://127.0.0.1:3101";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/dashboard?view=subjects`);
  await page.locator(".master-heading").waitFor();
  await page.locator("input[name=subject]").fill("Biologi");
  await page.getByRole("button", { name: "Tambah", exact: true }).click();
  await page.getByRole("heading", { name: "Biologi", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Biologi", exact: true }).waitFor();
  // Legacy preference edits must preserve fields owned by newer dashboard views.
  await page.evaluate(() => {
    window.OmniProduct.updateDashboard(state => { state.profile.language = 'en'; });
    window.OmniProduct.navigate('settings');
  });
  await page.locator('.profile-form input[name="name"]').fill('Audit learner');
  await page.getByRole('button', {name: 'Simpan preferensi', exact: true}).click();
  await page.evaluate(() => window.OmniLocalLibrary.flush());
  await page.reload();
  await page.locator('.profile-form').waitFor();
  const savedProfile = await page.evaluate(() => window.OmniProduct.snapshot().profile);
  assert.deepEqual(savedProfile.subjects, ['Biologi']);
  assert.equal(savedProfile.language, 'en');
  assert.equal(savedProfile.name, 'Audit learner');
  await page.evaluate(() => {
    window.OmniProduct.addSource({
      name: "Biologi <script>.txt",
      text: "Sel adalah unit kehidupan.",
      meta: { extractionMode: "native-text" },
    });
    window.OmniProduct.navigate("dashboard");
  });
  await page.getByRole("button", { name: "Sematkan", exact: true }).click();
  await page.goto(`${base}/dashboard?view=pinned`);
  await page
    .getByRole("heading", { name: "Biologi <script>.txt", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("heading", { name: "Biologi <script>.txt", exact: true })
    .waitFor();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => window.OmniTheme.setPreference(value),
      theme,
    );
    for (const width of [1440, 1280, 1024, 768, 390, 360]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${base}/dashboard`);
      await page.locator(".master-composer").waitFor();
      assert.equal(
        await page.evaluate(() => document.documentElement.dataset.theme),
        theme,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({
        path: `/tmp/master-verified-${theme}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.locator("#productMenu").click();
  assert.equal(
    await page
      .locator("body")
      .evaluate((node) => node.classList.contains("dashboard-drawer")),
    true,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .locator("body")
      .evaluate((node) => node.classList.contains("dashboard-drawer")),
    false,
  );
  // An explicit unavailable-provider fixture verifies UI recovery without spending quota.
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Provider fixture unavailable",
        code: "AI_DEFERRED",
        requestId: "browser-fixture",
      }),
    }),
  );
  await page.route("**/api/source/analyze", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({
        error: "Provider fixture unavailable",
        code: "AI_DEFERRED",
        requestId: "browser-fixture",
      }),
    }),
  );
  await page.locator(".master-composer textarea").fill("Apa itu sel?");
  await page.locator(".master-composer button[type=submit]").click();
  await page
    .getByText("Provider fixture unavailable", { exact: false })
    .first()
    .waitFor();
  assert.equal(
    await page.locator(".master-section #chatMessages").isVisible(),
    true,
  );
  for (const view of [
    "subjects",
    "streaks",
    "leaderboard",
    "profile",
    "help",
    "pinned",
    "updates",
    "sources",
    "exams",
    "settings",
    "recovery",
  ]) {
    await page.goto(`${base}/dashboard?view=${view}`);
    await page.locator(".product-panel h1").waitFor();
  }
  await page.goto(`${base}/dashboard?view=chat`);
  await page.locator(".workspace #chatMessages").waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Dashboard browser checks passed: subjects/pins and legacy preferences persistence, escaped source titles, 12 viewport/theme combinations, drawer, unavailable-provider conversation, main and legacy routes.",
  );
} finally {
  await browser.close();
}
