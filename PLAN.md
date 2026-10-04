# Monomath build plan

Status: pending / in progress / verified. A milestone is verified only after its acceptance checks and `npm run check` pass.

- [x] M0 Foundation — verified: tooling, two live themes, persisted settings, routing, PWA, storage, accessibility, local fonts.
- [x] M1 Dual-render engine — verified: shared SceneSpec, deterministic timeline, tween, 2D/3D, dial, tethers, player, quality probe.
- [x] M2 Notelets and summary — verified: global hold on desktop/touch, anchors, safe multi-drafts, awaited save, context restoration, ring/helix/flat/grid/list, filters, inertia, exports.
- [x] M3 Mascots and motivation — verified: five one-eyed guides, live gaze, quiet/off, cosmetic application, local XP ledger, facets, daily tasks, streak/freeze, fake-clock-tested SRS, Trophy Shelf and tutorial.
- [x] M4 Fractions vertical slice — verified locally: six worked families, alternate methods, predictions, pie/bar/stack, eight seeded proof families, three-part Boss, fresh Echoes, lab dialogue, graph Bridge and contributor guide. Physical-phone and complete-product Lighthouse audits remain M6 gates.
- [ ] M5 Remaining MUST labs — in progress, in the exact order below.
  - [x] Sets — verified locally: bounded parser/solver, Venn/Euler/sieve, power set and relation views, four worked examples, seeded challenges, Boss, SQL Bridge, Echoes, context restoration and desktop/touch e2e.
  - [x] Propositional logic — verified locally: bounded formulas and arguments, truth lanterns, wired gates, Venn truth sets, six proof families, three-phase Boss, Echoes and complete notelet context.
  - [x] Summation — verified locally: exact finite and double sums, animated Hopper, pairing, population mean/variance/SD, six seeded proof families, Boss, Python/R/SQL, Echoes and offline context restoration.
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

M0–M4, Sets, Logic, Summation and the user workspaces pass the current local checks (425 unit/component tests) and 60 production desktop/mobile e2e tests at 1440×1000 and 360×800. Shell JS is 77.41 KB gzip; shared Three dependencies 220.44 KB plus stage48.05 KB; Summation 9.75 KB plus solver/challenge7.18 KB and shared exact fractions6.06 KB. WebGL checks cover 96 blocks/slices and Summation's maximum sixteen-cell and ten-observation scenes within 150 calls / 200,000 triangles. Philosophy authoring and the bounded equation workspace include offline operation and complete notelet restoration.

Sets, Logic and Summation have passed their local gates and are unlocked on the Monomap. Next implement Matrices in this order:

1. Record bounded 2×2/3×3 input and exact arithmetic fixtures for addition, transpose, multiplication, determinant, 2×2 inverse and Ax=b; verify independently with mathjs, including singular systems and negative determinants.
2. Extend the shared scene contract/renderers as needed for genuinely deformed lattice cells, basis vectors and unit square/cube; animate row-by-column products, determinant orientation/area/volume and real eigenvector directions. Keep all ids stable and all geometry within budgets.
3. Add at least three authored worked examples with all depths, Why, alternate methods and Predicts; six seeded proof families checking actual construction, a three-part Boss, dialogue, Echoes, curated loops/NumPy and declared Bridges.
4. Validate the complete bounded context, notelet Jump, dial/tethers, keyboard/touch/reduced motion and both dimensions. Run content/oracle/component tests, the full `npm run check` and desktop/mobile production e2e. Only then unlock and commit Matrices.

Functions, Distributions, Kinematics, Memory and Algorithms follow in the listed M5 order. M6 still requires the constellation map, five remaining themes, AAA contrast, settings/string-table completeness, Lighthouse and physical-device FPS. M7 remains pending.
