import test from 'node:test';
import assert from 'node:assert/strict';
import {
  recordActivity,
  activitySummary,
  activityDay
} from '../public/learning-activity.js';
test('empty activity never manufactures progress, streak or a level', () => {
  assert.deepEqual(activitySummary({ events: [] }, 0), {
    xp: 0,
    level: 0,
    streak: 0,
    today: 0,
    answered: 0,
    accuracy: null,
    weakTopics: []
  });
});
test('activity points derive from unique actual actions, with correct accuracy and weak topics', () => {
  let state = { events: [] };
  const now = Date.parse('2026-11-06T10:00:00Z');
  state = recordActivity(
    state,
    { id: 'q1', type: 'quiz', correct: true, topic: 'Circles' },
    now
  );
  state = recordActivity(state, { id: 'q1', type: 'quiz', correct: true }, now);
  state = recordActivity(
    state,
    { id: 'q2', type: 'quiz', correct: false, topic: 'Photosynthesis' },
    now
  );
  state = recordActivity(state, { id: 'lesson-1', type: 'lesson' }, now);
  const summary = activitySummary(state, now);
  assert.equal(summary.xp, 27);
  assert.equal(summary.accuracy, 50);
  assert.equal(summary.answered, 2);
  assert.deepEqual(summary.weakTopics, [{ topic: 'Photosynthesis', count: 1 }]);
});
test('streak uses Jakarta days and breaks on missed days', () => {
  let state = { events: [] };
  for (const [id, at] of [
    ['a', '2026-11-04T18:00:00Z'],
    ['b', '2026-11-05T18:00:00Z']
  ])
    state = recordActivity(state, { id, type: 'lesson' }, Date.parse(at));
  assert.equal(activityDay(Date.parse('2026-11-05T18:00:00Z')), '2026-11-06');
  assert.equal(
    activitySummary(state, Date.parse('2026-11-06T10:00:00Z')).streak,
    2
  );
  assert.equal(
    activitySummary(state, Date.parse('2026-11-09T10:00:00Z')).streak,
    0
  );
});
test('long event IDs deduplicate after truncation and unknown events do not create streaks', () => {
  const event={id:'x'.repeat(300),type:'lesson'};
  const once=recordActivity({},event,0);
  assert.equal(recordActivity(once,event,0).events.length,1);
  assert.equal(recordActivity(once,{id:'other',type:'invented'},0).events.length,1);
});
