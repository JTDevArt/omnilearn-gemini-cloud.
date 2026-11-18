# Home and Dashboard archive review

## V15 reference update · 18 November 2026

Two recordings show **different application screens**. Sampled 12 frames from each recording, then inspected the Classic frame at 70.9 seconds at larger scale. These are observations from the owner’s recordings. The publicly retrievable [Classic route](https://app.pelajarin.ai/dashboard) returned only a brand shell.

| Evidence | What a student can do | OmniLearn implementation requirement |
|---|---|---|
| Application Home. 12 Nov, 22:13 recording at 121.6s and the single saved Home in `app-pelajarin-ai(3).zip` | Start a question, record, upload or bring a video. Resume study and find saved notes below the composer. | Keep one question form and preserve its draft and source mode. Open resources by ID. Keep the original mascot, with search and filters beside the collection they act on. |
| Classic Dashboard. 12 Nov, 18:34 recording at 70.9s and 188.6s | From a labeled sidebar and greeting, start a note, check four compact metrics, read level progress, then find personal notes by query, subject or sort. A timer control is visible. | Place one material action by the greeting, show actual progress and expose resource lookup on the same page. Reuse OmniLearn’s timer. Show rankings only with opt-in data. |
| Quiz screenshot 143620 | See the selected option, verdict and explanation before proceeding. | Keep written feedback and keyboard-operable answer controls together. |
| Flashcard screenshots 143623 and 143627 | Reveal the card, then rate recall. In the answer image, a long explanation overruns both the card and its controls. | Let answers grow with their content, including formulas. Keep the rating row below the answer at narrow widths and with enlarged text. |
| Source screenshot 143630 | Read the source alongside its contextual conversation. | Keep the active source identity visible. On mobile, let the student reach the source and chat from the same workspace. |

The `(3)` public marketing ZIP is byte-identical to its predecessor (SHA-256 prefix `235da80fc507`). The new application ZIP (`8cc2a3e3f777`) has 151 entries versus 136 and still contains a single saved HTML page. Its landmarks and composer arrangement match the older Home. No bundled third-party logic or personal data is needed for these decisions.

The existing [research register](OMNILEARN-DESIGN-RESEARCH.md) covers 50 references and ten closer analyses. Its older layout freeze and palette guidance are historical. V15 uses the existing OmniLearn tokens and the two workflows above. Two targeted checks supplement that register:

- Quizlet documents revealing a card, moving between cards and rating recall. Make the same three actions distinct in OmniLearn and let the existing scheduler determine review dates. [Flashcards](https://help.quizlet.com/hc/en-ca/articles/360030988091-Studying-with-Flashcards) · [Spaced repetition](https://help.quizlet.com/hc/en-ca/articles/48324742264077-Studying-with-Spaced-Repetition).
- Apple’s guidance keeps motion brief and optional. Verify the revealed answer and quiz result stay understandable with reduced motion enabled. [Apple HIG motion](https://developer.apple.com/design/human-interface-guidelines/motion.md).

## Previous implementation checkpoint

The following findings and test results refer to the earlier archive-based implementation.

## Inputs

- pelajarin-ai.zip: public marketing export, including an embedded learning demonstration.
- app-pelajarin-ai.zip: saved application Home with header, narrow navigation,
  central question input, resume card and filtered note gallery.
- The application export shows only one saved page. Bundled JavaScript does
  not prove the other authenticated routes were observed.
- Both exports contain analytics code. The application export also contains
  account information and private material previews. None was copied into production.
- Third-party JavaScript, CSS, fonts, images and trackers were not imported.

## Design decisions

Energy 2; rhythm 2; motion 1.

- Centralize Home's composer to make beginning a study session the main action.
- Place continuation below the composer so returning to material remains visible.
- Use an actual resource gallery with search, subject filtering and gallery/list
  controls, rather than decorative feature cards.
- Preserve OmniLearn's teal semantic tokens, original mascot and typography.
- Use the existing soft accent on the continuation surface to identify the
  next learning action; keep the rest of the page quiet.
- Separate Dashboard activity from level/timer planning. Keep all existing
  metric formulas, source identifiers and focus-timer behavior.
- Use short hover feedback and the existing reduced-motion treatment.

## Changed production files

- public/dashboard-shell.js: Home composition, library controls and resource
  cards; Dashboard activity/planning columns; contextual greeting.
- public/home.css: replace the prior split Home layout and equal-column
  Dashboard styles with responsive layouts for the revised DOM.

## Verification

- npm run lint: PASS.
- npm test: 171 passed, 0 failed.
- npm run build: PASS.
- Browser verifier: scripts/verify-archive-home.cjs.
- Browser execution: BLOCKED. Default Playwright browser binary is absent.
  System Chromium fails to launch with socket() Operation not permitted.
  Cloud browser cannot reach the local test server (ERR_CONNECTION_REFUSED).
- No screenshots, browser interaction passes, contrast passes or live AI/OCR
  successes are claimed for this checkpoint.
- No Gemini calls were needed for design analysis.

## Remaining gates

Run the browser verifier in an environment with working Playwright:

    node scripts/verify-archive-home.cjs

It checks empty state, canonical source titles, search, subject filtering,
gallery/list switching, mocked chat, correct source opening, 20 viewport/theme
combinations and three screenshots. It uses synthetic local fixtures.
Playwright is QA tooling, not an added production dependency.

Review Home desktop/mobile and Dashboard desktop screenshots before merge.
Production and the uploaded third-party archives are not altered by this branch.
