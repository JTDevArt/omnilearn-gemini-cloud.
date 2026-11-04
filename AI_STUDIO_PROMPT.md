# Prompt for Google AI Studio Build Mode

Import this existing OmniLearn project and complete the migration as a full-stack web app. Preserve the current visual design, page structure, responsive behavior, Indonesian copy, and all existing learning workflows. Do not redesign it from scratch.

## Required architecture

- Keep the frontend in `public/index.html` unless a small structural change is needed to make the project run in Build Mode.
- Keep a Node.js server backend in `server.js`.
- Use the official `@google/genai` SDK and Gemini Cloud model `gemini-3.8-flash` by default.
- Read the API key only from `process.env.GEMINI_API_KEY` in server-side code.
- Provision or connect `GEMINI_API_KEY` through AI Studio's Settings → Secrets. Do not ask end users for an API key. Do not hardcode any key.
- Keep all Gemini calls on the server. Never import `@google/genai` in browser code and never expose the secret in HTML, JavaScript bundles, logs, or API responses.
- Use Node.js runtime and npm dependencies. Ensure the app starts with `npm start` and listens on `process.env.PORT`.

## Features that must remain working

1. Universal tutor chat, including recent conversation history and uploaded-material context.
2. Upload PDF, DOCX, PPTX, and TXT files up to 15 MB; extract text and show the material name and character count.
3. Generate summaries.
4. Generate multiple-choice quizzes with answer keys and explanations.
5. Generate flashcards.
6. Generate hierarchical concept maps.
7. Generate a seven-day study plan / learning path.
8. Translate material to the selected target language.
9. Research planning assistant that helps formulate research questions, objectives, concepts/variables, method options, data needs, and literature-search keywords. Never invent citations or claim that references were verified if no search was performed.
10. Subject exploration, dark mode, local chat history, clear chat, copy output, and drag-and-drop upload.

## API contract

- `GET /api/health` returns provider, model, and `ready` based on the server-side secret.
- `POST /api/chat` accepts `{ message, history, material, materialName }` and returns `{ answer, model }`.
- `POST /api/study` accepts `{ task, material, topic, materialName, count, targetLanguage }` and returns `{ result, task, model }`.
- `POST /api/upload` accepts multipart form data with field `file` and returns `{ text, filename, characters, truncated }`.

## Hard exclusions

- Remove WebLLM, `@mlc-ai/web-llm`, WebGPU, `navigator.gpu`, model downloads, model caches, `llm-worker.js`, and any local model selector.
- Do not add a browser-side Gemini API call.
- Do not add an API-key input field for learners.
- Do not save uploaded documents permanently unless the owner explicitly asks for that later.

## Verification checklist

- Install all npm dependencies and resolve all build/runtime errors.
- Confirm `GET /api/health` reports ready when the AI Studio secret exists.
- Test one tutor question with and without uploaded material.
- Test PDF, DOCX, PPTX, and TXT extraction.
- Test every learning tab: summary, quiz, flashcards, concept map, seven-day plan, translation, and research assistant.
- Confirm the app works on desktop and mobile.
- Search the entire project for `@mlc-ai/web-llm`, `navigator.gpu`, `llm-worker.js`, and model-download code; remove any remaining local-AI code.
- Confirm `GEMINI_API_KEY` appears only in server-side environment access and documentation/examples, never in browser code.

Do not claim deployment is complete until the live preview passes these checks. Keep the UI and user-facing text in Indonesian.
