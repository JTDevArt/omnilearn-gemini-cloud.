# OmniLearn state

## Base
- V15 branch `codex/v15-study-recovery` started at main `65ebe9cafb046f817d811c5cc848c6910d97bce3` after PR #5.
- Frontend marker: `omnilearn-v15-study-recovery-1` at `/ui-build.json`. The server health marker is older.

## V15
- Home starts with the composer and keeps scope visible below it. Saved materials use canonical titles, actual progress and existing controls.
- Dashboard uses four real summary metrics, a level and focus row, searchable material management, and weekly and recent activity views.
- Landing preview comes from the rendered OmniLearn Home. References and V15 differences are recorded in `docs/design/archive-home-dashboard.md`.
- Legacy chapters open and can be edited without practice. Existing practice retains persisted drafts. Source selection stays in place when returning to General chat.
- General topic cache includes typed text. Saved tool results are restored on reopening. Document decks remain isolated from general decks.
- Lint and build passed locally. Unit suite: 177 passed. Browser checks use a local Express instance and synthetic content. They cover both themes, responsive layouts, source switching, quiz/flashcard controls, and access to saved content.
- Browser upload test verified extraction and original retention across failure, refresh and retry. The workspace fixture passed chapter edits, map edits, five quiz types, flashcard review, chat retry/cancel, and source version history.
- Visual workflow captures three required screenshots and runs on pull requests targeting main.

## Open
- Public baseline assets were sampled before the V15 change. Check the UI marker and rendered behavior after an approved merge and successful deployment.
- Historical non-JSON 403 has no correlated provider or hosting trace. The local Express origin fixture returns a JSON 403. See the research report for available evidence.
- Gemini requester credentials, real scanned-PDF provider calls and alternate-provider benchmarks require approved deployment access. Fixture tests consume no provider quota.
- Keep Gemini in production until a synthetic provider comparison actually validates an alternative. Preserve the current source and backup contracts.
