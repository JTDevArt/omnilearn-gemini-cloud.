# V10 workspace recovery and visual refinement

Date: 14 November 2026 (Asia/Jakarta). Base: `882f17f930501e24655365fe89ceffaa95ddbceb`.

Overall V10/V10.1: **PARTIAL**. This increment repairs confirmed library regressions and explicit chat context, and refines Dashboard/mobile presentation. It does not certify the complete nine-screen redesign.

## Verified changes

- The previous commit removed topic search/sorting, source rename handling, preview/download controls, and canonical titles in the editor/manual mindmap. Restored these without reverting its source-card presentation.
- Original filenames remain metadata; reviewed lesson titles are used for reading and editing. No-match search now distinguishes an existing library from an empty one.
- Source cards retain open/rename, with original-file and study-management actions in disclosures. Version/backup tools follow the collection, rather than dominating its header. All prior actions remain available.
- Shared chat explicitly states whether it uses the active material. Switching to general chat uses the existing source-detachment flow and retains the draft. Synthetic browser checks prove no previous source text, source ID, chapter or source-chat history is sent; it does not call source analysis. Strict source validation is unchanged.
- Dashboard statistics have consistent original SVG markers and real values. The existing focus timer has a clearer time/action/mode hierarchy, selected-mode state, and keyboard-focus transfer when Start/Pause is replaced. No new timer state or dependency.
- Shared borders are quieter. On mobile the study result precedes secondary chapter/tools panels; lesson title and progress no longer crowd one line. Source controls meet 44px minimum height and cards fit narrow widths.
- Build marker: `algorithmic-v10-workspace-1`. This identifies an increment, not completed V10 or a released product.

## Verification

`npm ci --no-audit --no-fund`, `npm run lint`, `npm test` (163 passed, 0 failed), `npm run build`, and `git diff --check` passed locally. Browser scripts use Playwright 1.56.1 and synthetic fixtures; no Gemini/OCR quota was consumed.

`verify-home-visual.cjs`: Home/Dashboard at seven widths in two themes (28 combinations), plus Sources/Subjects/Exams/Streaks/Leaderboard/Profile/Updates at five widths in two themes (70). Existing draft, drawer, upload-picker, transcript, focus-timer and reduced-motion interactions passed.

`verify-study-workspace.cjs`: seven tools at seven widths in two themes (98), plus notes gallery/list (28); distinct chapter content, rename/search/sort/preview/download, pin/reload, saved decks, persistent rejection recovery and general-chat isolation passed. Total 224 layout/theme/route combinations; this is not 224 independent end-to-end feature tests.

One initial added assertion incorrectly omitted `select` as an interactive control on the empty exam screen. Corrected the test; final runs passed. A browser download mirror initially returned invalid archives; the fallback mirror succeeded. These were not application failures.

Three final views were rendered and visually inspected: Home 1440px dark, Dashboard 1440px dark, saved lesson workspace 390px dark. Initial mobile inspection prompted a hierarchy/heading correction. Screenshots use an empty personal dashboard and clearly synthetic lesson content, not fabricated production activity. The workflow captures these three views; additional failure screenshots are diagnostic only. Reports intentionally leave human visual acceptance separate from automated assertions.

## Compatibility and review

No storage/schema migration, original-file deletion, new API provider, credential change or dependency. Source text rendering remains escaped/textContent; SVG paths are static. Existing account isolation, source evidence checks and bounded provider behavior are retained. Backend health metadata is the only server change. No new animation was introduced; existing reduced-motion support was retained and checked.

## Deployment and remaining work

Public `/api/health` was checked during this increment and returned `algorithmic-v9.1-1`, not this increment. No AI Studio publication was performed. GitHub delivery and live deployment must be reported separately.

Still incomplete: full page-specific redesign of Subjects/Exams/Streaks/Profile/landing; the requested twelve-reference V10.1 research/motion synthesis; live PDF/Gemini/OCR acceptance for the owner's failing document; microphone/Firebase/device-to-device checks; final release acceptance. Passing route/overflow checks does not certify these workflows or visual parity. Keep v1.0.0 in development.
