import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduleReview, reviewKey, reviewStatus, reviewStats } from '../public/review-scheduler.js';

const DAY = 86_400_000;

test('four review grades produce distinct, persisted next reviews', () => {
  const now = Date.UTC(2026, 10, 6, 12);
  const again = scheduleReview({}, 'again', now);
  const hard = scheduleReview({}, 'hard', now);
  const good = scheduleReview({}, 'good', now);
  const easy = scheduleReview({}, 'easy', now);
  assert.equal(again.dueAt - now, 10 * 60 * 1000);
  assert.equal(again.repetitions, 0);
  assert.equal(again.lapses, 1);
  assert.equal(hard.repetitions, 0);
  assert.ok(hard.ease < good.ease);
  assert.equal(good.days, 1);
  assert.equal(easy.days, 4);
  for (const result of [again, hard, good, easy]) {
    assert.equal(result.reviews, 1);
    assert.equal(result.reviewedAt, now);
    assert.ok(result.dueAt > now);
  }
});

test('successful reviews grow the interval; difficulty slows it and forgetting resets it', () => {
  let review = {};
  for (let index = 0; index < 6; index++) {
    const next = scheduleReview(review, 'good', index * DAY);
    assert.ok(next.days > (review.days || 0));
    review = next;
  }
  const hard = scheduleReview(review, 'hard', 10 * DAY);
  const good = scheduleReview(review, 'good', 10 * DAY);
  const easy = scheduleReview(review, 'easy', 10 * DAY);
  assert.ok(hard.days < good.days);
  assert.ok(good.days < easy.days);
  const again = scheduleReview(review, 'again', 10 * DAY);
  assert.equal(again.repetitions, 0);
  assert.equal(again.lapses, 1);
  assert.equal(again.reviews, 7);
  assert.equal(scheduleReview(again, 'good', again.dueAt).days, 1);
});

test('legacy boolean schedules retain one-day reset and 1/3-day introduction', () => {
  const first = scheduleReview({}, true, 0);
  const second = scheduleReview(first, true, DAY);
  assert.equal(first.days, 1);
  assert.equal(second.days, 3);
  assert.equal(scheduleReview(second, false, 4 * DAY).dueAt, 5 * DAY);
});

test('invalid saved data cannot produce invalid due dates, and unsupported grades fail explicitly', () => {
  const previous = { repetitions: -20, days: Infinity, ease: 'invalid', reviews: -9 };
  const untouched = { ...previous };
  const result = scheduleReview(previous, 'good', 0);
  assert.deepEqual(previous, untouched);
  assert.equal(result.days, 1);
  assert.equal(result.reviews, 1);
  assert.ok(Number.isFinite(result.dueAt));
  assert.throws(() => scheduleReview({}, 'excellent', 0), TypeError);
  assert.throws(() => scheduleReview({}, 'good', NaN), TypeError);
  let difficult = {};
  for (let i = 0; i < 100; i++) difficult = scheduleReview(difficult, 'again', i * DAY);
  assert.equal(difficult.ease, 1.3);
});

test('review statistics distinguish new, learning, overdue, and mastered without storing answer text twice', () => {
  const now = Date.UTC(2026, 10, 6, 12);
  const cards = ['new', 'learning', 'overdue', 'mastered'].map(front => ({front, back: 'answer'}));
  const reviews = {
    [reviewKey(cards[1])]: scheduleReview({}, 'good', now),
    [reviewKey(cards[2])]: {dueAt: now - 1, reviewedAt: now - DAY, repetitions: 2, days: 3},
    [reviewKey(cards[3])]: {dueAt: now + 30 * DAY, reviewedAt: now, repetitions: 5, days: 30}
  };
  assert.equal(reviewStatus(reviews[reviewKey(cards[2])], now), 'overdue');
  assert.deepEqual(reviewStats(cards, reviews, now), {
    total: 4, new: 1, learning: 1, overdue: 1, mastered: 1, due: 2,
    reviewedToday: 2, nextDueAt: now + DAY
  });
});
