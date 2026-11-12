import test from 'node:test';
import assert from 'node:assert/strict';
import { progressMetrics } from '../public/progress-metrics.js';
import { scheduleReview, reviewKey } from '../public/review-scheduler.js';

test('empty metrics never invent XP, cards or streaks', () => {
  assert.deepEqual(progressMetrics([], { events: [] }, 0), {
    xp: 0, level: 0, levelStartXp: 0, nextLevelXp: 100,
    levelProgress: 0, longestStreak: 0, cardsDue: 0, cardsReviewed: 0
  });
});
test('counts longest consecutive streak, progress and actual due cards', () => {
  const now = Date.parse('2026-11-12T12:00:00Z');
  const card = {front:'A', back:'B'};
  const review = scheduleReview({}, 'again', now - 20 * 60 * 1000);
  const activity = {events: [
    {id:'a',day:'2026-11-07',points:25},
    {id:'b',day:'2026-11-08',points:50},
    {id:'c',day:'2026-11-09',points:50},
    {id:'d',day:'2026-11-11',points:5},
  ]};
  const sources = [{deck:[card],reviews:{[reviewKey(card)]:review}}];
  const result = progressMetrics(sources, activity, now);
  assert.equal(result.xp, 130);
  assert.equal(result.level, 2);
  assert.equal(result.levelProgress, 30);
  assert.equal(result.longestStreak, 3);
  assert.equal(result.cardsDue, 1);
  assert.equal(result.cardsReviewed, 1);
});
test('dedupes activity days and handles malformed source collections', () => {
  const result = progressMetrics([{deck:'invalid'}, null], {events:[
    {day:'2026-01-01',points:-999},{day:'2026-01-01',points:'bad'},
    {day:'2026-01-03',points:3}
  ]}, 0);
  assert.equal(result.longestStreak, 1);
  assert.equal(result.xp, 3);
  assert.equal(result.cardsDue, 0);
});
