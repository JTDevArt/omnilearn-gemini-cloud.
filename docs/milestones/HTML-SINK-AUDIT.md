# HTML sink audit — 2026-11-16

Repository: JTDevArt/omnilearn-gemini-cloud. Base: fb4946dff9e583b00103549ad2677743a34345d9.

V15.3 replaced the `public/dashboard-shell.js` material-dialog assignment with `OmniHtml.fragment()`. The regression inventory decreases from 66 assignments before that change to 65. The reference lines below describe the original audit.

## Scope and findings

Reviewed every assignment to innerHTML in all top-level public/*.js using a parser-assisted inventory and caller/data-flow inspection. Initially 68 assignments: 44 dynamic values, 23 static markup/clears, one raw section() renderer. Now 67 assignments remain: all 44 dynamic assignment boundaries sanitize the assembled string; 23 static/clear assignments remain unchanged. The section renderer no longer uses innerHTML. These are 44 hardened sinks, not 44 demonstrated exploitable vulnerabilities: many fields already used escapeHtml or the safe Markdown renderer.

Key boundaries include app.js assistant/tool/quiz/flashcard/map/explorer templates, product.js library/profile/capability views and map editor, dashboard library cards, jarvis quiz/lesson templates, map and editable-note Markdown, and isolated preview session data. DOMPurify runs after interpolation. The helper falls back to escaped text without DOMPurify; interactive markup is deliberately not parsed in that degraded state. Scripts/style/iframes/object/embed are disallowed. Existing formatting, MathML, controls, SVG defaults, data attributes, and accessible labels remain supported. DOMPurify is an HTML sanitizer, not independent validation of AI facts, link destinations/business actions, or uploaded document quality.

## Every remaining assignment

Line numbers refer to this increment; no source behavior was changed to insert audit comments. The separate read of teaching.innerHTML is not an assignment; its containing profile form is sanitized at the final sink.

| Call site | Target | Change / disposition |
| --- | --- | --- |
| `public/account-workspace.js:191` | `form.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/app.js:208` | `el.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/app.js:223` | `toolOutput.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/app.js:273` | `list.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/app.js:337` | `chatMessages.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/app.js:723` | `toolOutput.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/app.js:769` | `toolOutput.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/app.js:838` | `toolOutput.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/app.js:943` | `toolOutput.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/app.js:1127` | `toolOutput.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/app.js:1244` | `toolOutput.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/app.js:1383` | `toolOutput.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/app.js:1568` | `chatMessages.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/app.js:1682` | `chatMessages.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/app.js:1685` | `toolOutput.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/app.js:1851` | `cardEl.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/dashboard-shell.js:63` | `host.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/dashboard-shell.js:125` | `results.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/dashboard-shell.js:190` | `chat.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/dashboard-shell.js:230` | `dialog.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/dashboard-shell.js:302` | `video.querySelector(".master-video").innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/dashboard-shell.js:306` | `extras.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/design-preview.js:95` | `nav.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:146` | `container.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:149` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:172` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:210` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:226` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:249` | `target.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:252` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:257` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:285` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:308` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:329` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:335` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:354` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:366` | `page.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:523` | `$('#examResult').innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/design-preview.js:536` | `$('#examResult').innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/focus-timer.js:17` | `host.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/jarvis.js:37` | `host.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/jarvis.js:102` | `panel.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/jarvis.js:174` | `panel.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/jarvis.js:178` | `tools.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/map-workspace.js:283` | `text.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:249` | `sidebar.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:270` | `top.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/product.js:286` | `materialNav.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:331` | `teaching.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/product.js:338` | `quizType.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/product.js:865` | `panel.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:1047` | `hub.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:1051` | `filters.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:1054` | `panel.querySelector('#sourceResults').innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:1064` | `stats.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:1070` | `weak.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:1128` | `panel.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:1150` | `panel.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/product.js:1260` | `panel.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:1263` | `form.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:1298` | `panel.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/product.js:1552` | `controls.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/product.js:1601` | `dialog.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/product.js:1976` | `results.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |
| `public/research-workspace.js:9` | `root.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/study-shell.js:27` | `more.innerHTML` | Unchanged: literal markup or empty-string clear. No model/upload/server interpolation. |
| `public/workbench.js:22` | `node.innerHTML` | Whole assembled value now passes through `OmniHtml.sanitize()` (DOMPurify; escaped text fallback). Existing field escaping/Markdown sanitization retained. |

## section() API and every caller

Removed the former dashboard-shell.js:67 innerHTML assignment. Headings use textContent. String content is literal text (including any escaped text the caller supplies), never parsed markup. Rich content must be a DocumentFragment created by OmniHtml.fragment(), which uses DOMPurify with RETURN_DOM_FRAGMENT. A private WeakSet rejects arbitrary Elements, unbranded fragments and lookalike objects. All 20 production callers explicitly create a sanitized fragment; no caller passes a raw markup string directly.

| dashboard-shell.js call | Heading expression | Change |
| --- | --- | --- |
| 95 | `pinned ? "Materi disematkan" : "Catatan"` | Body wrapped in `OmniHtml.fragment()`. |
| 259 | `'Progres level'` | Body wrapped in `OmniHtml.fragment()`. |
| 264 | `'Timer fokus'` | Body wrapped in `OmniHtml.fragment()`. |
| 270 | `'Progres mingguan'` | Body wrapped in `OmniHtml.fragment()`. |
| 271 | `'Aktivitas terbaru'` | Body wrapped in `OmniHtml.fragment()`. |
| 273 | `'Lanjutkan belajar'` | Body wrapped in `OmniHtml.fragment()`. |
| 279 | `"Lanjutkan dari video"` | Body wrapped in `OmniHtml.fragment()`. |
| 326 | `"Koleksi pelajaran"` | Body wrapped in `OmniHtml.fragment()`. |
| 382 | `"Kelompokkan materi"` | Body wrapped in `OmniHtml.fragment()`. |
| 404 | `'Kalender belajar'` | Body wrapped in `OmniHtml.fragment()`. |
| 410 | `'Riwayat terbaru'` | Body wrapped in `OmniHtml.fragment()`. |
| 414 | `'Belajar bersama'` | Body wrapped in `OmniHtml.fragment()`. |
| 418 | `'Profil pelajar'` | Body wrapped in `OmniHtml.fragment()`. |
| 419 | `"Preferensi pribadi"` | Body wrapped in `OmniHtml.fragment()`. |
| 441 | `"Identitas akun"` | Body wrapped in `OmniHtml.fragment()`. |
| 442 | `"Penggunaan nyata"` | Body wrapped in `OmniHtml.fragment()`. |
| 519 | `"Format yang didukung"` | Body wrapped in `OmniHtml.fragment()`. |
| 523 | `"Mulai belajar"` | Body wrapped in `OmniHtml.fragment()`. |
| 528 | `"Diagnostik koneksi"` | Body wrapped in `OmniHtml.fragment()`. |
| 555 | `"Riwayat versi"` | Body wrapped in `OmniHtml.fragment()`. |

A sanitized fragment is intended to be appended immediately; trusted application code must not add untrusted nodes to it after sanitization.

DOMPurify's default DOM-clobbering protection removes field names that collide with DOM properties. An initial profile-save browser regression timed out because `name="name"` was removed. Profile field bindings now use `learnerName`, and the mindmap title field uses `nodeTitle` throughout its fill/submit handler. Stored profile/source properties remain unchanged. The profile save/reload regression passed after the correction; real sanitized FormData bindings are checked in the HTML safety suite. The sanitizer's clobbering protection was not disabled.

## Files with no innerHTML assignments

- `public/backup-format.js`
- `public/backup-workspace.js`
- `public/dashboard-metrics.js`
- `public/exam-builder.js`
- `public/exam-engine.js`
- `public/exam-workspace.js`
- `public/home-draft.js`
- `public/landing.js`
- `public/learning-activity.js`
- `public/lesson-editor.js`
- `public/lesson-label.js`
- `public/local-library.js`
- `public/mindmap-model.js`
- `public/production-preview.js`
- `public/progress-metrics.js`
- `public/recovery-workspace.js`
- `public/release-history.js`
- `public/review-scheduler.js`
- `public/safe-html.js`
- `public/source-tools.js`
- `public/theme.js`
- `public/transcripts.js`
- `public/ui-motion.js`
- `public/upload-queue.js`
- `public/video-sampling.js`
- `public/video-workspace.js`

This inventory is specifically for innerHTML assignments, not a proof that every other DOM API is safe. Other sinks such as insertAdjacentHTML, URL properties and CSS assignments are outside the exhaustive inventory here.

## Verification and limits

- npm test: 171 tests passed, 0 failed. New tests check helper fail-closed behavior, section heading/body text, sanitized fragment acceptance, rejection of arbitrary/lookalike nodes, script load order, and a source guard for all 67 known assignment sites.
- npm run build: passed (syntax and migration checks).
- verify-html-safety.cjs: real Chromium plus the installed DOMPurify, six attack payloads (image error handler, SVG load handler, javascript URL, srcdoc iframe, named-form clobbering fixture, malformed MathML/table payload). Checks no dangerous DOM attributes/elements and zero executed fixture handlers, retained form controls/formatting/KaTeX, actual assistant/map renderers, uploaded/user text on notes/subjects/sources, mindmap edit/submit with the sanitized nodeTitle field, and preview dependency loading. Passed after the field-binding correction.
- Existing VM tests still test template escaping/copy and explicitly stub only the new outer sanitizer; they are not used as evidence that DOMPurify works. Real sanitizer behavior is tested in Chromium.
- The static assignment guard is a regression aid, not a general JavaScript taint analyzer. It verifies wrappers/literals at the known sinks; it cannot prove all possible paths and payloads safe. Not every renderer branch has an adversarial runtime fixture.
- Existing home/study browser regression suites passed separately for navigation, persistence, controls and layout. The page-interaction suite passed 40 page/theme/width combinations plus subject rename/delete and profile save/reload/keyboard tabs.
- Standalone preview export now bundles the sanitizer and shared tokens so opening the export offline keeps the same protections. Export generation and opening the exported file in Chromium passed: lesson cards rendered with zero page errors.
- Initial GitHub export job 43856678990 failed with ENOENT for node_modules/dompurify/dist/purify.min.js because that workflow did not install dependencies. The export workflow now runs npm ci before bundling, and watches sanitizer/token/lockfile changes. This is a delivery-workflow correction; it does not weaken sanitization.

## Gemini defaults

No default changed. All three exact IDs are listed in the official catalog checked on 2026-11-16: https://ai.google.dev/gemini-api/docs/models (redirects to https://aistudio.google.com/docs/models).

| Variable | Default | Result |
| --- | --- | --- |
| GEMINI_MODEL | gemini-3.8-flash | Listed stable |
| GEMINI_FALLBACK_MODEL | gemini-3.1-flash-lite | Listed stable |
| GEMINI_MULTIMODAL_FALLBACK_MODEL | gemini-3-flash-preview | Listed preview |

Server defaults, ProviderManager defaults and .env.example agree. Read-only scripts/verify-gemini-models.mjs returned blocked (exit 2): no GEMINI_API_KEY in this workspace. Catalog existence is verified; availability for the owner's project/key and live generation are not. No model substitution is justified by the evidence.

GitHub delivery does not publish or restart Google AI Studio; no deployment is claimed.
