# OmniLearn product recovery design

Base: `main` at `6ed55c0`. This document describes intended behavior and verification. See the release and test evidence for implementation status.

## Reference evidence

The supplied New Look Home moves from a centered tutor prompt to upload, record and video actions, then shows one resume link and saved notes. The Classic screenshot presents a greeting, a labeled rail, four compact indicators, level progress and a searchable notes list. The public Classic URL exposed a brand shell on 18 November 2026. The authenticated observations here come from the supplied screenshots and the [earlier archive review](archive-home-dashboard.md). [Classic Dashboard](https://app.pelajarin.ai/dashboard)

| Supplied screenshot suffix | Use |
| --- | --- |
| `154732` | New Look Home. Keep the composer and resume action ahead of the library. |
| `154727-1` | Classic Dashboard. Place the material action, study metrics and note search in scan order. |
| `154727`, `154736` | Lesson intro and chapter progression. Open with the topic and resume the last chapter. |
| `154737`, `154739` | Quiz. Keep selection, checking and feedback in one reading column. |
| `154740`, `154743`, `154746` | Flashcard prompt and reveal. The long reference answer collides with rating controls, so give it natural height. |
| `154749` | Source with contextual tutor. Keep the active document identifiable during chat. |
| `154813` | OmniLearn before repair. Flashcard error names no usable cause, and the active material has no topic title. |
| `154817` | OmniLearn before repair. Tutor responds in general mode and offers no action to save a lesson. |

The `(4)` archives match the earlier `(3)` archives byte for byte. SHA-256 prefixes are `8cc2a3e3f777` for the app and `235da80fc507` for marketing. Each archive has one saved HTML page. The supplied original screenshots remain in the owner's Library. This index leaves personal and account information outside the repository.

## Supporting patterns

| Reference | OmniLearn decision |
| --- | --- |
| [Linear](https://linear.app/homepage) | Group everyday destinations in a compact labeled sidebar. Give contextual tools their own area. |
| [NotebookLM](https://blog.google/innovation-and-ai/models-and-research/google-labs/notebooklm-new-features-december-2024/) | State chat scope beside the prompt. Keep document evidence available while reading or creating from it. |
| [Readwise Reader](https://readwise.io/read) | Put reading first. Keep source navigation and study actions at the edges of the lesson. |
| [Notion](https://www.notion.com/help/writing-and-editing-basics) | Edit the title and ordered chapter content before saving a lesson. |
| [Quizlet](https://help.quizlet.com/hc/en-us/articles/360030988091-Studying-with-Flashcards) | Separate the card face, reveal and previous/next control. Keep remembered review choices. |
| [Khan Academy](https://support.khanacademy.org/hc/en-us/articles/115002552631-What-are-Course-and-Unit-Mastery) | Reflect actual learning events in progress indicators. Point students to the next relevant practice. |
| [Brilliant](https://brilliant.org/) | Keep each question, answer control and explanation together. |
| [Geist](https://vercel.com/geist/introduction) | Reuse token roles for surfaces, focus, inputs and active states. |
| [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/motion?changes=l_9_3) | Use short optional transitions and written feedback. |
| [Raycast](https://manual.raycast.com/search-bar) | Show responsive search results near the query. Make the result itself actionable. |

## Screens and navigation

| Screen | Composition and real behavior |
| --- | --- |
| Home | One centered composer, visible general/document choice, and adjacent source/action controls. Show one compact resume row and a topic-first library. Place **Jadikan Materi** next to the relevant tutor answer so the user can preview the lesson and edit it before saving. |
| Dashboard | Greeting and material action first. Compact counts for existing metrics, level progress, timer, study activity and resource search. |
| Catatan | Put topic title first, then chapter count, source type and available progress. Search and filter the actual saved collection. Label general AI material separately. |
| Mata Pelajaran | Subject folders show the materials they contain. Show the original notebook illustration when the library has no subjects. |
| Learning Workspace | Topic and progress header, keyboard-reachable chapter outline, primary reading area, contextual Flashcard/Kuis/Mindmap/Sumber/Tutor actions. Collapse to a single reading flow on mobile. |
| Ujian and Kuis | Present real answer controls and grading. Put the score, correction and explanation beside the attempt. Preserve progress and clear navigation among questions. |
| Flashcard | Center a focused prompt at readable width. Let the flipped answer expand with prose/formulas. Review ratings and navigation follow it in document order. |
| Streaks | Actual date-by-date activity with clear zero and completed states. Expose calendar legend and current/best counts. |
| Leaderboard | Display only participating users and real ranking criteria. Empty ranking states explain how participation works. |
| Profil | Group identity, preferences, current stats and account actions. Keep settings reachable from the mobile drawer or profile. |
| Update List | Chronological entries from the release data with version and changes. |
| Landing | Lead with the document-to-lesson workflow and a functional link to the application. Use OmniLearn demo assets for product imagery. |

Use a quiet navy or warm off-white canvas, teal for starting work, blue for selected workspace and focus, amber for review and streaks. Keep two surface levels, a compact navigation rail, and 16px reading copy with a roughly 68-character measure. The notebook illustration at `public/assets/omnilearn-study-mark.svg` is original OmniLearn artwork. Decorative use takes empty alt text.

## Interaction and verification

- At 1440px and 390px, keep route names and actions visible without horizontal scrolling. Mobile may move chapters and contextual tools into expandable sections. Answers, formulas and success/error messages stay in flow.
- Maintain visible focus, Escape and focus return for dialogs/drawers, and keyboard access to cards, question controls and visible filters. Confirm contrast of actual text and accent pairings in both themes.
- Use motion to show a reveal, state change or completed action. Reduced motion keeps the same information in a stable layout. Upload progress represents completed work.
- Preview the selected tutor exchange as editable chapters. Save first, then navigate to the new material ID. Source mode preserves grounding; generated general material retains its origin label.
- For failed OCR or provider calls, keep draft and original file. Display one actionable error near the failed control. Report the failure class supported by the response and let people decide when to retry.
- Capture before/after Home, Dashboard and Reader plus the long Flashcard answer on narrow screens. Record whether the chat-to-material and upload-to-study checks used a live provider or controlled fixtures.
