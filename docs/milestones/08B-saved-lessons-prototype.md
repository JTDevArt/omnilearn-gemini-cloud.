# Milestone 08B — Saved Materials as Structured Learning Notes

Status: **ISOLATED PROTOTYPE COMPLETE; PRODUCTION INTEGRATION PENDING** (12 November 2026).

## User requirement
The library must show a meaningful **topic title, real short summary, subject and chapter count**, not the raw PDF/office filename. Clicking an item must open **that item's** chaptered reader, not a hardcoded Limit Fungsi example.

### Prototype implementation
Files:
- `public/design-preview.html`: topic-title and subject fields in the existing dialog.
- `public/design-preview.js`: six original example lesson outlines; data normalization for old demo notes; per-note selected chapter; editable title/chapter; optional file chooser which captures **filename metadata only** and requires a user-supplied lesson topic.
- `public/design-preview.css`: lesson-cover cards, source-specific reader, chapter table of contents, mobile styles.

UI: topic titles on miniature lesson-cover cards; summary and chapter count; breadcrumbs; selected-note-specific chapters; editing; source name only under `Sumber asli`. No PDF bytes are uploaded or OCR/AI-inferred in this offline demo.

## Next Astra milestone — bind to production
- Use existing `public/local-library.js`, upload/extraction/OCR/AI services, and source versioning.
- Preserve `source.originalFilename`, raw original when retained, extraction status and page references separately from `lesson.displayTitle`, `summary`, and `chapters`.
- Derive title from **actual extracted heading/content** only when supported; otherwise ask user for a topic. Never fabricate text, summary, chapter, or page citation after OCR failure.
- Keep original file name available only in source metadata, not card headline. Preserve edits, backups, owner isolation, old deep links and existing tools.
- No extra unrelated features or second database; adapt the real dashboard according to the user's own original OmniLearn screenshot.

### Acceptance
1. `materi_biologi_kls10_FINAL.pdf` with verified title `Sistem Pencernaan Manusia` appears as **Sistem Pencernaan Manusia** in Catatan, with page/source references.
2. Two different notes open their own chapters, not a shared hardcoded page.
3. Rename/edit/reload/restore preserve correctly linked source and lesson.
4. Failed OCR/model requests keep the source safe and show an honest partial state.
5. Mobile + both themes + existing unit/build/browser checks pass.

No new live Gemini calls were needed for the isolated preview. **AI Studio deployment not performed** by these GitHub commits. The product release stays `v1.0.0 in-development` until acceptance.
