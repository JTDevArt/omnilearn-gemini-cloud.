import test from 'node:test';
import assert from 'node:assert/strict';
import {clearSubmittedDraft} from '../public/home-draft.js';

test('successful response clears only the submitted draft', () => {
  const values = new Map([['draft', 'first']]);
  const storage = {getItem: key => values.get(key) ?? null, removeItem: key => values.delete(key)};
  values.set('draft', 'newer message');
  assert.equal(clearSubmittedDraft(storage, 'draft', 'first'), false);
  assert.equal(values.get('draft'), 'newer message');
  assert.equal(clearSubmittedDraft(storage, 'draft', 'newer message'), true);
  assert.equal(values.has('draft'), false);
  assert.equal(clearSubmittedDraft({getItem(){throw new Error('blocked');}}, 'draft', 'first'), false);
});
