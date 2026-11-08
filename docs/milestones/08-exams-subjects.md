# Milestone 08 — Exams and subject management

Status: COMPLETE locally (8 November 2026, Asia/Jakarta).

1. Implemented: named source-specific saved banks, bank restore, configurable question count and 20 multiple-choice + 5 short-answer + 5 essay preset with editable counts, source picker, subject name/count sorting. Existing engine retains seven question formats, difficulty, deadline timer, autosave, flags, submission, objective scores, AI-labelled essay review, results and mistake explanations.
2. Files: `public/exam-engine.js`, `public/exam-builder.js`, `public/exam-workspace.js`, `public/dashboard-shell.js`, `tests/exam-selection.test.mjs`, `scripts/verify-exams-browser.mjs`.
3. Bugs fixed: restored banks now restore title/duration/difficulty controls; question mixes reject insufficient banks instead of creating placeholder questions; archived attempts cannot be AI-graded using revised source text.
4. Tests: `npm test` — 135 passed. `npm run build` passed. Exam/subject browser suite passed manual bank creation/save/restore, difficulty, preset shortage, answers/flags/cursor after reload, scoring/result history, subject sorting/moving/deleting without source loss. Deadline serialization and pending essay scores covered by unit tests.
5. Regression: existing exam grading and source/subject persistence reused. Bank selection does not mutate the original bank.
6. Remaining: AI essay scoring requires live Gemini; archived-version essay grading is unavailable, with a visible explanation. Results and answers remain accessible. No live service/deployment claim.
7. GitHub: delivered to `main`; exact milestone commit is identified by the commit containing this report (`git log -- docs/milestones/08-exams-subjects.md`).
8. Next: Milestone 09 progress and personalization, authorized by the request to continue through completion.
