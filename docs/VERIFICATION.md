# Verification log

## M4 and requested workspaces (2026-10-04)

`npm run check` passes strict TypeScript, ESLint, 227 unit/component tests and the production PWA build. `npm run e2e` passes all 40 tests in 48.6 seconds, at desktop 1440×1000 and touch 360×800. The full suite covers Fractions predictions with equivalent answers, common-cut animation, area overlap, measuring units, alternate methods, 2D/3D preservation, actual-state proof validation, Boss/XP deduplication and complete fraction notelet Jump. Component tests also cover equivalent recuts, visible simplification grouping, bounded context imports and Try-first.

Graph checks cover poles without false connecting strokes, implicit contours, surfaces, parameters, table/slice inspection, unsupported guidance, a note captured on retained valid geometry, complete exported/restored context, and offline reload followed by a new worker-sampled equation. Philosophy checks create/read/edit, private reflection, public JSON export, delete/Undo, valid/invalid import and reload. Public exports exclude reflections.

`node tests/renderers/verify-instancing.mjs <Vite URL>` verifies actual WebGL instancing: 96 blocks use 3 draw calls and 28,802 triangles; 96 slices use 3 calls and 6,530 triangles. Stable activation ids, local hit coordinates, invisible-piece rejection and hold-paused camera pass. This test-only harness is excluded from the production build. Reviewed generated screenshots at 360 and 1440; mobile content uses vertical scrolling and explicit controls.

Shell JS is 76.9 KB gzip, shared Three dependencies 220.4 KB plus stage48.0 KB; Fractions is 11.5 KB plus shared solver/challenge7.8 KB. The separate graph worker is about 684 KB minified and precached; its parser dependency stays outside initial JS. PWA precaches 93 entries, approximately 3.18 MiB. Runtime assets stay local.

M6 still owns Lighthouse, AAA contrast, physical-phone FPS, the complete constellation and remaining themes. Chromium’s software OpenGL path emits two “GPU stall due to ReadPixels” driver warnings during a surface smoke check; no application errors were observed. These are recorded rather than claiming literal zero-console-warning acceptance. The complete product’s final review remains partial in docs/QA_REPORT.md.

## M2 (2026-10-04)

`npm run check` passes TypeScript, ESLint, 13 unit tests and the static PWA build. `npm run e2e` passes 24 Chromium desktop/mobile tests. The hold surface matrix uses primary touch Pointer Events on mobile; canvas holds compare the camera position before and after. Reload verifies saved notes and restores the dial and dimension. Collections of 1, 2, 7 and 40 notes, Undo, keyboard creation and reduced motion are covered.

Note storage is awaited before the composer closes, including deleting its draft. Imports reject incomplete context and unsupported formats atomically. Preview thumbnails are best effort. No claim is made yet for full labs, mascots, gamification, all seven themes or Lighthouse budgets; their milestone checks remain pending.

The Three chunk is 271.1 KB gzip and is loaded separately from the 66.7 KB gzip shell. Vite emits a raw minified chunk-size advisory at the current 900 KB threshold; the gzip budget remains below 300 KB. Playwright emits an environment NO_COLOR/FORCE_COLOR notice; this is runner output, not an app browser console warning.

## M3 (2026-10-04)

`npm run check` passes 42 pure/component tests, TypeScript, ESLint and the offline production build. All 26 desktop/mobile Playwright tests pass, including wrong Predict → hint → correct reveal → save/star note → reload → tomorrow’s Echo → Good → persisted schedule/XP. Fake-clock tests prove 1/3/7/14-day schedules, daily caps, permanent award deduplication, weekly freeze and mastery requiring different recall dates.

Guide component tests cover one eye, actual projected gaze after backward seeking, dialogue cooldown, quiet/off, docking and earned cosmetics in both rigs. Reviewed the 1440×1000 desktop and 360×900 mobile screenshots; the mobile controls continue down the page. The sidebar scrolls for small heights. Full M6 layout/contrast/Lighthouse audits remain pending. Build no longer emits the raw Three chunk advisory after shared chunks split naturally.
