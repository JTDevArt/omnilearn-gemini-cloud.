# OmniLearn design research — V10.4

Verified 15 November 2026. Scope: 50 distinct reference entries, including explicitly documented replacements, ten closer analyses, and production requirements. Research used retrieved public page text, public product examples and official component documentation. **It did not include signed-in use of the products, measured competitor layouts, tested competitor motion, or competitor mobile screenshots.** Responsive and motion recommendations below are engineering deductions to verify in OmniLearn, rather than observations of private applications.

The owner's nine-screen OmniLearn showcase and `ASTRA_SHOWCASE_CONTINUATION.md` govern identity and composition. The current Home/Dashboard layouts are frozen. Public Pelajarin examples verify the connected study workflow; the newer recording named in the directive was not present in this worktree's available attachments for frame inspection. Older recordings are not represented here as the newer recording. No third-party artwork, stylesheets or code were copied.

## Evidence register: fifty references

`Public` means readable marketing/product examples; `Docs` means readable documentation; `Gallery` means the gallery's structure was reviewed, not every linked site's implementation. Findings are deliberately limited to retrieved evidence. Where the requested candidate failed or no longer showed the relevant product, its replacement is named. A URL successfully resolving without substantive content was not counted as design evidence.

| # | Verified reference / accessible evidence | Type and access correction | Useful finding → production requirement |
|---|---|---|---|
| 01 | [Pelajarin](https://pelajarin.ai/) | Public interactive-product example text; authenticated dashboard not inspected | Same topic proceeds through chapters, chat, quiz and flashcards → keep source identity in `product.js`, `jarvis.js` and `study-shell.js`. |
| 02 | [Khan Academy About](https://www.khanacademy.org/about) | Public; root had no readable content; About retrieved instead | Separates courses, assessments and learning support → distinguish recorded completion from demonstrated mastery in Streaks and exams. |
| 03 | [Brilliant](https://brilliant.org/) | Public | Describes guided questions, examples and practice feedback → lesson explanation precedes practice, with results explained. |
| 04 | [Exercism](https://exercism.org/) | Public replacement: Quizlet root returned 403 and help URL was inaccessible | Distinct learning tracks and specific exercise descriptions → source-linked question bank and specific next action, without inventing progress. |
| 05 | [Memrise](https://www.memrise.com/) | Public replacement: Duolingo root yielded only iframe and blog URL failed | Shows a hear/recall/repeat sequence → reveal an answer after attempting recall; keep review actions explicit. |
| 06 | [Coursera](https://www.coursera.org/) | Public | Search, subject categories and clear learning intentions coexist → search/sort subjects separately from editing them. |
| 07 | [RemNote](https://www.remnote.com/) | Public | Notes, PDF, flashcards and section quizzes are presented as one study system → reuse the same saved source across tools. |
| 08 | [Anki studying manual](https://docs.ankiweb.net/manual/studying) | Docs; legacy studying URL redirected | Selected deck limits study scope; question precedes answer and recall rating → maintain source-specific saved decks and deliberate review. |
| 09 | [Knowt](https://knowt.com/) | Public | Uploads connect notes, cards and practice tests → show available tools for a resource, without copying exam-prediction claims. |
| 10 | [Gemini Notebook / NotebookLM](https://notebook.google.com/) | Public; notebooklm.google.com redirected here; no account workspace inspected | Product explicitly grounds research in supplied information → label general chat versus selected-source chat. |
| 11 | [Linear](https://linear.app/) | Public product example | Workspace/Favorites, issue content and properties occupy different roles → retain a quiet shell; put secondary management in context. |
| 12 | [Notion views, filters and sorts](https://www.notion.com/help/views-filters-and-sorts) | Docs; homepage also retrieved | Multiple views represent the same database → gallery/list and filters must not duplicate stored resources. |
| 13 | [Obsidian](https://obsidian.md/) | Public product example | Named notes and reference relationships lead its examples → use canonical topic titles for related materials. |
| 14 | [Craft](https://www.craft.do/) | Public | Distinct document/task/calendar uses are explained in normal language → distinguish learning content from management utilities. |
| 15 | [Capacities](https://capacities.io/) | Public; object-detail docs URL failed | Product distinguishes objects, notes and sources rather than folder names alone → resource title, original file and subject remain separate fields. |
| 16 | [Heptabase](https://heptabase.com/) | Public | Source cards, citations and nested organization are presented together → preserve source context in mindmaps; no new canvas required. |
| 17 | [Milanote](https://milanote.com/) | Public | Combines mixed content around a project context → group existing media with learning resources without duplicating the library. |
| 18 | [Raycast](https://www.raycast.com/) | Public | Keyboard-first access and search are foregrounded → keep search direct and controls operable from the keyboard. |
| 19 | [Things](https://culturedcode.com/things/) | Public | Presents today's work and larger goals separately → make the next review action legible without a new task-management subsystem. |
| 20 | [Readwise Reader](https://readwise.io/read) | Public product description | PDFs and transcripts belong in a reading workflow → content first, contextual tools secondary, comfortable reading measure. |
| 21 | [Apple HIG Markdown](https://developer.apple.com/design/human-interface-guidelines.md) | Docs; HTML shell required JS; used its linked Markdown | Platform guidance is organized around foundations/components → maintain familiar controls rather than inventing interaction semantics. |
| 22 | [Vercel Geist Button](https://vercel.com/geist/button) | Docs; system introduction also retrieved | Documents loading/disabled states and action versus navigation distinctions → stable controls, visible labels and accessible icon actions. |
| 23 | [USWDS components](https://designsystem.digital.gov/components/overview/) | Docs replacement: Material 3 root required JavaScript | Reusable component documentation → standardize controls and feedback with existing semantic tokens; no framework import. |
| 24 | [Carbon data table guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) | Docs; old data-table URL redirected | Search/filter/action toolbar and expandable rows organize complexity → separate collection controls from item management. |
| 25 | [Adobe Spectrum](https://spectrum.adobe.com/) | Docs overview; older forms URL inaccessible | Describes connected foundations/tokens and component playgrounds → use one shared foundation, test state variants in the real app. |
| 26 | [Shopify Polaris references](https://shopify.dev/docs/api/polaris) | Docs; polaris.shopify.com redirected | Same UI system spans multiple surfaces → keep source settings and learning tools visually related without showing every action at once. |
| 27 | [Atlassian Design](https://atlassian.design/) | Public design-system overview | Unified typography, color, accessibility and semantic tokens → use semantic role colors instead of arbitrary per-screen palettes. |
| 28 | [GitHub Primer](https://primer.style/) | Docs overview | Separates Product UI/Brand UI while sharing foundations → landing may tell a story while application remains task-focused. |
| 29 | [Radix](https://www.radix-ui.com/) | Public component examples; themes URL redirected | Settings examples group labels and controls; primitives emphasize accessibility → aligned profile rows and correct tab behavior. |
| 30 | [Base UI](https://base-ui.com/) | Docs overview | Separates behavior from visual choices and points to APG → use native semantics and keyboard support in vanilla JS. |
| 31 | [Framer](https://www.framer.com/) | Public product-canvas examples | Product presentation includes actual canvas/pages/layers context → hero should demonstrate a real learning flow rather than fake user statistics. |
| 32 | [Motion animate](https://motion.dev/docs/animate) | Docs; homepage also retrieved | JavaScript animation and explicit playback/cancel controls → bound animations to view lifecycle and reduced-motion preferences. |
| 33 | [GSAP](https://gsap.com/) | Public tooling overview | Distinguishes core/scroll/SVG/UI/text tools → choose complexity by need; simple transitions do not justify another dependency. |
| 34 | [web.dev CSS animations](https://web.dev/learn/css/animations) | Docs replacement: Codrops returned 403 | Keyframes express discrete state sequences → native CSS can handle restrained entrance feedback. |
| 35 | [Awwwards](https://www.awwwards.com/) | Gallery | Curates by interaction, header, typography and technology → judge composition separately from novelty; reject heavy WebGL decoration. |
| 36 | [Siteinspire](https://www.siteinspire.com/) | Gallery | Filters distinguish typographic, minimal and grid layouts → select a composition for the task rather than combining styles. |
| 37 | [A11Y Project checklist](https://www.a11yproject.com/checklist/) | Docs replacement: Godly redirected to inaccessible recent.design | Groups keyboard, controls, forms, motion and contrast checks → visual gate must include interaction accessibility. |
| 38 | [Lapa Ninja](https://www.lapa.ninja/) | Gallery | Categorizes education/productivity, sections and colors separately → select relevant product storytelling; color alone does not create an educational interface. |
| 39 | [NN/G progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | UX article replacement: Land-book returned 403 | Advanced options can be deferred → keep primary study actions visible, management details secondary. |
| 40 | [One Page Love](https://onepagelove.com/) | Gallery | Distinguishes full pages, sections, FAQ and lead capture → keep only sections that explain actual capabilities. |
| 41 | [Figma](https://www.figma.com/) | Public product overview | Design, code handoff and specs have distinct roles → separate reading from contextual tools and metadata. |
| 42 | [Webflow](https://webflow.com/) | Public | Presents design, content publication and optimization as separate tasks → organize landing sections by user outcome, not a repeated feature-card kit. |
| 43 | [GOV.UK components](https://design-system.service.gov.uk/components/) | Docs replacement: Framer Sites would duplicate #31, not a distinct inspected implementation | Details, error messages, fieldsets and summary lists have clear roles → use disclosure and labeled form groups for exams/settings. |
| 44 | [Todoist](https://www.todoist.com/) | Public replacement: Arc currently displays a sunset announcement, not the requested workspace example | Public preview distinguishes daily tasks and projects → group routine progress separately from content organization. |
| 45 | [Notion Calendar](https://www.notion.com/product/calendar) | Public | Describes glanceable schedules and cross-time-zone use → label activity dates/time zone, avoid inferred daily events. |
| 46 | [Superhuman](https://superhuman.com/) | Public product example; no signed-in mail client inspected | Example work is grouped by context and action → preserve prompt/source context while switching tools. |
| 47 | [Loom](https://www.loom.com/) | Public | Recording and sharing have distinct steps → truthful recording/processing states, no claim audio exists before successful creation. |
| 48 | [Vercel observability](https://vercel.com/docs/observability) | Docs, replacing assumption that public homepage exposed signed-in Dashboard | Diagnostics are a dedicated operational area → keep backend build/provider diagnostics in Help/usage, away from lesson content. |
| 49 | [GitHub Projects docs](https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects) | Docs; marketing candidate redirected to broad platform page | Filtered/grouped views refer to the same underlying work → one canonical material with multiple views. |
| 50 | [Stripe Dashboard basics](https://docs.stripe.com/dashboard/basics) | Docs; public homepage is not account Dashboard inspection | Defines primary navigation, analytics and notifications separately → consistent settings/status hierarchy without replacing approved Dashboard. |

## Ten closer analyses

These analyses compare retrieved evidence with current OmniLearn production code. They are design deductions, not competitor usability-test results. Each source stays below 200 derived words across this document.

### 1. Pelajarin — retain the learning object

**Evidence:** the public example carries a named topic through a chapter list, question interface, flashcards and tutor. **OmniLearn problem:** raw filenames and a dense tool strip obscure that relationship. **Requirement:** title from `lessonTitle(source)`; source ID/version remain the join across chapters and tools. In `product.js`, `jarvis.js`, `study-shell.js`, opening another material must change content, not just its heading. **Verify:** two fixture documents open different chapters; refresh preserves the selected lesson and edited title. **Reject:** copying its mascot, tutorial example text or speed claims.

### 2. Anki — recall before rating

**Evidence:** the manual separates selecting a deck, seeing due cards, revealing an answer and rating recall. **OmniLearn problem:** review controls can compete with card content. **Requirement:** keep saved source-specific cards, a readable question/answer region and clear next/review controls; retain the existing scheduler. **Verify:** review does not regenerate a saved deck, the reveal works with keyboard, and the event is not counted twice. **Reject:** importing another algorithm or disguising self-rating as demonstrated mastery.

### 3. Notion — different views, one record

**Evidence:** its database help distinguishes views from filters/sorts over the same database. **OmniLearn problem:** notes and source management can feel like unrelated libraries. **Requirement:** `dashboard-shell.js` gallery/list, search and subject filter operate on the existing sources; mutation targets the same ID. **Verify:** rename/pin survive switching layouts and reload; empty filtering has an explicit no-match state. **Reject:** a second store or a new all-purpose database builder.

### 4. Linear — content versus properties

**Evidence:** its public issue example separates Workspace/Favorites navigation, issue activity and properties. **OmniLearn problem:** secondary edit/delete/version tools receive the same prominence as studying. **Requirement:** subject cards lead with name, genuine count and opening; editing is disclosed. Preserve frozen Home/Dashboard composition. **Verify:** all previous actions remain keyboard-reachable and source selection follows the clicked card. **Reject:** proprietary dark styling, issue terminology and a new navigation scheme.

### 5. Readwise Reader — protect reading space

**Evidence:** the product describes unified reading, PDF/transcript support and context-attached notes. **OmniLearn problem:** toolbars push the lesson below the initial viewport, particularly mobile. **Requirement:** center content uses the existing reading measure/line height, while chapter/tools become secondary on narrow screens. **Verify:** active chapter and explanation remain readable at 360/390px with no horizontal overflow. **Reject:** new annotation features, copied reading UI or unsupported transcript access.

### 6. Carbon — complexity belongs in the right container

**Evidence:** data-table guidelines describe a toolbar for search/filter/actions and expandable rows for detail. **OmniLearn problem:** library backup/version actions and visible per-subject edit forms dominate collections. **Requirement:** one collection toolbar; each item exposes its own secondary management; grouping remains explicit. **Verify:** filtering does not reset stored subject assignments; controls remain available at small widths. **Reject:** forcing every material into a dense table or importing React components.

### 7. Geist — communicate control state

**Evidence:** button docs distinguish loading, disabled, navigation and mutation; icon-only actions need names. **OmniLearn problem:** controls can change labels or disappear without clear focus behavior. **Requirement:** use the existing control-height/focus tokens; selected modes use `aria-pressed`; asynchronous operations expose status; replaced controls transfer keyboard focus deliberately. **Verify:** no duplicate submit during a busy request, visible focus, cancellation recovery. **Reject:** copying framework-specific props into vanilla HTML or using style as a substitute for behavior.

### 8. WAI APG / Base UI — tabs are a behavior contract

**Evidence:** Base UI explicitly references APG; APG specifies active tab, associated panels, one tab stop and arrow navigation. **OmniLearn problem:** profile sections can become visually grouped but semantically disconnected. **Requirement:** retain `role=tablist/tab/tabpanel`, ID associations, selected state and arrow/Home/End handling in `dashboard-shell.js`. **Verify:** keyboard switching exposes exactly one panel and persisted preferences survive navigation. **Reject:** adding a component library merely for tabs.

### 9. NN/G — advanced is still available

**Evidence:** progressive disclosure places common actions first and specialized ones on request. **OmniLearn problem:** exam JSON editing, source archives and rename/delete are visible alongside the primary task. **Requirement:** exams show source/setup/attempts first; builder/import and source management use labeled native details. Keep all engine capabilities. **Verify:** no action is removed, disclosures work without hover, error status remains visible outside a closed form. **Reject:** hiding required validation or the only recovery action.

### 10. Motion / web.dev — lifecycle beats decoration

**Evidence:** Motion documents cancellation/playback and JavaScript APIs; web.dev describes native keyframe sequences. **OmniLearn problem:** repeated entrances or continuous mascot movement can distract from study. **Requirement:** one bounded entrance or feedback response; native CSS/WAAPI for simple effects; reduced motion exposes final state immediately; disconnect observers and stop abandoned animations. **Verify:** reduced-motion browser has no running decorative animations and page transitions do not request AI. **Reject:** React migration, scroll hijacking, endless glow/pulse and delayed reading.

## Implementation specification and traceability

Palette, typography, shell and page proportions derive from OmniLearn's approved showcase, not the references. Continue the existing navy surfaces, orange primary actions, blue secondary actions and system font. Use `design-system.css` semantic tokens as the canonical source. The eight workstreams are coordinated within one application; file owners integrate sequentially.

| Production target | Concrete requirement | Existing data/action to preserve | Verification |
|---|---|---|---|
| Home / Dashboard | Freeze composition; only state/accessibility/shared-token corrections | Composer, XP, due review, focus timer | Existing Home/Dashboard visual and interaction script |
| Subjects | Search/add toolbar, cards with name/count/open, secondary edit, assignment section | `updateDashboard`, canonical source IDs, safe deletion | Create/rename/filter/delete subject; source remains saved |
| Catatan | Topic-first hierarchy, readable excerpt, type/subject/chapters/date, gallery/list | Existing IndexedDB, title resolver, pin/editor actions | Two source fixtures, rename and reload |
| Exams | Named source setup and clear first action; advanced bank editing secondary; results readable | Existing exam engine, drafts, answers, pending AI grades | Saved/manual bank, start/answer/submit/restore; old versions rejected |
| Streaks | Genuine totals, dated calendar and history; distinguish activity from mastery | `learning-activity` and `progress-metrics` | Real event fixture; calendar accessible without color alone |
| Profile | Identity/header, real learning stats, three aligned preference/usage/account panels | Existing profile/auth/isolation/preferences | Keyboard tabs; name/theme/language persist |
| Leaderboard | Honest unavailable state and personal-progress route | No fabricated rankings | Empty-state action navigates correctly |
| Learning workspace | Actual chapter title/content, comfortable reading, contextual tools, mobile reading priority | Original source/version, saved chapters and generated artifacts | Two different lessons, chapter selection, edit/refresh, no navigation inference |
| Source Library | Reviewable canonical topic separate from original filename; processing/recovery status | Original files, OCR warnings, version/archive/backup | Original bytes/text remain after generation failure |
| Update List | Readable release hierarchy and details; implementation versus deployment distinction | Existing release manifest and commit links | Manifest validation/search/category filters |
| Landing | Hero educational purpose, original mascot/logo, upload→review→study sequence, honest CTA | Real routes, supported formats and privacy behavior | All links, mobile widths, no-script content and reduced motion |
| Shared motion | Short feedback and bounded view changes; no layout-blocking animation | Existing `ui-motion.js`, native APIs | Focus/keyboard, cancellation/disposal, reduced motion |

## Selected/rejected patterns

- **Select:** topic identity over file labels; collection controls separate from per-item actions; content before tools; source/context visible; neutral empty states with a next action; semantic control states; existing storage and engines.
- **Reject:** copying any of the fifty palettes/compositions; decorative canvas/WebGL; pricing tables without a plan; copied logos/mascots; fake testimonials/usage counts; claims that every quiz response demonstrates mastery; new search/task/annotation platforms; animation libraries for a few transitions.
- **Avoid false precision:** no competitor pixel measurements or numerical design scores are reported because the evidence was public retrieval, not a controlled visual/usability study. Suitability is assessed by concrete task fit and the tests above.

## Acceptance boundary

The fifty-entry research requirement is supported by retrieved evidence and documented replacements. The ten analyses are actionable production requirements. This document alone does **not** certify implementation, screenshot parity, live Gemini/OCR, authenticated provider privacy approval, or deployment. Root integration must record actual changed files, browser screenshots, final tests/commit and deployment evidence. The unavailable newer recording remains a reference-inspection limitation; do not claim it was watched.
