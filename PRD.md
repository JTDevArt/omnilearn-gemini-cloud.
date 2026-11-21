# OmniLearn product requirements

OmniLearn helps students turn their own documents and study questions into lessons, practice and notes. Primary users are Indonesian-speaking students. The public Landing introduces the product. Application Home starts a study task. Dashboard helps students resume and organize work.

## Routes and journeys

| Surface | Requirements |
| --- | --- |
| Landing | Original OmniLearn branding, one primary app CTA, a real product demo, feature explanations, FAQ, legal links and a responsive footer. |
| Application Home | Tutor composer with record, upload, YouTube, send, and general or selected-source context. Keep conversations, saved materials, and recorded progress accessible. |
| Dashboard | Recent materials, subject folders, search, filters, sort, focus timer, and actual XP, streak and level. |
| Library and workspace | Catatan, Subjects, Exams, Streaks, Leaderboard, Updates, Profile, source review, chapter reader, and learning tools. Show honest unavailable states for unconfigured services. |
| Account and privacy | Google sign-in, same-browser session restoration, explicit first-login privacy setup, consent history, data export, account deletion and privacy disclosures. |

1. Upload a file, keep the original, extract text with OCR when needed, review content and title, generate chapters, then save to the library.
2. Open saved material, resume its current chapter, and generate summary, flashcards, quiz, mindmap or podcast tied to the same source revision.
3. Ask the tutor a general or source question, select a response, review the resulting chapters under Jadikan Materi, and save into Catatan.
4. Sign in with Google, read the applicable notices, record required consent and optional choices separately, decide how to retain guest data, and continue into the app.

## UI and references

Use the existing Express routes and original Vanilla JS, CSS, logo, mascot and components. Keep Landing separate from application Home. [The reference map](docs/design/PELAJARIN_REFERENCE_MAP.md) records evidence for interaction and layout decisions. Match useful observable workflows while using distinct OmniLearn presentation. Owner recordings are required to verify any claimed video timestamp or reference match.

Show real progress from application initialization, requests, upload callbacks and validation. Single opaque operations get a single ongoing state. Surface completion only after the relevant step succeeds. Show a recoverable limit for app startup, expose retry and cancel where supported, announce major state changes, and honor reduced motion. Keep provider internals in diagnostics.

## AI, document processing and storage

Keep Gemini as the baseline. Route GENERAL, SOURCE, TUTOR and MATERIAL by intent and capability. Open-ended general questions must not inherit a previous document or its grounding constraints. Source work must bind the exact source ID and revision, validate page and evidence references, validate structured output before persistence, and surface incomplete replies. Retry within the existing bounds and preserve input after failure. A fallback requires approved task capability, privacy terms and demonstrated quality. The candidate benchmark uses synthetic Indonesian, math, source, chapter, quiz, flashcard and mindmap fixtures, expects at least 95% schema validity, rejects fabricated citations and records latency and error recovery.

Save the original file and filename, prefer native extraction, OCR only as needed, preserve page order, surface incomplete extraction, and let the student confirm a meaningful educational title. Use canonical source IDs and revisions for chapter progress, notes, retries and generated artifacts. Keep IndexedDB compatibility, namespace isolation, backups, explicit imports and deletion. Optional cloud sync needs verified account access. Large or unsupported uploads require a clear error with a next action.

## Account and privacy

Reuse the existing Firebase project and server-side session boundary. Verify provider credentials on the server, keep access and refresh tokens out of browser storage, and implement log out and revocation on their actual supported paths. Preserve guest records and originals through a deliberate import or migration. A configured Google provider must pass account linking and renewal checks before it is available to students.

Disclose what stays on-device, what is synchronized, what goes to approved AI providers, and the applicable retention policy. Link reviewed Terms and Privacy Policy, show a configured privacy contact, and keep actual export and deletion outcomes visible. Record the policy version and consent timestamp, keep optional analytics separate and default off, and prompt again only when applicable terms change. Child accounts require an approved age policy and any legally required guardian process before launch. Policy wording, scope, contact, age rules and retention commitments require owner or legal confirmation before publication.

## Acceptance and release

- Functional checks cover general and grounded tutor responses, missing-source rejection, malformed output, no duplicate retry, DOCX/PDF/native and scanned text, verified titles, chapter linkage, real study artifact storage, and recovery through reload.
- Account checks cover configured Google login and session renewal, logout/revocation, verified linking, consent persistence and policy changes, archive restoration, and actual deletion scope. Independently prove owner isolation and guest data preservation.
- Browser checks cover Landing and app navigation at 1440, 768, 390 and 360px, light and dark themes, reduced motion, keyboard focus, non-obscured controls, clear loading/error/empty states and documented video comparisons.
- Use a branch from current main, run lint, tests, build and browser gates, open a reviewable PR, and merge only with owner authorization. Verify deployed revision and live behavior separately. A health route alone does not prove inference, privacy, or release quality.

## Known limitations at the V19 baseline

V18 is on main at `e11fdca`. Its local checks use synthetic provider responses. The production health request returned HTTP 403 in this environment. Live AI credentials, approved legal terms and age policy, and matching reference recordings for the V19 brief have yet to be verified.
