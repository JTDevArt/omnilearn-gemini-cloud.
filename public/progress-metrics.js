import { reviewStats } from './review-scheduler.js';

const positive = value => Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function progressMetrics(sources = [], activity = {}, now = Date.now()) {
  const events = Array.isArray(activity?.events) ? activity.events : [];
  const xp = events.reduce((total, event) =>
    total + positive(Number(event?.points)), 0);
  const level = xp ? Math.floor(xp / 100) + 1 : 0;
  const levelStartXp = level ? (level - 1) * 100 : 0;
  const nextLevelXp = level ? level * 100 : 100;
  const levelProgress = xp ? Math.min(100, Math.round(
    100 * (xp - levelStartXp) / Math.max(1, nextLevelXp - levelStartXp))) : 0;
  const days = [...new Set(events.map(event => event?.day)
    .filter(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)))].sort();
  let longestStreak = 0, current = 0, previous = null;
  for (const day of days) {
    const epoch = Date.parse(day + 'T00:00:00Z');
    current = previous !== null && epoch - previous === 86_400_000 ? current + 1 : 1;
    longestStreak = Math.max(longestStreak, current);
    previous = epoch;
  }
  let cardsDue = 0, cardsReviewed = 0;
  for (const source of Array.isArray(sources) ? sources : []) {
    const cards = Array.isArray(source?.deck) ? source.deck : [];
    if (!cards.length) continue;
    const info = reviewStats(cards, source?.reviews && typeof source.reviews === 'object' ?
      source.reviews : {}, now);
    cardsDue += info.due;
    cardsReviewed += cards.reduce((total, card) => {
      const key = JSON.stringify([String(card?.front || ''), String(card?.back || '')]);
      const count = Number(source?.reviews?.[key]?.reviews);
      return total + (Number.isFinite(count) && count > 0 ? Math.floor(count) : 0);
    }, 0);
  }
  return { xp, level, levelStartXp, nextLevelXp, levelProgress,
    longestStreak, cardsDue, cardsReviewed };
}
