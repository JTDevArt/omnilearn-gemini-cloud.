# UI-02 — AI Learning Home

Status: PARTIAL — implementation and fixture tests; browser acceptance pending.

Home now centers the original OmniLearn mascot, heading and working composer. Recording, upload, manual material, YouTube, existing chat, retry and cancellation continue through the current application. The summary, focus timer, resume, video and library sections remain accessible on Dashboard instead of crowding Home. No AI provider or persistence schema changes.

Fixed a draft-loss race: after a successful response, the submitted draft is cleared only if storage still contains that exact draft. A newer question saved in another Home render survives. Failed/cancelled responses preserve the draft.

Tested using synthetic content: `node --test tests/home-draft.test.mjs`, full `npm test`, `npm run lint`, `npm run build`, and `git diff --check`. Browser acceptance remains blocked by Chromium's `socket() failed: Operation not permitted`; the updated Home browser script has not run. Verify real upload/record permission, YouTube manual fallback, draft lifecycle, route navigation, both themes and six requested viewport widths in a browser-capable environment. Live Gemini was not called; the AI Studio website was not deployed.
