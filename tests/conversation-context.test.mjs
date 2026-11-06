import test from 'node:test';
import assert from 'node:assert/strict';
import { selectConversationContext } from '../lib/conversation-context.js';
test('context keeps recent followups and retrieves relevant older actual messages', () => {
  const history = Array.from({ length: 12 }, (_, i) => ({
    role: i % 2 ? 'model' : 'user',
    parts: [{ text: i === 1 ? 'Chlorophyll absorbs light.' : 'message ' + i }]
  }));
  const selected = selectConversationContext(
    history,
    'Tell me about chlorophyll'
  );
  assert.ok(selected.includes(history[1]));
  assert.ok(selected.includes(history[11]));
  assert.ok(selected.includes(history[10]));
  assert.ok(selected.length <= 8);
  assert.deepEqual(
    selected.filter((m) => !history.includes(m)),
    []
  );
});
test('context is bounded and does not select irrelevant old messages', () => {
  const history = Array.from({ length: 20 }, (_, i) => ({
    role: 'user',
    parts: [{ text: String(i) + ' '.repeat(99) }]
  }));
  const selected = selectConversationContext(history, 'unrelated', 250);
  assert.equal(selected.length, 2);
  assert.equal(selected.at(-1), history.at(-1));
});
