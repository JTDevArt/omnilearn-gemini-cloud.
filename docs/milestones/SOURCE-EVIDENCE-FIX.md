# Source evidence false-rejection and truncation fixes

13 November 2026. Baseline `86beff168d5efc214678a76550218eef5eb0a5cc`. Implementation delivered to main: [`dcc957202154f528c81b2a5b28e316589cce04da`](https://github.com/JTDevArt/omnilearn-gemini-cloud./commit/dcc957202154f528c81b2a5b28e316589cce04da).

## Confirmed defects

1. `buildAnalysisPrompt` HTML-escapes ampersands and angle brackets inside its untrusted-document wrapper, but evidence/formula validation previously compared the returned transport spelling to the unescaped source. Copying `&lt;` from the prompt could reject an otherwise supported `<` quote.
2. PDF line wrapping, CRLF, tabs or nonbreaking spaces could cause a supported quote with the same words and punctuation to fail a byte-exact comparison.
3. Quote/formula cleaning truncated long values before validation. A 1000-character supported quote prefix followed by an invented suffix could therefore pass after the suffix was silently removed.

The first new regression reproduces the owner's error message with synthetic source text. The oversized-prefix regression also failed before the fix. These are confirmed code defects, but the owner's actual PDF/provider response was not available; this does not establish that every instance of their screenshot error had the same cause.

## Fix and safety boundary

Try the original exact match first, then a single decode of only `&amp;`, `&lt;` and `&gt;`, the escapes emitted by this application's wrapper. If necessary, collapse layout whitespace for matching and map the match back to the original source offsets. The stored quote and formula are always actual contiguous source substrings. Source bytes, content hashes and page references are preserved.

Do not change case, punctuation, numbers, mathematical operators, missing words or section IDs. Do not remove page markers, join omitted source content, perform fuzzy semantic matching or decode arbitrary/numeric HTML entities. Oversized quotes/formulas are rejected before matching instead of truncated. Unsupported output still returns `INVALID_BLUEPRINT`; it does not enter the analysis cache. The prompt now specifies the transport encoding and actual length limits.

The shared matcher covers coverage entries, concept evidence and literal formulas. No new API client, dependency, retry loop, extra provider request, source-store schema or migration was added. Existing Gemini/OCR and original uploads remain intact.

## Verification

- New regression tests failed before the fix: supported escaped/wrapped evidence rejected, and an oversized fabricated suffix was not rejected.
- `node --test tests/source-intelligence.test.mjs`: 10 passed.
- `npm ci --no-audit --no-fund`: passed; existing node-domexception deprecation warning remains.
- `npm run lint`, `npm test` (162 passed, zero failures), `npm run build`: passed locally.
- Cases cover single-pass decoding, CRLF/tabs/NBSP, original substring offsets/page references, unchanged hashes, cache reuse with one provider fixture call, altered numbers/operators/case, omitted page content, wrong section and oversized suffix rejection.
- No real Gemini requests or quota were used. This backend-only change does not require recapturing unchanged UI screenshots.

Deployment is separate: sync the reviewed main backend into the existing AI Studio project and restart it before testing the original material. Unsupported evidence may still be rejected correctly. Live document acceptance and hosted publication were not performed here.
