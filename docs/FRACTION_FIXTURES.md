# Independent Fractions acceptance fixtures

These are expected outcomes for M4, not claims that the implementation passes. The nontrivial binary results below were independently checked with reduced BigInt numerator/denominator arithmetic. Solver tests should also compare with mathjs using parenthesized rational operands, independent of the authored explanation steps.

## Exact arithmetic

Compare canonical rational values, not formatted strings. A whole-number answer has denominator 1 internally; zero normalizes to `0/1`; denominators are positive and numerator/denominator gcd is 1. Display may use an improper or mixed form when the lesson calls for it.

| Skill | Input | Exact result | Scene/content check |
| --- | --- | --- | --- |
| Add | `3/4 + 1/6` | `11/12` | Recut to 12ths; 9 selected parts plus 2. |
| Add | `1/6 + 1/3` | `1/2` | `1/6 + 2/6 = 3/6`, then simplify. |
| Add | `1/2 + 1/2` | `1` | One complete unit, not two larger “halves”. |
| Add improper result | `7/8 + 5/12` | `31/24 = 1 7/24` | Preserve unit size while adding a second whole. |
| Add signed operands | `−2/3 + 1/6` | `−1/2` | Sign has a label/position meaning, beyond colour. |
| Add mixed operands | `1 1/2 + 2 2/3` | `25/6 = 4 1/6` | Convert to `3/2 + 8/3`, preserving whole units. |
| Subtract | `5/8 − 1/4` | `3/8` | Remove two eighths from five. |
| Subtract below zero | `1/3 − 2/3` | `−1/3` | Explain a signed difference; do not clamp to zero. |
| Subtract equal parts | `1/2 − 1/2` | `0` | Empty result with the whole outline retained. |
| Subtract signed operands | `−1/4 − 1/2` | `−3/4` | Negative quantity increases in magnitude. |
| Subtract mixed operands | `2 1/3 − 1 5/6` | `1/2` | `14/6 − 11/6 = 3/6`. |
| Multiply | `2/3 × 3/5` | `2/5` | 3×5 area grid, six overlap cells out of 15. |
| Multiply signed operands | `−3/4 × 2/3` | `−1/2` | Area magnitude and signed result agree. |
| Multiply two negatives | `−2/5 × −15/8` | `3/4` | Positive sign plus exact cancellation. |
| Multiply by zero | `7/3 × 0` | `0` | Empty overlap and explicit zero result. |
| Multiply mixed operands | `1 1/2 × 2 2/3` | `4` | `3/2 × 8/3 = 4`, four unit wholes. |
| Divide | `3/4 ÷ 1/8` | `6` | Six eighth-length measuring bars fit. |
| Divide by a whole | `1/2 ÷ 2` | `1/4` | Halve the dividend; do not return 1. |
| Divide with partial fit | `2/3 ÷ 4/5` | `5/6` | One partial measuring unit; integer fit-count alone is insufficient. |
| Divide signed operands | `−3/4 ÷ 1/2` | `−3/2 = −1 1/2` | Signed count and magnitude are explicit. |
| Divide by a negative | `1/2 ÷ −3/4` | `−2/3` | The divisor’s sign must not be discarded. |
| Divide mixed operands | `2 1/4 ÷ 1 1/2` | `3/2 = 1 1/2` | `9/4 ÷ 3/2`; preserve atomic fraction operands. |
| Divide zero by nonzero | `0 ÷ 7/8` | `0` | Valid empty dividend, no error. |
| Whole input | `2 + 3/4` | `11/4 = 2 3/4` | Integer is internally `2/1`. |

## Mixed/improper and simplify

| Input or conversion | Expected result | Required invariant |
| --- | --- | --- |
| `7/4` → mixed | `1 3/4` | Four quarters fill one whole; three remain. |
| `9/4` → mixed | `2 1/4` | Two complete wholes, each with four quarter cuts. |
| `8/4` → mixed | `2` | No trailing zero fractional part. |
| `1 3/4` → improper | `7/4` | Whole contributes four quarters. |
| `−1 1/2` → improper | `−3/2` | Leading minus applies to the entire mixed number. |
| `−7/4` → mixed | `−1 3/4` | Means `−(1 + 3/4)`, never `−1 + 3/4`. |
| Simplify `12/18` | `2/3` | Area stays fixed; group cells by gcd 6. |
| Simplify `18/12` | `3/2 = 1 1/2` | Simplification and mixed conversion remain separate operations. |
| Simplify `−6/8` | `−3/4` | Positive denominator, sign preserved. |
| Simplify `0/9` | `0` | Canonical `0/1`; do not divide by zero while calculating gcd. |
| Simplify `11/12` | `11/12` | Already reduced; explanation says why no change is needed. |
| Normalize `−2/−4` | `1/2` | If signed denominators are supported, two signs cancel. Otherwise reject this syntax clearly. |
| Normalize `2/−4` | `−1/2` | If signed denominators are supported, move the sign to the numerator. |

## Parser and failure fixtures

