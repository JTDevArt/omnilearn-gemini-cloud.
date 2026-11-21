# OmniLearn V19 state

Updated 21 November 2026. Work branch `codex/omnilearn-v19` starts from verified remote `main` at `e11fdca7862371cd2a07db94b7662804e1c31360`. Verified product commit `7883a79`, candidate marker `omnilearn-v19-candidate-1`. Check `git status --short --branch` and `git rev-parse HEAD` before resuming.

## Verified locally

- [PRD](../../PRD.md) covers target users, production routes, AI, storage, Google auth, privacy, visual checks and release criteria. The [reference map](../design/PELAJARIN_REFERENCE_MAP.md) uses UNKNOWN for V19 timecodes and separates earlier recorded findings.
- General tutor answers can mention ordinary page notation. Document output still checks references against the actual source. Flashcards, mindmaps, chapters and quiz use the normalized output from the validated parse. Content-free summaries get bounded recovery. Provider safety and truncation have distinct errors.
- Startup reflects initialization and first route rendering. The app has a recovery timeout. Tutor, document and study generation show real work stages and support cancellation where available. Technical provider results remain in diagnostics.
- Firebase-issued identity is verified before setting session cookies, including renewal. HTTP fixtures cover valid restoration and denial without cookies. Guest ZIP backup uses the existing archive flow. The Privasi & data page discloses current processing and uses actual backup and device erase controls.
- The storage browser regression deletes a selected source and original bytes, then reloads and checks that the data and tutor draft stay erased. ZIP, revision, rollback, owner isolation and earlier storage checks still pass. The privacy route passed eight theme/width cases with four screenshots in `/tmp/omnilearn-v19-privacy`.
- Local lint, build and 197 tests passed. Provider and OCR checks use fixtures. Report actual production results separately. [V19 task ledger](TASKS.md)
- Chromium passed startup, cancel-before-send, timeout and explicit retry, model diagnostics, upload, workspace and tutor-to-material. The Home visual verifier passed 98 checks. The HTML safety browser gate passed.

## Open gates

- VIDEO-1 (04:22), VIDEO-2 (08:59) and current defect screenshots are absent from the available attachments and workspace Library. Video layout comparison and the related screen redesign remain open.
- Firebase and Gemini credentials are absent from the runtime. Google sign-in, real provider benchmarks, live OCR, cross-device account revocation and account deletion remain unverified or unimplemented. Device erase does not delete cloud copies.
- First-login consent, Terms, retention commitments, contact and age or guardian handling require approved policy inputs and verification. The device privacy disclosures describe current behavior.
- V18 is on remote main. Its last live health attempt returned HTTP 403. The V19 branch was pushed. Draft PR creation returned GitHub GraphQL Forbidden. GitHub CI and live V19 remain unverified. Merge and production releases require owner authorization. [Open draft PR](https://github.com/JTDevArt/omnilearn-gemini-cloud./pull/new/codex/omnilearn-v19)

Next eligible batch. Attach the reference recordings for one timestamp pass. Confirm the approved identity and privacy settings before wiring or accepting Google onboarding. Independently verify public build identity and a synthetic workflow after a V19 deployment.
