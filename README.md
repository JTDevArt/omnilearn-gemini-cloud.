# OmniLearn AI — Gemini Cloud Edition

OmniLearn is a universal learning workspace. This migration replaces browser-local WebLLM/WebGPU inference with Gemini Cloud through a Node.js backend.

## What changed

- Removed WebLLM, WebGPU checks, local model downloads, model selector, and the LLM worker.
- All Gemini requests now run in `server.js` using the official `@google/genai` SDK.
- The browser never receives or stores `GEMINI_API_KEY`.
- Google AI Studio Build Mode can provision `GEMINI_API_KEY` as a server-side secret.
- Document uploads are extracted in server memory and are not written to disk.

## Learning features retained and included

- Universal tutor chat with conversation history.
- Upload and text extraction for PDF, DOCX, PPTX, and TXT (15 MB maximum).
- Automatic summaries.
- Multiple-choice quizzes with answer keys and explanations.
- Flashcards.
- Hierarchical concept maps.
- Seven-day study plans / learning path.
- Material translation to several target languages.
- Research planning assistant for questions, objectives, concepts, methods, data needs, and literature-search keywords. It does not claim to verify live references.
- Subject exploration, dark mode, local chat history, clear chat, copy output, and drag-and-drop upload.

## Google AI Studio Build Mode

1. Put this project in a GitHub repository. The repository can be private.
2. Open [Google AI Studio](https://aistudio.google.com/) and choose **Build**.
3. Use **Add files (+) → Import from GitHub** and select the repository.
4. Open `AI_STUDIO_PROMPT.md` and paste its prompt into the Build agent.
5. Let the agent install dependencies and verify the preview.
6. Open **Settings → Secrets**. Confirm that `GEMINI_API_KEY` exists as a server-side secret. New Gemini web apps in AI Studio may provision this automatically; if it is missing, add it there. Never put it in `public/index.html` or any client-side variable.
7. Test chat, all learning tabs, and each supported upload format before sharing or deploying.
8. When ready, deploy from AI Studio to Cloud Run.

AI Studio's Build Mode supports a Node.js server runtime, npm packages, GitHub import, and server-side secrets. Deployment to Cloud Run may incur costs. Gemini usage is charged or quota-limited according to the selected model and account.

## Local development (optional)

Local development needs the project owner's Gemini API key. This is separate from any ChatGPT subscription.

```bash
npm install
cp .env.example .env
# Edit .env and set GEMINI_API_KEY for local testing only
npm run check
npm start
```

Open `http://localhost:8080`.

On Windows PowerShell, copy the example with:

```powershell
Copy-Item .env.example .env
```

Do not commit `.env`. In AI Studio, use the Secrets panel instead of a local `.env` file.

## Server routes

- `GET /api/health` — reports whether the server-side Gemini secret is available.
- `POST /api/chat` — tutor chat with short conversation history and optional extracted material.
- `POST /api/study` — summary, quiz, flashcards, concept map, seven-day plan, translation, and research planning.
- `POST /api/upload` — in-memory extraction for PDF, DOCX, PPTX, and TXT.

## Security and privacy notes

- The Gemini API key is read only from `process.env.GEMINI_API_KEY` in `server.js`.
- Uploaded file bytes are held in memory for extraction; they are not persisted to disk by this app.
- Extracted text is returned to the browser and sent to Gemini only when the learner requests AI processing.
- The browser stores chat history and theme preference in its own `localStorage`.
- Basic per-IP rate limits and a 15 MB upload cap are enabled. For a public production service, add authentication, durable rate limiting, abuse monitoring, and a clear privacy/retention policy.
- Scanned PDFs without a text layer need OCR before upload.

## Project structure

```text
omnilearn-gemini-cloud/
├── public/
│   └── index.html
├── scripts/
│   └── verify-migration.mjs
├── server.js
├── package.json
├── .env.example
├── .gitignore
├── AI_STUDIO_PROMPT.md
└── README.md
```
