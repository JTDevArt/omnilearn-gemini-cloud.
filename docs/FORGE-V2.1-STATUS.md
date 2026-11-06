# Forge V2.1 — completion and verification report

Date: 6 November 2026. Before changes: `30187783dec0c98c18788898a571506b09a0e134` on `upgrade/omnilearn-max`, matching `origin/main`; the working tree was clean. This continues that implementation without a framework migration. This report supersedes earlier reports for changed scope. Older live-AI evidence is historical, not a new test result.

**IMPLEMENTED:** functioning code exists. **TESTED:** actual checks executed, within the stated scope. **PARTIAL:** important requirements remain. **BLOCKED:** an external prerequisite prevents verification/completion. **NOT IMPLEMENTED:** functioning code does not exist. Fixture checks are not live-provider acceptance.

## 1. Repository baseline and retained features

The preceding increment provided separate home/dashboard, server-side Gemini SDK, concise source-language summaries, canonical source blueprint/quote gate, notes/cards/quizzes/maps, journeys, translation, IndexedDB, original uploads, source revisions and context isolation. Existing Markdown sanitization, KaTeX, document/media formats and guest tutor flows are retained. The earlier complete product-transformation directive was not fully delivered.

## 2. Workstream status

| Workstream | Implemented and verified scope | Remaining status |
| --- | --- | --- |
| Deployment | Startup/env/PORT validation, health/version, nonce HTML/static serving, graceful shutdown, locked non-root Docker runtime and deployment documentation | **BLOCKED:** actual AI Studio/Cloud Run publication needs an available owner/platform deployment capability. No new hosted revision was published here |
| Accounts/database/sync | Firebase REST Auth/Firestore; registration/login/logout/refresh/reset/verification/profile; verified UID and per-account local cache; source/version resources, atomic revision preconditions; auto push/pull, offline local saves and conflict recovery | **TESTED with fixtures:** HTTP isolation/CAS/cookies and two browser profiles. **BLOCKED:** real Firebase/email delivery, deployed/emulator-tested rules and real-device acceptance |
| YouTube transcription | Strict URL/id validation, official authorized caption download, metadata/language/timestamps, chapters, manual transcript/SRT/VTT fallback | **TESTED with fixtures. BLOCKED:** eligible video/OAuth credential. **PARTIAL:** static access token, no consent/refresh flow or arbitrary-public-video download |
| Video learning | Native controls/speed/fullscreen, privacy-enhanced YouTube embed, subtitle/chapter seek, chapter highlighting, learning-tool links, cached frame sampling/thumbnails | **TESTED in Chromium** with a real synthetic MP4/subtitles. **PARTIAL:** visual-change heuristic rather than semantic scene understanding; no YouTube pixel sampling or generated chapter objectives |
| Research | Crossref/optional Brave adapters, scoped source registry, retrieval metadata/provider citations, metadata comparison; optional synthesis with separated uploaded/external/AI sections and validated evidence IDs | **TESTED with fixtures. BLOCKED:** live Crossref policy denial; Brave credential missing. **PARTIAL:** metadata/snippets, no full-article verification or guaranteed peer-review ranking |
| Exam simulator | All requested bank types; individual-question form/advanced multipart bank; subject/difficulty/duration; wall-clock timer/navigation/flags/autosave/reload/submit/history; deterministic numeric/unit/short/objective grading; rubric AI assessment and pending recovery | **TESTED:** units/timer/multipart and browser draft/attempt reload/pending essays. **BLOCKED:** live AI grading quality. **PARTIAL:** deadline continues without pause; multipart authoring uses advanced JSON |
| Mindmaps | Source map/root creation, child/sibling, title/description, confirmed subtree deletion, move/reorder/connect/disconnect, collapse/pan/zoom/fit, undo/redo/autosave/JSON; original generated map retained | **TESTED:** graph validation and browser CRUD/reload. **PARTIAL:** free-topic maps without a saved source are explicitly temporary; layout is a tree with relationship labels rather than a force-layout canvas |
| Backup/import/restore | Versioned ZIP/manifest/originals when available, SHA-256/bounded extraction, duplicate preview/copy-or-skip, atomic import/pre-import rollback; restore old content as a new revision | **TESTED:** roundtrip/corruption/path/prototype/size cases and browser import/version restore. Missing originals are reported; rollback retains one pre-import library rather than unlimited history |
| OCR | EXIF correction, conservative projection deskew, contrast/resolution normalization and optional median denoise; native Stage A retained; target scan-page rendering for multimodal Stage B, temp cleanup/page quality/partial-source gate | **TESTED:** real pixel transforms and native/scanned/mixed PDF SDK-transport fixtures. **PARTIAL:** no calibrated confidence, semantic rotation without EXIF, independent table/formula/reading-order benchmark or perfect completeness detection |
| Quota/provider manager | Central primary/text/multimodal/speech config; daily/rate/auth/model/network classification; bounded concurrency/FIFO, cooldown/RetryInfo, two-candidate deadline, cancellation/deduplication/scoped chat cache; canonical blueprint cache retained | **TESTED with fixtures:** cooldown/no reprobe, auth fail-fast, queue/cancel/dedupe and actual fallback. **BLOCKED:** fresh live primary/fallback inference deliberately avoided to protect quota |
| Recovery/integration | Persist deferred tutor/tool requests per source/version; explicit retry/remove, actual fallback notice, pending essay recovery, cloud conflict handling and scoped cache clearing | **TESTED:** browser 429/retry/fallback and cloud fixtures. **PARTIAL:** no durable server jobs after restart; in-flight extraction may finish computing, but cleared background results are discarded |
| Security | Nonce CSP, Origin/Fetch Metadata checks, HttpOnly sessions/ownership, request/upload/extraction/archive limits, patched image dependency, private server files unavailable | **TESTED:** scoped regression/security requests and dependency audit. **PARTIAL:** no comprehensive penetration test or deployed infrastructure assessment |

