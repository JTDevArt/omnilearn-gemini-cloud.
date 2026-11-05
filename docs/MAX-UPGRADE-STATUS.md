# MAX upgrade: implementation status

This branch is in progress, not release-ready. Base: 349677d; existing design work from ui/humanized-home-motion (0a8b8f7) is preserved.

## Implemented in this increment
- Integrated existing humanized Home/workspace design; extracted styles into public/styles.css for maintenance.
- Removed rigid summary word limits and tutor bullet-count instructions; retained adaptive style-specific guidance.
- Translation now receives the entire accepted material rather than a relevance-selected excerpt. Long outputs still have a provider output limit and require chunking before long-document translation can be called complete.
- DOCX/PPTX validation checks archive signatures, entry counts, declared expansion and actual streamed expansion before parser execution (30 MiB expanded cap).

## Evidence
- 27 executed tests passed across learning-engine, provider/UI, AI policy, office archive and API readiness suites.
- Syntax/build and git diff whitespace checks passed.
- Chromium at 1920, 1366, 768, 390 and 360 px: no document-level horizontal overflow, no captured page errors, dark-mode toggle works. Screenshots stored outside the repository in /workspace/qa-output.
- These checks do not establish every control or OCR format is correct.

## Access limitations
- GitHub fetch/push works. gh pr list via api.github.com/graphql returned Forbidden. No PR review/ready status can be claimed.
- No video-generation connector is available; configured Gemini model discovery returned no video/Veo model. No original cinematic hero video has been produced. Existing motion is not a substitute.
- No verified deployment pipeline or deployment identity has been identified. Nothing deployed or environment-published.
- npm audit returned ENOLOCK because the project has bun.lock, not an npm lockfile. Dependency vulnerability assessment remains incomplete.

## Outstanding work before release
- Original hero video, poster, reduced-motion behavior and media performance validation.
- Full control/accessibility review beyond viewport overflow and theme switching.
- True/false, short-answer and essay quiz modes with grading and evaluation.
- Measured spaced-repetition scheduling; concept-map zoom controls.
- Personalized learning-plan inputs and complete long-document translation with chunked processing.
- Representative OCR matrix: scanned, mixed, table, diagram, corrupt and near-limit PDF fixtures; resource/concurrency validation.
- Dependency vulnerability audit, broader security/session tests, long-conversation and bilingual live-AI evaluation.
- Actual production deployment and confirmation of the served version.

Do not merge this branch as a completed MAX upgrade until critical findings and required checks are resolved.
