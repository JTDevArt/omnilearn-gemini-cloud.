// Day-based review intervals. Session persistence is handled by the source library.
export function scheduleReview(previous = {}, understood, now = Date.now()) {
  const repetitions = understood ? (previous.repetitions || 0) + 1 : 0;
  const ease = Math.max(1.3, (previous.ease || 2.5) + (understood ? .1 : -.2));
  const days = !understood ? 1 : repetitions === 1 ? 1 : repetitions === 2 ? 3 : Math.round((previous.days || 3) * ease);
  return { repetitions, ease, days, reviewedAt: now, dueAt: now + days * 86400000 };
}
