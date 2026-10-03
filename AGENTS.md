## 0. Working agreement (read first)

1. Work autonomously. Do not ask me questions: decide, record the decision in `DECISIONS.md` (one line each), and continue.
2. First actions, in this order: (a) create `AGENTS.md` containing §0 and §15 verbatim; (b) create `docs/BRIEF.md`, a faithful condensed copy of this whole brief; (c) create `PLAN.md`, a checklist of every milestone (§14) and every lab (§12) with a status, and keep it current; (d) write `docs/DESIGN.md` (§11) before any UI code.
3. Build strictly in the milestone order of §14. A milestone is done only when `npm run check` (typecheck + lint + unit tests + build) passes and its acceptance criteria are met. Then commit as `M<n>: <summary>`.
4. Priority tags: **[MUST]**, **[SHOULD]**, **[COULD]**. Never trade a MUST for a SHOULD. Cut COULDs first.
5. Nothing fake: no lorem ipsum, no dead buttons, no stubs presented as features. An unfinished lab appears only as a locked "Coming soon" gem on the Monomap.
6. Everything must run on Windows, macOS and Linux: cross-platform npm scripts only, no bash-only commands.
7. Stay lean: lazy-load labs, Three.js and KaTeX; tree-shake; justify in `DECISIONS.md` any dependency over 30 KB gzipped.
8. When two options are equal, pick the one that is simpler for the learner and simpler to maintain.
9. If you run out of budget mid-milestone, leave the repo green and write the exact next actions into `PLAN.md`.
10. After each milestone print: what was done, how to run it, what is next.


## 15. Quality gates, docs and final checklist

**Scripts:** `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `e2e`, and `check` (= typecheck + lint + test + build).

**Tests**
- Unit: solvers against independent mathjs results, challenge validators, timeline determinism, the hold-gesture machine, the SRS scheduler, carousel geometry.
- Component tests for the key UI.
- Playwright e2e on desktop Chromium and a mobile emulation profile (touch).
- A content-lint test over every lab (all text depths present, `aria` present, valid ids).

**Docs:** `README.md` (what and why, run, build, deploy to Vercel / Netlify / GitHub Pages, and an architecture diagram in Mermaid), `docs/ARCHITECTURE.md`, `docs/ADD_A_LAB.md`, `DECISIONS.md`, and `CONTENT_MAP.md` (every lab, its status and its Bridges).

**Never:** backends, logins, trackers, runtime CDNs, `eval`, `dangerouslySetInnerHTML` (except sanitised KaTeX output), copyrighted characters or assets, autoplaying audio, colour-only meaning, dead UI.

**Final self-review before you declare done.** Verify each item and report pass or fail:

1. Press-and-hold works on empty space, a button, text, the 3D canvas, the carousel and settings, on desktop and touch, with no accidental click, menu or text selection.
2. Pins persist after a reload, and Jump to context restores everything.
3. The summary carousel rotates in 3D, snaps and filters, and the reduced-motion fallback works.
4. The 2D ⇄ 3D toggle works in every lab without losing the step, the dial or the selection.
5. The Unfold Dial morphs in every lab, and tethers work in both directions.
6. PhotoMath-style steps: Quick / Standard / Deep text, "Why?", "Show another method", Try-first.
7. Gamification persists, there are no fail states, and Echoes schedule correctly.
8. Mascots: gaze cue, quiet, off, per-domain, and a 2D version.
9. At least 7 themes, all legible, with High Contrast passing AAA.
10. Mobile at 360 px and desktop at 1440 px are both polished; offline works; budgets are met; zero console errors or warnings.
11. `docs/DESIGN.md` records the critique against the generic defaults.
12. All MUST labs meet the Lab Definition of Done, and `PLAN.md` and `CONTENT_MAP.md` are accurate.

Then output a final report: what exists, how to run it, known gaps, and the next three best improvements.

**Begin now with M0.**
