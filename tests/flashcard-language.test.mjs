import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFlashcardsData } from '../lib/learning-engine.js';
test('card metadata follows output language and non-Latin questions remain distinct', () => {
  const cards = normalizeFlashcardsData({
    cards: [
      { front: '什么是半径？', back: '从圆心到圆周的线段。', category: '定义' },
      { front: '什么是直径？', back: '经过圆心的弦。', category: '定义' },
    ],
  });
  assert.equal(cards.length, 2);
  assert.equal(
    normalizeFlashcardsData(
      [{ front: 'Radius?', back: 'Centre to boundary.', category: 'Definisi' }],
      'en'
    )[0].category,
    'Definition'
  );
  assert.equal(
    normalizeFlashcardsData(
      [{ front: 'Radius?', back: 'Centre to boundary.' }],
      'en'
    )[0].category,
    'Core concept'
  );
});
