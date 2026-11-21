# OmniLearn V18 task ledger

Evidence is local unless stated. The current branch starts at `a42d638`. Reference findings are in [RECON.md](RECON.md).

IDs follow the requested work order by workstream. Workstream 4 and 5 repairs preceded production UI implementation. Final integration depends on local checks and owner release approval.

## Reference and workflow

| ID | OWNER | FILES | STATUS | TEST |
| --- | --- | --- | --- | --- |
| 01 Read New Look Home | Design | `RECON.md` | Blocked | Proxy CONNECT 403. Existing owner findings reused. |
| 02 Read Classic Dashboard | Design | `RECON.md` | Blocked | Proxy CONNECT 403. Existing owner findings reused. |
| 03 Locate owner screenshot archive | Design | `RECON.md` | Blocked | Owner records name captures. Files absent here. |
| 04 Map source selection and tutor flow | Design | `RECON.md` | Verified | F01 and F02 reflect current app and recorded evidence. |
| 05 Map notes, filters and folders | Design | `RECON.md` | Verified | F03 and S03–S04 inventory. |
| 06 Map review and focus | Design | `RECON.md` | Verified | F04 current behavior documented. |
| 07 Inventory primary screens | Design | `RECON.md` | Verified | S01–S12. |
| 08 Capture existing Home and Dashboard | Design | `verify-archive-home.cjs` | Verified | Four baseline images reviewed. |
| 09 Capture existing secondary routes | Design | `RECON.md` | Verified | Twenty baseline images reviewed. |
| 10 Document accessible reference limits | Design | `RECON.md` | Verified | Observed access and historical evidence labeled. |

## Visual design

| ID | OWNER | FILES | STATUS | TEST |
| --- | --- | --- | --- | --- |
| 11 Choose original layout direction | Lead | `RECON.md` | Verified | Tutor and collections after owner asked to continue. |
| 12 Keep original mascot and brand | Lead | `public/mascot.svg` | Verified | Local identity in Home and Landing. |
| 13 Reuse navy and teal tokens | Lead | `public/design-system.css` | Verified | Existing semantic light/dark palette. |
| 14 Set primary and secondary type hierarchy | Lead | `public/home.css` | Verified | Existing display and UI font roles. |
| 15 Plan composer source-picker state | Lead | `public/dashboard-shell.js` | Verified | Native dialog and search. |
| 16 Plan desktop Dashboard columns | Lead | `public/home.css` | Verified | Responsive geometry assertions. |
| 17 Prioritize saved source inventory | Lead | `public/product.js` | Verified | Compact import row above saved sources. |
| 18 Plan contextual study navigation | Lead | `public/study-shell.js` | Verified | Mobile chooser plus deep links. |
| 19 Arrange examination actions by use | Lead | `public/exam-workspace.js` | Verified | Active attempt and start controls first. |
| 20 Use real progress or honest empty states | Lead | `public/dashboard-shell.js` | Verified | Fixture with real recorded progress and empty state. |

## Production UI

| ID | OWNER | FILES | STATUS | TEST |
| --- | --- | --- | --- | --- |
| 21 Recompose Home around source-aware composer | Lead | `public/dashboard-shell.js` | Verified | verify-archive-home and verify-chat-material. |
| 22 Place Dashboard collection beside study planning | Lead | `public/dashboard-shell.js` | Verified | verify-home-visual validates split and stacking. |
| 23 Default Catatan to compact rows | Lead | `public/dashboard-shell.js` | Verified | verify-remaining-pages. |
| 24 Pair subject folders and assignment controls | Lead | `public/dashboard-shell.js` | Verified | verify-page-interactions. |
| 25 Recompose Exams around attempts | Lead | `public/exam-workspace.js` | Verified | verify-exams-browser. |
| 26 Pair activity calendar with history | Lead | `public/dashboard-shell.js` | Verified | verify-page-interactions. |
| 27 Expose personal progress and ranking availability | Lead | `public/dashboard-shell.js` | Verified | verify-page-interactions. Shared ranking still unavailable. |
| 28 Pair profile settings with study summary | Lead + agents | `public/dashboard-shell.js` | Verified | Keyboard tabs and save/reload. |
| 29 Give version, status and changes separate hierarchy | Lead + agents | `public/release-history.js` | Verified | Manifest tests and responsive check. |
| 30 Rebuild study, source and landing layouts | Lead + agents | `public/study-shell.js, public/product.js, public/landing.html` | Verified | Workspace, sources and Landing browser checks. |

## AI and providers

