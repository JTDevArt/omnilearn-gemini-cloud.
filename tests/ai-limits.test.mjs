import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { createAiDailyLimiter, positiveEnvInteger } from '../lib/ai-limits.js';

test('daily admission covers every paid route and shares IP/session budgets', async () => {
  for (const scope of ['IP', 'SESSION']) {
    const app = express();
    app.use(express.json());
    app.use(createAiDailyLimiter({AI_DAILY_LIMIT_PER_IP:scope === 'IP' ? '2' : '100', AI_DAILY_LIMIT_PER_SESSION:scope === 'SESSION' ? '2' : '100'}));
    app.use((_req,res)=>res.json({ok:true}));
    const server = app.listen(0, '127.0.0.1');
    await new Promise(resolve=>server.once('listening',resolve));
    try {
      const base = `http://127.0.0.1:${server.address().port}`;
      const post = (path, sessionId='same') => fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId})});
      assert.equal((await post('/api/chat')).status,200);
      assert.equal((await post('/api/study',scope==='IP'?'rotated':'same')).status,200);
      for (const route of ['/api/chat','/api/study','/api/source/analyze','/api/exam/grade','/api/research/search','/api/research/synthesize','/api/speech']) {
        const response = await post(route);
        assert.equal(response.status,429,route);
        assert.equal((await response.json()).code,'AI_DAILY_LIMIT');
        assert.ok(response.headers.get('retry-after'));
      }
      assert.equal((await fetch(base+'/api/health')).status,200);
      assert.equal((await post('/api/upload')).status,200);
    } finally { await new Promise(resolve=>server.close(resolve)); }
  }
  assert.throws(()=>positiveEnvInteger({X:'0'},'X',10));
});
