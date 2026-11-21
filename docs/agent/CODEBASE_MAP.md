# OmniLearn code map

V19 starts from `e11fdca7862371cd2a07db94b7662804e1c31360`. Compare the working tree and [STATE.md](STATE.md) before reusing this map.

| Surface | Entry points | API or storage boundary | Local checks |
| --- | --- | --- | --- |
| Landing | `server.js` sends `public/landing.html`, with `landing.js` for navigation and demo controls | Deep links into `/dashboard?view=…` | `verify-remaining-pages.cjs` |
| Home and Dashboard | `product.js:navigate` → `dashboard-shell.js:render`; `openSourcePicker`, `library`, `openMaterialDialog` | `OmniProduct.selectSource`, `submitDashboardChat`, `persistAsync`; metrics from stored activity | `verify-archive-home.cjs`, `verify-home-visual.cjs` |
| Notes, subjects, streaks, ranking, profile, updates | `dashboard-shell.js:render`, `release-history.js:mountReleaseHistory` | Same library and activity; versioned public JSON; `GET /api/account/me` | `verify-page-interactions.cjs`, `verify-remaining-pages.cjs` |
| Exams | `exam-workspace.js:renderExams`, `exam-engine.js` | Source-scoped banks, attempts and results. Local objective grading. `POST /api/exam/grade` for assessment | `verify-exams-browser.mjs`, `exam-selection.test.mjs` |
| Sources | `product.js:sourcesView`, `sourceCards`, `stageUpload`, `finishUpload`; `source-tools.js` | Upload, corrections, original files, version history and ZIP/JSON exports | `verify-storage-browser.mjs`, `verify-upload-browser.mjs` |
| Workspace | `study-shell.js:mount`, `mountMaterialNavigation`; `jarvis.js` chapter/quiz readers; `workbench.js` review and notes; `map-workspace.js` | `/api/study`, `/api/quiz/check`, `/api/speech`; save by source ID and revision | `verify-study-workspace.cjs`, `verify-workspace-browser.mjs` |
| Provider status | `server.js:generateText`, `lib/provider-manager.js:ProviderManager`, `lib/provider-request.js`, `lib/provider-errors.js` | Official Gemini SDK, bounded by task/capability, deadline and quota. Text-provider pilot stays disconnected | `provider-http.test.mjs`, `provider-manager.test.mjs`, `text-provider-pilot.test.mjs` |
| Accounts and cloud sync | `account-workspace.js`, `lib/account-routes.js`, `lib/cloud-account.js`, `firestore.rules` | Firebase identity cookies and optional owner-scoped sync. Original bytes stay local | `cloud-account.test.mjs`, `verify-storage-browser.mjs` |
| Startup | `index.html`, `app-startup.js`, end of `product.js` initialization | Actual account/IndexedDB initialization and first route mount signal completion. Health polling is independent | Startup browser regression |
| Device privacy | `product.js:navigate('privacy')`, `backup-workspace.js:openBackup`, `local-library.js:clear` | Device ZIP export or namespace-scoped erase. A new account session cookie is issued only after Firebase identity verification | `verify-storage-browser.mjs`, `cloud-account.test.mjs` |

## Request and storage paths

- **Tutor.** Home or workspace dispatches `app.js:sendChat`. `OmniProduct.chatRequestContext` selects the general thread or the active document ID, version and text. `ensureAnalysis` uses `/api/source/analyze`, and `/api/chat` runs the server-side source analysis and context checks. `commitChatExchange` writes one successful turn to its original thread. A resolved manual retry removes that request from the recovery queue.
- **Tutor to material.** `attachChatMaterialAction` opens `chat-material.js:openChatMaterial`, calls `/api/study` for a journey, then calls `saveChatLesson` after title and chapter review. The original ID, version and text must still match before a derivative is saved.
- **Upload and OCR.** `upload-queue.js` and `app.js` preserve the original before submitting `/api/upload`. `server.js:inspectPdfTextLayer` maps native content by page number. `extractPdfWithGeminiOcr` uses targeted images from `lib/pdf-preprocess.js` when available, then validates `lib/ocr-pages.js` markers before merging results in page order. Vercel uses bounded synchronous upload. Other hosts also expose status and cancel endpoints.
- **Source validation.** `SourceIntelligence` checks quotations and source structure in the same session, ID, content hash and version. `generateText` decodes once and passes the normalized study artifact to the route. Grounded page IDs come from the actual source, while general chat accepts ordinary page notation. A human or a live quality benchmark must establish factual correctness.
- **Durability.** `public/local-library.js` is the IndexedDB v1 owner, with `state` and `files` stores. `product.js` owns application records and account namespace changes. `backup-format.js` owns `omnilearn-backup/1`. File keys remain tied to source ID and version. Session storage holds active context and the Home draft.

The workspace has no Graphify index or Codebase Memory MCP endpoint. This map is based on repository symbols and the cited checks.
