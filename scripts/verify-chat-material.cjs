const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

async function run() {
  const server = spawn(process.execPath, ['server.js'], {
    env: {...process.env, PORT:'0', NODE_ENV:'test', GEMINI_API_KEY:'TEST_ONLY_NOT_A_REAL_KEY'},
    stdio:['ignore','pipe','inherit'],
  });
  let browser;
  try {
    const base = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(Error('Server did not start')), 15000);
      server.stdout.on('data', chunk => {
        const port = String(chunk).match(/listening on port (\d+)/)?.[1];
        if (port) { clearTimeout(timeout); resolve('http://127.0.0.1:'+port); }
      });
      server.once('exit', code => { clearTimeout(timeout); reject(Error('Server exited '+code)); });
    });
    browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH, args:['--no-sandbox','--disable-dev-shm-usage']});
    const page = await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const answer = 'Relativitas khusus membahas ruang dan waktu.';
    let failChat = true;
    await page.route('**/api/chat', route => {
      if (failChat) {
        failChat = false;
        return route.fulfill({status:503,json:{code:'GEMINI_UNAVAILABLE'}});
      }
      return route.fulfill({json:{answer}});
    });
    await page.route('**/api/source/analyze', route => route.fulfill({json:{blueprint:{title:'Fisika',topics:[]}}}));
    let fail = true;
    let request;
    await page.route('**/api/study', route => {
      request = route.request().postDataJSON();
      if (fail) {
        fail = false;
        return route.fulfill({status:503,json:{code:'GEMINI_UNAVAILABLE',error:'Tutor temporarily unavailable'}});
      }
      return route.fulfill({json:{structuredData:{type:'journey',title:'Relativitas khusus',chapters:[
        {id:'chapter-1',title:'Ruang dan waktu',explanation:answer},
      ]}}});
    });

    const send = async prompt => {
      await page.locator('#homeQuestion').fill(prompt);
      await page.locator('.home-composer [type=submit]').click();
      await page.getByRole('button',{name:'Jadikan Materi',exact:true}).last().click();
      return page.getByRole('dialog',{name:'Jadikan Materi',exact:true});
    };
    await page.goto(base+'/dashboard?view=home');
    const prompt = 'Jelaskan teori relativitas Einstein';
    await page.locator('#homeQuestion').fill(prompt);
    await page.locator('.home-composer [type=submit]').click();
    await page.locator('#retryChat').click();
    await page.getByRole('button',{name:'Jadikan Materi',exact:true}).last().click();
    assert.equal(await page.locator('#chatMessages .user').filter({hasText:prompt}).count(),1);
    assert.equal(await page.evaluate(()=>OmniProduct.pendingTasks().length),0);
    const dialog = page.getByRole('dialog',{name:'Jadikan Materi',exact:true});
    const retry = dialog.getByRole('button',{name:'Coba susun ulang',exact:true});
    await retry.waitFor();
    assert.deepEqual(await page.evaluate(()=>OmniProduct.snapshot().sources),[]);
    await retry.click();
    await dialog.getByRole('textbox',{name:'Judul topik',exact:true}).fill('Einstein: Ruang dan Waktu');
    await dialog.getByRole('textbox',{name:'Judul bab',exact:true}).fill('Pengantar ruang dan waktu');
    assert.equal(request.material,'');
    assert.equal(request.materialId,'');
    assert.match(request.tutorConversation,/Jelaskan teori relativitas Einstein/);
    await dialog.getByRole('button',{name:'Simpan dan buka',exact:true}).click();
    await page.getByRole('heading',{name:'Einstein: Ruang dan Waktu',exact:true}).waitFor();
    const id = await page.evaluate(()=>OmniProduct.getCurrentSource().id);
    await page.reload();
    await page.getByRole('heading',{name:'Pengantar ruang dan waktu',exact:true}).waitFor();
    assert.equal(await page.evaluate(sourceId=>OmniProduct.getSource(sourceId).meta.origin,id),'tutor-general');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);

    const original = await page.evaluate(async()=>{
      const source = OmniProduct.addSource({name:'fisika.pdf',text:'[Halaman 1]\nRelativitas khusus membahas ruang dan waktu.',meta:{}});
      await OmniProduct.persistAsync();
      OmniProduct.navigate('home');
      return source.id;
    });
    const sourceDialog = await send('Apa topik pada materi ini?');
    await sourceDialog.getByRole('textbox',{name:'Judul topik',exact:true}).waitFor();
    assert.equal(request.materialId,original);
    assert.match(request.material,/\[Halaman 1\]/);
    await sourceDialog.getByRole('button',{name:'Simpan dan buka',exact:true}).click();
    await page.getByRole('heading',{name:'Relativitas khusus',exact:true}).waitFor();
    const result = await page.evaluate(originalId=>({
      parent: OmniProduct.getCurrentSource().meta.parentSourceId,
      originalName: OmniProduct.getSource(originalId).name,
      count: OmniProduct.snapshot().sources.length,
    }),original);
    assert.deepEqual(result,{parent:original,originalName:'fisika.pdf',count:3});
    assert.deepEqual(errors,[]);
    console.log('PASS: chat → retry → edit → save → reload; source-grounded derivative preserves original.');
  } finally {
    await browser?.close();
    if (server.exitCode === null) server.kill();
  }
}
run().catch(error => {console.error(error);process.exitCode=1;});
