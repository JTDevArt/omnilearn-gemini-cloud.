# V18 design evidence

Baseline `a42d638382d9efa89c09c4585bb3ae854ccf9252`, checked 20 November 2026. V18 uses Pelajarin for task order and navigation hierarchy. OmniLearn retains its wordmark, mascot, local fonts, and learning data.

| Reference | Evidence | Pattern to carry into OmniLearn |
| --- | --- | --- |
| [New Look Home](https://app.pelajarin.ai/) | The current workspace proxy returned CONNECT 403 before an origin response. Earlier owner screenshot `154732` and recording at `121.6s` are indexed in [the design record](../design/v153-production.md). | Start in one centered tutor composer, then offer a direct return to a lesson and access to saved material. |
| [Classic Dashboard](https://app.pelajarin.ai/dashboard) | Same proxy result. Earlier owner screenshot `154727-1` and recording at `70.9s` are indexed in [the archive review](../design/archive-home-dashboard.md). | Put the greeting and new-note action first, followed by real study counts, level progress, and searchable notes. |
| Owner learning screenshots | The [recovery design record](../design/v16-product-recovery.md) indexes the original lesson, quiz, flashcard and source screenshots. The original files are absent from this workspace. | Keep chapter progression, written quiz feedback, expandable flashcard answers, and a clear active source in the study workspace. |
| OmniLearn baseline | The existing browser verifier passed 20 Home/Dashboard viewport and theme checks and 12 fixture interactions. Another 80 checks covered the ten remaining screens at four widths in both themes. No page errors or horizontal overflow. Twenty-four screenshots were captured and reviewed at `1440` and `390` in dark mode, including contact sheets for the ten remaining screens. | Home and Dashboard already have the top-level New Look and Classic hierarchy. Improve how students select and manage learning material within those layouts. |

No target screenshot measurements or fresh signed-in reference interactions were possible in this run. Archived findings above are attributed to the existing records. OmniLearn captures are available during this task in `/tmp/omnilearn-v18-before`.

## Screen map

All app views below are query parameters on `/dashboard`. The landing page is `/`.

| Screen | View | Existing user action | Structural target |
| --- | --- | --- | --- |
| S01 Home | `home` | Ask, record, upload, add a transcript, resume or open a lesson. | Keep context beside the question and select the exact source inside the composer. Read saved notes as a compact collection. |
| S02 Dashboard | `dashboard` | Create a note, check counts and level, search notes, run the timer. | Put library management alongside study planning on wide screens. Move utilities into the reading order at narrower widths. |
| S03 Catatan | `notes` | Search, open, pin, rename or edit saved material. | Make the title, folder, progress and next action scan together. Put management actions behind the existing disclosure. |
| S04 Mata Pelajaran | `subjects` | Group and find stored materials by subject. | Keep folder navigation and its materials adjacent. Distinguish empty folders from the full collection. |
| S05 Ujian | `exams` | Choose a source, build or start an exam, resume and view results. | Present saved attempts and start controls before builder and import options. Keep the score next to corrections. |
| S06 Streaks | `streaks` | Review activity by date. | Lead with current and best streak, then explain the calendar using existing activity. |
| S07 Leaderboard | `leaderboard` | Read ranking availability and requirements. | Keep availability and consent status explicit. The current UI has no rankings to display. |
| S08 Profil | `profile` | Edit personal details and preferences. | Group editable settings separately from study statistics and account actions. |
| S09 Update List | `updates` | Read published release notes. | Prioritize version and release date, then expose the changes in chronological order. |
| S10 Learning Workspace | `journey`, `quiz`, `cards`, `map`, `note-editor`, `chat`, `podcast` | Read chapters and practice from the selected source. | Keep the source and current chapter in reach. Place chapter and tool controls alongside the reading column on wide screens. On phones, use a compact chooser so the chip rows do not displace the lesson. |
| S11 Source Library | `sources` | Add a file, inspect extraction, correct text and manage versions. | Bring the source list and import actions ahead of the tall input-method tiles. Put original file, extraction state and reviewed text together. Keep recovery accessible when extraction or inference fails. |
| S12 Landing | `/` | Learn what the app does and open it. | Show how a document becomes a study session using OmniLearn's own product and media. |

## Core flows

- **F01 Tutor to material.** Home question, tutor response, Jadikan Materi, review title and chapters, save, open the saved material in Catatan or the workspace. Exercise both general and document scope with distinct source IDs. On failure, keep the draft and show one recovery action.
- **F02 Upload to study.** Save original, run native extraction and OCR where needed, review text and title, correct incomplete extraction, create a lesson, resume a chapter. Verify original bytes remain available after correction or reload.
- **F03 Manage and practice.** Find a saved item by text, type or subject, open the exact item, then complete a quiz or rate a flashcard. Verify progress and review dates after reload.
- **F04 Study activity.** From Dashboard, inspect actual level and due review, start/pause focus, inspect history and return to the source. Verify zero states and real activity separately.

## Composition options

1. **Tutor and collection.** Keep Home's centered start, put a native source picker next to the input, then show one resume row and compact saved rows. Give Dashboard a wide collection with a separate study-planning column at desktop widths. This is the smallest structural change that improves the observed workflow.
2. **Daily study.** Put due reviews and focus at the top of Dashboard, above the library. Useful if daily return is the priority. It changes the Classic scan order and makes the library less immediate.
3. **Source navigator.** On desktop, combine source navigation, chapter reading and the tutor in adjacent workspace columns. This is a strong workspace direction after source identity and the Home path are verified. It requires more layout and focus work than the first option.

Keep existing two-layer navy surfaces, teal actions, blue focus and orange progress accents. Keep the original mascot on the initial Home prompt. Use route-specific reading order at `1440`, `768`, `390`, and `360`, with normal keyboard focus, reduced motion, and no horizontal page scrolling. Match future captures by viewport, theme, and data state. Do not score visual parity where the same reference state is unavailable.
