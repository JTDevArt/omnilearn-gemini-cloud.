# OmniLearn V18 state

Updated 21 November 2026. Branch `codex/omnilearn-v18`, based on remote `main` at `a42d638382d9efa89c09c4585bb3ae854ccf9252`. Last verified executable commit `c36a91fdff081f3e72aa5125736d39d3c4f38213`. This ledger follows that commit. Check `git rev-parse HEAD` and `git status --short --branch` before resuming.

## Verified work

- `91b8aec` fixes duplicate tutor retry turns, clears successful deferred retries, requires source text for document mode, reads fenced Gemini JSON, validates escaped page markers, and keeps native PDF and OCR page identities.
- `c36a91f` rebuilds twelve primary screens. Home selects a source inside the composer. Dashboard pairs the collection with study planning on wide screens. The lesson reader has mobile tool and chapter choosers. Flashcards put recall first. Exams lead with the current attempt and start controls. Notes, subjects, sources, activity, ranking availability, profile, release history and landing use the existing OmniLearn data and identity.
- Dependency files and storage schemas are unchanged. Browser checks verified existing original bytes, revisions, rollback, namespace separation, IndexedDB transactions, post-reload progress and notes, and exam attempts.
- `npm run lint`, `npm test` (187 passing), `npm run build`, `git diff --check` and `npm audit --omit=dev` passed. The audit reported zero advisories.
- All seven browser commands in the visual workflow passed locally. Additional browser checks passed for upload, navigation, storage, exams and the full learning workspace. The study flows used synthetic provider responses and real local scoring, original file reads and persistence.
- The local candidate marker is `omnilearn-v18-candidate-1`. Chromium passed 96 combinations of 12 screens, widths 1440, 768, 390 and 360, and light/dark themes with reduced motion. Twenty-four candidate screenshots were compared with available OmniLearn baseline captures. Those captures use synthetic library records, with differing counts on some screens. Workspace and landing had separate keyboard, contrast and visual checks. Temporary capture paths are `/tmp/omnilearn-v18-matrix`, `/tmp/omnilearn-v18-comparisons`, `/tmp/omnilearn-v18-workspace` and `/tmp/omnilearn-v18-landing-after`.

## Open gates

- The branch is on GitHub. Draft PR creation returned `Post "https://api.github.com/graphql": Forbidden` from this environment. The [GitHub PR creation page](https://github.com/JTDevArt/omnilearn-gemini-cloud./pull/new/codex/omnilearn-v18) is available to the repository owner. Check the PR's GitHub workflow results before requesting explicit owner merge approval. This V18 approval requirement supersedes older notes about standing approval.
- Public production and Pelajarin probes encountered proxy denial. The historic non-JSON 403 remains unresolved. The local Express origin denial is JSON and distinct from the Gemini permission-denied fixture. Correlate the historical request ID, route and time with the host trace if available.
- The local health check shows Gemini is unconfigured. Live inference, model entitlement, OCR quality and alternate-provider thresholds remain unverified. Use secure server-side credentials and an owner-approved zero-cost allocation for synthetic checks. No substitute provider received student data. Shared rankings remain unavailable, and the screen shows real personal progress.
- Owner screenshots and recordings cited by earlier research are absent from this workspace. See [RECON.md](RECON.md) for provenance and the reference limits. Local screenshots verify OmniLearn layout only.

Next release task. Open the PR and confirm GitHub gates. After owner approval and deployment, compare the public `/ui-build.json`, `/api/health` and page marker, then exercise the approved synthetic tutor and OCR cases on the deployed URL.
