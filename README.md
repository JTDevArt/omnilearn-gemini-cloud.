# OmniLearn AI — Gemini Cloud Edition

Home is at `/` and the learning application at `/dashboard`. The [current milestone status](docs/milestones/README.md) records work through Milestone 07, test evidence and live-service limitations. The [Forge V2.1 report](docs/FORGE-V2.1-STATUS.md) is the earlier feature baseline. Read [deployment and integration setup](docs/DEPLOYMENT.md) for external prerequisites. In the managed cloud runtime start with `NODE_USE_ENV_PROXY=1 npm start`.

Forge V2.1 extends the existing shared source-analysis blueprint, source revisions and IndexedDB persistence with timed exams, editable mindmaps, versioned ZIP backup/import/restore, native video/subtitle learning, OCR preprocessing, centralized Gemini routing and request recovery. Firebase account/sync, authorized YouTube captions and research adapters are connected, but their live external acceptance tests remain blocked by missing credentials/network access. No hosted revision has been published by this increment.

OmniLearn is a universal learning workspace. This migration replaces browser-local WebLLM/WebGPU inference with Gemini Cloud through a Node.js backend.

## What changed

- Removed WebLLM, WebGPU checks, local model downloads, model selector, and the LLM worker.
- All Gemini requests now run in `server.js` using the official `@google/genai` SDK.
- The browser never receives or stores `GEMINI_API_KEY`.
- Google AI Studio Build Mode can provision `GEMINI_API_KEY` as a server-side secret.
- Native extraction uses server memory. Targeted scanned-PDF rendering uses short-lived temporary files cleaned in `finally`; original uploads remain in the browser library when storage permits.

## Learning features retained and upgraded (Phase 2)

- **Humanized & Document-Aware AI Tutor**: Adaptive explanation depth (`BASIC`, `INTERMEDIATE`, `ADVANCED`), direct answers without robotic filler, and explicit `[Halaman X]` page citations when answering from uploaded documents.
- **Hybrid Document & OCR Engine**: Asynchronous upload (`POST /api/upload` + `GET /api/upload/status/:jobId`) supporting normal PDFs, scanned PDFs (automatic Gemini Vision OCR), hybrid PDFs, DOCX, PPTX, and TXT (up to 15 MB).
- **Smart Summary Engine**: 6 configurable styles (*Ringkasan singkat*, *Ringkasan lengkap*, *Catatan kuliah*, *Poin penting ujian*, *Penjelasan per bab*, *Ringkasan konsep dan mekanisme*).
- **Interactive Quiz Engine**: Configurable difficulty (*Mudah*, *Sedang*, *Sulit*, *Campuran*) and question count (*5, 10, 15, 20*), one-question-at-a-time interactive UI, immediate dual feedback (why the right answer is correct and why the chosen wrong option is incorrect), score breakdown, and retry support.
- **Interactive 3D Flashcards**: Front/Back cards with 3D flip animation, shuffle, mastery tracking (*Sudah paham* / *Perlu diulang*), and a *Tinjau Kartu Sulit* filter.
- **Hierarchical Concept Map**: Interactive tree visualization with expandable/collapsible branches, concise definitions and optional cross-concept relationships.
- **Seven-Day Learning Path**: Progressive 7-day study curriculum with 7 structured daily components.
- **Academic Translation Engine**: Preserves technical terminology, headings, tables, and mathematical formulas across target languages.
- **12-Point Research Assistant**: Structured academic research blueprint with variable operationalization tables and honest methodological labels without fabricated citations.
- **Subject Explorer**: Instant `Pemula → Menengah → Lanjut` roadmaps across 15 disciplines plus deep-dive generation.
- **Rich Markdown & KaTeX Math Rendering**: Full support for tables, blockquotes, code blocks, inline math (`$...$`), and display math (`$$...$$`) sanitized with DOMPurify.

## Google AI Studio Build Mode

