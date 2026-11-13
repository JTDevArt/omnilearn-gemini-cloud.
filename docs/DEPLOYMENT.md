# Forge V2.1 deployment and external setup

A GitHub commit, local Docker build, and saved development-environment draft are separate from publishing `omnilearnid.ai.studio`. No new hosted revision has been deployed by the Forge V2.1 work.

## Runtime

- Node >=20.9; the Dockerfile uses Node 24. Use `npm ci` with the committed lockfile.
- Install `poppler-utils` (`pdftoppm`) for targeted scan-page rendering. Without it, OCR reports fallback to the original PDF.
- Start with `npm start`. The server listens on `0.0.0.0:$PORT`, default 3000. The container defaults to 8080.
- Required production secret: `GEMINI_API_KEY`. Missing/placeholder keys and invalid ports fail startup clearly. Key presence does not establish usable quota/model access.
- `GET /api/health` returns `productVersion: "forge-2.1"` and `uiBuild: "algorithmic-v5-dashboard-1"`; `ready` reports key presence only. The UI build marker identifies this code increment, not a passed deployment or live inference test. `/` is home, `/dashboard` is the application, `/vendor/*` serves local dependencies.
- The build checks JavaScript, inline scripts and migration invariants; there is no bundler output directory.
- SIGTERM/SIGINT close HTTP connections with a 10-second deadline.
- Use HTTPS behind exactly the platform's trusted ingress. The server trusts one proxy; forward the public Host/protocol correctly for mutation Origin checks. Avoid another untrusted proxy hop.

## Container

```bash
docker build -t omnilearn:forge-v21 .
docker run --rm -p 8080:8080 --env-file .env omnilearn:forge-v21
```

Use an untracked private `.env` only locally; production should use platform secret bindings. The image excludes `.env*`, Git, tests, attachments and local dependencies, and runs as `node`. A managed proxy may need a build-only trusted CA mount:

```bash
docker build --secret id=proxy_ca,src=/path/to/proxy-ca.pem -t omnilearn:forge-v21 .
```

That CA is optional outside the proxy. Preserve certificate verification. Never pass the Gemini secret as a build argument.

## Update the existing Google AI Studio application

1. Open the existing OmniLearn project. Bring the latest `JTDevArt/omnilearn-gemini-cloud.` GitHub `main` files into its code with the import/sync workflow available in that interface. A GitHub toolbar icon is not assumed to exist.
2. Confirm the new `lib/*`, `public/*`, `package-lock.json`, `Dockerfile` and updated `server.js` are present. Install with `npm ci`; start with `npm start` on the platform-provided `PORT`.
3. Keep `GEMINI_API_KEY` in the project's **server-side Secrets/environment settings**. Configure optional integrations only when their external prerequisites below are ready.
4. Restart the preview backend. Verify `/api/health` includes `uiBuild: "algorithmic-v5-dashboard-1"`, then check `/dashboard?view=dashboard`, a TXT upload and local exams/maps/backups. The unchanged `productVersion: "forge-2.1"` alone cannot distinguish dashboard revisions. A missing/different UI build marker means this backend increment is not serving that preview; the matching marker still requires checking that current frontend assets load.
5. Click **Publish** in the project's upper-right toolbar to update the existing app, and complete any platform deployment settings in the owner's account.
6. Open the published URL in a fresh tab and repeat health/version and TXT checks. Run one controlled inference only when Gemini quota permits; inspect actual-model/fallback notices.

No callable AI Studio publish capability or Google Cloud deployment identity is available in this execution environment. GitHub synchronization is not website publication.

## Cloud Run alternative

An owner with an authorized Google Cloud project and existing secret can deploy this Dockerfile through that project's release flow. Example placeholders:

```bash
gcloud run deploy YOUR_SERVICE --source . --region YOUR_REGION \
  --set-secrets GEMINI_API_KEY=YOUR_EXISTING_SECRET:latest
```

Choose ingress/access and billing/quota policies in that account. This example does not create a secret, select a project, enable billing or grant public access. Process-local queues/caches are not a distributed quota ledger.

## Firebase accounts and Firestore

No Firebase configuration was available in this increment. Fixture services validate code paths, not live Firebase/email delivery/rules or two physical devices.

