# ASTRA CONTINUATION — OmniLearn Showcase UI → Production

## Goal
Continue **existing OmniLearn**, not a new project. The user approved a visual direction based on the attached **OmniLearn AI Learning Platform Showcase(2).png** (3×3 desktop showcase). A working **isolated preview scaffold** now exists:

- /design-preview.html — standalone preview route
- public/design-preview.html — semantic shell, sidebar, header, modal
- public/design-preview.css — original navy / orange / blue responsive design tokens
- public/design-preview.js — interactive navigation, local demo notes/subjects, theme, quiz preview, focus timer, profile tabs, changelog
- tests/design-preview.test.mjs — route, isolation, and responsive smoke checks

**This preview is not the production app.** It uses explicitly labeled sample data in sessionStorage, makes no Gemini inference requests, and must never be treated as an authentic XP/leaderboard/account source. The existing Express backend serves the /public static files; a hosted redeploy must be verified independently of GitHub pushes.

## Reference-screen mapping
The concept image shows nine main panels. Reproduce their **content hierarchy and product identity** while preserving original OmniLearn assets and avoiding protected third-party branding/source code.

| Row | Panel | Production destination | Visual/interaction specification |
| --- | --- | --- | --- |
| 1 | Landing | / | original orange wordmark, hero, learning CTAs, feature chips |
| 1 | AI Learning Home | /dashboard?view=home | mascot, centered composer, Rekam/Unggah/YouTube, header view switch, real Gemini chat |
| 1 | Catatan | /dashboard?view=notes or contextual library | searchable cards, chips, subject/sort, gallery/list, create/edit |
| 2 | Dashboard | /dashboard?view=dashboard | sidebar, 4 real stats, XP, focus timer, activities, progress |
| 2 | Mata Pelajaran | /dashboard?view=subjects | search, add, empty state, durable per-user subjects |
| 2 | Streaks & Aktivitas | /dashboard?view=streaks | actual event metrics, chart/calendar, honest ranking state |
| 3 | Ujian | /dashboard?view=exams | exam configuration, tryout links, working exam engine |
| 3 | Lesson Workspace | /dashboard?view=learn (plus existing tools) | chapters, explanations, source context, AI, notes, quiz, cards |
| 3 | Profil | /dashboard?view=profile | identity, preferences, usage, actual account tools |

Keep Update List and the other existing features in navigation. Do not delete old deep links.

## Color and style direction
Refer to public/design-preview.css rather than guessing. Dark base #0B1220, sidebar #0E1727, surface #111C2F, raised surface #19273D, border #2B3950, accent #FF791F, secondary #55AEFF. Light mode must have its own accessible counterparts. Use licensed/system fonts; do not bundle proprietary Apple SF. Rounded 12–20px controls, restrained outlines/shadows, responsive 1440/1024/768/390/360px. Original abstract robot in preview is CSS artwork, not an imitation of the reference mascot. Replace it with an original licensed OmniLearn mascot if available.

