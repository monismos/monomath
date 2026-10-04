# Summation fixtures and acceptance

The Hopper accepts inclusive finite ranges with integer quadratic terms. A single sum has at most twelve terms; a double sum has at most four values per index (sixteen cells). Bounds lie in 0–12; each term lies in 0–100 and the exact total is at most 600. `data(...)` accepts 2–10 integer observations in −20–20. Unsupported input explains the scope and keeps the current lesson. It never evaluates arbitrary learner code.

| Input                       | Exact expected value                            |
| --------------------------- | ----------------------------------------------- |
| sum(i=1..5, 2i+1)           | Terms 3,5,7,9,11; total 35                      |
| sum(i=1..5, i²)             | Terms 1,4,9,16,25; total 55                     |
| sum(i=1..10, i)             | Total 55; each first/last pair totals 11        |
| sum(i=1..3, j=1..3, i+j)    | Nine cells; total 36 in either order            |
| sum(i=0..3, j=0..3, (i+j)²) | Sixteen cells; total 184                        |
| data(4,8,6,5,3)             | Mean 26/5; population variance 74/25; σ ≈ 1.720 |
| data(0,0)                   | Mean 0; variance 0; no nonzero-radius ring      |

The dataset's deviation-square areas are 36/25, 196/25, 16/25, 1/25 and 121/25. Their total is 74/5; dividing by five gives population variance 74/25. Standard deviation returns to the original units. The ring marks a distance scale without assuming a normal distribution. Repeated observations remain separate equal weights. The alternate method uses E[X²]−μ², not sample variance with n−1.

Thing shows an index walker, term blocks that move into a growing Hopper stack, or a mean balance beam. Shape pairs first/last terms, keeps double-sum cells in their ordered grid, or shows deviation-square areas with a common scale. Symbol keeps the same indices and exact values. Code supplies curated Python, R and SQL with bound tokens. Changing row/column order changes the actual walker route; all cells still enter once. Geometric scales adapt to bounded learner edits so wrong constructions remain visible and usable.

Six seeded proof families cover linear terms, squares, Gauss pairing, double sums, mean and variance. Validators check exact individual contributions, the exact included set, a mean pin for data, and the claim. The three-part Boss checks reading, actual construction and an inclusive accumulating Python loop. A correct claim without a correct model earns no proof completion. Fresh seeded Echoes use exact numeric equivalence.

Acceptance covers independent mathjs term/mean/population-variance results, exact rational answers, parser bounds, safe context imports, all text depths and tethers, deterministic timelines, real proof edits, both renderers and offline notelet restoration. Desktop and touch browser tests exercise the largest sixteen-cell and ten-observation scenes against the shared 150-draw-call / 200,000-triangle budgets. Complete-product Lighthouse and physical-phone FPS remain M6 checks.
