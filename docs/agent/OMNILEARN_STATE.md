# OmniLearn state

## Branch and delivery

- V15 shipped from main commit `6ed55c0f3121c78320985fae7cb3483d67b8766d`.
- Product recovery branch `codex/v16-product-recovery` starts at that commit. Production verification uses the marker in `/ui-build.json` and the dashboard HTML before any claim about the live version.
- Merge tested OmniLearn PRs into `main` after GitHub checks pass. The owner gave standing approval on 18 November 2026.

## Implemented in product recovery

- Tutor answers have a **Jadikan Materi** action. An editable title and ordered chapter preview precede the IndexedDB save. General tutor material has its own provenance and no document citations. Material derived from a source records the original ID and version.
- Native PDF extraction runs before OCR. Incomplete OCR is reported per page and valid early pages survive a later failure. Vercel completes upload in a single request subject to its body limit.
- Redesign decisions and links to references are in `docs/design/v16-product-recovery.md`. The original screenshot evidence stays in the owner's Library. The two OmniLearn screenshots are pre-fix evidence.
- Existing library IDs, session account boundaries, original upload files, review progress, and backup schema stay compatible.
- Local verification: 183 unit/integration tests, lint, build, desktop and mobile browser checks. Coverage includes upload retry/original retention, five quiz types, flashcard review persistence, and mindmap editing.
- Browser verification exercises Einstein chat, synthetic failure and explicit retry, editable chapters, persisted material after reload, and document grounding. Fixture calls consume no provider quota.

## Open checks

- Historical HTML 403 has no correlated hosting or provider trace. The Express origin fixture yields a JSON 403. Provider denial and unsupported output use distinct handling.
- Direct Gemini and alternate-provider benchmarks require authorized credentials. Keep the active provider until a real comparison verifies alternatives.
- Cross-account opt-in rankings need deployed storage, a consent/revocation contract, and trustworthy score publication. The app renders the current availability honestly.
