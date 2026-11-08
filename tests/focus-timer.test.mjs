import test from 'node:test';
import assert from 'node:assert/strict';
import {transition, remaining} from '../public/focus-timer.js';
test('focus deadline survives reload/background throttling and pause/resume', () => {
  const started = transition(undefined,'start',1000);
  assert.equal(remaining(JSON.parse(JSON.stringify(started)),61000),1440);
  const paused = transition(started,'pause',61000);
  assert.equal(remaining(paused,90000),1440);
  const resumed = transition(paused,'start',100000);
  assert.equal(remaining(resumed,1540000),0);
  assert.equal(transition(resumed,'tick',1540000).running,false);
  assert.deepEqual(transition(resumed,'break'),{mode:'break',seconds:300,running:false});
  assert.equal(transition(paused,'reset').seconds,1500);
});
