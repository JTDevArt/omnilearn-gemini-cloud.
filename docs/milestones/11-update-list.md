# Milestone 11 — Update List

Status: IMPLEMENTED LOCALLY, validation pending (12 November 2026).

- Renamed UI label from `Patch Updates` to `Update List`.
- Added `public/data/releases.json` with initial `v1.0.0` (status: `in-development`, no invented release date).
- Added `public/release-history.js` with SemVer/commit/path checks, safe DOM rendering, category filtering, search, and known limitations.
- Connected the `view=updates` page to on-demand manifest fetching; presents useful error states on failure.
- Added responsive CSS and targeted `tests/release-history.test.mjs`.
- Recorded the actual historical milestone commits and current UI/progress work as `implemented-local`, not shipped.

Pending:
- Execute local test suite and browser checks.
- Verify published host separately.
- Convert release status to `released` and set verified date only after release acceptance.
