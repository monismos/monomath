# Add a lab

Use Fractions as the concrete example. Content, exact logic and renderers have separate responsibilities. A small new lab can reuse `Explainer` and finish its first scene in about 30 minutes; unlocking it still requires the full checklist below.

## 1. Pure logic (5 minutes)

Create `src/core/solvers/<topic>.ts`. Implement `Solver<Problem, Solution>` from `core/labs/types.ts`: bounded `parse`, a list of named `methods`, and deterministic `solve`. Return an exact or explicitly approximate answer and typed `Step[]`. Reject unsupported input with useful text. Never execute learner input with `eval`, `Function` or mathjs compilation.

Fractions uses a closed rational parser and BigInt intermediate arithmetic. Graph input instead uses a worker, mathjs AST allowlisting and a numeric interpreter. Choose the smallest safe representation for the topic.

## 2. One scene (8 minutes)

Create `src/labs/<domain>/<topic>/scene.ts`. Return `SceneSpec` with stable entity ids, semantic palette tokens and at least three `layers`. Use the same entities and operations for SVG and Three. Add `tether` to each symbolic entity and bind its token with `\\htmlClass{tk-<token>}{...}` in the step LaTeX. Code identifiers can use the same tokens through `CodeSnippet`.

Every step needs a unique id, title, Quick/Standard/Deep text, `aria`, `ops`, `tethers` and useful `gaze` ids. Begin with a Read step, then ask a Predict before showing its answer. The player renders the previous step until the learner commits a guess or chooses Reveal. A reveal records the checkpoint and awards no prediction XP.

`resolveTimeline(spec, step, localTime, dial)` is the single source of visual truth. Avoid per-frame React state. Keep a scene within 150 draw calls and 200,000 triangles; the renderer batches large groups. Bound entity counts before construction and provide a truthful numeric path for inputs outside the visual envelope.

## 3. A usable lesson (7 minutes)

Create a lazy UI component with `ProblemBar` and `Explainer`. Pass `domain` for the correct guide, `echoSkillId` for topic recall, `onMethod` for the alternate method and `onActivate` for actual piece manipulation. `Explainer` owns the dimension switch, dial, step depths, playback, tethers, guide and noteable stage.

On entry set `useLesson`'s `labId`, `problem`, `step`, `dial` and `selection`. Save any shape, mode, challenge seed and build state as a bounded, validated `variant`. Notelets capture it automatically. Restore the variant before deriving the scene so Jump restores the actual experiment. A richer context may use a versioned DTO, as graphs do.

Keep touch targets at least 44 px where practical; provide explicit controls for every drag action. Leave native text inputs editable and use real labels. Reduced motion skips tweens and always keeps the same state.

## 4. Typed definition and proof (10 minutes for a small example)

Export a `LabDefinition` from `definition.ts` with id/title/domain, prerequisites, Bridges, example inputs, scenes, solver, challenge presets, Predicts, three short lines per mascot event and dial defaults. Fractions exposes `createFractionsDefinition(scenes)` so content does not import renderers.

Add at least five seeded challenge families and a Boss. A challenge's pure `goal(state)` must inspect the state the scene depicts: counts, positions, selections, removals or connections. Checking only a typed answer does not prove a physical task. Keep seeds reproducible. Award `prove` or `boss` only after validation, keyed by challenge id so repeating Check adds no XP. Wrong attempts keep the experiment usable and can queue a fresh skill Echo.

Register an Echo provider at app initialization through a lazy import, so a reload directly into Echoes still finds it. Return a fresh seeded prompt, a safe check, three hints and an explanation. Do not reuse the remembered challenge's answer as a new task.

## Unlock gate

1. At least three worked examples, each with all text depths, narration and a Predict.
2. At least five seeded Prove families plus a Boss, independently tested.
3. Three dial layers and one shared scene in both renderers, with both-direction tethers.
4. Full topic dialogue, declared Bridges and a truthful bounded parser.
5. Desktop, touch, keyboard, reduced motion and notelet Jump tested inside the lab.
6. Solver tests against an independent oracle; content lint checks ids, references and depths.
7. `npm run check` and relevant desktop/mobile Playwright tests pass. Measure scene and bundle budgets.
8. Update `PLAN.md`, `CONTENT_MAP.md`, the route and feature flag; unlock the Monomap gem only now. Commit the completed milestone as `M<n>: <summary>`.

Follow M5's exact lab order. A partially implemented lab remains a locked Coming soon gem; source files can exist before it is exposed.
