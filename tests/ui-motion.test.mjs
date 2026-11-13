import test from 'node:test';
import assert from 'node:assert/strict';
import {enterView} from '../public/ui-motion.js';

test('view entrance skips reduced motion and detached views, and cancels the previous entrance', async () => {
  const original = globalThis.matchMedia;
  let listeners = 0, cancellations = 0, calls = 0;
  globalThis.matchMedia = () => ({matches:false,addEventListener(){listeners++;},removeEventListener(){listeners--;}});
  const resolvers = [];
  const host = {isConnected:true, animate(){
    calls++;
    return {cancel(){cancellations++;},finished:new Promise(resolve=>resolvers.push(resolve))};
  }};
  try {
    enterView(host, {reduced:true});
    enterView({...host,isConnected:false}, {reduced:false});
    assert.equal(calls,0);
    enterView(host); enterView(host);
    assert.equal(cancellations,1);
    assert.equal(calls,2);
    for (const resolve of resolvers) resolve();
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(listeners,0);
  } finally { globalThis.matchMedia = original; }
});