1. In an existing authorized Firebase project, enable **Authentication → Email/Password**. Configure the deployed domain under authorized domains and check verification/password-reset email templates. Do not enable paid resources implicitly.
2. Select/create the **default Firestore database**, with the owner's chosen region/policy. Review/deploy [firestore.rules](../firestore.rules) to this same project through the Firebase console or its configured CLI.
3. Set `FIREBASE_PROJECT_ID` and `FIREBASE_WEB_API_KEY` in the server environment. Authentication/rules enforce ownership; this API key identifies the project. Apply Google API key restrictions compatible with server-side Identity Toolkit/Secure Token requests.
4. Restart the app. Open **Akun & sinkronisasi**, register, verify the email through Firebase, then refresh/login. Cloud writes require verified email.
5. In a second independent browser/device on the same deployed HTTPS app, log into the same account. Explicitly activate cloud sync from the desired library. Confirm auto push/idle pull, notes/progress/versions and a deliberate concurrent-edit conflict. Test cross-user denial with a second UID and the deployed rules before sensitive use.

Sessions use Secure/HttpOnly/SameSite=Strict cookies in production and server-side verification/refresh. Test account flows in the standalone app; browser third-party-cookie policies may block embedded AI Studio previews. Logout clears cookies, retains a separate per-account device cache and does not revoke every other device's session.

### Data model and limits

`users/{verifiedUid}/resources/{sha256(kind, sourceId, version)}` stores owner UID, kind, source/version, JSON payload and timestamp. `users/{verifiedUid}/sync/head` stores the resource index/revision. Settings/profile and source resources retain nested blueprint, notes, cards, reviews, quizzes/exams, maps, chats, bookmarks when present, and progress. Archived source versions have separate resources.

Limits: 8 MiB validated snapshot, 700,000 UTF-8 bytes/resource, 350 settings/source/version resources, and fewer than 499 writes before the head write. Excessive libraries fail atomically. Original binary uploads are device-local and must be transferred separately in ZIP backups.

Sync is explicitly activated per tab and must be activated again after a reload. The browser debounces pushes for 2.5 seconds and checks remote revisions every 20 seconds while the library/learning UI is idle. It avoids applying remote changes during editing, dialogs or active requests. Conflicts pause sync; preview a cloud snapshot or merge copies. Offline changes persist locally in the open app and can retry after reconnecting. This is not a service-worker offline app or collaborative document merging.

## Authorized YouTube captions

Enable YouTube Data API and obtain an OAuth **access token** permitted to list/download the intended video's captions. Set `YOUTUBE_OAUTH_TOKEN` on the server. The official download API generally requires ownership/editor permission; it is not an arbitrary-public-video downloader. No scraping or access-control bypass is used.

The adapter does not implement OAuth consent/refresh-token UI. Renew expired access tokens externally. Missing/denied/expired credentials preserve manual transcript and SRT/VTT workflows. Live tests with an eligible caption track and a denied video remain outstanding.

## Research

Crossref metadata needs no API secret but requires `api.crossref.org` access. Its metadata is not proof of peer review/full-text accuracy. This environment's live request was denied by current network policy. Brave web search additionally requires an authorized `BRAVE_SEARCH_API_KEY`; it is optional and never paid for/activated automatically.

Results retain provider URLs/DOIs/dates/authors when supplied, citations and retrieval timestamps. Optional synthesis cites only registry entries and separates uploaded information, external metadata and AI interpretation. Full-article fetching/verification, retraction checking and systematic-review workflows are not implemented.

## Managed environment draft and network

The active runtime initially allowed Gemini plus package-manager presets. The reusable draft prepares these integration hosts, preserving existing rules:

- `generativelanguage.googleapis.com`
- `identitytoolkit.googleapis.com`
- `securetoken.googleapis.com`
- `firestore.googleapis.com`
- `www.googleapis.com` (YouTube Data API)
- `api.crossref.org`
- `api.search.brave.com` (optional)

Saving the draft does not change the running instance. Review/save/publish it in cloud-environment settings to activate it for a new runtime. Keep the existing Gemini secret binding; enter optional credentials only in secure settings, never chat or Git. Publishing that development configuration does not replace the AI Studio website's **Publish** action.

## Release checks

```bash
npm ci --no-audit --no-fund
npm test
npm run build
npm audit
```

Then test the production container, health/assets/TXT upload, Markdown/KaTeX, isolation and reload persistence. Verify real Firebase, YouTube, research and inference only after credentials/network/quota are ready. The [status report](FORGE-V2.1-STATUS.md) distinguishes checks actually executed from remaining work.
