# Pelajarin reference map

Evidence checked 21 November 2026. The V19 brief identifies VIDEO-1 as a `04:22` public website recording and VIDEO-2 as an `08:59` application recording. The two videos and the current OmniLearn defect screenshots are absent from the available attachments and workspace Library. The workspace contains the V17 and V19 text briefs and OmniLearn's own demo video. It has no callable Library search connector.

The descriptions in the brief define what to look for when the recordings are available. `UNKNOWN` denotes evidence that has not been observed. The two public application URLs returned proxy CONNECT 403 during V18 review. The previous Classic Dashboard and New Look findings are indexed separately below.

## V19 recording observations

| VIDEO | TIMESTAMP | SCREEN | LAYOUT | ACTION | RESULT | TRANSITION | OMNILEARN COMPONENT | GAP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VIDEO-1 | UNKNOWN | UNKNOWN (brief lists public landing, demos) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Landing `/`, demo, primary CTA | `04:22` recording unavailable |
| VIDEO-1 | UNKNOWN | UNKNOWN (brief lists pricing, FAQ, legal) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Landing feature details, FAQ, policy and terms links | Pricing, navigation, footer hierarchy and responsive behavior unobserved |
| VIDEO-2 | UNKNOWN | UNKNOWN (brief lists login and onboarding) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Account, session restoration, privacy setup | `08:59` recording unavailable |
| VIDEO-2 | UNKNOWN | UNKNOWN (brief lists loading and application Home) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | App initialization, application Home, shared navigation | Navigation hierarchy and loading transitions unobserved |
| VIDEO-2 | UNKNOWN | UNKNOWN (brief lists AI Tutor) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Composer, source selection, tutor conversation | Submit, pending, response and retry lifecycle unobserved |
| VIDEO-2 | UNKNOWN | UNKNOWN (brief lists lesson and notes) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Lesson reader, chapter outline, note editor | Chapter and edit/save interactions unobserved |
| VIDEO-2 | UNKNOWN | UNKNOWN (brief lists quiz and flashcards) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Quiz practice, flashcard review | Generation, feedback, reveal and review motion unobserved |
| VIDEO-2 | UNKNOWN | UNKNOWN (brief lists podcast and mindmap) | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | Podcast controls, editable mindmap | Configuration, navigation and responsive behavior unobserved |

## Earlier owner evidence

These reports came from distinct earlier research. Their timestamp and screenshot references belong to the named historical inputs. The originals are currently unavailable for reinspection.

| Earlier reference | Observation reported in repository | OmniLearn design and acceptance implication |
| --- | --- | --- |
| 12 Nov New Look recording at `121.6s`, screenshot `154732` | The Home composer offers multiple inputs. Resume and the note collection follow it. | Keep one centered composer, visible source scope and the existing input actions. Verify that switching the selected source preserves the draft and binds the intended source ID. [V15.3 design record](v153-production.md) |
| 12 Nov Classic Dashboard recording at `70.9s` and `188.6s`, screenshot `154727-1` | The screen shows a labeled rail, greeting, note action, four indicators, level progress, searchable notes, and a timer control. | Place the material action by the greeting and use existing real level, streak and review data. Verify that search, subject filter, sort and timer controls work with both empty and populated libraries. [Archive review](archive-home-dashboard.md) |
| Earlier lesson screenshots `154727` and `154736` | The earlier report identifies an introduction and chapter progression. | Keep the verified topic and active chapter visible. Verify that chapter selection and progress persist with the same source after reload. [Recovery design record](v16-product-recovery.md) |
| Earlier quiz screenshots `154737` and `154739`, flashcard screenshots `154740`, `154743`, `154746` | The report records answer feedback and a long flashcard answer colliding with the rating controls. | Keep quiz feedback beside the submitted answer. Verify that a long flashcard answer expands, with rating actions after the answer at phone and desktop widths. [Recovery design record](v16-product-recovery.md) |
| Earlier source screenshot `154749` | The reported workspace presents a source alongside a contextual tutor. | Show the active source in the reader and during document chat. Verify that navigation never changes the question's source silently. [Recovery design record](v16-product-recovery.md) |

Use the [V18 screen and flow map](../agent/RECON.md) for OmniLearn's existing routes and fixture-backed checks. V19 product requirements for onboarding, privacy, provider progress and source recovery come from the brief. Their exact reference layout or interaction remains unknown. Validate OmniLearn at `1440`, `768`, `390`, and `360` in both themes with keyboard access and reduced motion. Leave the video comparison gate pending until the two recordings and defect screenshots are available. When supplied, confirm each file's duration, record the start time of each interaction and its visible outcome in one pass, and revisit unclear timestamps only.