1. Put this project in a GitHub repository. The repository can be private.
2. Open [Google AI Studio](https://aistudio.google.com/) and choose **Build**.
3. Use **Add files (+) → Import from GitHub** and select the repository.
4. Open `AI_STUDIO_PROMPT.md` and paste its prompt into the Build agent.
5. Let the agent install dependencies and verify the preview.
6. Open **Settings → Secrets**. Confirm that `GEMINI_API_KEY` exists as a server-side secret. Never put it in `public/index.html` or any client-side variable.
7. Test chat, all learning tabs, and each supported upload format before sharing or deploying.
8. Bring the reviewed GitHub `main` files into the existing project using the import/sync controls available in that interface, restart the backend, verify `productVersion: forge-2.1`, then use **Publish**. A particular GitHub toolbar icon is not assumed to exist. See [exact deployment steps](docs/DEPLOYMENT.md).

## Local development

```bash
npm ci --no-audit --no-fund
cp .env.example .env
# Edit .env and set GEMINI_API_KEY for local testing only
npm test
npm run check
node --env-file=.env server.js
```

Open `http://localhost:3000`.

Requires Node >=20.9. The reviewed Docker image uses Node 24 and `poppler-utils` (`pdftoppm`) for scan-page preprocessing. Without that renderer, OCR reports fallback to the original PDF. `npm run build` checks application JavaScript/inline scripts and migration invariants; this app has no bundler output directory. Production startup requires a non-placeholder server-side Gemini secret.

## Forge V2.1 configuration and APIs

See [.env.example](.env.example). Optional server configuration: `FIREBASE_PROJECT_ID`, `FIREBASE_WEB_API_KEY`, `YOUTUBE_OAUTH_TOKEN`, `BRAVE_SEARCH_API_KEY`; model configuration: `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GEMINI_MULTIMODAL_FALLBACK_MODEL`, `GEMINI_SPEECH_MODEL`. Denoising is opt-in with `OCR_DENOISE=true` because it can erase thin formula strokes.

- `GET /api/provider/status`, `/api/integrations`: safe provider/cooldown/configuration metadata.
- `/api/account/*`: registration/login/logout, refresh, profile, password reset, email verification and verified identity.
- `GET/POST /api/cloud/library`: owner-scoped Firebase library and atomic revision conflicts. Deploy [firestore.rules](firestore.rules) before enabling sync. Original binary files stay local; cloud limits are documented.
- `POST /api/youtube/transcript`: official captions API for videos accessible to the configured OAuth account; manual transcript/SRT/VTT fallback remains available.
- `POST /api/research/search`, `/api/research/synthesize`: Crossref/optional Brave metadata, registry references and optional evidence-linked AI synthesis; no full-article verification claim.
- `POST /api/exam/grade`: validated rubric assessment for essays/cases; pending submissions survive unavailable inference.
- ZIP backups use `omnilearn-backup/1`, SHA-256 checks and atomic previewed import. Source mindmaps and exams persist locally and are included in backups/sync.

## Server routes

- `GET /api/health` — reports whether the server-side Gemini secret is available.
- `POST /api/chat` — adaptive tutor chat with conversation history and page-indexed document context.
- `POST /api/study` — structured & Markdown generation for `summary`, `quiz`, `cards`, `map`, `plan`, `translate`, `research`, and `explore`.
- `POST /api/source/analyze` — session/source/version-scoped knowledge blueprint and automated structural/evidence checks, shared by document learning tools and the tutor.
- `POST /api/speech` — real Gemini audio generation returned as a downloadable WAV.
- `POST /api/upload` — asynchronous in-memory extraction & automatic OCR for PDF, DOCX, PPTX, and TXT.
- `GET /api/upload/status/:jobId` — real-time progress and result polling for document extraction/OCR jobs.

## Security and privacy notes

- The Gemini API key is read only from `process.env.GEMINI_API_KEY` in `server.js`.
- Server upload buffers are released after extraction; preprocessing work, extracted-text and analysis caches are bounded. Temporary scan-rendering files are removed after processing.
- The browser stores the library, chats, notes, progress and new original uploads in device-local IndexedDB when available. Active selection and request session IDs remain tab-scoped. Device data can be erased through Settings; JSON exports omit binary originals.
- Optional Firebase account/sync uses server-verified identity, HttpOnly cookies and per-account local namespaces; fixture tests passed, while real Firebase configuration/rules and real-device tests remain outstanding. Automated quote/structure checks do not independently certify factual or OCR accuracy.
- Nonce CSP, mutation Origin/Fetch Metadata checks, request/upload limits, bounded extraction/provider queues and ZIP validation are active. Guest AI endpoints remain public; process-local rate limits need an owner-chosen authenticated spending policy/shared abuse controls before public scaling. See the [security review](docs/FORGE-V2.1-STATUS.md#security-review).

## Project structure

```text
omnilearn-gemini-cloud/
├── lib/
│   ├── learning-engine.js
│   └── learning-engine.test.js
├── public/
│   └── index.html
├── scripts/
│   └── verify-migration.mjs
├── server.js
├── package.json
├── metadata.json
├── .env.example
├── .gitignore
├── AI_STUDIO_PROMPT.md
└── README.md
```

## AI request reliability

Chat uses a 40-second total provider deadline; study tools use 42 or 55 seconds depending on the task. At most two configured candidates are attempted within that deadline. Browser timeouts include a margin for server responses. Failed POST responses are not automatically replayed.

The primary default remains `gemini-3.8-flash`, with `gemini-3.1-flash-lite` for text fallback and `gemini-3-flash-preview` for multimodal fallback. Centralized configuration, cooldowns and actual-model notices are active. Model availability and quota still affect requests; no new paid AI provider is enabled.

Commands such as “bikin peta konsep” open the existing interactive map workflow. The output-language selector now reaches the backend. Automatic English/Indonesian detection is heuristic; uncertain material is left for model detection and the user can override it.

Run `npm test` and `npm run build`. The suite starts local fixture servers on ephemeral ports without real Gemini calls. Live Gemini validation requires a configured key and quota. `/api/health` retains `version: concise-ai-v4` and identifies this increment as `productVersion: forge-2.1`; `ready` only indicates key presence. Pushing GitHub changes does not update an existing AI Studio preview: sync/import that revision and restart its backend before checking the version.

Concept maps omit separate cause-and-effect fields, including legacy fields returned by a model or held in the browser cache. Map labels follow the selected output language. Shared AI guidance prioritizes brief, grounded explanations; invalid or incomplete structured results return `INVALID_AI_OUTPUT` rather than raw JSON shown as a successful answer.