| ID | OWNER | FILES | STATUS | TEST |
| --- | --- | --- | --- | --- |
| 31 Separate general and document request scopes | Lead | `server.js` | Verified | provider-http missing-source regression. |
| 32 Keep existing tutor instruction modes | Lead | `public/app.js` | Verified | Teaching preference and chat fixture. |
| 33 Convert the selected tutor turn to material | Lead | `public/chat-material.js` | Verified | Editable lesson and parent source in browser. |
| 34 Distinguish provider permission failure | Lead | `tests/provider-http.test.mjs` | Verified | 403 maps to safe provider-auth error. |
| 35 Trace historical non-JSON 403 | Lead | `docs/research/free-llm-provider-evaluation.md` | Blocked | Need original failed request ID and corresponding host trace. |
| 36 Accept valid fenced structured responses | Lead | `server.js` | Verified | Single Gemini SDK fixture call for fenced cards. |
| 37 Reject decoded fabricated page references | Lead | `server.js` | Verified | Escaped page marker rejected in provider HTTP test. |
| 38 Keep approved Gemini-only fallback | Lead | `lib/provider-manager.js` | Verified | SDK fixtures cover model and transient failure rules. |
| 39 Review official alternatives and terms | Lead | `docs/research/free-llm-provider-evaluation.md` | Reviewed | Existing provider comparison reused. |
| 40 Run live synthetic quality and latency gate | Lead | `scripts/verify-gemini-models.mjs` | Blocked | Approved credentials and zero-cost entitlement unverified. |

## OCR and documents

| ID | OWNER | FILES | STATUS | TEST |
| --- | --- | --- | --- | --- |
| 41 Store original before extraction | OCR | `public/product.js` | Verified | Upload and durable IndexedDB browser tests. |
| 42 Use native extraction before Gemini OCR | OCR | `server.js` | Verified | Native PDF route fixture. |
| 43 Keep native PDF page identities | OCR | `server.js` | Verified | Failed page 1 cannot shift subsequent text. |
| 44 Keep mixed native and scanned pages ordered | OCR | `tests/pdf-pipeline.test.mjs` | Verified | Mixed PDF integration fixture. |
| 45 Require page markers for full-file fallback | OCR | `lib/ocr-pages.js` | Verified | Unmarked output rejected for multipage PDF. |
| 46 Surface partial and blank scans | OCR | `tests/pdf-pipeline.test.mjs` | Verified | Partial, blank and unreadable fixtures. |
| 47 Keep original accessible after text correction | Lead | `public/product.js` | Verified | Revision and original file bytes in storage checks. |
| 48 Verify educational title before save | Lead | `public/chat-material.js` | Verified | Editable title and source label fixtures. |
| 49 Exercise DOCX, PPTX, XLSX and TXT ingestion | Lead | `tests/pdf-pipeline.test.mjs` | Verified | HTTP format fixtures. |
| 50 Verify real OCR accuracy on formulas and tables | Lead | `scripts/verify-gemini-models.mjs` | Blocked | No authorized live OCR or accuracy benchmark. |

## Learning and persistence

| ID | OWNER | FILES | STATUS | TEST |
| --- | --- | --- | --- | --- |
| 51 Remove duplicate tutor retry turn | Lead | `public/app.js` | Verified | Chromium regression counts one question. |
| 52 Clear resolved recovery record | Lead | `public/product.js` | Verified | Successful tutor retry clears deferred request. |
| 53 Save reviewed chapter order | Lead | `public/chat-material.js` | Verified | Browser edit, save and reload. |
| 54 Bind derivative to source version | Lead | `public/product.js` | Verified | Parent source remains after lesson saved. |
| 55 Keep notes across reload | Lead | `scripts/verify-storage-browser.mjs` | Verified | Real IndexedDB fixture browser. |
| 56 Exercise all five quiz types | Lead | `scripts/verify-workspace-browser.mjs` | Verified | Browser and unit normalization checks. |
| 57 Exercise flashcard scheduling | Lead | `scripts/verify-workspace-browser.mjs` | Verified | Browser review and reload. |
| 58 Exercise mindmap edit | Lead | `scripts/verify-workspace-browser.mjs` | Verified | Manual graph actions and persistence. |
| 59 Exercise podcast storage and speech contract | Lead | `lib/speech.js` | Verified | Local draft and WAV fixtures. Live voice unverified. |
| 60 Exercise focus timer and true metrics | Lead | `scripts/verify-home-visual.cjs` | Verified | Start, pause, reset and computed counts. |

## Responsive behavior and motion

| ID | OWNER | FILES | STATUS | TEST |
| --- | --- | --- | --- | --- |
| 61 Check 1440 px layout | Lead | `scripts/verify-home-visual.cjs` | Verified | Light and dark. |
| 62 Check 768 px transitions | Lead | `scripts/verify-home-visual.cjs` | Verified | Light and dark. |
| 63 Check 390 px layout | Lead | `scripts/verify-home-visual.cjs` | Verified | Light and dark. |
| 64 Check 360 px layout | Lead | `scripts/verify-home-visual.cjs` | Verified | Light and dark. |
| 65 Keep keyboard source selection and focus | Lead | `scripts/verify-archive-home.cjs` | Verified | Picker focus and draft retention. |
| 66 Keep keyboard profile tabs | Lead | `scripts/verify-page-interactions.cjs` | Verified | Arrow key selection. |
| 67 Keep mobile study actions discoverable | Lead | `scripts/verify-study-workspace.cjs` | Verified | Tool and chapter disclosures. |
| 68 Respect reduced motion | Lead | `tests/ui-motion.test.mjs` | Verified | Unit and browser tests. |
| 69 Keep upload status linked to work stages | Lead | `public/app.js` | Verified | Upload and cancellation evidence. |
| 70 Check real-device microphone controls | Lead | `public/product.js` | Blocked | Browser permission and physical input unverified. |

