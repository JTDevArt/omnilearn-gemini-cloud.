# Home visual correction and optimized evidence policy

13 November 2026. Baseline main: `c37c0a471ed005cbebe3de293476cae7a0c025f7`. Status: implementation PARTIAL, visual acceptance pending runner evidence and image review.

The owner's latest screenshot shows an extra generic card heading and stacked outer/input focus borders. Home now uses a dedicated hero, a semantic tutor section and one composer form. A single form-level focus ring surrounds a borderless textarea. Initial input height is 88px; desktop mascot is 112px and mobile 92px. Route-specific Home styling belongs in `public/home.css`; conflicting old Home rules were removed from the shared stylesheets. The existing mascot asset and backend handlers remain in use.

Primary composer actions remain Rekam, Unggah, YouTube and Kirim. Paste is preserved in a secondary disclosure. Dialog close restores focus. Home/Dashboard navigation resets page scroll so a previously scrolled page cannot leave the mascot above the viewport. Canceling an upload picker no longer hides Home before a file has been chosen. No source schema or user data migration.

## Evidence policy, supersedes older screenshot counts

Required screenshots are exactly these three, taken once per tested tree:

1. AI Home, 1440px, dark.
2. Management Dashboard, 1440px, dark.
3. AI Home, 390px, dark.

Other sizes and light mode use automated assertions. Only a failing assertion or significant defect justifies an additional investigation image. Screenshots are taken at scrollY 0, device scale factor 1 and 900px viewport height. Assertions exercise both themes at 1440, 1280, 1024, 820, 768, 390 and 360px.

`scripts/verify-home-visual.cjs` starts the actual Express app with a non-secret fixture key, verifies the UI build marker, renders production HTML/CSS/JS, checks overflow, mascot visibility, composer border/focus, Dashboard grid, draft/error recovery, refresh/history, drawer Escape, timer controls, paste dialog focus restoration, upload cancellation, YouTube transcript access and reduced motion. Inference is intercepted with an explicit failure fixture; no Gemini quota is spent.

The existing GitHub screenshot workflow now runs this production-render test rather than nine public live pages. Its artifact is `omnilearn-production-visual-qa`, containing up to three required PNGs plus `STATUS.json`. `ASSERTIONS_PASSED_VISUAL_REVIEW_PENDING` deliberately does not claim human image acceptance. A browser launch failure records BLOCKED; a failed UI assertion records FAIL and one investigation screenshot where possible.

Local Chromium was retried and still fails with `socket() failed: Operation not permitted`. Local unit/build results cannot replace screenshots. Public AI Studio publication remains separate from GitHub and local production-render tests. Uploaded old live captures are historical evidence and show legacy navigation; they do not verify this increment.