## 3. Newly implemented files

- Backend: `lib/cloud-account.js`, `lib/account-routes.js`, `lib/external-http.js`, `lib/youtube-provider.js`, `lib/research-provider.js`, `lib/research-synthesis.js`, `lib/exam-assessment.js`.
- Reliability/extraction: `lib/provider-manager.js`, `lib/work-queue.js`, `lib/ocr-preprocess.js`, `lib/pdf-preprocess.js`, integrated in `server.js`.
- Frontend domain logic: `public/exam-engine.js`, `public/mindmap-model.js`, `public/backup-format.js`, `public/transcripts.js`, `public/video-sampling.js`.
- UI: `public/account-workspace.js`, `public/exam-builder.js`, `public/exam-workspace.js`, `public/map-workspace.js`, `public/backup-workspace.js`, `public/research-workspace.js`, `public/recovery-workspace.js`, `public/video-workspace.js`, `public/forge.css`; updates to `public/index.html`, `public/product.js`, `public/source-tools.js`, `public/local-library.js`.
- Runtime/schema/docs: `Dockerfile`, `.dockerignore`, `firestore.rules`, `.env.example`, `package.json`, `package-lock.json`, `README.md`, `docs/DEPLOYMENT.md` and this report.
- Checks: new cloud-account/integration-adapters/OCR-preprocess/PDF-pipeline/provider-manager/recovery-core tests and `tests/fixtures/*`; expanded `tests/readiness.test.mjs`.

## 4. Identity, database and synchronization

Firebase Email/Password Authentication fits the existing Google project without adding a paid AI provider/browser auth SDK. Server REST calls verify identity and refresh HttpOnly credentials. Cloud routes derive UID from verification; writes require verified email and a matching Firestore head revision. Expected-account mismatch is rejected. Passwords are sent to Firebase over HTTPS and are not stored by this app.

Settings/current sources and archived versions have separate owner/source/version/timestamp resources. Artifacts remain nested inside their source/version JSON to preserve existing relationships. Bounds: 700,000 UTF-8 bytes/resource, 8 MiB snapshot and 350 resources. Binary originals remain local. Per-account browser namespaces are separate from guest data.

Automatic sync preserves edits made during a push, pulls only while idle, retries after reconnecting in an open tab and pauses on conflicts. It does not provide unlimited storage, background sync after closing the app, service-worker offline reload or collaborative document merging. Real Firebase and two-device credential acceptance remain blocked; two isolated browser profiles passed against explicit fixture services.

## 5. Backup format and source restoration

ZIP `omnilearn-backup/1` contains `manifest.json`, `library.json` and manifest-listed originals. The manifest records format version, byte counts and SHA-256 hashes. Import rejects unknown entries, traversal/absolute paths, symlinks, prototype keys, malformed schemas/version chains, mismatched checksums and excessive content. Limits: 64 MiB compressed, 100 MiB expanded, 8 MiB library JSON and 15 MiB/original. Automatic archive splitting is not implemented.

