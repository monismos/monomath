# Verification log

## M2 (2026-10-04)

`npm run check` passes TypeScript, ESLint, 13 unit tests and the static PWA build. `npm run e2e` passes 24 Chromium desktop/mobile tests. The hold surface matrix uses primary touch Pointer Events on mobile; canvas holds compare the camera position before and after. Reload verifies saved notes and restores the dial and dimension. Collections of 1, 2, 7 and 40 notes, Undo, keyboard creation and reduced motion are covered.

Note storage is awaited before the composer closes, including deleting its draft. Imports reject incomplete context and unsupported formats atomically. Preview thumbnails are best effort. No claim is made yet for full labs, mascots, gamification, all seven themes or Lighthouse budgets; their milestone checks remain pending.

The Three chunk is 271.1 KB gzip and is loaded separately from the 66.7 KB gzip shell. Vite emits a raw minified chunk-size advisory at the current 900 KB threshold; the gzip budget remains below 300 KB. Playwright emits an environment NO_COLOR/FORCE_COLOR notice; this is runner output, not an app browser console warning.
## M3 (2026-10-04)

`npm run check` passes 42 pure/component tests, TypeScript, ESLint and the offline production build. All 26 desktop/mobile Playwright tests pass, including wrong Predict → hint → correct reveal → save/star note → reload → tomorrow’s Echo → Good → persisted schedule/XP. Fake-clock tests prove 1/3/7/14-day schedules, daily caps, permanent award deduplication, weekly freeze and mastery requiring different recall dates.

Guide component tests cover one eye, actual projected gaze after backward seeking, dialogue cooldown, quiet/off, docking and earned cosmetics in both rigs. Reviewed the 1440×1000 desktop and 360×900 mobile screenshots; the mobile controls continue down the page. The sidebar scrolls for small heights. Full M6 layout/contrast/Lighthouse audits remain pending. Build no longer emits the raw Three chunk advisory after shared chunks split naturally.
