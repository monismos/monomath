# Content map

This file describes shipped behavior, not the product backlog as if it were complete. See PLAN.md for the milestone gate.

| Lab / workspace                       | Status                             | Bridges declared / available                                        |
| ------------------------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| Hello Blocks / Fractions introduction | Verified M1–M3                     | Opens the full Fractions lab through navigation                     |
| Fractions and parts of a whole        | Verified M4 locally                | Sets, Functions, Summation (locked); Equation workspace (available) |
| Sets                                  | Verified M5 locally                | Logic, SQL, Functions, Fractions                                    |
| Propositional logic                   | Verified M5 locally                | Sets (available), Summation, Memory (locked); curated Boolean code  |
| Σ Summation                           | Coming soon                        | Fractions, Functions, Loops, Distributions                          |
| Matrices and transformations          | Coming soon                        | Functions, Linear systems, Vectors                                  |
| Functions and graphs teaching lab     | Coming soon                        | Summation, Kinematics, Matrices                                     |
| Distributions / Galton board          | Coming soon                        | Summation, Probability                                              |
| Kinematics                            | Coming soon                        | Functions, Summation, Units                                         |
| Memory, types and control flow        | Coming soon                        | Logic, Sets, Algorithms                                             |
| Algorithms and recursion              | Coming soon                        | Control flow, Summation, Graph theory                               |
| Equation workspace (user addition)    | Verified desktop/mobile acceptance | Fractions → constant value or function                              |
| Philosophy authoring (user addition)  | Verified desktop/mobile acceptance | Author-defined references                                           |

Sets accepts bounded finite expressions and set-builder predicates, with Venn/Euler, sieve, power-set and ordered-pair/function views. Logic accepts up to four variables and sixteen AST nodes, including arguments with up to three premises. It visualizes exact truth tables, the selected world's gates and counter-worlds; Shape groups by the first two variables while retaining all assignments in labels. Six seeded proof families check the exact marked world set and classification. Curated Python/SQL never executes learner input. The equation workspace supports bounded real curves, implicit planar relations, height surfaces, constants and up to four parameters. It provides numerical views, not a general symbolic solver. It does not complete the Functions teaching lab's Riemann rectangles, factoring or integral explainers. Philosophy starts empty so Airator can author the lessons; private reflections are never exported with public lessons.

## Remaining SHOULD labs

All are **Coming soon**: equations and balance tiles; number lines; trigonometry and unit circle; graph theory/BFS/DFS/Dijkstra; quantifiers; induction and contradiction; natural deduction; data towers; probability and Bayes; regression; confidence intervals; hypothesis tests; forces and vectors; energy tanks; waves; circuits; fields; optics; Unit Snap; Sketch-then-Simulate; Rosetta; Big-O terrain; data structures; functional pipelines; Paradigm Lens; Bug Hunt; Parsons puzzles; Syntax Anatomy; Async restaurant.

## COULD adapters and extras

All pending: on-device OCR, voice dictation, Rapier free play, Rust/Go Rosetta presets, Terminal theme. These are not exposed as working features.
