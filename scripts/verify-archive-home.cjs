const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

async function run() {
  const output = process.env.OMNILEARN_QA_OUTPUT || '/tmp/omnilearn-archive-review';
  await fs.mkdir(output, {recursive:true});
  const server = spawn(process.execPath, ['server.js'], {
    env:{...process.env, PORT:'0', NODE_ENV:'test', GEMINI_API_KEY:'TEST_ONLY_NOT_A_REAL_KEY'},
    stdio:['ignore','pipe','pipe'],
  });
  let browser;
  try {
    const base = await new Promise((resolve,reject) => {
      const deadline = setTimeout(()=>reject(Error('Server startup timeout')),15000);
      server.stdout.on('data', chunk => {
        const port = String(chunk).match(/listening on port (\d+)/)?.[1];
        if(port) {clearTimeout(deadline);resolve('http://127.0.0.1:'+port);}
      });
      server.once('exit', code=>reject(Error('Server exited '+code)));
    });
    browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
    const page = await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'reduce'});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.route(/^https:\/\/fonts\./,route=>route.abort());
    let requests=0;
    await page.route('**/api/chat',route=>{requests++;return route.fulfill({json:{answer:'Jawaban uji tersimpan.'}});});
    await page.goto(base+'/dashboard?view=home');
    await page.locator('.home-library').waitFor();
    assert.equal(await page.locator('.home-library .master-note').count(),0);
    await page.evaluate(async()=>{
      for(const [title,subject] of [['Sistem pencernaan','Biologi'],['Ikatan kimia','Kimia']]) {
        const source=OmniProduct.addSource({name:'scan_FINAL.pdf',text:'Materi uji yang cukup panjang untuk pelajaran.',meta:{extractionMode:subject==='Kimia'?'paste':'test-fixture'}});
        source.lessonTitle=title;source.subject=subject;
        source.journey={chapters:[{id:'intro',title:'Pengantar',explanation:'Isi uji.'}]};
        source.activeChapter='intro';
      }
      await OmniProduct.persistAsync();
      OmniProduct.navigate('home');
    });
    const homeNotes = page.locator('.home-library .master-note');
    await homeNotes.first().waitFor();
    assert.equal(await homeNotes.count(),2);
    assert.doesNotMatch(await page.locator('.home-library').innerText(),/scan_FINAL/);
    await page.getByRole('combobox',{name:'Filter mata pelajaran',exact:true}).selectOption('Kimia');
    assert.deepEqual(await homeNotes.locator('h3').allTextContents(),['Ikatan kimia']);
    await page.getByRole('combobox',{name:'Filter mata pelajaran',exact:true}).selectOption('');
    await page.getByRole('searchbox',{name:'Cari catatan',exact:true}).fill('pencernaan');
    assert.equal(await homeNotes.count(),1);
    await page.getByRole('searchbox',{name:'Cari catatan',exact:true}).fill('tidak ditemukan');
    await page.getByRole('button',{name:'Atur ulang filter',exact:true}).click();
    assert.equal(await homeNotes.count(),2);
    await page.getByRole('combobox',{name:'Format catatan',exact:true}).selectOption('paste');
    assert.deepEqual(await homeNotes.locator('h3').allTextContents(),['Ikatan kimia']);
    await page.getByRole('combobox',{name:'Format catatan',exact:true}).selectOption('all');
    await page.getByRole('button',{name:'Daftar',exact:true}).click();
    assert.equal(await page.locator('.home-library .master-library.list').count(),1);
    await page.getByRole('button',{name:'Galeri',exact:true}).click();
    await page.getByRole('button',{name:'Tanya umum',exact:true}).click();
    await page.locator('#homeQuestion').fill('Pertanyaan uji');
    await page.locator('.home-composer [type=submit]').click();
    await page.getByText('Jawaban uji tersimpan.',{exact:true}).waitFor();
    assert.equal(requests,1);
    await page.locator('#homeQuestion').fill('Draf untuk sumber');
    await page.getByRole('button',{name:'Pilih materi',exact:true}).or(page.getByRole('button',{name:'Ganti materi',exact:true})).click();
    const picker = page.getByRole('dialog',{name:'Pilih sumber untuk tutor',exact:true});
    const search = picker.getByRole('searchbox',{name:'Cari sumber',exact:true});
    assert.equal(await search.evaluate(node=>node===document.activeElement),true);
    await search.fill('Kimia');
    await picker.getByRole('button',{name:'Ikatan kimia Kimia',exact:true}).click();
    assert.equal(await page.locator('#homeQuestion').inputValue(),'Draf untuk sumber');
    await page.locator('.home-session.has-source').waitFor();
    assert.equal(await page.locator('.home-source-context strong').textContent(),'Ikatan kimia');
    assert.equal(await page.getByRole('button',{name:'Berdasarkan materi',exact:true}).getAttribute('aria-pressed'),'true');
    await page.evaluate(()=>OmniProduct.navigate('dashboard'));
    await page.getByRole('button',{name:'Buat Catatan',exact:true}).click();
    const editor = page.getByRole('dialog',{name:'Buat Catatan',exact:true});
    await editor.getByLabel('Judul',{exact:true}).fill('Catatan fisika');
    await editor.getByLabel('Isi catatan',{exact:true}).fill('Energi adalah kemampuan melakukan usaha.');
    await editor.getByRole('button',{name:'Simpan catatan',exact:true}).click();
    await page.locator('.dashboard-resources').getByRole('button',{name:'Catatan fisika',exact:true}).waitFor();
    await page.reload();
    await page.locator('.dashboard-resources').getByRole('button',{name:'Catatan fisika',exact:true}).waitFor();
    assert.equal(await page.locator('.dashboard-summary a').filter({hasText:'Catatan ditulis'}).locator('strong').textContent(),'1');
    await page.getByRole('combobox',{name:'Urutan',exact:true}).selectOption('title');
    assert.deepEqual(await page.locator('.dashboard-resources h3').allTextContents(),['Catatan fisika','Ikatan kimia','Sistem pencernaan']);
    const checks=[];
    for(const theme of ['light','dark']) for(const width of [360,390,768,1280,1440]) for(const view of ['home','dashboard']) {
      await page.setViewportSize({width,height:1100});
      await page.evaluate(({theme,view})=>{OmniTheme.setPreference(theme);OmniProduct.navigate(view);},{theme,view});
      await page.locator(view==='home'?'.home-library':'.dashboard-planning-column').waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,view+' '+width+' '+theme);
      checks.push({view,width,theme});
    }
    await page.evaluate(()=>OmniProduct.navigate('home'));
    await page.locator('.home-library').waitFor();
    await page.locator('.home-library').getByRole('button',{name:'Ikatan kimia',exact:true}).click();
    await page.locator('.journey-workspace').waitFor();
    assert.equal(await page.evaluate(()=>OmniProduct.getCurrentSource().lessonTitle),'Ikatan kimia');
    for(const [view,width] of [['home',1440],['dashboard',1440],['home',390],['dashboard',390]]) {
      await page.setViewportSize({width,height:1100});
      await page.evaluate(view=>{OmniTheme.setPreference('dark');OmniProduct.navigate(view);},view);
      await page.locator(view==='home'?'.home-library':'.dashboard-planning-column').waitFor();
      await page.screenshot({path:output+'/'+view+'-'+width+'-dark.png',fullPage:true,animations:'disabled'});
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({status:'PASS',layoutChecks:checks.length,interactions:['empty state','real source titles','folder filter','search and reset','format filter','gallery/list','mocked chat','document scope selection','create and reload note','real stats','title sort','correct source open'],screenshots:4,consoleErrors:errors,fontDelivery:'Network font requests blocked; declared fallback fonts tested.'}));
  } finally {await browser?.close();server.kill();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
