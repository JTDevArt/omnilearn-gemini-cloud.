# Home and Dashboard archive review

Status: implementation checkpoint; visual acceptance BLOCKED.

## Inputs

- pelajarin-ai.zip: public marketing export, including an embedded learning demonstration.
- app-pelajarin-ai.zip: saved application Home with header, narrow navigation,
  central question input, resume card and filtered note gallery.
- The application export shows only one saved page. Bundled JavaScript does
  not prove the other authenticated routes were observed.
- Both exports contain analytics code. The application export also contains
  account information and private material previews. None was copied into production.
- Third-party JavaScript, CSS, fonts, images and trackers were not imported.

## Design decisions

Energy 2; rhythm 2; motion 1.

- Centralize Home's composer to make beginning a study session the main action.
- Place continuation below the composer so returning to material remains visible.
- Use an actual resource gallery with search, subject filtering and gallery/list
  controls, rather than decorative feature cards.
- Preserve OmniLearn's teal semantic tokens, original mascot and typography.
- Use the existing soft accent on the continuation surface to identify the
  next learning action; keep the rest of the page quiet.
- Separate Dashboard activity from level/timer planning. Keep all existing
  metric formulas, source identifiers and focus-timer behavior.
- Use short hover feedback and the existing reduced-motion treatment.

## Changed production files

- public/dashboard-shell.js: Home composition, library controls and resource
  cards; Dashboard activity/planning columns; contextual greeting.
- public/home.css: replace the prior split Home layout and equal-column
  Dashboard styles with responsive layouts for the revised DOM.

## Verification

- npm run lint: PASS.
- npm test: 171 passed, 0 failed.
- npm run build: PASS.
- Browser verifier: scripts/verify-archive-home.cjs.
- Browser execution: BLOCKED. Default Playwright browser binary is absent.
  System Chromium fails to launch with socket() Operation not permitted.
  Cloud browser cannot reach the local test server (ERR_CONNECTION_REFUSED).
- No screenshots, browser interaction passes, contrast passes or live AI/OCR
  successes are claimed for this checkpoint.
- No Gemini calls were needed for design analysis.

## Remaining gates

Run the browser verifier in an environment with working Playwright:

    node scripts/verify-archive-home.cjs

It checks empty state, canonical source titles, search, subject filtering,
gallery/list switching, mocked chat, correct source opening, 20 viewport/theme
combinations and three screenshots. It uses synthetic local fixtures.
Playwright is QA tooling, not an added production dependency.

Review Home desktop/mobile and Dashboard desktop screenshots before merge.
Production and the uploaded third-party archives are not altered by this branch.
