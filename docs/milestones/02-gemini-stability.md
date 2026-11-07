# Milestone 02 — Gemini stability and intelligence

Status: implementation and fixture acceptance complete, 7 November 2026. Live model access/quality remains blocked by the absent server credential. Milestone 03 is not started. Milestone 01 was separately committed and pushed as `9094514799ed8b2511fb37e6dcc983da7b48d030`.

## Historical error investigation

The old provider manager emitted **“Kuota atau layanan model belum tersedia…”** with HTTP 429 whenever every candidate had entered a retryable cooldown. Model 404, service 503, timeout 504 and actual quota 429 could all reach that branch. The text alone therefore could not establish that a daily quota was exhausted. The server also had a second, partly different classifier. No historical production logs or authorized live model response are available here, so the exact original incident cause remains unproven.

Request path reviewed: route validation and request cancellation → optional shared source analysis → context selection → `generateText` → provider scope/cache/queue → candidate and cooldown checks → shared-deadline request runner → official Google SDK → output validation → API JSON → browser notice/recovery. SDK retries remain `attempts: 1`; application retry limits are not multiplied by SDK retries. Upload/OCR, speech, source analysis, tutoring and learning endpoints keep their existing routes.

## Delivered behavior

- One classifier distinguishes authentication, unavailable/incompatible model, daily quota, temporary rate limit, network failure, unavailable service, timeout, cancellation, invalid request and invalid response. Public messages omit raw SDK bodies and credentials. Existing structured output errors keep their explicit codes.
- Google `RetryInfo` is parsed from the actual SDK JSON-message shape, including fractional durations and structured seconds/nanoseconds. `Retry-After` seconds/dates are honored when provided by an adapter. Browser recovery stores the retry time and disables premature manual retry. There is no automatic browser replay loop.
- Quota responses stop the request and open a process-wide quota cooldown; the application does not switch models to evade them. Authentication blocks credential retries. Model/service circuits retain separate causes, bounded exponential cooldowns and success reset. Gates are checked again immediately before an invocation, including when another request reports quota during backoff.
- At most **two distinct compatible candidates** are invoked per request. Transient fallback uses exponential backoff based on consecutive model failures, jitter (bounded at 2.4 seconds), and the remaining shared deadline. A provider retry hint is a minimum delay; if it exceeds the remaining budget, the request returns for later recovery. An unavailable model can move directly to a different candidate. Cancellation interrupts waiting and in-flight work, including providers that ignore their abort signal.
- Known speech, embedding, image-generation and live-audio families are excluded from incompatible text routes. Multimodal and speech routing remain separate. Gemini 2.5 uses token-budget thinking parameters, 2.0 omits thinking configuration, and current text models retain level-based configuration. These guards do not claim every configured model or modality is live-accessible.
- Deduplication/cache keys now explicitly include request scope and stage. Already-aborted callers cannot receive cached success. A cancelled request/analysis finishing late cannot delete the pending entry of its replacement; remaining consumers still share generation. Existing source caches retain session, source ID, version, SHA-256 content hash, output language, partial-read state and blueprint version boundaries. Invalid blueprints never enter that cache.
- Context selection now preserves both `[Page N]` and `[Halaman N]`, honors explicit page requests, avoids exceeding its character budget after truncating an oversized relevant page, and avoids empty context when every block is oversized. Generated explicit page references absent from the supplied excerpts/validated blueprint are rejected before successful chat caching.
- Exact blueprint evidence, formulas, coverage and reference integrity remain mandatory. Structured cards/maps/quizzes receive stronger shape checks. Tutor policy now asks for reproducible worked steps, defined symbols/units, first-error correction, comparable criteria and clearly labelled teaching examples.
- The visible chat feedback retains the actual fallback model and cache notice. The old generic completion message no longer hides that information. Failed/deferred AI requests keep lessons, original files and recovery tasks through refresh.

## Verification

`npm test`: **125 passed**, zero failures. `npm run build` and `npm run lint`: passed, including 51 JavaScript modules/inline scripts and migration invariants. `git diff --check`: passed. No runtime dependency changes.

New/extended automated cases cover actual SDK error payloads; retry headers; 400 invalid credentials; daily versus rate quota; no quota-driven model switch; concurrent quota during backoff; model compatibility; bounded backoff/deadlines; cancellation; circuit reset; request scope; stale pending-entry cleanup; source hash/version/language/session isolation; malformed output; absent page references; and context budget regressions.

`tests/provider-http.test.mjs` runs the real server and official SDK with an explicitly preloaded test-only transport. Eight scenarios exercise authentication, daily quota, rate limit, network failure, empty output, unsupported citation, malformed flashcards and successful fallback/cache reuse. It checks public JSON and exact provider invocation counts. No production route or runtime switch installs that transport. Existing native/scanned/mixed PDF tests still pass; their fallback fixture now uses model unavailability rather than exhausting a daily quota.

Browser verification:

```bash
PORT=3104 NODE_USE_ENV_PROXY=1 npm start
# In a second shell, with Playwright installed externally:
DASHBOARD_TEST_URL=http://127.0.0.1:3104 node scripts/verify-ai-browser.mjs
DASHBOARD_TEST_URL=http://127.0.0.1:3104 node scripts/verify-dashboard-browser.mjs
```

Set `PLAYWRIGHT_MODULE` to an absolute external module path if necessary and `CHROMIUM_PATH` to the browser binary. Both suites passed with no page errors. They cover visible fallback identity, saved cooldown/recovery, lesson/original preservation after reload, profile/subject/pin persistence, 12 viewport/theme combinations and retained routes. The final concurrency-only backend adjustment was then covered by the complete 125-test run and repeated build/lint.

## Live verification and remaining limits

`node scripts/verify-gemini-models.mjs` was run and returned **blocked**, exit code 2, because `GEMINI_API_KEY` is absent. No API secret is requested in chat or put in the browser. With an authorized server secret, this command reads configured model metadata; adding `--generate` performs one small primary-model text smoke test. It prints sanitized outcomes. Metadata alone does not prove all multimodal/speech tasks work.

Configured defaults remain `gemini-3.8-flash`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview` and `gemini-2.5-flash-preview-tts`. Official documentation is evidence of published APIs, not of this project's access, billing or remaining quota. No live OCR, speech, educational-quality benchmark, production deployment or new release is claimed.

The existing deployment maps provider HTTP 502/503/504 to JSON HTTP 500 to avoid its proxy replacing errors with a warmup page. Distinct `code`, `stage`, `failureKind` and retry time remain available where applicable. Circuits, queues and caches are process-local and reset on restart; multi-replica global coordination remains future operational work. Daily-quota reset is only known when the provider supplies it; otherwise the one-hour cooldown is a conservative recheck interval, not a reset guarantee.

Quote/page-identifier checks establish source identity and exact evidence, not semantic entailment or universal factual correctness. Human review and a live quality benchmark remain necessary for educational claims. The broad legacy unhandled-rejection hook was inspected but retained to avoid changing PDF-worker behavior without targeted lifecycle evidence; its narrower replacement remains an explicit later reliability item. See [research notes](02-research-notes.md).
