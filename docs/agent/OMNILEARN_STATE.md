# OmniLearn state

## Branch and delivery

- V15.3 layout and OCR correction branch `codex/v153-production` starts from V17 at `a5ce722c680f943483f63148c9d8601920612eb7`. Verify `omnilearn-v153-layout-1` in `/ui-build.json` and the dashboard HTML before reporting a live release.
- Merge tested OmniLearn PRs into `main` after GitHub checks pass. The owner gave standing approval on 18 November 2026.

## Implemented in product recovery

- Home centers the tutor and places resume above the notes library. Dashboard shows four real metrics and a wide XP panel before notes. Both share the library search, folder and format filters, sort, and grid/list controls. See [V15.3 design decisions](../design/v153-production.md).
- After correcting extracted text, the original file remains downloadable from the reviewed source.

- Tutor answers have a **Jadikan Materi** action. An editable title and ordered chapter preview precede the IndexedDB save. General tutor material has its own provenance and no document citations. Material derived from a source records the original ID and version.
- Native PDF extraction runs before OCR. Incomplete OCR is reported per page and valid early pages survive a later failure. Vercel completes upload in a single request subject to its body limit.
- Redesign decisions and links to references are in `docs/design/v16-product-recovery.md`. The original screenshot evidence stays in the owner's Library. The two OmniLearn screenshots are pre-fix evidence.
- Existing library IDs, session account boundaries, original upload files, review progress, and backup schema stay compatible.
- Local verification: 183 unit/integration tests, lint, build, desktop and mobile browser checks. Coverage includes upload retry/original retention, five quiz types, flashcard review persistence, and mindmap editing.
- Browser verification exercises Einstein chat, synthetic failure and explicit retry, editable chapters, persisted material after reload, and document grounding. Fixture calls consume no provider quota.

## Open checks

- The document tutor evidence and insufficient-source generation guards are tested in a separate local candidate. Publishing that candidate is pending review of the legacy AI Studio iframe transport in `public/app.js`.

- Historical HTML 403 has no correlated hosting or provider trace. The Express origin fixture yields a JSON 403. Provider denial and unsupported output use distinct handling.
- Direct Gemini and alternate-provider benchmarks require authorized credentials. Keep the active provider until a real comparison verifies alternatives.
- Cross-account opt-in rankings need deployed storage, a consent/revocation contract, and trustworthy score publication. The app renders the current availability honestly.
