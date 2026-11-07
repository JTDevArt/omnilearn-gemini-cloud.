// Real IndexedDB transactions and product recovery; no provider credentials needed.
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.DASHBOARD_TEST_URL || 'http://127.0.0.1:3103';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/api/health`);
  await page.addScriptTag({url: `${base}/local-library.js`});
  await page.addScriptTag({url: `${base}/vendor/jszip.min.js`});
  const checks = await page.evaluate(async () => {
    const db = OmniLocalLibrary;
    const { exportBackup, importBackup, restoredSource } = await import('/backup-format.js');
    const first = {id:'lesson', version:1, name:'Lesson.txt', text:'Original text', notes:'Keep notes', hasOriginal:true, generated:{summary:{markdown:'Summary'}}};
    const second = {...first, version:2, text:'Revised text', versions:[first]};
    const library = {schemaVersion:1, sources:[second], profile:{subjects:['Science']}};
    await db.importData(library, [1, 2].map(version => ({sourceId:'lesson', version, file:new File([`original-${version}`], 'Lesson.txt', {type:'text/plain'})})));
    const bytes = await exportBackup({JSZip, snapshot:await db.load(), readFile:db.readFile});
    const bundle = await importBackup({JSZip, bytes});
    // Queue a namespace change and a read together: the read must see the new owner.
    const switching = db.setNamespace('account-a');
    const empty = await db.load();
    await switching;
    const isolated = empty === null && !(await db.readFile('lesson', 1));
    await db.importData(bundle.snapshot, bundle.files.map(f => ({sourceId:f.sourceId, version:f.version, file:new File([f.data], f.name, {type:f.mimeType})})));
    const originals = await Promise.all([1,2].map(async v => (await db.readFile('lesson',v)).text()));
    const restored = restoredSource(bundle.snapshot.sources[0], bundle.snapshot.sources[0].versions[0]);
    await db.importData({...library, sources:[restored]});
    const rollback = await db.readRollback();
    await db.setNamespace('guest');
    const guest = await db.load();
    // Abort an actual readwrite transaction, rather than mocking save's return value.
    const originalTransaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function(...args) {
      const tx = originalTransaction.apply(this, args);
      if (args[1] === 'readwrite') queueMicrotask(() => tx.abort());
      return tx;
    };
    let aborted = false;
    try { await db.importData({schemaVersion:1, sources:[]}, [{sourceId:'lesson',version:1,file:new File(['corrupt'],'Lesson.txt')}]); }
    catch { aborted = true; }
    finally { IDBDatabase.prototype.transaction = originalTransaction; }
    return {isolated, originals, revisions:restored.versions.map(v=>v.version), rollbackVersion:rollback.sources[0].version,
      guestVersion:guest.sources[0].version, aborted, retained:(await db.load()).sources[0].text,
      originalRetained:await (await db.readFile('lesson',1)).text()};
  });
  assert.deepEqual(checks, {isolated:true, originals:['original-1','original-2'], revisions:[1,2], rollbackVersion:2, guestVersion:2, aborted:true, retained:'Revised text', originalRetained:'original-1'});
  const other = await context.newPage();
  await other.goto(`${base}/api/health`);
  await other.addScriptTag({url:`${base}/local-library.js`});
  await other.evaluate(async () => { const value = await OmniLocalLibrary.load(); value.profile.name = 'Other tab'; await OmniLocalLibrary.save(value); });
  assert.match(await page.evaluate(async () => { try { await OmniLocalLibrary.save({schemaVersion:1,sources:[]}); } catch(e) { return e.message; } }), /tab lain/);
  await other.close();
  await page.goto(`${base}/dashboard?view=notes`);
  await page.waitForFunction(() => !!window.OmniProduct);
  await page.evaluate(() => { OmniProduct.selectSource('lesson'); OmniProduct.navigate('notes'); });
  await page.locator('#noteEditor').fill('Notes survive navigation and reload');
  await page.evaluate(async () => { await OmniLocalLibrary.flush(); OmniProduct.navigate('subjects'); });
  await page.reload();
  await page.waitForFunction(() => !!window.OmniProduct);
  assert.equal(await page.evaluate(() => OmniProduct.getSource('lesson').notes), 'Notes survive navigation and reload');
  await page.evaluate(() => {
    window.realSave = OmniLocalLibrary.save;
    OmniLocalLibrary.save = () => Promise.reject(new Error('Storage fixture full'));
    OmniProduct.navigate('profile');
  });
  await page.locator('input[name=name]').fill('Unsaved learner');
  await page.getByRole('button', {name:'Simpan',exact:true}).click();
  await page.getByText('Belum tersimpan di perangkat. Storage fixture full', {exact:true}).waitFor();
  assert.equal(await page.evaluate(() => OmniProduct.storageStatus().unsavedChanges), true);
  assert.equal(await page.evaluate(() => !dispatchEvent(new Event('beforeunload', {cancelable:true}))), true);
  assert.equal(await page.getByText('Preferensi tersimpan di pustaka perangkat.', {exact:true}).count(), 0);
  await page.evaluate(() => OmniProduct.navigate('sources'));
  page.on('dialog', dialog => dialog.accept());
  await page.locator('[data-action=delete]').click();
  await page.waitForFunction(() => OmniProduct.storageStatus().pendingWrites === 0);
  assert.equal(await page.evaluate(() => OmniProduct.snapshot().sources.length), 1);
  assert.equal(await page.evaluate(async () => (await OmniLocalLibrary.readFile('lesson',1)).text()), 'original-1');
  await page.evaluate(async () => { OmniLocalLibrary.save = realSave; await OmniProduct.persistAsync(); });
  assert.equal(await page.evaluate(() => OmniProduct.storageStatus().unsavedChanges), false);
  // Older malformed optional fields remain recoverable and do not crash Subjects.
  await page.evaluate(async () => { await OmniProduct.updateDashboard(s => {s.profile.subjects = 42;}); });
  await page.goto(`${base}/dashboard?view=subjects`);
  await page.locator('input[name=subject]').fill('Math');
  await page.getByRole('button', {name:'Tambah',exact:true}).click();
  await page.getByRole('heading', {name:'Math',exact:true}).waitFor();
  assert.equal(await page.evaluate(() => OmniProduct.snapshot().profile.legacySubjects), 42);
  await page.evaluate(() => OmniProduct.navigate('sources'));
  await page.locator('[data-action=delete]').click();
  await page.waitForFunction(() => OmniProduct.snapshot().sources.length === 0 && OmniProduct.storageStatus().pendingWrites === 0);
  await page.evaluate(() => OmniLocalLibrary.flush());
  await page.reload();
  await page.waitForFunction(() => !!window.OmniProduct);
  assert.equal(await page.evaluate(() => OmniProduct.snapshot().sources.length), 0);
  assert.equal(await page.evaluate(() => OmniLocalLibrary.readFile('lesson', 1)), undefined);
  assert.deepEqual(errors, []);
  console.log('Storage browser checks passed: originals, ZIP, revisions, rollback, account isolation, aborted transactions, tab conflicts, reload, failed saves and deletion.');
} finally { await browser.close(); }
