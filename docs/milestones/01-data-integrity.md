# Milestone 01 — Data integrity and application foundation

Status: complete for local storage and fixture-tested account boundaries, 7 November 2026. The user authorized continuing through Milestone 02. No production deployment or database-version change.

## Changes

- Dashboard pins, subjects, assignments and profile saves now await IndexedDB completion before showing success. The legacy preference form and original-file metadata save also await durable writes. Failed writes keep edits available for backup and trigger an unsaved-work warning on unload; pending writes do the same. Sidebar logout saves before changing account session.
- Source deletion asks for confirmation, saves the remaining library before removing original files, and restores the in-memory/session list on save failure. Removing the selected source explicitly clears its selection without recapturing and resurrecting it. Failed file cleanup can leave an orphan file, but cannot erase a still-referenced source's original before the library commit.
- Namespace changes and reads share the IndexedDB transaction queue. Reads scheduled after an account switch cannot return the previous namespace. Version changes close the connection for upgrades. Existing revision comparison, import rollback point, transaction atomicity and original-file keys remain intact.
- Backup/cloud library validation checks new optional dashboard fields and saved-request shapes. Import validates before disk or memory changes. Older libraries without these fields stay valid; unknown safe extension fields survive. Subjects can render a historical malformed optional value; explicit repair preserves it as `legacySubjects`.

## Preserved contracts and evidence

IndexedDB remains version 1 with `state` and `files`; JSON schema remains 1 and ZIP schema remains `omnilearn-backup/1`. Source IDs, version history, generated artifacts and `<sourceId>:<version>` original-file references remain unchanged. No destructive migration was needed.

`npm test`: **105 passed**, zero failures. `npm run build` and `npm run lint`: passed (48 JavaScript modules plus inline scripts and migration invariants). `git diff --check`: passed.

New `scripts/verify-storage-browser.mjs` uses real Chromium IndexedDB. It verifies original bytes for two revisions, ZIP checksum roundtrip, revision restoration, import rollback, queued account isolation, atomic transaction abort, stale-tab rejection, notes after navigation/reload, failed profile save feedback, unload protection, failed-deletion preservation, successful deletion after reload and recovery of malformed historical subjects. No browser page errors.

`scripts/verify-dashboard-browser.mjs`: passed subject/pin/profile persistence, escaped titles, 12 viewport/theme combinations, unavailable-provider source preservation and existing navigation. Both scripts accept `DASHBOARD_TEST_URL`, `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` and use external Playwright without changing runtime dependencies.

Research basis: [MDN IndexedDB guidance and audit notes](00-research-notes.md#2-indexeddb-durability). Transaction completion, not an in-memory mutation, is the save acknowledgement. Browsers cannot guarantee writes during abrupt process termination; the unload warning covers supported ordinary navigation, and completed writes survive reload.

## Limits

Real Firebase email login and two-device Firestore sync remain unverified because credentials/configuration are absent. Existing cloud ownership/CAS/conflict tests pass; namespace isolation is independently exercised in a real browser. No hosted-app or live AI claim is made. Browser eviction, disk failure and forced process termination still require user backups. Later roadmap UI and ingestion work remains outside this milestone.
