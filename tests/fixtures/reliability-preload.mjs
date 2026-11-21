// Only loaded explicitly by the test runner's child process; never by server.js.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = String(input?.url || input);
  if (!url.includes('generativelanguage.googleapis.com')) return originalFetch(input, options);
  const mode = process.env.OMNILEARN_TEST_PROVIDER_MODE;
  console.log('[reliability-fixture] invocation');
  const error = (status, message, details=[]) => new Response(JSON.stringify({error:{code:status,message,details}}),
    {status,headers:{'Content-Type':'application/json'}});
  if (mode==='auth') return error(400,'API_KEY_INVALID DO_NOT_LEAK_PROVIDER_DETAIL');
  if (mode==='permission') return error(403,'PERMISSION_DENIED DO_NOT_LEAK_PROVIDER_DETAIL');
  if (mode==='daily' || mode==='rate') return error(429, 'DO_NOT_LEAK_PROVIDER_DETAIL', [
    {'@type':'type.googleapis.com/google.rpc.QuotaFailure',violations:[{quotaId:mode==='daily'?'RequestsPerDay':'RequestsPerMinute'}]},
    {'@type':'type.googleapis.com/google.rpc.RetryInfo',retryDelay:mode==='daily'?'7200s':'60s'}]);
  if (mode==='network') throw new TypeError('fetch failed DO_NOT_LEAK_PROVIDER_DETAIL');
  if (mode==='success' && url.includes('gemini-3.8-flash')) return error(404,'Fixture model not found');
  if (['json-syntax','json-schema','json-both'].includes(mode)) {
    const primary = url.includes('gemini-3.8-flash');
    const text = primary || mode === 'json-both'
      ? (mode === 'json-syntax' ? '{broken' : '{"cards":[{}]}')
      : JSON.stringify({cards:Array.from({length:5},(_,i)=>({front:`Question ${i}`,back:`Answer ${i}`}))});
    return new Response(JSON.stringify({candidates:[{content:{role:'model',parts:[{text}]},finishReason:'STOP'}]}),{headers:{'Content-Type':'application/json'}});
  }
  const latexCards = mode === 'latex-cards' ? JSON.stringify({cards:Array.from({length:5},(_,i)=>({front:`Question ${i}`,back:'Radius \\Delta relation'}))}).replaceAll('\\\\Delta','\\Delta') : null;
  const cards = JSON.stringify({cards:Array.from({length:5},(_,i)=>({front:`Question ${i}`,back:'Radius relation'}))});
  const text = latexCards ?? ({
    empty:'', citation:'Unseen source [Page 999]', malformed:'{"cards":[{}]}', success:'Fixture tutor explanation.',
    'fenced-cards':'```json\n'+cards+'\n```',
    'encoded-citation':cards.replace('Radius relation','Radius relation \\u005bPage 999\\u005d'),
  })[mode];
  return new Response(JSON.stringify({candidates:[{content:{role:'model',parts:[{text}]},finishReason:'STOP'}]}),
    {headers:{'Content-Type':'application/json'}});
};