## Security and code quality

| ID | OWNER | FILES | STATUS | TEST |
| --- | --- | --- | --- | --- |
| 71 Verify input validation | Lead | `tests/ai-policy.test.mjs` | Verified | Malformed result and input fixtures. |
| 72 Verify upload type and size handling | Lead | `tests/material-input.test.mjs` | Verified | Signature and archive bounds tests. |
| 73 Verify account boundaries | Lead | `tests/cloud-account.test.mjs` | Verified | Account and library fixtures. |
| 74 Verify origin and CSRF protection | Lead | `tests/origin-check.test.mjs` | Verified | Existing same-host, forwarded-host and foreign-origin tests. |
| 75 Verify sanitization and CSP | Lead | `scripts/verify-html-safety.cjs` | Verified | Browser and unit checks. |
| 76 Verify isolated session sources and OCR jobs | Lead | `tests/pdf-pipeline.test.mjs` | Verified | Cross-session status and cancellation tests. |
| 77 Verify credential handling | Lead | `tests/provider-http.test.mjs` | Verified | Server-only configuration and response redaction. |
| 78 Verify limits and bounded requests | Lead | `tests/ai-limits.test.mjs` | Verified | Existing quota, rate-limit and idempotency fixtures. |
| 79 Verify IndexedDB compatibility | Lead | `scripts/verify-storage-browser.mjs` | Verified | Archive, rollback and account isolation. |
| 80 Audit shipped dependencies | Lead | `package-lock.json` | Verified | npm audit --omit=dev reported zero advisories. |

## Browser and visual QA

| ID | OWNER | FILES | STATUS | TEST |
| --- | --- | --- | --- | --- |
| 81 Compare Home before and after | Lead | `verify-archive-home.cjs` | Verified | Original OmniLearn baseline and candidate captures. |
| 82 Compare Dashboard before and after | Lead | `verify-home-visual.cjs` | Verified | New side-column geometry assertions. |
| 83 Review exam layout and scoring | Lead + agents | `verify-exams-browser.mjs` | Verified | Before/after and keyboard scoring. |
| 84 Review reader and practice navigation | Lead | `verify-study-workspace.cjs` | Verified | Deep links, keyboard and preserved chapter. |
| 85 Check Landing links and keyboard controls | Lead | `public/landing.html` | Verified | Eight layout states and local destination checks. |
| 86 Check secondary route layout and actions | Lead | `verify-page-interactions.cjs` | Verified | Forty route and theme checks. |
| 87 Verify notes survive role and route changes | Lead | `verify-storage-browser.mjs` | Verified | Existing persistence and namespace checks. |
| 88 Verify all local browser gates | Lead | `docs/agent/STATE.md` | Verified | Local Chromium checks recorded. |
| 89 Compare with matched Pelajarin captures | Lead | `RECON.md` | Blocked | Live reference and owner originals unavailable. |
| 90 Verify live visual and model workflows | Lead | `docs/DEPLOYMENT.md` | Blocked | Live host access and release approval. |

## Integration, CI and delivery

| ID | OWNER | FILES | STATUS | TEST |
| --- | --- | --- | --- | --- |
| 91 Branch from latest main | Lead | `codex/omnilearn-v18` | Verified | Remote main and baseline both a42d638. |
| 92 Commit verified P0 batch | Lead | `server.js` | Verified | 91b8aec. |
| 93 Integrate production routes | Lead | `docs/agent/STATE.md` | Verified | Candidate marker and local route checks. |
| 94 Run npm lint | Lead | `package.json` | Verified | Syntax check. |
| 95 Run npm test | Lead | `package.json` | Verified | 187 passing tests. |
| 96 Run npm build | Lead | `package.json` | Verified | Migration and syntax checks. |
| 97 Push verified branch | Lead | `codex/omnilearn-v18` | Verified | Git push created the remote branch. |
| 98 Open pull request and verify GitHub CI | Lead | `github.com` | Blocked | Draft PR creation returned Forbidden from GitHub GraphQL. |
| 99 Merge with owner approval | Lead | `main` | Blocked | Requires owner approval and GitHub gates. |
| 100 Publish and verify live revision | Lead | `public/ui-build.json` | Blocked | Pending owner release and accessible live host. |
