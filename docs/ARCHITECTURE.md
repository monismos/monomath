# Monomath architecture

The app is static. Hash routes work under a GitHub Pages repository path. Vite bundles local fonts and a service worker precaches every shipped lazy chunk. No account, server or runtime external request is needed.

## Scene and learning state

`core/scene/spec.ts` is the renderer-neutral contract. A typed `SceneSpec` owns stable entities, steps, operations, tethers and four-layer overrides. `resolveTimeline` deterministically calculates the visual frame from the step, local time and dial. Layer position overrides are offsets, so animation movement survives a dial change.

`ScenePlayer` owns one mutable state and a cancellable animation loop. React updates on learner actions, not each frame. Three reads the stable entities in `useFrame`; SVG writes transforms and opacity through element refs. Both publish screen projections and local-point projectors for tethers, anchored notes and teaching gaze.

`useLesson` holds the current problem, lab, step, dial and selection. `Explainer` adds the transport, notebook, mobile sheet and Predict gate. A reveal checkpoint persists in the progress action ledger; a reload or a notelet Jump can restore a previously revealed frame. Watch credit requires every unblocked step to have been viewed, while replay cannot duplicate an award.

## Local persistence

Settings and the validated version-one progress DTO use localStorage through Zustand. Notelets and individual drafts use IndexedDB through `idb`, with a memory fallback and a visible storage warning. The composer waits for note persistence and draft deletion before closing. Imports validate the complete consumed context before mutation. Raw JSON never replaces store methods.

The global capture-phase Pointer Event handler owns hold detection. Native editable inputs are excluded. Its fake-clock-tested state machine charges after 150 ms, completes at the configured duration, cancels on movement or interruption, and suppresses one trailing click. Tap-to-place lets stage hit-testing finish before capture. World anchors store a point local to the hit object; DOM anchors use stable attributes and normalized viewport coordinates.

## Motivation and guides

The award ledger gives each learning completion a stable identity. Pure logic owns XP, daily caps, local-calendar streaks, facets and achievement conditions. Echo schedules use local-calendar days; Good advances through 1/3/7/14-day Leitner intervals and Again returns to tomorrow. Mastery requires two successful recall dates. Skill providers generate a fresh challenge from a saved seed; a provider that does not exist stays explicitly pending.

The guide cast shares one procedural pose model in SVG and a small demand-driven Three canvas. It reads projected teaching targets, tracks the pointer, and offers a visible quick menu. Notelet hold remains available over the guide. Quiet retains cues, Off removes the rig, and speech starts only from an explicit action.

## Adding modules

Finished labs will be registered as lazy typed modules. They must supply solvers, scene proof validators, worked examples, Predicts, Bridges, dialogue and tests. `docs/ADD_A_LAB.md` will document the verified Fractions experience. The graphing and authored Philosophy extensions remain tracked in `PLAN.md`; `docs/EQUATION_WORKSPACE.md` specifies the numeric graphing design.
