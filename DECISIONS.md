# Decisions

- 2026-10-03: This request builds the local repository; deployment remains an optional documented step, with no external backend or runtime requests.
- 2026-10-03: Preserve the complete supplied brief in docs/BRIEF.md so no acceptance detail is lost during condensation.
- 2026-10-03: Use a paper workshop frame with a teal cutting mat, cobalt manipulatives, fine drafting rules, and a single-eyed wordmark.
- 2026-10-03: Draw manipulatives and guides procedurally; photographic or generated bitmap assets would obscure the shared scene grammar.
- 2026-10-03: Pending labs are visibly locked until they meet the lab definition of done.
- 2026-10-03: React exceeds 30 KB gzipped and is required for the component model; Three/R3F/drei will be lazy-loaded for interactive 3D; KaTeX will be lazy-loaded for accessible notation; mathjs will be test-time verification and lazy solver support, keeping all large libraries out of the shell.
- 2026-10-03: Use patched mathjs 15.2 or newer after the dependency audit identified unsafe setters in version 14; no arbitrary user expressions are evaluated.
- 2026-10-03: Compose step movement as an offset from each layer layout; a shared mutable ScenePlayer runs one requestAnimationFrame loop and both renderers subscribe without React frame updates. Local SDF fonts keep 3D labels offline.
 - User extension (2026-10-03): add local authored Philosophy lessons and an equation graphing workspace; retain milestone gates, finish required labs before unlocking them, and prepare the repository for the user's GitHub push.
