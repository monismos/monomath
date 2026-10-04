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
  - [x] Functions and graphs — verified locally: lines, quadratics, sine/exponential curves, polynomial derivatives/integrals, trace/tangent/zoom, signed rectangles, surfaces/slices, literal square tiles, five construction families, Boss, Echoes and offline notelets.
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

M0–M4, Sets, Logic, Summation, Matrices, Functions and the user workspaces pass the current local checks (533 unit/component tests) and 84 production desktop/mobile e2e tests at 1440×1000 and 360×800. Shell JS is about 77.8 KB gzip; shared Three dependencies 220.4 KB plus stage48.3 KB; Functions20.9 KB plus the separate lazy mathjs parser192.3 KB. WebGL checks cover 96 blocks/slices, Summation's largest grid/dataset, maximum 3×3 composition/plane scenes and Functions surfaces within 150 calls / 200,000 triangles. Philosophy authoring and the bounded equation workspace include offline operation and complete notelet restoration. Observation credit now requires Watch mode, so lingering on a proof does not award Watch XP.

Sets, Logic, Summation, Matrices and Functions have passed their local gates and are unlocked on the Monomap. The user authorized publication of this working checkpoint to monismos/monomath with its GitHub Pages Actions workflow. Complete that deployment and verify the hosted site before starting the next lab.

Next implement Distributions and Galton in this order:

1. Specify and test bounded binomial/coin/dice-sum distributions with exact probabilities, independent combinatorial/mathjs fixtures and deterministic seeded sampling. Distinguish theoretical probability from a finite observed frequency and normal approximations.
2. Build one shared Galton pegboard/histogram scene: peg, bias and ball-count sliders, deterministic fall paths, live empirical bins, a labelled normal overlay and a selected inclusive probability band. Keep SVG/Three ids, dial layers and timeline deterministic and meet 150 calls / 200,000 triangles.
3. Author at least three worked examples with all text depths, Predict, Try-first, code and Bridges. Supply five seeded actual-construction proofs, a three-part Boss, Echoes and the required mascot dialogue.
4. Validate complete bounded context including parameters, seed, band, cursor, mode and construction. Run oracle/content/component tests, npm run check, desktop/touch browser tests, offline notelet restoration and scene budgets before unlocking and committing Distributions.

Kinematics, Memory and Algorithms follow Distributions in the listed M5 order. M6 still requires the constellation map, five remaining themes, AAA contrast, settings/string-table completeness, Lighthouse and physical-device FPS. Headless Chromium ReadPixels performance notices are recorded separately from application warnings. M7 remains pending.
