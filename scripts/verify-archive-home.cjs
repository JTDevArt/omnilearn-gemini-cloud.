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
    assert.equal(await page.locator('.home-recent-rows article').count(),0);
    await page.evaluate(async()=>{
      for(const [title,subject] of [['Sistem pencernaan','Biologi'],['Ikatan kimia','Kimia']]) {
        const source=OmniProduct.addSource({name:'scan_FINAL.pdf',text:'Materi uji yang cukup panjang untuk pelajaran.',meta:{extractionMode:'test-fixture'}});
        source.lessonTitle=title;source.subject=subject;
        source.journey={chapters:[{id:'intro',title:'Pengantar',explanation:'Isi uji.'}]};
        source.activeChapter='intro';
      }
      await OmniProduct.persistAsync();
      OmniProduct.navigate('home');
    });
    await page.locator('.home-recent-rows article').first().waitFor();
    assert.equal(await page.locator('.home-recent-rows article').count(),2);
    assert.doesNotMatch(await page.locator('.home-library').innerText(),/scan_FINAL/);
    await page.getByRole('combobox',{name:'Filter mata pelajaran',exact:true}).selectOption('Kimia');
    assert.deepEqual(await page.locator('.home-recent-rows h3').allTextContents(),['Ikatan kimia']);
    await page.getByRole('combobox',{name:'Filter mata pelajaran',exact:true}).selectOption('');
    await page.getByRole('searchbox',{name:'Cari catatan',exact:true}).fill('pencernaan');
    assert.equal(await page.locator('.home-recent-rows article').count(),1);
    await page.getByRole('searchbox',{name:'Cari catatan',exact:true}).fill('');
    await page.getByRole('button',{name:'Daftar',exact:true}).click();
    assert.equal(await page.locator('.home-recent-rows.list').count(),1);
    await page.getByRole('button',{name:'Galeri',exact:true}).click();
    await page.getByRole('button',{name:'Tanya umum',exact:true}).click();
    await page.locator('#homeQuestion').fill('Pertanyaan uji');
    await page.locator('.home-composer [type=submit]').click();
    await page.getByText('Jawaban uji tersimpan.',{exact:true}).waitFor();
    assert.equal(requests,1);
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
    await page.locator('.home-recent-rows [data-resume]').last().click();
    await page.locator('.journey-workspace').waitFor();
    assert.equal(await page.evaluate(()=>OmniProduct.getCurrentSource().lessonTitle),'Ikatan kimia');
    for(const [view,width] of [['home',1440],['dashboard',1440],['home',390]]) {
      await page.setViewportSize({width,height:1100});
      await page.evaluate(view=>{OmniTheme.setPreference('dark');OmniProduct.navigate(view);},view);
      await page.locator(view==='home'?'.home-library':'.dashboard-planning-column').waitFor();
      await page.screenshot({path:output+'/'+view+'-'+width+'-dark.png',fullPage:true,animations:'disabled'});
    }
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({status:'PASS',layoutChecks:checks.length,interactions:['empty state','real source titles','subject filter','search','gallery/list','mocked chat','correct source open'],screenshots:3,consoleErrors:errors,fontDelivery:'Network font requests blocked; declared fallback fonts tested.'}));
  } finally {await browser?.close();server.kill();}
}
run().catch(error=>{console.error(error);process.exitCode=1;});