Duplicates are copied under new source IDs or skipped. Version restore archives the current content and makes a new revision from old content while preserving current personal notes. Atomic IndexedDB import retains a before-import snapshot. Original file keys are retained during import/rollback; source deletion has explicit cleanup. Exports are not encrypted or signed.

## 6. AI, video and OCR integrity

No live Gemini inference request was made in this increment. Existing defaults remain `gemini-3.8-flash` primary, `gemini-3.1-flash-lite` text fallback, `gemini-3-flash-preview` multimodal fallback and `gemini-2.5-flash-preview-tts` speech. Earlier live checks observed primary daily exhaustion and successful text fallback; that is not a fresh check or a model availability guarantee.

Provider metadata records actual model/fallback/usage/latency/cache/retry time when supplied. Cooldowns prevent repeated probing and never assume unlimited fallback quota. State is process-local and resets on restart. No new paid AI provider is introduced. Canonical analysis and schema validation remain; they do not independently prove every generated fact.

Pixel preprocessing and sampled video thumbnails are real local operations. Gemini supplies no calibrated OCR confidence, so quality remains qualitative with `ocrConfidence: null`. Scene detection is sampled visual difference, not semantic recognition. Research citations originate in selected provider registry records; generated prose cannot introduce a new URL/DOI/record ID. These checks do not establish full-text credibility, perfect extraction or complete visual understanding.

## Security review

| Priority/finding | Resolution and verification |
| --- | --- |
| High: initial `sharp` dependency had image-library advisories | Updated to `sharp ^0.35.5` and regenerated the lockfile; final audit below |
| High: cloud ownership must not trust browser UID | Firebase verification, scoped paths/owner checks, account pinning and revision CAS; fixture two-user/mismatch/conflict checks |
| High: backup decompression/unsafe paths and keys | Streaming budgets, strict manifest/schema/graph/exam/version checks, SHA-256; adversarial fixtures |
| Medium: missing nonce script policy | Per-response nonce CSP/no inline handlers or objects; browser console and HTTP nonce checks |
| Medium: cross-origin mutations/large bodies | Origin plus Fetch Metadata checks, SameSite Strict cookies, separate JSON/upload/cloud bounds and pre-parser rate limits; request rejection tests |
| Medium: heavy processing/repeated exhausted calls | Early bounded admission, serial extraction, sharp limits, PDF renderer timeout/cleanup, provider queue/deadlines/circuits; deterministic tests |
| Medium: unexpected error details/fatal process errors | Generic unexpected responses/safe logs, missing-secret startup failure, fatal exception exit; no secret in public files or build configuration |

**Open high-priority production work:** guest AI endpoints remain callable without login and can consume quota. Process-local rate limits/circuits are not shared across replicas; add an owner-chosen authenticated spending policy and ingress abuse controls before public scaling. Deploy/test Firestore rules and real identity flows before sensitive cloud use. An independent production penetration test, OS/container CVE scan and sustained upload/load benchmark were not performed.

Local caches/ZIPs are readable to a person controlling that browser profile/export. Logout clears cookies without administratively revoking every refresh token. The legacy `pdf-parse`/pdf.js stack is bounded but not isolated into a worker container. Its compatibility unhandled-rejection handler still logs a safe error name; uncaught fatal exceptions now terminate. No SQL layer exists; Firestore requests use validated data/static resource paths. These changes are a scoped security review, not a guarantee that the app cannot be hacked.

## 8. Performance

- Gemini: four active requests, 24 queued maximum with a short wait, two candidates under a shared deadline; duplicate callers share work with isolated cancellation. Short scoped chat caching supplements canonical blueprint caching.
- Extraction: one active expensive upload/four waiting, early admission before body parsing, target scan batches up to four pages, bounded render resolution/time, sharp cache/concurrency limits. Native pages are retained.
- Video: up to 60 sample frames/24 thumbnails cached per source; transitions between samples can be missed.
- Sync: 2.5-second debounced writes, 20-second idle polls, no remote application during editing, and atomic rejection of oversized libraries.
- No comprehensive latency, throughput, memory or learning-effectiveness benchmark was run.

## 9. Executed verification and results

Provider-dependent tests use explicit fixtures; production has no mock mode. The PDF fixture is loaded only with a test-process `--import`, exercises the actual SDK transport and is excluded from the image.

