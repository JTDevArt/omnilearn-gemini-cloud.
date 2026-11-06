export function activityDay(time = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(time);
}
export function recordActivity(state, event, now = Date.now()) {
  const next = { events: [], ...state };
  if (!event?.id || next.events.some((item) => item.id === event.id))
    return next;
  const points =
    { lesson: 15, quiz: event.correct ? 10 : 2, review: 3, note: 2 }[
      event.type
    ] || 0;
  next.events = [
    ...next.events,
    {
      id: String(event.id).slice(0, 250),
      type: event.type,
      correct: event.correct,
      topic: String(event.topic || '').slice(0, 180),
      points,
      at: now,
      day: activityDay(now)
    }
  ].slice(-1000);
  return next;
}
export function activitySummary(state, now = Date.now()) {
  const events = state?.events || [];
  const xp = events.reduce((n, e) => n + (Number(e.points) || 0), 0);
  const dates = new Set(events.map((e) => e.day));
  let day = activityDay(now),
    streak = 0;
  if (!dates.has(day))
    day = new Date(Date.parse(day + 'T00:00:00Z') - 86400000)
      .toISOString()
      .slice(0, 10);
  while (dates.has(day)) {
    streak++;
    day = new Date(Date.parse(day + 'T00:00:00Z') - 86400000)
      .toISOString()
      .slice(0, 10);
  }
  const quiz = events.filter((e) => e.type === 'quiz');
  const missed = {};
  for (const event of quiz)
    if (!event.correct && event.topic)
      missed[event.topic] = (missed[event.topic] || 0) + 1;
  return {
    xp,
    level: xp ? Math.floor(xp / 100) + 1 : 0,
    streak,
    today: events.filter((e) => e.day === activityDay(now)).length,
    answered: quiz.length,
    accuracy: quiz.length
      ? Math.round((quiz.filter((e) => e.correct).length / quiz.length) * 100)
      : null,
    weakTopics: Object.entries(missed)
      .sort((a, b) => b[1] - a[1])
      .map(([topic, count]) => ({ topic, count }))
      .slice(0, 5)
  };
}
