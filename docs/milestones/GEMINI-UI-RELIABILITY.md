# Gemini reliability and UI consistency — 2026-11-16

Scope: existing application reliability, shared styling and extraction; no product-feature additions or storage migrations.

## Verification

- Backend increment: 167 tests passed; build passed.
- Runtime extraction increment: 167 tests passed; build passed.
- Token consolidation increment: 167 tests passed; build passed.
- Final increment: 168 tests passed, 0 failed; `npm run build` passed; `git diff --check` passed.
- Browser suites: `verify-home-visual.cjs`, `verify-study-workspace.cjs`, `verify-remaining-pages.cjs` passed. Includes 360/768/1280px and dark/light themes, overflow, seven learning tools, source identity, draft persistence, drawer/timer and manual exam persistence/scoring. Synthetic provider responses only.
- Rendered dark desktop Home, Dashboard and 390px learning workspace screenshots were inspected in this run; no major visual defects in those views. Screenshots/reports are under `visual-qa/` and are not user data or release assets.

## Model verification

All three defaults are listed in the official current catalog; none renamed:

| Setting | Default | Official source |
| --- | --- | --- |
| GEMINI_MODEL | gemini-3.8-flash | https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash |
| GEMINI_FALLBACK_MODEL | gemini-3.1-flash-lite | https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite |
| GEMINI_MULTIMODAL_FALLBACK_MODEL | gemini-3-flash-preview | https://ai.google.dev/gemini-api/docs/models |

`node scripts/verify-gemini-models.mjs` returned status blocked (exit 2): GEMINI_API_KEY absent. Account-specific model availability and successful live generation cannot be verified. No credentials or paid inference were used. Thinking configuration references: https://ai.google.dev/gemini-api/docs/generate-content/thinking .

## Boundaries

- Budget models reserve thinking tokens plus expected visible output. Level models expose no numeric thinking budget; the supported defaults reserve the documented 65536-token ceiling. This does not guarantee completion before a deadline or fix provider outages.
- Invalid JSON/schema uses the existing second candidate once; source evidence and existing task validators remain mandatory. Authentication/quota failures retain their fail-fast behavior. Browser POSTs and SDK transport attempts are not automatically replayed.
- Daily limits are fixed 24-hour in-memory windows per server process. They reset on restart and do not provide a multi-instance global spend cap. Session IDs are client-provided; the shared IP cap still applies when clients rotate them. Existing proxy configuration requires a trusted upstream.
- Canonical theme tokens replace conflicting legacy root aliases; tool-specific layout, illustration colors and geometries remain where needed. Font/spacing/radius references are shared; no framework/dependency was added.
- AI Studio deployment was not performed or verified by this increment. GitHub delivery and runtime deployment are separate.

## Every changed file

| File | Change |
| --- | --- |
| `.env.example` | Document model IDs, total/attempt deadlines, daily IP/session limits. |
| `README.md` | Correct representative project tree; document thinking allocation, verified model IDs, timeouts, daily limits and deployment limitations. |
| `lib/ai-limits.js` | Positive integer configuration and shared per-IP/per-session daily admission before provider work. |
| `lib/provider-errors.js` | Allow exactly one candidate fallback for internally flagged structured-output validation failures. |
| `lib/provider-models.js` | Explicit model capability lookup, unknown-model warning and thinking-plus-output token allocation. |
| `lib/source-intelligence.js` | Pass original source text to generation validation; retain exact-evidence gate and source-scoped cache. |
| `public/app.css` | Move static inline document presentation into named CSS classes using spacing tokens. |
| `public/app.js` | Existing runtime extracted intact; allow 120 seconds for source analysis plus generation without POST replay. |
| `public/design-preview.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/design-preview.html` | Load canonical tokens before isolated preview styles. |
| `public/design-system.css` | Canonical semantic palette, font, spacing/radius scales, code font and sidebar width; retain shared button/card/focus/theme foundations. |
| `public/exam-workspace.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/forge.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/home.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/index.html` | Extract classic runtime and inline styles, preserve script order/CSP, remove obsolete font preload. |
| `public/jarvis.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/landing.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/product.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/production-preview.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/production-preview.html` | Load canonical tokens before route-preview styles. |
| `public/study-workspace.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/styles.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/upload-queue.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `public/workbench.css` | Replace duplicate theme aliases, font stacks, spacing/radius and primary-palette literals with canonical tokens; preserve tool layout. |
| `scripts/verify-gemini-models.mjs` | Use the same safe token/thinking allocation for the optional live smoke test. |
| `server.js` | Apply thinking/output allocation to all text stages, configure bounded deadlines, validate structured output before success/cache, attach daily admission. |
| `tests/ai-limits.test.mjs` | HTTP tests for shared IP/session budgets across every AI route, 429 JSON/Retry-After, unaffected health/upload. |
| `tests/ai-policy.test.mjs` | Read extracted runtime for existing policy/rendering regression coverage. |
| `tests/fixtures/reliability-preload.mjs` | Synthetic malformed/valid structured provider responses for fallback tests. |
| `tests/provider-and-ui.test.mjs` | Read extracted runtime and verify no inline CSS/JS, original script order and safe rendering/POST behavior. |
| `tests/provider-config.test.mjs` | Test all lookup cases, warn-once unknowns and stage/level output budgets. |
| `tests/provider-http.test.mjs` | Test invalid JSON and schema primary/fallback responses using official SDK with mocked transport; retain bounded existing failure checks. |
| `docs/milestones/GEMINI-UI-RELIABILITY.md` | This evidence and file-by-file delivery record. |
