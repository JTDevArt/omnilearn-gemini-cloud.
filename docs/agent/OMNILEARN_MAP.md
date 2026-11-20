# OmniLearn architecture

## Routes
- `server.js` serves the public landing (`public/landing.html`) at `/` and the application shell (`public/index.html`) at `/dashboard`.
- `public/product.js` owns navigation, active source, library persistence and tool dispatch.
- `public/dashboard-shell.js` renders Home, Dashboard, Catatan, subjects, streaks, profile and Update List.
- Home, Dashboard, and Catatan share `library()` for search, sorting and folder/source filters. `openMaterialDialog()` saves a local note or pasted source.
- `public/study-shell.js` mounts shared study controls. `public/jarvis.js` renders chapters and structured quizzes. `public/workbench.js` handles flashcard review and note editing.
- `public/design-system.css` owns base tokens. `public/home.css` owns Home and Dashboard composition. Theme choice comes from `public/theme.js`.

## Data flow
1. `public/upload-queue.js` saves the original file through `public/local-library.js` before extraction. `public/app.js` submits multipart uploads to `/api/upload` and reads job status.
2. `server.js` dispatches native extraction and the PDF OCR path. `lib/pdf-preprocess.js`, `lib/ocr-preprocess.js` and `lib/ocr-policy.js` support PDF scan handling.
3. The active source carries the original filename, extracted text and reviewed lesson title. `public/lesson-label.js` provides the shared title resolver. `public/backup-format.js` validates backups. An OCR text revision keeps the original attachment available by version.
4. `public/product.js` prepares the source version and context. `/api/source/analyze` validates evidence through `lib/source-intelligence.js`. `/api/study` returns structured lessons, cards, quizzes and maps. Source-linked tool results persist through `saveTool`.
5. `public/app.js` sends `/api/chat`. General mode sends its own history without document text. Source mode requests verified analysis. `public/ai-response.js` classifies failures and keeps diagnostic details separate from the user-facing error.
6. `public/chat-material.js` previews an individual chat exchange. `public/app.js` calls `/api/study` with `task: journey` and `tutorConversation`, including original source fields only in document scope. `OmniProduct.saveChatLesson` persists the edited preview as a separate library record.
7. `lib/provider-manager.js` and `lib/provider-request.js` manage Gemini routing and deadlines. `lib/text-provider-pilot.js` is a separate test adapter.

## Regression entry points
- AI, source and OCR fixtures: `tests/provider-http.test.mjs`, `tests/source-intelligence.test.mjs`, `tests/origin-check.test.mjs`, `tests/pdf-pipeline.test.mjs`.
- Chat-to-material browser fixture: `scripts/verify-chat-material.cjs`.
- Study cases: `tests/study-recovery.test.mjs`.
- Browser interactions and screenshots: `scripts/verify-archive-home.cjs`, `scripts/verify-home-visual.cjs`, `scripts/verify-study-workspace.cjs`, `scripts/verify-remaining-pages.cjs`.
