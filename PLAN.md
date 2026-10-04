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
  - [x] Matrices — verified locally: exact 2×2/3×3 operations, affine lattice/square/cube, basis images, real eigenspaces, row-column animation, inverse and singular systems, six construction families, Boss, Echoes and offline notelet context.
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

M0–M4, Sets, Logic, Summation, Matrices and the user workspaces pass the current local checks (475 unit/component tests) and 72 production desktop/mobile e2e tests at 1440×1000 and 360×800. Shell JS is about 77.6 KB gzip; shared Three dependencies 220.4 KB plus stage48.2 KB; Matrices about 10.6 KB plus solver/challenge8.0 KB and shared exact fractions6.06 KB. WebGL checks cover 96 blocks/slices, Summation's largest grid/dataset and maximum 3×3 composition/plane scenes within 150 calls / 200,000 triangles. Philosophy authoring and the bounded equation workspace include offline operation and complete notelet restoration.

Sets, Logic, Summation and Matrices have passed their local gates and are unlocked on the Monomap. Next implement Functions and graphs in this order:

1. Specify and test bounded linear/quadratic, sine/exponential, polynomial derivative and definite-integral teaching problems. Use independent mathjs fixtures for roots, slopes and areas; keep the existing general equation workspace available.
2. Reuse the graph parser/sampling worker and shared affine mesh primitives where useful. Build linked parameter controls, point/trace ball, zoom, movable tangent, Riemann rectangles with n, and a surface/slice view. The 2D/3D teaching scene must preserve step, dial, selection and stable ids.
3. Author y=2x+1, x²−4x+3=0 with factoring, literal completing-square tiles and the quadratic formula, d/dx(3x²+2x), and the integral of x² from 0 to 3. Add all text depths, Predict, Try-first, at least five seeded actual-construction proofs, a three-part Boss, Echoes, code and Bridges.
4. Validate bounded input and complete notelet context including parameters, trace, tangent, rectangle count and slice. Run oracle/content/component tests, `npm run check`, production desktop/touch e2e, offline reload and geometry budgets before unlocking and committing Functions.

Distributions, Kinematics, Memory and Algorithms follow Functions in the listed M5 order. M6 still requires the constellation map, five remaining themes, AAA contrast, settings/string-table completeness, Lighthouse and physical-device FPS. Headless Chromium ReadPixels performance notices are recorded separately from application warnings. M7 remains pending.
