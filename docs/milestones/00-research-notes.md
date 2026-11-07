# Milestone 00 — research notes

Reviewed 7 November 2026 (Asia/Jakarta). This research informs the audit; it does not establish live model access or complete later milestones. No new service, paid provider, runtime dependency or credential was introduced.

## 1. Google Gen AI SDK and runtime compatibility

Sources retrieved successfully:

- [Official SDK README](https://github.com/googleapis/js-genai/blob/main/README.md)
- [Official API client implementation](https://github.com/googleapis/js-genai/blob/main/src/_api_client.ts)

The README recommends keeping API keys server-side. It also announces a Node 22 requirement for SDK 3.x and recommends constraining the SDK below 3.0.0 to avoid unexpected migration. These are upstream-main observations, not the installed version's API contract. Local inspection finds `@google/genai` **2.32.0**, with its own Node requirement `>=20.0.0`; the application declares `>=20.9.0`, runs on **24.22.1**, and `^2.32.0` excludes 3.x. Keep the lockfile and current SDK during the audit.

The upstream client explains that retry attempts count the initial request. `server.js` already passes `retryOptions: { attempts: 1 }`; the application provider manager owns bounded candidates/deadlines/cooldowns. Avoid adding another retry layer without measuring combined request counts. Model names in configuration are not evidence of availability. No model was changed or called live.

Attempt to read `https://ai.google.dev/gemini-api/docs/troubleshooting` returned HTTP 403. Do not infer current quota, regional availability, or the cause of the historical `source-analysis-bifg-y2daoo` failure from that denial. Milestone 02 needs authorized runtime model discovery and a small controlled inference when a credential and quota exist.

## 2. IndexedDB durability

Source: [MDN — Using IndexedDB](https://github.com/mdn/content/blob/main/files/en-us/web/api/indexeddb_api/using_indexeddb/index.md), retrieved successfully.

MDN describes transaction completion/abort, version-change handling, atomic updates, and the inability to guarantee asynchronous transactions during page unload. The current store already waits for transaction completion, serializes writes and rejects revision conflicts. Preserve those mechanisms. Future schema changes should handle `versionchange`/blocked connections explicitly. New UI success messages should await durable writes rather than infer success from an in-memory change or session-storage write. Native-video progress currently saves on pause/end; this does not guarantee the latest playback position survives an abrupt tab/process termination.

Research also motivated checking the interaction between new profile fields and the legacy preference form. A real browser reproduction showed that the form replaced the whole profile and erased `subjects` and `language`. A minimal merge now preserves fields owned by other views; the browser regression test verifies reload persistence.

## 3. Keyboard focus and overlays

Source: [MDN — ARIA dialog role](https://github.com/mdn/content/blob/main/files/en-us/web/accessibility/aria/reference/roles/dialog_role/index.md), retrieved successfully.

The guidance distinguishes modal from non-modal interaction, explains focus placement/restoration, and requires preventing interaction outside a modal dialog. It does not imply every drawer must be modal. Choose and document the drawer interaction model in Milestone 05. Independently of modality, off-screen hidden navigation should not retain unintended focus targets, and `aria-expanded` must match visibility.

Observed here at 360 px: the drawer is closed, the toggle still reports `aria-expanded="true"`, and a sidebar destination accepts focus with its bounding rectangle at x=-222. Escape visibility checks alone do not establish keyboard accessibility.

## 4. Semantic versioning

Source: [Semantic Versioning 2.0.0](https://github.com/semver/semver/blob/master/semver.md), retrieved successfully.

SemVer defines `MAJOR.MINOR.PATCH`, compatibility-based increments and prerelease identifiers. Legacy UI label `v1.01` is not a valid SemVer release. `package.json` already says `1.0.0`, but package metadata is not proof of the new roadmap's release acceptance. Retain historical records; Milestone 11 should introduce a validated manifest and planned `v1.0.0` entry, with shipped status gated on Milestone 12. No tag, version bump or release publication is made in Milestone 00.

## 5. Node.js rejected promises

Source: [Node.js 24 process documentation](https://github.com/nodejs/node/blob/v24.x/doc/api/process.md), retrieved successfully.

Node documents unhandled promise rejections and the effect of an installed rejection handler. `server.js` currently installs a global handler that logs only the rejection name and continues, originally for the PDF compatibility layer. That makes unexpected async failures difficult to diagnose. A later focused change should distinguish known compatibility failures from unexpected operational failures and test both. Removing it blindly could regress PDF processing; no change is made in this audit.

## 6. Access limits and visual references

Fresh HTTPS attempts to the hosted app health route and `https://pelajarin.ai/` failed at the proxy with CONNECT 403. No hosted-version or fresh competitor-site inspection is claimed. The user-supplied screenshot montage remains the available visual reference. No competitor source or assets were copied. A first attempt to fetch a W3C pattern file from a guessed repository path returned 404; the MDN dialog source above was retrieved and used instead.

Research files were downloaded to `/tmp/omnilearn-*-research.*` for inspection. The links, conclusions, local comparisons and limitations above are the durable research record; temporary downloads are not part of the application.
