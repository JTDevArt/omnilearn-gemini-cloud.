# V12 frontend recovery — review checkpoint

Status: **PARTIAL; not released or deployed.** Baseline: `6101627c77f79cb35c1a133841187c0353dc8dae`. Branch: `codex/v12-recovery`. Existing main is saved as `backup/pre-v12-2026-11-16-6101627`. V12 now includes the approved CSP/server export and updated browser expectations; no environment secret or dependency was changed.

## Changes and scope

| Production file | Change |
| --- | --- |
| `public/ai-response.js` | Content-Type-aware response parser, status classification, safe DOM error display, expandable request diagnostics. |
| `public/app.js` | Shared response parser for fetch/XHR; one chat error; explicit chat context; cancellation/draft preservation; canonical source badge title. Failed POST requests are never replayed. |
| `public/product.js` | General and document chat scopes reuse existing storage. General mode does not send the selected document, its history, or chapter. General chat deletion preserves document chat. Successful sends clear drafts even at the history cap. Rename refreshes the source badge. |
| `public/dashboard-shell.js` | Structurally changed Home: composer/continuation split, explicit source scope, small real XP/streak indicator, searchable recent material rows. Dashboard: unboxed summary, remaining level XP, existing focus timer, real weekly activity and resources. Existing secure `section()` and `escape()` retained. |
| `public/design-system.css` | Locked light/dark teal tokens, semantic contrast variants, original orange brand token, display/reading font stacks, shared focus/error/motion styles, reduced motion. |
| `public/home.css` | Responsive Home and Dashboard composition; single composer boundary; compact resource rows; honest zero-activity chart. |
| `public/index.html` | Loads the response classifier before app.js and identifies this development build. |
| `public/landing.html` | Shows an actual local OmniLearn render instead of a simulated product UI; sample-material caption; development build marker. |
| `public/landing.css` | Restrained preview, original brand accent, workflow rows without decorative numbered cards, normal-case labels; obsolete preview rules removed. |
| `public/study-shell.js` | Scope-aware tutor context and explicit return to the selected document; legacy free-chat action preserved. |
| `public/study-workspace.css` | Reading at 16px/1.7, 70ch font tokens; lesson before chapter navigation on mobile. |
| `public/ui-motion.js` | Home entrance 350ms; other views 190ms; existing cancellation/reduced-motion cleanup retained. |
| `public/ui-build.json` | `omnilearn-v12-recovery-1`, in development, baseline recorded. `sourceCommit` deliberately null before publishing. |
| `public/review-v12/*` | New isolated simulations, browser verifier, screenshots and exact command logs. These do not replace existing tests. |

No data migration or progress formula changes. Existing filename/source/version data, source analysis validation, backup storage and learning engines remain. Browser fixtures verify selected-source identity, rename/reload, general/document chat isolation, and subject deletion without losing source material. This is not an exhaustive backup/restore or OCR/provider certification.

## 403 diagnosis

The reported production non-JSON 403 **cannot yet be attributed** to Gemini, authentication, the hosting proxy, or the Express origin guard: no matching live request trace or server log was available. The Express origin guard returns JSON; that alone does not explain the reported HTML response. A synthetic intercepted `POST /api/chat` with HTTP 403, Content-Type `text/html`, and body `<html><head><title>403 Forbidden</title></head><body>Fixture session access denied.</body></html>` proves frontend recovery only. Gemini was not called in this fixture. Exact synthetic metadata is in `browser-status.json`; it is not incident evidence.

A separate defect was confirmed locally and fixed: `server.js:79–80` CSP previously blocked the same-origin authentication recovery iframe and Google Fonts. The policy now permits `'self'` for `frameSrc`, `https://fonts.googleapis.com` for styles, and `https://fonts.gstatic.com` for fonts. Nonces, origin validation, YouTube restrictions and script protections remain. This still does not prove the production 403 cause.

`server.js` now also exports the Express app for Vercel's Express adapter. The local production startup check still fails fast when `GEMINI_API_KEY` is absent, which is intentional for non-Vercel production. A Vercel deployment without that Production environment variable exits with `MISSING_SECRET`, surfaced by Vercel as `FUNCTION_INVOCATION_FAILED`; configure the secret in Vercel and redeploy. The key is never stored in this repository. Bricolage Grotesque and Source Serif 4 load through the approved Google Fonts origins in the browser verifier.

## Verification

Executed locally with installed dependencies and an existing isolated Playwright installation. No new npm dependency and no real Gemini/OCR requests.

