# Milestone 06 — home dashboard

Completed 8 November 2026 (Asia/Jakarta). Home now uses “Mulai belajar dari mana hari ini?”, a contextual greeting and actual source/activity counts. Its existing composer retains chat history, uploads, recording, YouTube transcript entry, loading/errors and learning shortcuts. A native modal adds pasted material directly to the durable source library, with save errors and retry without duplicating the source.

Continue learning lists four recent readable sources, subject, actual completed chapter count and a resume action that preserves the active chapter. Notes retain gallery/list, search, subject/type filtering, sorting, previews and editable opening; video has its own format filter. Empty sections explain how to start.

The focus timer supports 25-minute focus and 5-minute breaks, start/pause/resume/reset and persistence in the learner profile. It derives remaining time from a saved deadline, so background throttling and reload do not lose elapsed time. Sessions do not invent learning XP. Timer controls and completion expose accessible status.

Video uses the existing player/subtitle workspace. Local video saves periodically as well as on pause/end, and uses a saved sampled frame as its poster when available. YouTube starts at the saved position and accepts progress only from its own iframe and exact origin. Listeners, polling and object URLs are cleaned up on navigation; file-read errors are visible. YouTube progress requires the external player to send infoDelivery messages; this transport was tested with a fixture, not live playback.

Validation: 131 unit/integration tests pass; build passes (54 modules plus inline scripts). `scripts/verify-home-browser.mjs` passes paste/reload, chapter resume, timer lifecycle/reload, video progress and rejected unrelated messages, and four viewport widths. Existing dashboard browser suite passes 12 viewport/theme combinations, subjects/pins/settings persistence and chat error handling. The dark 390px screenshot was visually inspected.

Research: MDN's [setTimeout documentation](https://github.com/mdn/content/blob/main/files/en-us/web/api/window/settimeout/index.md), retrieved 8 November 2026, describes delayed callbacks and inactive-tab throttling. This informed deadline-derived timer behavior rather than counting interval callbacks.

Live Gemini/OCR quality remains unverified because environment policy blocks the provider endpoint. No deployment, dependency upgrades or release tag. Milestone 07 follows.
