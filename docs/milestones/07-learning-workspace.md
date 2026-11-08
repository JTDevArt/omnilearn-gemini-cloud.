# Milestone 07 — learning workspace engine

Completed locally on 8 November 2026 (Asia/Jakarta). Existing learning engines were retained and the missing editing, controls and state persistence were completed. Live Gemini acceptance remains pending; generated-content browser checks use explicit provider fixtures.

## Delivered changes

- Belajar: editable chapter title, objective, explanation, example, formula, recap, practice question/answer/explanation and source references. New generated chapters request and retain recaps. Reference edits accept only exact page/time markers present in the original source. The first AI version stays available in a read-only dialog. Practice drafts, active chapter and completion markers survive navigation/reload. Empty/malformed journeys show a recoverable state; late generation does not replace a page the learner has left.
- Kuis: fixed the missing question-type change handler. Multiple choice, true/false, fill-in, ordering and matching now switch correctly through the existing engines. Cursor/reset state is saved alongside answers; difficulty/count preferences and cached results remain available. Scoring remains deterministic, with explanations and rejection of invalid orderings/pairs.
- Flashcards: existing flip, shuffle, editing, deletion, due filters and review scheduling remain; saved session state now preserves card order, position, flipped side and due-only mode. Deck signatures prevent applying an old session to different cards. Review data is retained separately from the current session.
- Tanya AI: visible cancel/retry controls in both dashboard and lesson chat, using the existing AbortController through source analysis and chat. Cancellation produces a visible result and does not create a recovery task. Retry is scoped to the selected source. Existing general discussion, document context, validated citations and persisted conversation history remain.
- Podcast: source-specific text drafts persist; notes/source text can seed a recap. Generated WAV playback/download and browser speech controls remain. Navigation aborts pending audio generation, stops playback/speech and releases object URLs. Generated audio remains a downloadable session artifact, while its text draft is durable.
- Tempel: durable save completion/errors are now reflected in status instead of claiming session-only storage. Existing sticky text, colors, deletion and exports remain.
- Source revisions archive the new chapter originals, practice drafts, flashcard sessions and podcast text together with previous study content; a revised source starts with fresh generated content. Original files and personal notes are preserved by the existing versioning workflow.

Existing mindmap generation, manual node/branch/relationship editing, zoom/pan, undo/redo, JSON export and durable saving were reviewed and reused. Notes retain autosave, editing, preview and export. Source previews, original downloads, OCR limitations and version archives remain accessible.

## Verification

- `npm test`: **133 passed**, zero failed/skipped. Includes exact source-reference validation, recap normalization, five quiz grading formats, scheduler and graph operations, backend/provider and storage tests.
- `npm run build`: syntax and migration checks pass for **55 application modules** plus inline scripts.
- `scripts/verify-workspace-browser.mjs`: provider fixtures drive real UI workflows for journey generation/editing/original viewing, practice/completion/resume, mindmap edit/undo/redo/export, all five quiz types (the four structured formats use the real local grading endpoint), quiz cursor persistence, flashcard scheduling/edit/delete/resume, notes, sticky notes, podcast draft/audio-download fixture, selected-source chat/retry/cancel/history, source revisions and exact original file bytes. It also checks mobile editor width; the 390px screenshot was visually inspected.
- Storage, navigation, AI recovery and home browser regression suites all pass. They cover real IndexedDB, ZIP, rollback, failed writes, account isolation, tab conflicts, mobile modal focus behavior, background uploads, provider recovery fixtures, dashboard resume, focus timer persistence and video message-origin checks.

Run browser scripts against `PORT=3110 NODE_USE_ENV_PROXY=1 npm start`, with `DASHBOARD_TEST_URL=http://127.0.0.1:3110` and `PLAYWRIGHT_MODULE` pointing to an installed Playwright module. These scripts require Chromium; this environment uses `/usr/bin/chromium`.

## Research and limits

MDN's [AbortController.abort documentation](https://github.com/mdn/content/blob/main/files/en-us/web/api/abortcontroller/abort/index.md), retrieved 8 November 2026, confirms that abort cancels fetch and response-body consumption. The implementation propagates the same signal through analysis/chat and audio generation, rather than only hiding the loading indicator.

The current environment still has restricted package-manager networking, no custom allowed hosts and no configured secrets. Consequently live Gemini/OCR/TTS quality, live YouTube playback and live Firebase integration are not claimed. The earlier environment configuration draft still requires publication to enable external acceptance checks. No production deployment, dependency upgrade, release tag or Milestone 08 work was performed.