| Command | Result |
| --- | --- |
| `npm run lint` | PASS: syntax for 69 JS modules and HTML inline scripts. |
| `npm test` | PASS: 171 passed, 0 failed. |
| `npm run build` | PASS: syntax and migration/learning-route checks. |
| `node --test public/review-v12/ai-recovery.test.mjs` | PASS: 18 passed, 0 failed. |
| `node public/review-v12/verify-browser.cjs` | PASS automated assertions: 108 layout/theme cases, recovery and persistence checks; 12 required screenshots plus 2 Landing screenshots. |
| `QA_SKIP_SCREENSHOTS=1 node scripts/verify-remaining-pages.cjs` | PASS assertions: 82 cases; manual exam answer survives reload and scores 1/1. Broader visual gate remains limited to screenshots reviewed here. |
| `node scripts/verify-page-interactions.cjs` | PASS: 40 page/theme/width checks, subject and profile persistence, keyboard tabs. |
| `node scripts/verify-html-safety.cjs` | PASS: 6 malicious payload fixtures, 0 executions; selected actual renderers, not exhaustive XSS proof. |
| `QA_SKIP_SCREENSHOTS=1 node scripts/verify-home-visual.cjs` | PASS: 98 layout/interaction checks; expects the current build marker and classified friendly provider error. |
| `QA_SKIP_SCREENSHOTS=1 node scripts/verify-study-workspace.cjs` | PASS: 28 checks; expects 16px × 1.7 = `27.2px` and preserves source-review guidance. |

The complete local regression gate is green for the listed checks. `npm start` behavior was exercised by each browser script launching the real `server.js` on an ephemeral local port. No unexpected JS, asset or console errors were recorded. The Vercel failure is a deployment-environment issue until the Production secret is configured and a new deployment is tested.

AI simulations cover JSON success, HTML 403, 401, 429 with Retry-After, 503, invalid JSON, malformed successful payload, timeout, cancellation, source mismatch, no failed-POST replay, and general/document isolation. Source mismatch choices preserve question and selected source and do not submit automatically. They verify client behavior, not actual model accuracy or production permissions.

## Visual evidence and contrast

Reviewed 12 Home/Dashboard/Workspace screenshots in both themes: desktop 1440, Home/Dashboard mobile 375, Workspace mobile 390. Two additional Landing screenshots investigate its changed real-product preview. Desktop Home has separate source-aware composer and continuation; Dashboard has summary strip/timer/activity; mobile lesson precedes chapter navigation. No visible clipping or horizontal overflow in those fixtures. The verifier also checks remaining routes at 360/768/1280 and core views at 375/390/768/1024/1440. `visual-review.json` records limitations. `failure.png` preserves the initial draft-loss failure that was subsequently fixed and retested.

| Core text/background pair | Light | Dark |
| --- | ---: | ---: |
| text / bg | 13.90 | 16.31 |
| muted / surface | 7.54 | 7.18 |
| muted / surface2 | 7.32 | 7.75 |
| accent-ink / surface | 5.47 | 9.37 |
| accent-ink / accent-soft | 4.81 | 8.54 |
| on-primary / accent | 5.54 | 8.82 |
| success / success-soft | 7.15 | 7.96 |
| error / error-soft | 7.68 | 8.47 |
| XP / bg | 5.61 | 10.85 |

Ratios are browser-computed sRGB contrast for the listed semantic token pairs. They are not an element-by-element accessibility certification. Remaining legacy icon/styling rules outside the redesigned components were not exhaustively replaced.

## Identity and external integrations

Compared the implementation with the owner's supplied showcase: shared common patterns include sidebar navigation, composer and progress cards. V12 uses its own split source-aware Home, compact summary/reading flow, Indonesian copy and unchanged original mascot.svg. No third-party source, logo, mascot pose or artwork was imported. Authenticated Pelajarin pages/recordings were not available for a direct current side-by-side replay; that part of similarity review is **BLOCKED**, not claimed passed.

Read-only model verification against official documentation retained `gemini-3.8-flash` and `gemini-2.5-flash-preview-tts`; they are documented model IDs. Account-specific availability and real inference were not tested. Sources: [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash), [Gemini 2.5 Flash Preview TTS](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-preview-tts). Existing provider defaults, budgets and server output validation were not changed.

## Delivery and next work

This branch is a reviewable V12 checkpoint, not a completed release. Main merge authorization was already supplied. GitHub publication, Vercel deployment and Google AI Studio deployment are separate. No V12 live-build success is claimed.

Next: configure `GEMINI_API_KEY` for Vercel Production, redeploy, then inspect the first function log if the 500 remains. Capture the actual affected 403 request and matching backend trace before claiming its root cause. Google AI Studio still requires its own sync/restart/publish flow.
