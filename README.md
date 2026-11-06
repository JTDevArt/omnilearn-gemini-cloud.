# OmniLearn AI — Gemini Cloud Edition

Home is at `/` and the learning application at `/dashboard`. The [reviewed Final Forge status](docs/FINAL-FORGE-STATUS.md) distinguishes implemented, tested, partial and pending features. It supersedes earlier V2/MAX status documents for the current scope. In the managed cloud runtime start with `NODE_USE_ENV_PROXY=1 npm start`.

The current increment adds a shared source-analysis blueprint with exact supporting quotes, source revisions with archived artifacts, and device-local IndexedDB persistence. It remains an incremental implementation: authentication, cloud accounts, automatic YouTube transcripts, live literature research and production deployment are not complete.

OmniLearn is a universal learning workspace. This migration replaces browser-local WebLLM/WebGPU inference with Gemini Cloud through a Node.js backend.

## What changed

- Removed WebLLM, WebGPU checks, local model downloads, model selector, and the LLM worker.
- All Gemini requests now run in `server.js` using the official `@google/genai` SDK.
- The browser never receives or stores `GEMINI_API_KEY`.
- Google AI Studio Build Mode can provision `GEMINI_API_KEY` as a server-side secret.
- Document uploads are extracted in server memory and are not written to disk.

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
8. When ready, sync changes back to GitHub using the **GitHub** button in the AI Studio top bar or deploy to Cloud Run.

## Local development

```bash
npm install
cp .env.example .env
# Edit .env and set GEMINI_API_KEY for local testing only
npm test
npm run check
node --env-file=.env server.js
```

Open `http://localhost:3000`.

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
- Server upload buffers are processed in memory and released after extraction; temporary extracted-text and analysis caches are bounded and expire.
- The browser stores the library, chats, notes, progress and new original uploads in device-local IndexedDB when available. Active selection and request session IDs remain tab-scoped. Device data can be erased through Settings; JSON exports omit binary originals.
- There is no authenticated cloud account or cross-device synchronization. Automated quote/structure checks do not independently certify factual or OCR accuracy.

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

The default model is `gemini-3-flash-preview`, with `gemini-3.1-flash-lite` as a fallback for eligible errors; `GEMINI_MODEL` overrides the primary model. Responses identify the actual model used. Provider availability and quota still affect requests.

Commands such as “bikin peta konsep” open the existing interactive map workflow. The output-language selector now reaches the backend. Automatic English/Indonesian detection is heuristic; uncertain material is left for model detection and the user can override it.

Run `npm test`, `npm run build`, and `node tests/readiness.test.mjs` (starts a local server on an ephemeral port). Live Gemini validation additionally requires a configured key. `/api/health` includes `version: concise-ai-v4`; `ready` only indicates key presence. Pushing GitHub changes does not automatically update an existing AI Studio preview: sync or import the revision into that project and restart its backend before checking the version.

Concept maps omit separate cause-and-effect fields, including legacy fields returned by a model or held in the browser cache. Map labels follow the selected output language. Shared AI guidance prioritizes brief, grounded explanations; invalid or incomplete structured results return `INVALID_AI_OUTPUT` rather than raw JSON shown as a successful answer.
