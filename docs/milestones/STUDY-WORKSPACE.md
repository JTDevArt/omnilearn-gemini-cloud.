# Correct the legacy study-tool screen

13 November 2026. Baseline main `722394f176b8039ea717b9e5d149a77de9b28acb`. Implementation `93c093ab084d642e4e0cce8bddd1777c61c025fd`; screenshot-led correction `f76e0d6de7c426099d18c55646ecaf19c9b59055`. Focused browser regression and visual inspection completed. Full showcase parity and full product acceptance remain PARTIAL.

## What the owner's screenshot exposed

The earlier visual gate covered AI Home and the management overview. It did not certify the tool screen used for flashcards, summaries, quizzes and chat. That screen still exposed the old large upload dropzone, language controls, result text and unrelated chat form together. A claim of full dashboard/workspace design acceptance would have been unsupported.

The legacy `selectTab` also called `runTool` for uncached tabs. Opening flashcards could therefore spend quota and surface a source-analysis rejection before the user explicitly requested generation. The shown evidence-mismatch error is a real grounding rejection; weakening `validateBlueprint` would conceal an unsupported output, not fix the UI.

## Actual production changes

- Existing live DOM nodes and event handlers now sit in a source-bound three-column tool workspace: actual chapters on the left, selected tool/result in the center, contextual study tools on the right.
- Original source metadata, upload dropzone, source selection and output language remain in a secondary disclosure. They no longer dominate every tool screen.
- Non-chat tools do not display an unrelated chat composer. Tutor chat remains available through the tool rail.
- The heading uses the reviewed topic-title policy; filenames remain in source metadata.
- Opening uncached tabs shows the appropriate empty state. Only explicit creation controls invoke AI. Existing cached output and saved source flashcards are reused.
- Rejected generation displays a safe error panel with explicit retry and source-review actions. Source data remains intact; the grounding validator is unchanged.
- The legacy `/dashboard?view=learn` link opens the selected source's existing chapters when available; it retains source intake for items without chapters.

Files: `public/study-shell.js`, `public/study-workspace.css`, `public/index.html`, `public/product.js`, `scripts/verify-study-workspace.cjs`, `scripts/verify-home-visual.cjs`, `.github/workflows/live-screenshots.yml`.

## Focused evidence policy

Keep the three already-reviewed Home/Dashboard images as their historical proof. This correction runs their 28 viewport/theme assertions and interactions without recapturing identical images. Three targeted investigation images cover the materially changed screen: rejected flashcard analysis at 1440px, source-specific lesson workspace at 1440px, and saved flashcards at 390px. They use synthetic browser-local source data, not an owner's private library or actual Gemini-generated lessons.

The new study browser suite checks seven tool routes across seven widths/two themes, no generation on navigation, correct source/chapter relationships, saved flashcards after refresh, source preservation after rejected analysis and overflow. The provider rejection is a fixture. Existing source-analysis unit tests still enforce exact source evidence. Live Gemini/OCR quality and hosted publication remain outside this proof.

Local verification: lint, build and 159 unit/HTTP fixture tests passed.

## Final browser and image evidence

[Final browser run](https://github.com/JTDevArt/omnilearn-gemini-cloud./actions/runs/43436069433) and [code CI](https://github.com/JTDevArt/omnilearn-gemini-cloud./actions/runs/43436069412) succeeded. [Artifact 14043477870](https://github.com/JTDevArt/omnilearn-gemini-cloud./actions/runs/43436069433/artifacts/14043477870), retained seven days, contains three targeted PNGs, the Home assertion report and the study report. All three images were opened and inspected.

- Desktop flashcard error: real source/topic/chapter context, compact settings disclosure, separate tool rail, actionable error panel and no irrelevant chat composer.
- Desktop chapter reader: source-specific explanation and chapter navigation use matching elevated panels and the existing learning tools. The legacy learn link opens this reader when selected material has chapters.
- Mobile saved deck: study content precedes the tool rail; source/chapter context and saved deck remain after refresh. Content remains scrollable, with no horizontal overflow. The first image set exposed tools preceding content on mobile, fixed by removing inherited content-panel ordering. The corrective image set also verifies the profile control exists on a direct tool reload.

Automated evidence: 98 tool/width/theme combinations (seven routes × seven widths × two themes), 28 Home/Dashboard combinations and basic Home interactions. No AI requests occur during navigation or settings changes. Exactly one intercepted source-analysis rejection is deliberately requested by the test. Source text remains intact after rejection; two synthetic sources display their own chapters; saved flashcards reload without regeneration. No live inference quality, microphone recording, OCR accuracy, production account or AI Studio deployment is certified.

Only the changed study screens were recaptured. Additional images were justified by the owner's significant legacy-workspace defect and the mobile ordering failure; unchanged Home/Dashboard images were not repeated. This proof addresses the screen in the complaint, not every remaining page or every reference-detail requirement.
