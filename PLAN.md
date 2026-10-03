# Monomath build plan

Status: pending / in progress / verified. A milestone is verified only after its acceptance checks and `npm run check` pass.

- [x] M0 Foundation — verified: tooling, two live themes, persisted settings, routing, PWA, storage, accessibility, local fonts.
- [x] M1 Dual-render engine — verified: shared SceneSpec, deterministic timeline, tween, 2D/3D, dial, tethers, player, quality probe.
- [x] M2 Notelets and summary — verified: global hold on desktop/touch, anchors, safe multi-drafts, awaited save, context restoration, ring/helix/flat/grid/list, filters, inertia, exports.
- [ ] M3 Mascots and motivation — pending: one-eyed guides, local XP, gems, SRS, trophies, first-run tutorial.
- [ ] M4 Fractions vertical slice — pending: all operations, predictions, scene-verified challenges, boss, bridges, contributor guide.
- [ ] M5 Remaining MUST labs — pending, in the exact order below.
  - [ ] Sets — pending.
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

M0–M2 pass npm run check (13 unit tests); 24 production desktop/mobile e2e tests pass, including touch on all hold surfaces and unchanged camera position. Shell JS: 66.7 KB gzip; lazy Three chunk: 271.1 KB gzip. Next: M3 local award ledger, pure SRS scheduler, gems, daily tasks, Trophy Shelf, three one-eyed guide rigs and first-run tutorial. User additions remain required: a local Philosophy lesson authoring area and equation workspace for explicit/implicit graphs and surfaces; implement these alongside the completed learning loop, with truthful unsupported-input guidance.