- `3/4 ÷ 1/8` is `(3/4)/(1/8)`, not left-associated `3/4/1/8`. Use explicit parentheses in the independent mathjs expression. Prefer `÷` for the keypad’s binary division operation.
- Equivalent keyboard forms: spaces around operators; ASCII `-`, `*`; Unicode `−`, `×`, `÷`; and mixed-number spacing. Either support an ASCII slash as binary division with a defined grammar or show an unambiguous supported example.
- `1/0`, `2/3 ÷ 0`, and `0 ÷ 0` give friendly undefined-operation feedback and leave the current scene intact. Never produce NaN/Infinity entities or a result of zero.
- Empty input, `3/`, `1/2 +`, unknown identifiers, repeated operators, unmatched brackets and unsupported expressions must not silently solve a nearby preset.
- A denominator must be a nonzero integer. Reject malformed fraction literals and unsupported excessive input lengths before expensive work. Record the actual accepted grammar and numeric limits.
- Simplification/normalization must not rely on floating-point equality: `1/3 + 1/6` equals `1/2` exactly. Try-first accepts `22/24` for `11/12`, but a challenge requesting lowest terms additionally requires gcd 1.

## Seeded challenge invariants

Run each generator for fixed seeds `0`, `1`, `42` and `4294967295`, plus a small spread of generated seeds. A seed and skill version reproduce the same setup and solution. A new seed can change operands without changing the skill. Each generated setup must be solvable from its actual inventory; generation is bounded and cannot loop indefinitely trying to find suitable denominators.

| Challenge family | Reference goal | What the validator must inspect |
| --- | --- | --- |
| Build a quantity | `7/8` using exactly three pieces: `1/2 + 1/4 + 1/8`. | Exact sum, requested piece count, distinct ids, equal unit scale, no overlap and pieces genuinely present in inventory. |
| Equivalent cuts | Show `3/4` as eighths. | Eight equal cuts and six selected; `3/4` typed into an input or an unchanged quarter picture is insufficient. |
| Recut/add | Build `1/3 + 1/4 = 7/12`. | Shared valid denominator, conserved input areas, seven non-overlapping result twelfths and the same whole scale. |
| Remove | Start with `7/8`, remove `1/2`, leave `3/8`. | Four eighths removed from the original selection, three remain; constructing an unrelated 3/8 result does not pass. |
| Multiply area | `3/4 × 2/3 = 1/2`. | 4×3 unit grid; first factor covers nine cells, second eight, intersection six; factor axes and overlap agree. |
| Divide by measurement | `5/6 ÷ 1/6 = 5`. | Five complete measuring bars with no gap/overlap and an exact divisor length. Include a partial-fit solver fixture separately. |
| Improper/mixed | Arrange `9/4 = 2 1/4`. | Two complete unit wholes plus one selected quarter, rather than a stretched 9/4 “whole”. |
| Simplify | Group `12/18` into `2/3`. | Conserved area, three equal resulting groups with two selected, gcd 1 for lowest terms. |

Reject nearly solved states: duplicate/removed piece ids, an extra selected cell, overlap, wrong cut count, a whole scaled differently, unsimplified output when lowest terms are required, and mismatched code tokens. Validation must produce the same result in 2D and 3D.

The Boss has distinct checkpoints: read the operands, make common cuts, assemble the exact result, then choose/build the matching curated Python `Fraction` expression. Award completion only after all checkpoints pass; rerunning a checkpoint cannot duplicate XP. Missed Predicts produce fresh seeded Echo parameters and persist their due dates.

## Finite rendering limits and decision to record

Keep the exact value separate from the number of visible pieces. Validate bounds **before** allocating arrays, grids, geometries, meshes or challenge inventories; simplifying afterward is too late for inputs such as `1/1000000`.

Recommended initial visual envelope:

- Seeded practice denominators 2–12; addition/subtraction lcm ≤24; multiplication grid ≤36 cells.
- Show at most 24 individual cuts per whole and four individual whole outlines. Use readable pies up to 12 cuts; bars/grids can carry larger cut counts.
- Limit uninstanced drawable meshes to 40, with a total resolved scene-entity cap of 96 including labels and grouped objects. Use `InstancedMesh` for ≥50 identical visible entities; count actual draw calls including shadows and the guide, staying below the brief’s 150 draw-call/200k-triangle ceiling.
- For large quotient counts, show a bounded set of measuring bars plus an exact count badge; do not instantiate one bar per unit of the answer.
- For larger typed fractions, use a truthful aggregate view: a bounded number of grouped parts with explicit counts and the exact fraction, or a clearly labelled continuous-area view. Say “Individual cuts are grouped” when individual cuts are not shown. Keep selection and validators rational/state based.
- If the current renderer cannot show a supported value accurately with aggregation, reject that visual case clearly and offer supported nearby examples. Never approximate the answer, silently clamp the denominator or mark an unfinished operation complete.

Suggested `DECISIONS.md` entry: “Fractions retain exact rational values, while the stage caps visible cuts/wholes and groups larger values with explicit counts; this protects mobile rendering and readability at the cost of showing every individual part.” Record the concrete supported input bounds separately from these visual caps.

Acceptance stress cases: `1/997 + 1/991 = 1988/988027`, `1/1000000`, `1000000 ÷ 1/1000 = 1000000000`, and a very long malformed input. Each must take a documented bounded path—an exact grouped result or clear rejection—with no huge entity array, frozen UI or loss of the current lesson.
