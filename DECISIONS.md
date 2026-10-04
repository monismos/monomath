# Decisions

- M4: keep the short welcome demo and expose the full Fractions lab separately; its checkpoints and experiments have their own bounded context.
- M4: use exact rational equivalence for Fractions Try-first; avoid claiming a general symbolic CAS from numerical sampling.
- M4: cap manipulative cut counts at 24 and unit areas at four; large exact inputs keep a truthful numeric explanation, and division counts measuring units instead of original whole pies.
- User workspaces: Philosophy and equations are independent requested additions; an equation plot does not unlock the pending Functions teaching lab.
- Graph parser: mathjs exceeds 30 KB gzip but supplies a maintained AST parser and notation conversion; ship it solely in a lazy local worker, interpret only an allowlisted numeric DTO, and precache it for offline study.
- Philosophy: browser lessons must be exported into the typed source lesson list to travel with a GitHub push; personal reflections stay outside public lesson exports.

- 2026-10-03: This request builds the local repository; deployment remains an optional documented step, with no external backend or runtime requests.
- 2026-10-03: Preserve the complete supplied brief in docs/BRIEF.md so no acceptance detail is lost during condensation.
- 2026-10-03: Use a paper workshop frame with a teal cutting mat, cobalt manipulatives, fine drafting rules, and a single-eyed wordmark.
- 2026-10-03: Draw manipulatives and guides procedurally; photographic or generated bitmap assets would obscure the shared scene grammar.
- 2026-10-03: Pending labs are visibly locked until they meet the lab definition of done.
- 2026-10-03: React exceeds 30 KB gzipped and is required for the component model; Three/R3F/drei will be lazy-loaded for interactive 3D; KaTeX will be lazy-loaded for accessible notation; mathjs will be test-time verification and lazy solver support, keeping all large libraries out of the shell.
- 2026-10-03: Use patched mathjs 15.2 or newer after the dependency audit identified unsafe setters in version 14; no arbitrary user expressions are evaluated.
- 2026-10-03: Compose step movement as an offset from each layer layout; a shared mutable ScenePlayer runs one requestAnimationFrame loop and both renderers subscribe without React frame updates. Local SDF fonts keep 3D labels offline.
- User extension (2026-10-03): add local authored Philosophy lessons and an equation graphing workspace; retain milestone gates, finish required labs before unlocking them, and prepare the repository for the user's GitHub push.
- M3: progress awards have stable completion identities; daily dial tasks are date scoped, while XP stays deduplicated across replay and reload.
- Echoes use local calendar days and preserve local wall-clock hour across DST; Good advances to 3/7/14 days and Again returns to tomorrow.
- M3: completed Predict reveals persist separately from XP, so hinted reveals restore correctly after notelet Jump without awarding credit.
- GitHub Pages uses relative assets, hash routes and an Actions workflow; the user will push and enable Pages in repository settings.
