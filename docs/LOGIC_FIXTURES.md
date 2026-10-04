# Logic fixtures and acceptance

Variables are p–z, at most four per formula. Negation, conjunction, disjunction, implication and equivalence use ¬ ∧ ∨ → ↔, with ASCII aliases. Uppercase T/F and ⊤/⊥ are constants. Input is capped at 256 characters, 64 tokens, sixteen logical nodes and sixteen nesting levels. Arguments use semicolon-separated premises followed by ⊢ or |-, with at most three premises. Unsupported or oversized input explains its bounds and keeps the current lesson.

Worlds are ordered lexicographically, F before T. These expected values are independent fixtures:

| Input                | True assignments / counter-worlds | Answer        |
| -------------------- | --------------------------------- | ------------- |
| (p → q) ∧ ¬q         | p=F, q=F                          | Contingent    |
| ¬(p ∧ q) ↔ (¬p ∨ ¬q) | Every world                       | Tautology     |
| p ∨ ¬p               | p=F and p=T                       | Tautology     |
| p ∧ ¬p               | None                              | Contradiction |
| p → q; p ⊢ q         | No counter-world                  | Valid         |
| p → q; q ⊢ p         | Counter-world p=F, q=T            | Invalid       |

The six seeded proof families are tautology, contradiction, truth set, counter-world, equivalence and argument validity. Validators require the exact requested distinct world ids and the correct classification. The Boss separately checks classification, counter-world construction and a valid curated SQL predicate. A false premise is never a counterexample to an argument. Echo providers produce a fresh seeded recall task.

The shared scene has wired postorder gates whose displayed values agree with the inspected world. Thing shows lanterns or the circuit; Shape moves assignments into the first two variables' Venn regions; Symbol shows the formula; Code binds variables and intermediate gates to static Python. All assignments remain visible in the table when more than two variables are present. De Morgan's equivalence, tautology and contradiction retain their exact truth sets.

The local gate passed: 351 unit/component tests, independent mathjs Boolean checks, content and bounded-import tests, deterministic scene and budget checks, and 50 production desktop/touch e2e tests. Logic e2e covers Predict seek guarding, gate/Venn layers, both dimensions, actual-world proof checks, all Boss phases, argument counter-worlds and complete notelet restoration after reload. Reviewed circuit screenshots cover 1440 px desktop and 360 px touch layouts. Physical-phone FPS and complete-product Lighthouse remain M6 gates.
