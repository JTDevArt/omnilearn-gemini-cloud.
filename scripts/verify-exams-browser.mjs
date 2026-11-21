import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});const base=process.env.DASHBOARD_TEST_URL||'http://127.0.0.1:3110';
try {const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(base+'/dashboard');await page.waitForFunction(()=>!!window.OmniProduct);
await page.evaluate(async()=>{OmniProduct.addSource({name:'First lesson',text:'A cell is a unit of life.'});OmniProduct.addSource({name:'Second lesson',text:'A membrane is a boundary.'});await OmniProduct.updateDashboard(s=>{s.profile.subjects=['Zoologi','Biologi'];s.sources[0].subject='Zoologi';s.sources[1].subject='Zoologi';});OmniProduct.navigate('subjects');});
await page.getByRole('combobox',{name:'Urutan mata pelajaran'}).selectOption('count');assert.equal(await page.locator('.master-subject h3').first().textContent(),'Zoologi');await page.locator('[data-assign]').first().selectOption('Biologi');await page.waitForFunction(()=>OmniProduct.snapshot().sources[0].subject==='Biologi');await page.locator('.subject-search').fill('Zoologi');await page.locator('.master-subject:visible .subject-edit > summary').click();await page.locator('.master-subject:visible').getByRole('button',{name:'Hapus pelajaran'}).click();await page.waitForFunction(()=>OmniProduct.snapshot().sources.every(s=>s.subject!=='Zoologi'));assert.equal(await page.evaluate(()=>OmniProduct.snapshot().sources.length),2);
await page.evaluate(()=>OmniProduct.navigate('exams'));await page.getByLabel('Judul ujian',{exact:true}).fill('Cells exam');await page.getByLabel('Durasi (menit)',{exact:true}).fill('1');await page.getByLabel('Tingkat kesulitan',{exact:true}).selectOption('easy');await page.getByLabel('Pertanyaan',{exact:true}).fill('What is a cell?');await page.getByLabel('Pilihan jawaban',{exact:true}).fill('Unit of life\nMetal');await page.getByLabel('Kunci jawaban',{exact:true}).fill('A');await page.getByRole('button',{name:'Tambahkan soal',exact:true}).click();
await page.locator('.exam-builder').getByLabel('Jenis soal',{exact:true}).selectOption('short');await page.getByLabel('Pertanyaan',{exact:true}).fill('Name the boundary.');await page.getByLabel('Kunci jawaban',{exact:true}).fill('membrane');await page.getByRole('button',{name:'Tambahkan soal',exact:true}).click();await page.getByRole('button',{name:'Simpan bank soal',exact:true}).click();await page.getByRole('button',{name:'Cells exam · 2 soal',exact:true}).click();assert.equal(await page.getByLabel('Judul ujian',{exact:true}).inputValue(),'Cells exam');assert.equal(await page.getByLabel('Durasi (menit)',{exact:true}).inputValue(),'1');
for (const theme of ['light','dark']) for (const width of [1440,768,390,360]) {
  await page.setViewportSize({width,height:900});
  await page.evaluate(theme=>OmniTheme.setPreference(theme),theme);
  const layout = await page.evaluate(() => {
    const box = selector => document.querySelector(selector).getBoundingClientRect();
    const setup = box('.exam-selection'), history = box('.exam-history');
    return {
      overflow: document.documentElement.scrollWidth > innerWidth,
      bankBelow: box('.exam-bank-area').top >= Math.max(setup.bottom, history.bottom),
      adjacent: history.left >= setup.right,
    };
  });
  assert.deepEqual(layout,{overflow:false,bankBelow:true,adjacent:width===1440},`${theme} ${width}`);
}
await page.getByLabel('Komposisi ujian').selectOption('mix');await page.getByRole('button',{name:'Mulai ujian',exact:true}).click();await page.locator('.exam-selection [role=status]').getByText(/Bank hanya memiliki/).waitFor();await page.getByLabel('Komposisi ujian').selectOption('all');await page.getByLabel('Jumlah soal ujian').fill('2');await page.getByRole('button',{name:'Mulai ujian',exact:true}).click();await page.getByLabel('Unit of life',{exact:true}).check();await page.getByRole('button',{name:'Tandai tinjau',exact:true}).click();await page.getByRole('button',{name:'Berikutnya',exact:true}).click();await page.getByLabel('Jawaban',{exact:true}).fill('membrane');await page.evaluate(()=>OmniProduct.persistAsync());await page.reload();
const resume = page.getByRole('button',{name:'Cells exam · Lanjutkan',exact:true});
await resume.focus();
await page.keyboard.press('Enter');
assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Cells exam');
assert.equal(await page.locator('.exam-question-nav [aria-current="step"]').textContent(),'2');
assert.equal(await page.getByLabel('Jawaban',{exact:true}).inputValue(),'membrane');await page.getByRole('button',{name:'Kumpulkan',exact:true}).click();await page.getByText(/2 \/ 2 poin/).waitFor();await page.evaluate(()=>OmniProduct.persistAsync());await page.reload();await page.getByRole('button',{name:'Cells exam · Hasil',exact:true}).click();await page.getByText(/2 \/ 2 poin/).waitFor();
assert.deepEqual(errors,[]);console.log('Exams/subjects passed: bank creation/save/restore, difficulty, composition shortages, timer, answers/flags/cursor reload, scores/history, subject sorting/move/delete preserves sources.');}finally{await browser.close();}