- `npm test`: **104 passed, 0 failed, 0 skipped**, including the final research-language regression. Tests cover all retained modules plus account ownership/CAS/cookies, provider cooldowns/queue/cancellation, graph operations, exam types/units/timers, adversarial ZIP validation, real image transforms and native/scanned/mixed PDF transport fixtures.
- `npm run build`: passed, checking **47 JavaScript modules** and HTML inline scripts plus migration invariants. `git diff --check`: passed.
- `npm audit --json`: **0 vulnerabilities** after the sharp update. This is an npm advisory result, not an OS/container CVE assessment.
- Chromium main journey: actual two-file TXT processing/IndexedDB, map CRUD/relationships/undo/reload, ZIP roundtrip/duplicate copies/version restore, exam draft/answer reload and numeric units, quota-pending essays, deferred tutor retry and visible fallback, real native MP4 controls/subtitle seek/sampled frames, honest missing-cloud state. AI results/failures were explicit fixtures. Zero captured page errors/CSP violations.
- Responsive library checks: 1440, 1280, 768, 390 and 360 pixels with no document-level horizontal overflow. Additional research UI at 360 pixels had no horizontal overflow.
- Separate research/rollback browser journey: pre-import restore survived reload and retained original bytes; metadata selection/comparison/synthesis, language/query context, no automatic inference on opening/reselecting research, and hiding research on tab change all passed. Research/AI services were explicit fixtures.
- Two isolated browser profiles: fixture-account auto push/idle pull, concurrent conflict preserving both local versions, and local account namespace separation passed. This is not real Firebase or physical-device acceptance.
- Docker production build and smoke passed: non-root UID, actual `sharp 0.35.5` preprocessing and `pdftoppm 22.12.0`, missing-secret exit 1, health `forge-2.1`, local vendor assets, frontend/backend connectivity and actual TXT extraction. Only an explicit fake key was supplied for non-AI checks; no inference was attempted.
- Live Crossref probe: **blocked**, HTTP CONNECT 403 from active network policy. Firebase/YouTube/Brave credentials absent; no corresponding live success claim. **No new live Gemini inference calls.**

Browser evidence is under `/workspace/qa-output/v21-*.json` and `v21-library-*.png`; temporary Playwright scripts are under `/tmp/omnilearn-qa/`. Those paths are not part of a fresh Git clone. The committed Node suite is reproducible with `npm ci && npm test`. Earlier live reports/screenshots belong to prior increments.

The regression suite also covers retained language/source policy, flashcards, quizzes/activity, conversation context, Office archives, source isolation and speech. Browser checks exercise reload persistence and responsive UI. A fresh live AI/language/OCR accuracy benchmark and a complete every-format/every-theme visual matrix were not executed. Fixture responses are not genuine model output.

## 10. Remaining blockers and exact next steps

1. **BLOCKED — Publish:** no callable AI Studio publishing or Google Cloud identity is available. Bring GitHub `main` into the existing project, restart, verify `forge-2.1`, use **Publish**, then verify the hosted version. See [deployment steps](DEPLOYMENT.md).
2. **BLOCKED — Real cloud:** configure Firebase Auth/Firestore/server values, deploy rules, test verification/reset email and same-account sync on two real devices plus cross-user denial.
3. **BLOCKED — YouTube:** provide an authorized eligible caption token/video; test real language/timestamps and denial fallback. OAuth consent/refresh UI is **NOT IMPLEMENTED**.
4. **BLOCKED — Live research:** activate scoped network hosts in the environment draft; current Crossref access is denied. Brave requires a credential. Verified full-article retrieval is **NOT IMPLEMENTED**.
5. **BLOCKED — AI quality:** when quota permits, run a minimal real source-analysis/summary/essay/research check and inspect the actual model. No inference was spent on repeated debugging here.
6. **PARTIAL — Advanced intelligence:** semantic scene interpretation, generated chapter objectives, orientation without EXIF, calibrated OCR confidence from a supporting engine and independent reading-order/formula/table validation remain open.
7. **PARTIAL — Production security:** complete the open work above. Distributed provider accounting, durable server tasks and a full offline service worker are **NOT IMPLEMENTED**.
8. Review/save the reusable environment configuration with lockfile/startup/integration hosts. A saved development draft does not apply missing credentials, activate the running network policy or deploy the website.

The assistant cannot inspect remaining five-hour chat quota, so an exact automatic 5% stop is unavailable. Gemini model API quota is separate; this increment protected it by using local processing and explicit provider fixtures.
