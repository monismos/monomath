# Sets fixtures and acceptance

These fixed expected values are checked independently from the solver. The finite teaching universe is `U = {0,1,2,3,4,5,6,7,8,9}`, with `A = {0,2,4,6,8}`, `B = {1,2,3,4,5}`, `C = {3,6,9}`. Complement always means relative to the displayed U.

| Expression | Expected result |
| --- | --- |
| A ∪ B | {0,1,2,3,4,5,6,8} |
| A ∩ (B ∪ C) | {2,4,6} |
| A ∖ B | {0,6,8} |
| (A ∖ B)ᶜ | {1,2,3,4,5,7,9} |
| A Δ B | {0,1,3,5,6,8} |
| {x ∈ U : x even, x < 10} | {0,2,4,6,8} |
| A ∩ Aᶜ | ∅ |
| A ∪ Aᶜ | U |

The power-set cube must name its exact displayed base set of at most three members. For `{0,2,4}`, its eight nodes are ∅, {0}, {2}, {4}, {0,2}, {0,4}, {2,4}, {0,2,4}. Each edge changes exactly one element. For `{1,2} × {3,4}`, the grid cells are (1,3), (1,4), (2,3), (2,4). A function selects exactly one output per input column; multiple inputs may share an output.

M5 Sets acceptance requires four authored worked examples with Read→Predict→reveal, both methods and three explanation depths, five or more seeded proof families, a Boss, dialogue/Echoes, and declared Bridges. The SQL connection must match the finite-set operations (`UNION`, `INTERSECT`, `EXCEPT`, `WHERE`, `CROSS JOIN`) and be labelled as curated code. Actual selected tokens, memberships, lattice nodes or relation cells feed proof validators.

Venn/Euler, sieve, lattice and product scenes must each work through the shared renderers, at least three dial layers, keyboard/touch/reduced motion and notelet Jump. Drag membership into A/B/both/neither has explicit controls too. Bounds and unsupported grammar produce useful errors; no learner code executes. The gem remains Coming soon until `npm run check`, content/oracle/validator tests, renderer budgets and desktop/touch e2e all pass.