## Binding execution contract
- **Deliver code, not another plan.** First check the last 3 relevant GitHub commits and existing reports; no full-repo audit unless a concrete regression requires it.
- Work against \`JTDevArt/omnilearn-gemini-cloud.\` (trailing dot in repo name), default branch \`main\`.
- Reuse \`public/product.js\`, \`public/dashboard-shell.js\`, \`public/product.css\`, \`public/theme.js\`, \`public/local-library.js\`, \`public/focus-timer.js\`, \`public/progress-metrics.js\`, \`public/learning-activity.js\`, \`public/review-scheduler.js\`, \`public/exam-workspace.js\`, and existing server routes. Do **not** create a second user store, auth system, or Gemini client.
- Never substitute demo-data metrics for real user state; never send private study data to unapproved LLM providers. Defer FreeLLM until the UI migration is stable and official privacy/terms/quality review is approved.
- No live Gemini requests for visual testing or unit tests. Do not exhaust the user's quota just to check the UI.
- Use the isolated prototype as the **design reference**, then migrate components incrementally. The preview may remain available for comparison; production should use the existing data and services.
- Mark unfinished or blocked capabilities clearly. No fake success toasts, quota counts, ranks, exam results, subscriptions, AI streams, OCR confidence, or deployment claims.

## EXECUTION MILESTONES (one at a time)

### UI-01 — Consolidate visual tokens and shell
- Bring the preview's visual style to the existing production dashboard without copying its demo data.
- Align header (logo, mode switch, title, profile), sidebar active icons, spacing, focus state, light/dark palettes, mobile drawer.
- Fix conflicting old/new CSS rather than stacking fragile global overrides.
- Preserve route aliases and back/forward.
**DoD:** all existing routes render, mobile nav works, two themes pass contrast and keyboard focus, no user data lost.

### UI-02 — AI Learning Home parity
- Reuse real Gemini chat and source selection; center the prompt and original mascot as in the top-middle reference.
- Wire Rekam/Unggah/YouTube to existing permitted actions with visible statuses and real error handling.
- Preserve drafts when provider calls fail; navigate to dashboard via circular switch without losing state.
- Keep quick notes and real library access below the composer.
**DoD:** real backend only, no duplicate AI transport, no unapproved automatic inference, draft preserved and not misreported as sent.

### UI-03 — Management Dashboard, Notes and Subjects
- Use real source counts, reviewStats, events/XP, and existing timer; no hardcoded numbers.
- Rebuild notes card grid/list, search, category and subject filters, create/open/pin/edit operations; use existing durable local library.
- Subjects: real create/rename/delete behavior with safe preservation of source data.
**DoD:** reload preserves data, empty states match reference hierarchy, no duplicates or false save confirmation.

### UI-04 — Exams, Lesson Workspace and Streaks
- Adapt visual layout around the existing exam engine; don't replace its grading logic.
- Lesson workspace: chapter navigation, formula rendering, source reference, lesson tool shortcuts.
- Streaks, heatmap, and leaderboard: show only real verified events and opt-in ranking if available.
**DoD:** existing quiz/card/exam tests still pass; no imaginary student achievements or fabricated scores.

### UI-05 — Profile and Update List
- Adapt account/preferences/usage tabs from the concept; load genuine owner data and real usage or show unavailable state.
- Preserve \`view=updates\` and structured manifest \`public/data/releases.json\` with \`v1.0.0\` **in-development** until release acceptance.
- Do not claim paid/pro features exist without billing.
**DoD:** settings work, data is owner-scoped, release status and commit links truthful.

### UI-06 — Visual QA, integration, release gate
- Compare 9 screenshot concepts against real browser screenshots at 1440, 1024, 768, 390, 360 px.
- Verify keyboard, screen reader labeling, reduced motion, both themes, full mobile drawer, loading/empty/error states.
- Run \`npm ci --no-audit --no-fund\`, \`npm run lint\`, \`npm test\`, \`npm run build\`. GitHub Actions already runs these and does not need AI quota.
- No forced main push if branch protections prevent it. Push verified increments to \`main\` if authorized or open a PR. Verify hosted deployment separately.
**DoD:** CI green, browser checks documented, no P0 regression; mark blocked live Gemini/Firebase/YouTube/FreeLLM integrations accurately.

## Exact progress report after each milestone
1. Milestone and status: COMPLETE / PARTIAL / BLOCKED.
2. User-visible implemented behavior, with route.
3. Exact changed files.
4. Automated test results and any browser checks.
5. Confirmed remaining defects (not generic guesses).
6. GitHub commit SHA/PR URL and deployment state.
7. Next smallest executable milestone.

## Final instruction
The requested look is already scaffolded. **Implement missing production bindings and real behavior before creating more mockups or lengthy audits.** Keep change sets narrow, reversible, tested, and documented.
