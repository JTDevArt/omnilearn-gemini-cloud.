# UI-01 — production shell

Status: PARTIAL — browser and responsive acceptance blocked (12 November 2026).

Baseline: `main` at `7aa7db0a0cac2df702ed37ad9e424e70fb1186f9`. The preceding reports describe 08A, 09, 10 and 11 as partial or awaiting acceptance; 08B is a prototype, not production integration.

This increment retains the real app and its existing store. It keeps the sidebar available on both AI Home and Dashboard, adds Beranda and Catatan to the primary navigation, moves Disematkan to utilities, and removes the duplicate sidebar home switch. The header switch, legacy routes, learning tools and local data remain in place. Dark colors follow OmniLearn's supplied navy palette; transitions respond to hover and press and are disabled under reduced motion. This is CSS motion, not the React-only Framer Motion package.

Checks performed without AI calls: `npm ci --no-audit --no-fund`; `npm run lint`; `npm test` (146 passed); `npm run build`; `npm audit --omit=dev --audit-level=high` (0 vulnerabilities); `git diff --check`. The navigation browser script was updated for nine routes but Chromium failed at launch: `socket() failed: Operation not permitted`. No visual, mobile, keyboard, color-contrast or browser regression acceptance is claimed. Run `scripts/verify-navigation-browser.mjs`, `scripts/verify-dashboard-browser.mjs` and `scripts/verify-design-browser.mjs` in a browser-capable environment before completing UI-01; inspect Home and Dashboard at 1440, 1280, 1024, 768, 390 and 360 widths in both themes.

Catatan currently opens the existing note editor; the organized source-specific gallery and verified topic titles are still pending UI-04. No storage migration or provider change. No production deployment or live Gemini/OCR/Firebase/YouTube verification was performed.
