# AU-02–05 and AU-09 implementation increment

Date: 13 November 2026. Baseline: main `6691a2e88455ce09c07bf2d63c2840fc58c557d2`. Overall status: PARTIAL pending browser and hosted acceptance.

| Area | Status | Evidence / remaining work |
| --- | --- | --- |
| Existing source store and learning engines | COMPLETE for preservation in this increment | No schema migration, storage replacement or Gemini endpoint change |
| Shared shell, cool light theme and system typography | PARTIAL | Production CSS updated; screenshots and contrast checks remain |
| Management layout | PARTIAL | Four real summary links, paired level/timer and weekly/recent activity panels; mobile grid rules implemented but unverified visually |
| Source-specific title on continuation cards | CONFIRMED BUG fixed | Previously used `source.name`, now uses the existing `lessonTitle` policy |
| Layout leaking into legacy views | CONFIRMED BUG fixed | Clear Home/Dashboard layout classes before navigation, then apply only in the relevant view |
| Motion | PARTIAL | Native cancelable entrance, dialog/composer CSS, hover/press feedback; reduced motion and listener cleanup unit-tested; live visual acceptance remains |
| Deployment identification | COMPLETE locally | `/api/health.uiBuild` now identifies this increment, verified by HTTP fixture |
| Pilot output validation | CONFIRMED BUG fixed | Both Groq and Gemini callback output pass shared text/JSON/schema checks; malformed messages return controlled errors |
| Production Gemini-to-free-provider fallback | BLOCKED | No approved credential, account/region/privacy approval or live synthetic quality benchmark; isolated pilot remains disconnected |
| Complete saved-material editing and subject UX | PARTIAL | Existing title review preserved; source-specific browser journeys, subject editing inside gallery and full visual reconstruction remain |
| AI Studio publication | BLOCKED | No publish capability or authorized Google deployment identity available here |

The UI uses actual records and honest empty states. Video and library controls remain available behind a dashboard disclosure. No example statistics or local source data were imported into production.

## Verification

`npm ci --no-audit --no-fund`, `npm run lint`, `npm test` (159 passed, zero failures), and `npm run build` succeeded. `npm audit --omit=dev --audit-level=high` reported zero vulnerabilities. Browser launch was attempted and failed before a page opened. Elevated execution was rejected by policy. No browser pass is recorded. Release remains v1.0.0 in development.

Next acceptance: run `scripts/verify-dashboard-browser.mjs` and the Home suite in a socket-enabled browser environment, inspect both themes at 1440/1280/1024/768/390/360, confirm the source-title/backup journeys, then complete the remaining page-specific redesigns. Do not repeat milestones 00–08.
