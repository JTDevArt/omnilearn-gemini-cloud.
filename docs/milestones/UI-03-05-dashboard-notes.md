# UI-03–05 — Dashboard, saved materials and learning workspace

Status: PARTIAL, browser acceptance outstanding.

Dashboard shows actual subject count, sources with notes, submitted exams, XP, seven Jakarta-day activity counts, recent events, level and the existing focus timer. No demo values or new activity system. Resume, library and video use the existing source store and player.

`view=notes` now opens the existing durable source collection as a searchable gallery. Its cards show a user-specified topic title, or an existing generated lesson title, or an honest unnamed state instead of the source filename. The source filename remains in a disclosure. Cards open the selected source's actual journey; the note editor is available at `view=note-editor` and in contextual tools. Titles are stored as optional `lessonTitle` on the same source, included in backups/archives, validated on import, and rolled back in memory on failed save. No automatic lesson generation or new store was introduced. Existing versions, OCR metadata and originals remain in place.

The existing lesson reader gained a responsive tools column linking to its real summary, notes, flashcards, quiz and chat paths; chapters and editing remain in the existing engine. Fixed duplicate XP for overlong event IDs by normalizing IDs before deduplication and refusing unknown event types.

The upload queue now accepts a user-reviewed topic title after successful or unsuccessful extraction. It can offer the first short extracted line verbatim as a suggestion, but does not save it without user action or claim it is a verified topic. Cards display extraction state and reuse the existing confirmed source-deletion flow. A failed source selection no longer opens the previously selected lesson. Title-save failures roll back in memory.

Limitations: subject editing within the gallery, full chapter/source acceptance and mobile visual parity remain unfinished. Generated titles have not been independently verified for factual accuracy. `view=notes` now opens the gallery; the old editor is available at `view=note-editor`. Browser scripts were adjusted, but cannot be run here because Chromium cannot create a socket. No live AI, Firebase, OCR or deployment checks performed. See `tests/lesson-label.test.mjs`, `tests/dashboard-metrics.test.mjs`, `tests/learning-activity.test.mjs`, and `tests/recovery-core.test.mjs` for synthetic validation.
