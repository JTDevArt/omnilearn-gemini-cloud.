// Only loaded explicitly by the test runner's child process; never by server.js.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = String(input?.url || input);
  if (!url.includes('generativelanguage.googleapis.com')) return originalFetch(input, options);
  const mode = process.env.OMNILEARN_TEST_PROVIDER_MODE;
  const primary = url.includes('gemini-3.8-flash');
  const prompt = JSON.parse(options.body || '{}').contents?.flatMap(item => item.parts).map(part => part.text).join('\n') || '';
  console.log('[reliability-fixture] invocation');
  const error = (status, message, details=[]) => new Response(JSON.stringify({error:{code:status,message,details}}),
    {status,headers:{'Content-Type':'application/json'}});
  const response = (text, finishReason = 'STOP') => new Response(JSON.stringify({
    candidates: [{ content: { role: 'model', parts: [{ text }] }, finishReason }],
  }), { headers: { 'Content-Type':'application/json' } });
  if (mode === 'safety') return response('', 'SAFETY');
  if (mode === 'truncated') return response('', 'MAX_TOKENS');
  if (prompt.includes('Analyze only this source') && ['citation', 'blueprint-citation', 'encoded-citation'].includes(mode)) {
    const quote = 'A radius joins the centre to the circle boundary.';
    return response(JSON.stringify({
      subject: 'Geometry', overview: 'Circle measurements',
      concepts: [{ id: 'radius', name: 'Radius', definition: mode === 'blueprint-citation' ? `${quote} [Page 999]` : quote,
        evidence: { sectionId: 'section-1', quote } }],
      chapters: [{id: 'circle', title: 'Radius', conceptIds: ['radius'], prerequisites: []}],
      coverage: [{ sectionId: 'section-1', quote }],
    }));
  }
  if (mode==='auth') return error(400,'API_KEY_INVALID DO_NOT_LEAK_PROVIDER_DETAIL');
  if (mode==='permission') return error(403,'PERMISSION_DENIED DO_NOT_LEAK_PROVIDER_DETAIL');
  if (mode==='daily' || mode==='rate') return error(429, 'DO_NOT_LEAK_PROVIDER_DETAIL', [
    {'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaId:mode==='daily'?'RequestsPerDay':'RequestsPerMinute'}]},
    {'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:mode==='daily'?'7200s':'60s'}]);
  if (mode==='network') throw new TypeError('fetch failed DO_NOT_LEAK_PROVIDER_DETAIL');
  if (mode==='success' && url.includes('gemini-3.8-flash')) return error(404,'Fixture model not found');
  if (['json-syntax','json-schema','json-both'].includes(mode)) {
    const text = primary || mode === 'json-both'
      ? (mode === 'json-syntax' ? '{broken' : '{"cards":[{}]}')
      : JSON.stringify({cards:Array.from({length:5},(_,i)=>({front:`Question ${i}`,back:`Answer ${i}`}))});
    return new Response(JSON.stringify({candidates:[{content:{role:'model',parts:[{text}]},finishReason:'STOP'}]}),{headers:{'Content-Type':'application/json'}});
  }
  const latexCards = mode === 'latex-cards' ? JSON.stringify({cards:Array.from({length:5},(_,i)=>({front:`Question ${i}`,back:'Radius \\Delta relation'}))}).replaceAll('\\\\Delta','\\Delta') : null;
  const cards = JSON.stringify({cards:Array.from({length:5},(_,i)=>({front:`Question ${i}`,back:'Radius relation'}))});
  const studyCode = '```json [1, 2]```';
  const text = latexCards ?? ({
    empty:'', citation:'Unseen source [Page 999]', malformed:'{"cards":[{}]}', success:'Fixture tutor explanation.',
    'blueprint-citation':'The radius joins the centre to the boundary [Page 999].',
    'general-marker':'[Page 999] is literal notation in this example.',
    'fenced-cards':'```json\n'+cards+'\n```',
    'nested-cards':cards.replace('Question 0', `What value does ${studyCode} represent?`),
    'nested-map':JSON.stringify({centralTopic:'JSON values',branches:[{title:'Arrays',explanation:`An example is ${studyCode}.`}]}),
    'nested-journey':JSON.stringify({title:'JSON values',chapters:[{title:'Arrays',objective:'Read arrays',
      explanation:`An example is ${studyCode}.`,practice:{question:'How many items?',answer:'Two.',explanation:'Count both numbers.'}}]}),
    'empty-summary':primary ? '[Page 1]' : '# Radius\n- It joins the centre to the boundary.',
    'encoded-citation':cards.replace('Radius relation','Radius relation \\u005bPage 999\\u005d'),
  })[mode];
  return response(text);
};
