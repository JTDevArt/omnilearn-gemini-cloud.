# Milestone 08A — dual-home navigation

Status: IMPLEMENTED LOCALLY, browser acceptance pending (12 November 2026).

- Added separate `view=home` AI Learning Home and `view=dashboard` management summary without duplicating the source store or AI client.
- Added a keyboard-accessible circular header toggle and existing secondary switch; maintains browser navigation, active status and mobile controls.
- Home composer now saves its text draft in per-tab `sessionStorage`; identity switching clears it. The shared tutor DOM remains anchored and is moved between views.
- Dashboard now renders real source counts, streak, due flashcards, XP and a shared focus timer.
- Old `view=learn` remains available.
- Relevant files: `public/product.js`, `public/dashboard-shell.js`, `public/product.css`.
- Remaining: verify with browser automation and inspect mobile layout. Avoid claiming a production deployment.
