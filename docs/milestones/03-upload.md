# Milestone 03 — upload and OCR

Implementation and fixture acceptance completed 8 November 2026 (Asia/Jakarta).

Uploads now have per-file stages, cancellation, manual retry, paste/file/drop entry points and account-scoped original preservation before extraction. Failed extraction can be retried after refresh. Successful extraction is reviewed separately from AI lesson generation. Ambiguous POST failures are not automatically replayed; a session-bound upload ID and content hash make manual retries idempotent. Completed job polling is repeatable within the existing bounded 15-minute retention period. Cancellation propagates to PDF rendering and provider calls; cancelled jobs cannot publish late results. Existing 15 MiB limits remain.

OCR rejects out-of-request/duplicate page labels and does not assign unmarked multi-page text to an invented page. PDF parser failure uses pdfinfo to establish the actual page count instead of assuming one page. Existing EXIF correction, projection deskew, contrast, tables/formulas/language-preserving prompts and partial-read review remain. No calibrated OCR confidence is claimed.

Validation: 130 tests pass; build passes (53 modules). Real route fixtures cover native/scanned/mixed PDF, DOCX/PPTX/XLSX/TXT, PNG/JPEG and media adapter routing for MP3/WAV/MP4/MOV. Media signature fixtures establish routing, not decoder fidelity. Browser verification in scripts/verify-upload-browser.mjs passes extraction, original retention, failed-upload refresh and retry.

Live Gemini and reference-site probes were denied by the environment proxy before authentication. The supplied credential was not sent or stored. A configuration draft now includes Gemini secret requirements and research host additions; it requires environment-settings Save and Publish. No live OCR accuracy or deployment claim. Research basis: Google RetryInfo guidance in 02-research-notes.md and MDN IndexedDB transaction guidance in 00-research-notes.md.
