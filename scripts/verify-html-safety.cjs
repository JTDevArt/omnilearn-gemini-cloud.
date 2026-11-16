const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');
let server, browser;
async function run() {
  server=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'0',NODE_ENV:'test',GEMINI_API_KEY:'TEST_ONLY_NOT_A_REAL_KEY'},stdio:['ignore','pipe','pipe']});
  const base=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Server startup timeout')),15000);
    server.once('exit',()=>{clearTimeout(timer);reject(Error('Server exited'));});
    server.stdout.on('data',chunk=>{const port=String(chunk).match(/listening on port (\d+)/)?.[1];if(port){clearTimeout(timer);resolve('http://127.0.0.1:'+port);}});
  });
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  const page=await browser.newPage();
  await page.goto(base+'/dashboard?view=home');
  await page.locator('.home-composer').waitFor();
  const results=await page.evaluate(async()=>{
    window.__htmlSafetyExecuted=0;
    const attack='<img src="/missing-xss-fixture" onerror="window.__htmlSafetyExecuted++">';
    const payloads=[attack,'<svg onload="window.__htmlSafetyExecuted++"></svg>',
      '<a href="javascript:window.__htmlSafetyExecuted++">bad link</a>',
      '<iframe srcdoc="<script>parent.__htmlSafetyExecuted++</script>"></iframe>',
      '<form id="OmniHtml"><input name="sanitize"></form>',
      '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=window.__htmlSafetyExecuted++>">'];
    const root=document.createElement('div');document.body.append(root);
    const unsafe=node=>node.querySelector('script,iframe,object,embed,style,[onerror],[onload],a[href^="javascript:"]');
    for(const payload of payloads){root.innerHTML=OmniHtml.sanitize(payload);if(unsafe(root))throw Error('Unsafe sanitized HTML: '+payload);root.replaceChildren(OmniHtml.fragment(payload));if(unsafe(root))throw Error('Unsafe fragment: '+payload);}
    root.innerHTML=OmniHtml.sanitize('<form><input name="topic" value="safe"><input name="learnerName" value="Student"><input name="nodeTitle" value="Concept"><button data-open="notes">Notes</button></form><strong>kept</strong>');
    if(root.querySelector('input')?.value!=='safe'||!root.querySelector('[data-open="notes"]')||!root.querySelector('strong'))throw Error('Safe controls/formatting lost');
    const formData=new FormData(root.querySelector('form'));
    if(formData.get('learnerName')!=='Student'||formData.get('nodeTitle')!=='Concept')throw Error('Sanitized form bindings lost');
    setRenderedContent(root,'assistant','**Model output** '+attack+' [bad](javascript:alert(1))');
    if(unsafe(root)||!root.querySelector('strong'))throw Error('Assistant rendering unsafe or lost Markdown');
    setRenderedContent(root,'assistant','Formula: $x^2$');
    if(!root.querySelector('.katex'))throw Error('Math rendering lost');
    setToolOutputMarkdown('**Saved result** '+attack);
    if(unsafe(toolOutput))throw Error('Tool Markdown unsafe');
    conceptMapState={centralTopic:attack,summary:attack,branches:[{title:attack,relationToCenter:attack,subconcepts:[]}]};
    renderInteractiveConceptMap();
    if(unsafe(toolOutput))throw Error('Map rendering unsafe');
    if(!toolOutput.textContent.includes('<img'))throw Error('Escaped map title was not retained as text');
    const source=OmniProduct.addSource({name:'unsafe-fixture.txt',text:attack+' Uploaded text fixture.',meta:{extractionMode:'test-fixture'}});
    source.lessonTitle=attack+' Title';source.subject=attack+' Subject';source.notes=attack+' Notes';
    await OmniProduct.persistAsync();
    root.remove();
    return {payloads:payloads.length,executed:window.__htmlSafetyExecuted,controls:true,assistant:true,map:true,libraryRoutes:3};
  });
  for(const [view,selector] of [['notes','.notes-collection'],['subjects','.subjects-collection'],['sources','.source-card']]) {
    await page.evaluate(view=>OmniProduct.navigate(view),view);
    await page.locator(selector).first().waitFor();
    const unsafe=await page.locator('.product-panel').evaluate(host=>({
      element:!!host.querySelector('script,iframe,object,embed,style,[onerror],[onload],a[href^="javascript:"]'),
      text:host.textContent.includes('<img'),
    }));
    assert.equal(unsafe.element,false,view);
    assert.equal(unsafe.text,true,view);
  }
  await page.evaluate(()=>OmniProduct.navigate('map'));
  await page.locator('.study-title').waitFor();
  await page.evaluate(()=>{
    conceptMapState={centralTopic:'Original concept',summary:'',branches:[{title:'Branch',explanation:'A branch',subconcepts:[]}]};
    renderInteractiveConceptMap();
  });
  await page.locator('[data-edit-map]').click();
  await page.locator('.map-edit-dialog input[name="nodeTitle"]').fill('Edited concept');
  await page.locator('.map-edit-dialog button[type="submit"]').click();
  await page.locator('.map-edit-dialog').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>conceptMapState.centralTopic),'Edited concept');
  assert.equal(results.executed,0);
  await page.goto(base+'/design-preview.html#notes');
  await page.locator('.saved-lesson-card').first().waitFor();
  assert.equal(await page.evaluate(()=>typeof OmniHtml.sanitize),'function');
  console.log(JSON.stringify({status:'PASS',...results,preview:true,limits:'Browser payload fixtures and selected real renderers; not an exhaustive XSS proof or live provider test.'}));
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server?.kill();});
