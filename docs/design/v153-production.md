# OmniLearn V15.3 design decisions

Base: `a5ce722`. This is a reference comparison and implementation spec. See the release checks for results.

Classic-modern study workspace for students. Energy 2, rhythm 2, motion 1. The tutor is the focal point on Home. The notes collection is the primary destination on Dashboard. The original OmniLearn mascot, typography and teal/blue tokens carry the identity. Amber marks learning progress.

| Evidence | Observable workflow | OmniLearn requirement |
| --- | --- | --- |
| [New Look help](https://support.pelajarin.ai/new-look), supplied screenshot `154732`, recording 121.6s | A centered entry point starts a question or accepts a recording, upload or YouTube link. Resume and saved lessons follow. | Restore a centered vertical arrangement in place of V17’s split band. Keep one prompt and one action row. Put resume and the library below it. |
| [Classic route](https://app.pelajarin.ai/dashboard), supplied screenshot `154727-1`, recording 70.9s | Greeting and new-note action, four compact statistics, a wide level panel, and searchable notes. | Put the wide level panel above a full-width collection. Keep the timer and activity accessible below the collection. Use the existing calculations and local library. |
| [NotebookLM](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-new-features-december-2024/) and [Linear](https://linear.app/homepage) | Make sources explicit and keep regular destinations in a compact labeled rail. | Keep chat mode and active source beside the prompt. Preserve the sidebar routes and mobile drawer. |

Exact authenticated screen details come from the supplied evidence. The publicly fetched application pages exposed a brand shell. See [archive review](archive-home-dashboard.md) and [prior recovery research](v16-product-recovery.md) for the recordings and original evidence index.

## Implementation

1. Home uses a narrow, centered composer on the main canvas. Remove the split wrapper. Retain the original mascot and one clear heading. Keep the four actions reachable on narrow screens.
2. Keep general/document mode, selected source and chat feedback adjacent to the composer. Preserve failed prompts and show one error with a recovery action. Retain **Jadikan Materi** next to the relevant tutor answer, followed by editable chapters and a saved note.
3. When available, show one resume row with the real lesson title and progress. Put the searchable notes collection directly below. Use the existing subject groups as folders and provide source type, search and list/gallery controls. Give first-use and no-results states different, actionable text.
4. Dashboard starts with the greeting and **Buat Catatan**, four indicators in one desktop row, then the wide level panel and searchable notes. Keep XP, streak and review counts tied to persisted activity. Timer, weekly progress and recent activity remain reachable. Avoid duplicating XP in a statistic if the level panel already displays it.
5. Use four desktop or two mobile metric columns, 12–16px mobile gutters, fluid card widths and 44px targets for mobile controls. Preserve headings, focus order, named buttons and visible focus. Let long titles and source names wrap. Screen reader users should hear filter results and request outcomes.
6. Reserve motion for activity feedback, active state changes and disclosure. Reduced motion preserves the same content and functionality. Test empty and populated states at 1440px and 390px, in both themes, and exercise the composer and library controls with local fixtures.
