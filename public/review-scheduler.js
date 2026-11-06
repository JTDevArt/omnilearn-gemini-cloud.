// A small, deterministic SM-2-inspired scheduler. Storage belongs to the source library.
const DAY = 86_400_000;
const GRADES = new Set(['again', 'hard', 'good', 'easy']);
const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const count = value => Math.max(0, Math.floor(finite(value, 0)));

export function reviewKey(card) {
  return JSON.stringify([String(card?.front || ''), String(card?.back || '')]);
}

export function scheduleReview(previous = {}, gradeOrBoolean = 'good', now = Date.now()) {
  const legacy = typeof gradeOrBoolean === 'boolean';
  const grade = legacy ? (gradeOrBoolean ? 'good' : 'again') : gradeOrBoolean;
  if (!GRADES.has(grade)) throw new TypeError('Review grade must be again, hard, good, or easy.');
  if (!Number.isFinite(now)) throw new TypeError('Review time must be a finite timestamp.');
  previous = previous && typeof previous === 'object' ? previous : {};
  const oldRepetitions = count(previous.repetitions);
  const oldDays = Math.max(0, finite(previous.days, 0));
  const oldEase = Math.min(3.5, Math.max(1.3, finite(previous.ease, 2.5)));
  let repetitions = oldRepetitions;
  let ease = oldEase;
  let days;

  if (grade === 'again') {
    repetitions = 0;
    ease = Math.max(1.3, oldEase - .2);
    // Existing yes/no reviews retain their original next-day behavior.
    days = legacy ? 1 : 10 / 1440;
  } else if (grade === 'hard') {
    ease = Math.max(1.3, oldEase - .15);
    days = Math.max(1, Math.ceil(oldDays * 1.2));
  } else {
    repetitions++;
    ease = Math.min(3.5, oldEase + (grade === 'easy' ? .15 : .1));
    days = repetitions === 1 ? (grade === 'easy' ? 4 : 1)
      : repetitions === 2 ? (grade === 'easy' ? Math.max(7, Math.ceil(oldDays * 1.3)) : Math.max(3, Math.ceil(oldDays * 1.2)))
      : Math.max(oldDays + 1, Math.round(Math.max(oldDays, 3) * ease * (grade === 'easy' ? 1.3 : 1)));
  }
  days = Math.min(36_500, days);
  const result = {
    repetitions, ease: Number(ease.toFixed(2)), days, grade,
    reviews: count(previous.reviews) + 1,
    lapses: count(previous.lapses) + (grade === 'again' ? 1 : 0),
    reviewedAt: now, dueAt: now + Math.round(days * DAY)
  };
  return result;
}

export function reviewStatus(review, now = Date.now()) {
  if (!review || !Number.isFinite(review.dueAt)) return 'new';
  if (review.dueAt <= now) return 'overdue';
  if (count(review.repetitions) >= 3 && finite(review.days, 0) >= 21) return 'mastered';
  return 'learning';
}

export function reviewStats(cards = [], reviews = {}, now = Date.now()) {
  const stats = { total: cards.length, new: 0, learning: 0, overdue: 0, mastered: 0, due: 0, reviewedToday: 0, nextDueAt: null };
  const dayStart = new Date(now).setHours(0, 0, 0, 0);
  for (const card of cards) {
    const review = reviews[reviewKey(card)];
    const status = reviewStatus(review, now);
    stats[status]++;
    if (status === 'new' || status === 'overdue') stats.due++;
    if (review?.reviewedAt >= dayStart && review.reviewedAt <= now) stats.reviewedToday++;
    if (Number.isFinite(review?.dueAt) && review.dueAt > now && (stats.nextDueAt === null || review.dueAt < stats.nextDueAt)) stats.nextDueAt = review.dueAt;
  }
  return stats;
}
