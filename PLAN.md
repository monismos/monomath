# Monomath build plan

Status: pending / in progress / verified. A milestone is verified only after its acceptance checks and `npm run check` pass.

- [x] M0 Foundation — verified: tooling, two live themes, persisted settings, routing, PWA, storage, accessibility, local fonts.
- [x] M1 Dual-render engine — verified: shared SceneSpec, deterministic timeline, tween, 2D/3D, dial, tethers, player, quality probe.
- [x] M2 Notelets and summary — verified: global hold on desktop/touch, anchors, safe multi-drafts, awaited save, context restoration, ring/helix/flat/grid/list, filters, inertia, exports.
- [x] M3 Mascots and motivation — verified: five one-eyed guides, live gaze, quiet/off, cosmetic application, local XP ledger, facets, daily tasks, streak/freeze, fake-clock-tested SRS, Trophy Shelf and tutorial.
- [x] M4 Fractions vertical slice — verified locally: six worked families, alternate methods, predictions, pie/bar/stack, eight seeded proof families, three-part Boss, fresh Echoes, lab dialogue, graph Bridge and contributor guide. Physical-phone and complete-product Lighthouse audits remain M6 gates.
- [ ] M5 Remaining MUST labs — in progress, in the exact order below.
  - [x] Sets — verified locally: bounded parser/solver, Venn/Euler/sieve, power set and relation views, four worked examples, seeded challenges, Boss, SQL Bridge, Echoes, context restoration and desktop/touch e2e.
  - [ ] Propositional logic — pending.
  - [ ] Summation — pending.
  - [ ] Matrices — pending.
  - [ ] Functions and graphs — pending.
  - [ ] Distributions and Galton board — pending.
  - [ ] Kinematics — pending.
  - [ ] Memory, types, and control flow — pending.
  - [ ] Algorithms and recursion — pending.
- [ ] M6 Monomap, bridges, seven themes, settings, performance, accessibility, offline QA — pending.
- [ ] M7 SHOULD labs, then COULDs — pending.

## SHOULD lab backlog

- [ ] Equations and balance tiles.
- [ ] Number lines and operations.
- [ ] Trigonometry and unit circle.
- [ ] Graph theory, BFS, DFS, Dijkstra.
- [ ] Quantifiers.
- [ ] Induction and contradiction.
- [ ] Natural deduction.
- [ ] Data towers, mean, median, mode.
- [ ] Probability and Bayes.
- [ ] Regression and residuals.
- [ ] Confidence intervals.
- [ ] Hypothesis testing.
- [ ] Forces and vectors.
- [ ] Energy tanks.
- [ ] Waves.
- [ ] Circuits.
- [ ] Fields.
- [ ] Optics.
- [ ] Unit Snap.
- [ ] Sketch-then-Simulate.
- [ ] Rosetta mode.
- [ ] Big-O growth terrain.
- [ ] Data structures.
- [ ] Functional pipelines.
- [ ] Paradigm Lens.
- [ ] Bug Hunt.
- [ ] Parsons puzzles.
- [ ] Syntax Anatomy.
- [ ] Async restaurant.

## COULD backlog

- [ ] On-device OCR input adapter implementation.
- [ ] Voice dictation.
- [ ] Rapier free-play physics.
- [ ] Rust and Go Rosetta presets.
- [ ] Terminal theme.

## Exact next actions

M0–M4, Sets and the user workspaces pass the current local checks (291 unit/component tests) and 44 production desktop/mobile e2e tests at 1440×1000 and 360×800. Shell JS: 76.9 KB gzip; shared Three dependencies 220.4 KB plus stage48.0 KB; Fractions 11.5 KB plus shared challenge/solver7.8 KB; Sets 33.8 KB plus its shared scene/solver chunks. WebGL stress checks cover 96 blocks and pie slices within draw-call/triangle budgets. Philosophy authoring and the bounded equation workspace are implemented, including offline worker use and complete graph notelet context restoration.

Sets has passed its local gate and is unlocked on the Monomap. Next implement Propositional logic, then Summation, followed by the remaining M5 order. M6 still requires the constellation map, five remaining themes, AAA contrast, settings completeness, Lighthouse and physical-device FPS. M7 remains pending.
