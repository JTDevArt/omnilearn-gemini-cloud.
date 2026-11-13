# Executable roadmap status

Updated 13 November 2026. [Latest Dashboard/motion increment](AU-05-dashboard-motion.md) continues production work from main `6691a2e`. Browser acceptance remains blocked; no production deployment, release tag, model-name change or dependency upgrade.

Latest focused update: [Home/Dashboard visual QA](HOME-VISUAL-QA.md) passes on code `8599404` using a GitHub browser runner, three reviewed final images and 28 viewport/theme assertions. This supersedes the local-browser blocker for that focused gate only. Overall directive completion and hosted release acceptance remain open.

| Milestone | Status | Evidence |
| --- | --- | --- |
| 00 — Audit and baseline | Complete | [Audit](00-repository-audit.md), [research](00-research-notes.md) |
| 01 — Data integrity | Complete locally; live Firebase acceptance unavailable | [Storage changes and browser evidence](01-data-integrity.md); main commit `9094514799ed8b2511fb37e6dcc983da7b48d030` |
| 02 — Gemini stability and intelligence | Implementation and fixture acceptance complete; live model access unavailable | [Provider, context and recovery report](02-gemini-stability.md), [research](02-research-notes.md) |
| 03 — Upload and OCR | Implementation and fixture acceptance complete | [Upload report](03-upload.md); `9d7412e` |
| 04 — Design system | Complete with targeted browser checks | [Design report](04-design-system.md); `600c538` |
| 05 — Navigation | Complete with browser checks | [Navigation report](05-navigation.md) |
| 06 — Home dashboard | Complete with browser checks | [Home report](06-home-dashboard.md); `e9d6383` |
| 07 — Learning workspace | Implementation and fixture acceptance complete | [Workspace report](07-learning-workspace.md) |
| 08 — Exams and subjects | Complete locally | [Report](08-exams-subjects.md) |
| 08A — AI Home ↔ Dashboard | Implemented locally; browser checks pending | [Dual-home changes](08A-dual-dashboard.md) |
| UI-01 — Production shell | Partial; browser checks blocked | [Shell increment and verification](UI-01-production-shell.md) |
| UI-02 — AI Learning Home | Partial; browser checks blocked | [Home increment and verification](UI-02-ai-home.md) |
| UI-03–05 — Dashboard and saved materials | Partial; structured notes and browser acceptance remain | [Dashboard and notes increment](UI-03-05-dashboard-notes.md) |
| 09A — Free LLM evaluation | Partial; account and region checks remain | [Provider evaluation](../research/free-llm-provider-evaluation.md) |
| 09B — Optional text pilot | Fixture-tested and disconnected; live tests blocked | [Provider evaluation and pilot gates](../research/free-llm-provider-evaluation.md#pilot-and-production-boundary) |
| 09 — Progress and personalization | Partial; real XP, due cards and streaks integrated | [Progress report](09-progress-personalization.md) |
| 10 — Multimedia and research | Partial; safe durable research saving implemented | [Implementation and external gates](10-multimedia-research.md) |
| 11 — Update List | Implemented locally; release still in development | [Changelog report](11-update-list.md) |
| 12 — Final QA and release | Pending | Run the full suite and live acceptance before marking v1.0.0 shipped |

Latest independently observed CI result at commit `70ac085`: install, lint, tests and build succeeded without Gemini calls. Earlier local baseline: **135 tests passed**, build/lint passed, and workspace, storage, navigation, AI recovery and home browser suites passed. Milestone 01 also has a dedicated real-IndexedDB browser suite. These counts refer to local code and explicit fixtures, not live AI quality or deployed-service health. Detailed reports preserve the limits and reproduction commands.
