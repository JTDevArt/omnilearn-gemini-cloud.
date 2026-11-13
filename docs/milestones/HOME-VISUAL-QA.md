# Home visual correction and optimized evidence policy

13 November 2026. Baseline main: `c37c0a471ed005cbebe3de293476cae7a0c025f7`. Focused Home/Dashboard visual gate: PASS on the production render at commit `85994049161ba4eb28f145632d85c84aede59798`. The overall product directive remains PARTIAL; hosted AI Studio acceptance is unverified.

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

## Final evidence and visual review

[Browser run](https://github.com/JTDevArt/omnilearn-gemini-cloud./actions/runs/43431250382) succeeded on Ubuntu 24.04 / Playwright 1.56.1. [Screenshot artifact](https://github.com/JTDevArt/omnilearn-gemini-cloud./actions/runs/43431250382/artifacts/14039553209) contains exactly three required PNGs plus the machine-generated status report. Artifact retention is seven days. Source/build identity is recorded in STATUS.json; screenshots use anonymous local fixture state and do not establish hosted deployment or model availability.

| Acceptance | Evidence | Result |
| --- | --- | --- |
| Home composition | Viewed `01-home-desktop.png`: existing original mascot, centered heading, unified composer with four primary actions | PASS for focused correction; no exact pixel-match claim |
| Dashboard composition | Viewed `02-dashboard-desktop.png`: four genuine empty-state counts, paired level/timer and weekly/recent panels | PASS |
| Mobile | Viewed `03-home-mobile.png`, 390px: mascot and send action fully visible | PASS |
| No nested composer borders | Borderless input and one form-level focus ring asserted; three images inspected | PASS |
| Sidebar/content proportions | Desktop 220px sidebar; 390px collapsed drawer; header text remains on one line | PASS |
| Other viewport/theme combinations | 28 assertions: two views × two themes × seven widths; no root or child overflow | PASS |
| Basic interaction preservation | Failed-provider draft recovery, navigation/refresh, drawer Escape, timer start/pause/reset, paste dialog/focus, upload cancel, transcript access, reduced motion | PASS with explicit synthetic fixtures |
| Real services | Microphone device recording, live Gemini, OCR quality, Firebase and published host | NOT TESTED |

Review found one P1 defect in the first screenshot set: the desktop Profile label wrapped because the search field consumed the flex row. `3488618` fixes its width allocation and a leaked hidden sidebar theme control. The subsequent runner exposed an image-load timing issue in the assertion; `8599404` waits for image decoding before measurement. The final images were inspected and no P0/P1 defect remains within this focused gate. Additional captures occurred only to investigate/correct these failures; no unrelated pages were captured. Do not repeat captures or add polish after this gate without new evidence.

Local lint/build and 159 unit/HTTP tests passed. The final code CI checks must be reported independently from browser results. Release remains v1.0.0 in development. Full backup/source/chapter workflows and remaining pages are not certified by this focused test.
