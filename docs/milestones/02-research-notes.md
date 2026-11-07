# Milestone 02 — research notes

Reviewed 7 November 2026. Retrieved public upstream sources through HTTPS and inspected the installed SDK. No new provider, credential, subscription or dependency was added.

## Google retry semantics

Source: [Google RPC error details](https://github.com/googleapis/googleapis/blob/master/google/rpc/error_details.proto), successfully retrieved from its raw repository URL.

`RetryInfo` says clients should wait at least the supplied duration before retrying and use exponential backoff on repeated failures. `QuotaFailure` can describe project-level or daily limits, so a 429 is not permission to immediately route the same work to another model. This led to a shared quota gate, parsing structured retry details, respecting retry times beyond the current request budget, and an explicit concurrency regression test. Application fallback remains capped at two distinct model calls.

## Official SDK error and model contracts

Sources: [Google Gen AI SDK README](https://github.com/googleapis/js-genai/blob/main/README.md) and [SDK types](https://github.com/googleapis/js-genai/blob/main/src/types.ts), successfully retrieved. Also inspected the installed `@google/genai` **2.32.0** implementation and declarations in `node_modules`.

The installed `ApiError` exposes `status` and the error message; SDK transport fixtures confirmed that structured API error details survive in the JSON-formatted message. Do not depend on arbitrary SDK error objects retaining HTTP headers. The classifier additionally handles `Retry-After` for adapters that do provide headers. SDK retry attempts count the initial call; keeping `attempts: 1` avoids hidden retry multiplication.

The SDK exposes model metadata including `supportedActions`, `thinkingBudget` and `thinkingLevel`. Model-specific parameter support must be checked separately from syntactic model-name validity. The new verification script reads metadata and optionally generates once; it reports no live success without a key. Runtime model admission excludes known incompatible families, while endpoint routing remains configurable. No default model substitution is justified by an unrelated project's quota failure.

The official README recommends keeping keys server-side. Public HTTP fixture responses are checked for both fixture key and raw provider-detail leakage. Raw SDK messages are not returned to the UI. The dependency remains on the existing 2.x lockfile; no 3.x runtime migration was introduced.

## Thinking configuration and model documentation

Sources: [Official Gemini cookbook README](https://github.com/google-gemini/cookbook/blob/main/README.md) and its linked [thinking guide](https://github.com/google-gemini/cookbook/blob/main/quickstarts/Get_started_thinking.ipynb), successfully retrieved.

The current README names Gemini 3.8 Flash. The guide distinguishes thinking levels from legacy token budgets and describes migration between them. Installed types also expose both parameter forms. This supports using model-family-specific configuration rather than sending `thinkingLevel` to every historical model. These public references do not verify availability to the user's project, actual output quality, or all allowed parameter combinations. Tests verify routing/configuration shapes; live acceptance remains unavailable.

An initial guessed notebook URL, `quickstarts/Thinking.ipynb`, returned 404. The README supplied the actual guide link, which was then retrieved. Research uses the retrieved guide, not the missing file.

## Data and source integrity

The [Milestone 00 MDN IndexedDB research](00-research-notes.md#2-indexeddb-durability) remains the basis for Milestone 01's transaction acknowledgement and reload checks. Milestone 02 builds on that boundary: AI errors never perform source deletion or clear local originals.

Code review found context-selection bugs independently of the provider: English page markers were not recognized, an oversized first selection could be followed by extra blocks beyond budget, and general sampling could return empty text when every block exceeded the budget. New tests reproduce those cases. Existing exact-quote, coverage and hash/version checks are retained. Page-ID validation cannot prove a generated claim is semantically supported by the cited text; no such guarantee is claimed.

Local research downloads are temporary `/tmp/milestone02-*` files. These links, conclusions and limits are the durable record.
