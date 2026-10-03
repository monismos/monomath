# MONOMATH — MASTER BUILD PROMPT

You are a senior full-stack engineer, creative technologist and game designer. Build **Monomath** end to end in this repository: a gamified, interactive, 3D-first web app (with a first-class 2D mode) that teaches **Mathematics, Logic, Statistics, Physics and Programming** by turning abstract notation into objects the learner can touch, split, stack, scrub and break.

_Mono_ means one. The name is the design rule: **one small set of primitives, one visual grammar, one canvas, one eye** (every mascot has exactly one eye). A fraction, a set, a Σ, a force and a `for` loop should all feel like the same kind of thing wearing different costumes.

---

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

---

## 1. Vision and audience

- **Promise:** "See it, touch it, then read it." Learners meet an idea as a physical object, then watch the notation grow out of it.
- **Audience:** ages 13 and up through first-year university, plus adult learners. The tone is warm, curious and never condescending. Reading level is about grade 8. No unexplained jargon (tap a term to define it).
- **Learner level** (a setting): _Explorer_ (concrete first), _Scholar_ (diagram first), _Researcher_ (symbol first). It sets the default position of the Unfold Dial (§2A) and how much notation is shown.
- **The first screen is a live demo, not a landing page.** On first launch the learner sees one chunky pie on the stage and the Unfold Dial under it. Dragging the dial turns three of the four slices into `3/4`. That moment is the pitch. The Monomap (home) comes right after.

---

## 2. The Monomath Method (the creative core)

### 2.1 The learning loop (every topic)

**Watch → Predict → Play → Prove → Echo**

1. **Watch:** a 20–40 s animated worked example, narrated by a mascot, stoppable at any moment.
2. **Predict:** before each reveal the learner _commits to a guess_ (tap, type, drag or toggle). Only then does the animation play. Wrong guesses are never punished.
3. **Play:** a sandbox with the same manipulatives, sliders and drag handles, with instant feedback.
4. **Prove:** a goal-state challenge verified against the scene's state, for example "Shade exactly 7/8 using three pieces".
5. **Echo:** misses and starred notelets return days later as 20-second spaced-repetition micro-challenges.

### 2.2 Signature mechanics (always on)

**A. The Unfold Dial [MUST].** Every concept lives on four layers: **THING** (clay blocks, pies, lanterns, crates) → **SHAPE** (a labelled diagram) → **SYMBOL** (notation) → **CODE** (a short snippet that computes the same thing). A dial scrubs _continuously_ between layers and the whole scene morphs: labels crossfade into notation and objects slide into new positions. Drag THING → SYMBOL and three pie slices become `3/4`. Drag to CODE and a Σ hopper becomes a `for` loop. The learner watches notation grow out of objects. The default dial position follows the learner level.

**B. Tethers [MUST].** Every symbol that has a visual counterpart is bound to it by a shared colour. Tap or hover a token in the equation and its objects pulse, with a thin beam between the two. Tap an object and its token lights up. In code, tap a line and its machine part lights up.

**C. Bridges [SHOULD].** Cross-domain links, shown as chips on a topic page and dashed edges on the Monomap:

- Σ ↔ `for` loop ↔ `reduce` ↔ SQL `SUM` / R `sum`
- ∀ / ∃ ↔ `all()` / `any()`
- set operations ↔ Python sets ↔ SQL `UNION / INTERSECT / EXCEPT`; set-builder ↔ `WHERE`; Cartesian product ↔ `CROSS JOIN`
- truth tables ↔ logic gates ↔ Boolean code
- matrix product ↔ nested loops ↔ NumPy `@` ↔ R `%*%`
- recursion ↔ induction ↔ the call stack

One structure, many costumes.

**D. One-Eyed Guides [MUST].** Mascots with a single eye. Their gaze is a teaching tool: during a step the eye turns toward the object that matters and a soft spotlight marks it (gaze cueing, §10).

**E. Anchored Notelets [MUST].** Press and hold anywhere to attach a thought to that exact place: scene, step, 3D position, object (§7). The summary carousel (§8) jumps back to it.

**F. Echoes [SHOULD].** Spaced repetition built from the learner's own misses and starred notelets (§9).

**G. The Monomap [MUST].** The home screen is a constellation. Topics are gems, prerequisites are lines, Bridges are dashed, and mastery makes a gem glow. In 3D it is a slowly drifting, tappable constellation where the camera flies to the gem you tap. In 2D it is a flat node map.

---

## 3. Non-negotiables (my explicit asks; each must be demonstrably true at the end)

1. **Gamified and interactive**, usable on **desktop and mobile** (touch, mouse and keyboard), in portrait and landscape.
2. **Simple 3D style** by default wherever WebGL2 is available, plus a first-class **2D mode** the learner can switch to at any time, in one tap, without losing state. 2D is not a fallback afterthought. It is the same lesson drawn flat.
3. **PhotoMath-style explainers:** type or pick a problem and get a tappable step-by-step solution with plain-language reasons, shown as a simple 3D (or 2D) scene.
4. **Press-and-hold anywhere whatsoever** creates a small **notelet**, so the learner can jot a thought related to that spot, anytime.
5. A **summary screen with a simple 3D carousel** listing all notelets for easy access.
6. Domain-native visuals: **summations visualised**, **simple interactive graphs**, **fractions and sets as shapes**, **truth tables and propositions**, **matrices**, and more (§12).
7. **Aesthetic themes** and **interactive side mascots** that support visual learning.
8. **Creative visual approaches for physics and for programming and programming languages** (§12).
9. An offline-capable PWA with no accounts and no tracking. All data stays on the device.

---

## 4. Stack and architecture

**Stack [MUST unless noted]:** Vite + React 18+ + TypeScript (strict) · three + @react-three/fiber + @react-three/drei (lazy-loaded) · zustand · KaTeX · mathjs · idb (IndexedDB) · vite-plugin-pwa · Vitest + Testing Library · Playwright · ESLint + Prettier.

- Styling: CSS Modules plus CSS custom properties for every token. No CSS-in-JS runtime.
- Scene animation: our own tween engine (§5). UI chrome: CSS transitions or the Web Animations API. Add Framer Motion only if you can justify it in `DECISIONS.md`.
- Fonts self-hosted through @fontsource (§11). **No runtime CDN requests.**
- Output is a static site deployable to Vercel, Netlify or GitHub Pages (`npm run build` → `dist/`, with an SPA fallback config for each).
- PWA: precache the app shell, every lab chunk and all fonts so the whole app works offline after the first load.

**Principles**

1. Content is typed TypeScript modules (labs, solvers, challenges, dialogue), not loose JSON.
2. Pure logic (solvers, validators, SRS, the hold-gesture machine, carousel geometry) is separated from rendering and unit-tested.
3. One `SceneSpec` per lab drives both renderers (§5).
4. React never re-renders per animation frame.
5. Feature flags live in `src/config/features.ts`. Brand constants live in `src/config/brand.ts`.

**Layout**

```
monomath/
  AGENTS.md  PLAN.md  DECISIONS.md  README.md
  docs/        BRIEF  DESIGN  ARCHITECTURE  ADD_A_LAB  CONTENT_MAP
  src/
    core/      scene (spec, timeline, tween) · renderers/three · renderers/svg
               solvers · interpreter · gamification · notelets · mascots · themes
               audio · haptics · a11y · perf · storage
    labs/      math · logic · stats · physics · code
    ui/        ProblemBar · StepPanel · StepSheet · UnfoldDial · TopBar · Monomap · Settings · Help
    config/    routes/
  tests/e2e/
```

---

## 5. Dual-render scene engine (the heart of 2D and 3D)

**One description, two renderers.** Each lab describes its visuals once, as a renderer-agnostic `SceneSpec` in 3D coordinates. `ThreeStage` and `SvgStage` both consume the same resolved state, so 2D and 3D never drift apart, and tethers, notelets and mascot gaze behave identically. Toggling the mode keeps the same step, dial position and selection.

```ts
type Vec3 = [number, number, number];
type Layer = 'thing' | 'shape' | 'symbol' | 'code';
type Ease = 'linear' | 'inOut' | 'outCubic' | 'outBack';

interface Entity {
  id: string; // stable across steps, so it can tween and morph
  kind:
    | 'block'
    | 'slice'
    | 'sphere'
    | 'cylinder'
    | 'arrow'
    | 'line'
    | 'plane'
    | 'grid'
    | 'bar'
    | 'lantern'
    | 'crate'
    | 'token'
    | 'label'
    | 'group';
  pos: Vec3;
  rot?: Vec3;
  scale?: Vec3;
  size?: Vec3;
  color: string; // theme token name, never a raw hex
  opacity?: number;
  glow?: number;
  text?: { tex?: string; plain?: string }; // KaTeX or plain label
  layers?: Partial<Record<Layer, Partial<Entity>>>; // per-layer overrides the Unfold Dial interpolates
  tether?: string; // id of the symbolic token it is bound to
  parent?: string;
}

type Op =
  | { t: 'add'; entity: Entity }
  | { t: 'remove'; id: string }
  | { t: 'tween'; id: string; to: Partial<Entity>; ms?: number; ease?: Ease }
  | { t: 'morph'; from: string; to: string } // e.g. a pie slice becomes the numerator token
  | { t: 'pulse'; ids: string[] }
  | { t: 'camera'; focus: string[]; angle?: 'front' | 'iso' | 'top' };

interface Predict {
  kind: 'choice' | 'number' | 'drag' | 'toggle';
  prompt: string;
  options?: string[];
  check: (answer: unknown) => boolean;
  hints: [string, string, string]; // nudge -> hint -> show
}

interface Step {
  id: string;
  title: string;
  latexBefore?: string;
  latexAfter: string; // tokens wrapped as \htmlClass{tk-<id>}{...}
  say: { quick: string; standard: string; deep?: string };
  ops: Op[];
  tethers: { token: string; entities: string[]; color: string }[];
  predict?: Predict;
  gaze?: string[]; // entity ids the mascot looks at
  aria: string; // screen-reader narration of what changed
}
```

**Engine rules**

- A `Timeline` resolves `(spec, stepIndex, localTime, dialT)` into a `ResolvedState` (entity id → props). It is deterministic and seekable: scrubbing and reverse play are exact.
- Interpolated state lives in a plain mutable store updated by one rAF loop. React must not re-render per frame: Three reads the store in `useFrame`, and SVG writes attributes through refs. Use `frameloop="demand"` and invalidate only while something animates, drags or scrubs (this saves battery).
- Use `InstancedMesh` for 50 or more identical entities. Budget on a mid-range phone: at most 150 draw calls and 200k triangles.
- Easing: ease-out-back for snaps, ease-in-out for moves, squash-and-stretch up to 8% on drops. Step transitions run 250–600 ms, are always skippable, and honour a global speed of 0.5×, 1× or 2×.
- **Flatten transition** [MUST: animated crossfade; SHOULD: pixel-aligned]. 3D → 2D tweens the camera to a flat pose (looking straight at the layout plane, FOV shrinking to about 8° with a compensating dolly to fake orthographic), then crossfades into the SVG stage, whose `worldToScreen` uses the same scale and offset. 2D → 3D reverses it. In 2D, `z` becomes painter's order plus a soft drop shadow.
- **Unfold Dial:** `dialT ∈ [0,3]` selects a pair of adjacent layers. Every entity interpolates its `layers` overrides (position, scale, opacity, label), and shape labels crossfade into KaTeX. Entities without overrides stay put.
- **Tethers:** KaTeX tokens carry `tk-<id>` classes through `\htmlClass`. Pass a `trust` function that allows only `\htmlClass` and `\htmlData`, and never render raw user HTML. Hover or tap on either end pulses both and draws a fading SVG beam from the token's DOM rect to the entity's projected screen position, in the step's tether colour.
- **Camera:** damped orbit with clamped polar and azimuth range; one-finger orbit, two-finger pinch and pan, wheel zoom; buttons for Reset view and Flatten. It auto-frames the step's `focus` entities and compensates for UI occlusion (bottom sheet, side panel) so nothing important sits behind chrome.
- **Quality tiers** (auto-detected, overridable): High / Medium / Low / 2D-only, chosen from WebGL2 availability, `hardwareConcurrency`, `deviceMemory` and a 2-second FPS probe. Scale DPR (cap 2), shadows, antialiasing, instance counts and particles. On `webglcontextlost`, fall back to 2D with a friendly toast and a "Try 3D again" action.
- **Text:** 3D text uses SDF text with a **locally hosted** font file passed explicitly (never the library's CDN default). Every 3D label is mirrored in the DOM for accessibility.

---

## 6. The Explainer Player (PhotoMath-style, in simple 3D)

The learner types or picks a problem and gets an animated, step-by-step, tappable solution.

**Layout.** Desktop: the stage plus a right-hand step panel. Mobile: a full-screen stage plus a bottom sheet with three snap points (peek shows the current step in one line, half, full list).

```
DESKTOP
+----------------------------------------------------------------+
| (eye)monomath  [ 3/4 + 1/6 ................. ]   2D | 3D   gear |
+-----------------------------------------+----------------------+
|                                         | ANSWER   11/12       |
|                S T A G E               | -------------------- |
|          3D diorama  /  2D SVG          | 1  Match denominators|
|                                         | 2  Rewrite each part |
|  [mascot dock]                          | 3  Add the tops      |
|                                         | 4  Simplify          |
+-----------------------------------------+----------------------+
| < > play  |--o-------|     THING --o-- SHAPE -- SYMBOL -- CODE  |   (summary orb)
+----------------------------------------------------------------+

MOBILE
+------------------+
| menu  3/4+1/6  gear
|                  |
|      STAGE       |
|  [mascot peek]   |
|  THING --o-- SHAPE
+------------------+   <- bottom sheet (peek / half / full)
| 2  Rewrite...  ^ |
+------------------+
          (summary orb)
```

**Problem Bar [MUST].** Free text with a live KaTeX preview. On touch devices, an on-screen math keypad (digits, fractions, `^`, `√`, Σ, set symbols ∪ ∩ ∈ ⊂, logic symbols ¬ ∧ ∨ → ↔, matrix brackets). An example carousel, a "Surprise me" button and a history. A **Problem Router** detects the domain from the input (a grammar or regex per solver) and opens the right lab, or the learner picks a lab first. Unsupported input gets a friendly mascot message plus the three nearest supported examples. [COULD] Camera or photo input through lazy-loaded on-device OCR feeding the same bar: design the input adapter interface now but do not build OCR in v1.

**Solver contract [MUST]**

```ts
interface Solver<P> {
  id: string;
  domain: 'math' | 'logic' | 'stats' | 'physics' | 'code';
  parse(input: string): P | null; // null = "not mine"
  methods(p: P): { id: string; name: string }[]; // powers "Show another method"
  solve(p: P, method?: string): { answer: string; steps: Step[] };
}
```

- Step logic is hand-authored so it can explain itself. Use `mathjs` for parsing, evaluation and verification, not as the explainer.
- **No runtime AI or LLM calls and no network.**
- Every solver has table-driven unit tests that compare final answers against an independent `mathjs` computation.
- A content-lint test asserts that every `Step` has `quick` and `standard` text, `aria`, and valid entity and token references.

**Step card.** Collapsed: step number, a one-line action ("Make the denominators match"), and the before → after expression with changed tokens boxed in colour. Expanded: a plain-language explanation (depth switch Quick / Standard / Deep), a "Why?" chip that opens a three-sentence concept card read by the mascot, the tethered tokens, and "Replay this step". Tapping a step drives the stage to that step's frame. The stage drives the list in reverse, so scrubbing keeps both in sync.

**Controls.** Prev / Next / Play-Pause, a scrub bar with step ticks, speed 0.5× / 1× / 2×, keyboard (← → and Space), swipe on mobile, and the Unfold Dial directly above the transport.

**Try-first mode [SHOULD].** "Your turn" hides the next step. The learner types the next expression and the engine checks mathematical equivalence (mathjs symbolic simplification of the difference, falling back to numeric sampling), answering ✓ or "not equivalent, here is what changed". It counts as a Predict for XP.

**Predict checkpoints [MUST].** Types: `choice`, `number`, `drag`, `toggle`. The learner commits first and only then does the reveal play. A wrong guess gets a kind mascot reaction and a three-rung hint ladder (nudge → hint → show), and the miss is queued as an Echo.

---

## 7. Notelets: hold anywhere, think anywhere [MUST]

**Gesture.** Press and hold **anywhere in the app** (empty space, the 3D canvas, a button, a card, the carousel, settings) for 500 ms (user setting 350–900 ms) with movement under 10 px (12 px for touch) to drop a notelet at that spot.

- **Implementation:** one global handler on `window` using Pointer Events in the capture phase. Primary pointer only; left button, touch or pen. A small state machine `idle → pressing → charging → armed → composing` lives in `core/notelets/holdGesture.ts` and is unit-tested with fake timers.
- **Feedback:** after 150 ms a radial ring charges under the finger or cursor (SVG stroke-dashoffset, theme accent). The pressed element dips about 2%. A soft haptic tick on completion (`navigator.vibrate` where supported, silently ignored elsewhere) and an optional pop sound. With reduced motion: no animation, just a static "Adding notelet…" label.
- **Cancel** on early release, movement beyond the slop, a second pointer (pinch), `pointercancel`, scroll start, or the tab becoming hidden.
- **Suppress what a long press would otherwise do:** the touch `contextmenu`, the iOS callout (`-webkit-touch-callout: none`), the text-selection magnifier (`user-select: none` everywhere except text inputs and the composer), image drag menus, and double-tap zoom (`touch-action: manipulation`; the 3D canvas uses `touch-action: none`). After a completed hold, swallow the trailing `click` (capture phase, one-shot, 400 ms expiry) so the element under the finger is not activated.
- **Coexistence:** native text inputs, textareas and contenteditable keep their native long-press behaviour. That is the only exclusion, and the fallbacks below cover it. When a hold completes over the 3D canvas, disable camera controls until the pointer is released so the release cannot nudge the camera.
- **Fallbacks:** key `N` creates a notelet at the focused element (or the screen centre). A visible "Add notelet" button in the top bar arms tap-to-place mode. Both appear in the help overlay.
- **Discoverability:** the first-run tutorial asks the learner to hold anywhere, and the help overlay explains it. If no notelet exists after about 3 minutes of use, the mascot offers one gentle reminder (at most once per session).

**Composer.** A small paper-fold card (about 240 × 160 px) opens at the press point, clamped to the visible viewport. Use `visualViewport` so the soft keyboard never covers it; on phones it docks above the keyboard. Auto-focused textarea (500 characters, with a counter), six colour swatches, an optional emoji, and an auto-suggested topic chip (current lab and step, removable). Save with the button or Ctrl/Cmd+Enter, cancel with Esc. The draft is saved on blur so nothing is ever lost. [COULD] voice dictation through the Web Speech API.

**Anchoring (what makes notelets special)**

```ts
interface Notelet {
  id: string;
  text: string;
  color: 'sun' | 'mint' | 'sky' | 'rose' | 'lilac' | 'slate';
  emoji?: string;
  createdAt: number;
  updatedAt: number;
  starred?: boolean;
  echo?: boolean;
  context: {
    route: string;
    screen: string;
    labId?: string;
    stepId?: string;
    dimension: '2d' | '3d';
    dialT?: number;
    theme: string;
  };
  anchor:
    | { type: 'screen'; anchorId?: string; nx: number; ny: number } // DOM anchor or normalised viewport coords
    | { type: 'world'; entityId?: string; p: Vec3; nx: number; ny: number }; // hit on the stage
  thumb?: string; // 160×100 snapshot, best effort
}
```

- Over the 3D stage, raycast to the nearest entity and store `entityId` plus a local-space hit point, so the pin follows the object as it moves. Over the 2D stage, do the same with SVG hit-testing. Over other UI, store the nearest ancestor's `data-anchor-id` (give every panel, card and control one) plus normalised coordinates.
- **Pins** are small colour-coded paper tabs in a fixed DOM overlay, positioned each frame from the anchor (3D anchors are projected; update only pins in the current context). Tap expands, drag moves, double-click or double-tap edits. Delete offers an Undo toast. Cluster pins when more than 5 overlap. A global "Show / hide notelets" toggle, plus a **peek** shortcut (hold `Shift`).
- **Jump to context:** from the carousel, navigate to the route, restore dimension, step and dial, and pulse the anchor for 1.2 s. This must work after a reload.
- **Storage:** IndexedDB through `idb`, with a versioned schema and migrations. Export and import as JSON, export as Markdown, and "Delete all" behind a confirm.
- **Gamification hooks:** a first-notelet achievement, small capped XP (first 5 per day), and starred notelets can become Echoes.

---

## 8. Summary screen: the 3D notelet carousel [MUST]

Opened by a persistent **summary orb** (bottom-right, with a count badge), the `S` key, or the menu. It is a full-screen overlay with a blurred backdrop.

- **Ring carousel:** notelet cards on a rotating ring using CSS 3D (`perspective` about 1200 px, `transform-style: preserve-3d`). Card _i_ of _n_ sits at `rotateY(i·360/n) translateZ(R)` with `R = (cardWidth + gap) / (2·tan(π/n))`, clamped to a sensible minimum for small _n_. The ring rotates by `-activeIndex·360/n`. Cards at the back dim and shrink slightly.
- **Input:** drag or swipe with inertia and a magnetic snap; wheel and trackpad; ← →; Home / End; tap a side card to bring it forward. The active card enlarges and shows the full text, colour, a context chip ("Fractions · Step 3 · 3D"), the mini thumbnail, and actions: **Jump to context**, Edit, Star, Make Echo, Delete (with Undo).
- **Scale:** windowed rendering (at most 15 cards in the DOM near the active index). Beyond about 30 notelets, switch the layout from a ring to a gently rising **helix**.
- **Find:** search, filter chips by domain, colour and starred, and sort by recent / lab / starred. The empty state is an invitation: the mascot shows the hold gesture.
- **Alternate views:** a Grid / List toggle for scanning. Reduced motion, or a "Flat" setting, replaces the ring with a scroll-snap strip. The carousel stays 3D even when the learner chose 2D for the labs, unless Flat is chosen.
- Fully keyboard- and screen-reader-operable: roving tabindex, `aria-roledescription="carousel"`, live announcement of the active card.

---

## 9. Gamification: motivation without manipulation

- **XP** (all values live in `gameConfig.ts` and are tunable): Watch 5, correct Predict 10 (5 after a hint), Play milestones 5, Prove 25, Boss 100, Echo 8, notelet 3 (first 5 per day). Level _L_ needs `100·L^1.4` cumulative XP.
- **Gems:** each topic has a three-facet crystal (Observe · Play · Prove) that fills as the learner does each. "Mastered" also needs two successful Echoes on different days. Gems live on the Monomap.
- **Streaks and a daily quest:** three tiny daily tasks (about 5 minutes in total) and a streak with a weekly freeze. Kind copy, no guilt.
- **No fail states:** no hearts, no lives, no timers by default. A wrong answer leads to the hint ladder. An optional **Speedrun** mode serves the competitive.
- **Challenges are data:** `{ id, prompt, setup, goal: (state) => boolean, hints: [h1, h2, h3], xp }`. The Prove step verifies _the state of the scene_. Prefer **seeded, parameterised challenge generators** over hand-written one-offs, so practice never runs out and Echoes can re-ask with new numbers.
- **Boss puzzles:** one per lab, multi-part, mixing layers (read the symbol, build the shape, then write the code).
- **Echoes (SRS):** Leitner boxes at 1 / 3 / 7 / 14 days. A missed Predict returns as a micro-challenge with fresh parameters. A starred notelet returns as a recall card (context thumbnail and first words; the learner recalls, taps Reveal, then self-rates Again or Good).
- **Collectibles:** about 24 achievements shown as 3D trophies on a **Trophy Shelf** screen (tiles in 2D), plus unlockable themes, mascot skins and hats, and manipulative "toys". Sample achievements: First Hold, Scribe I–III, Dial Master (use all four layers on one topic), Tether Tapper (10 taps), Perfect Prediction ×5, Flatlander (toggle 2D/3D ×5), Bridge Builder (follow 3 Bridges), Bug Squasher, Zero-Hint Boss.
- **Ethics:** no ads, no tracking, no pay-to-anything, no loss-aversion pressure. All progress is local, with export and import.

---

## 10. One-Eyed Guides: interactive side mascots [MUST]

Mascots dock to the side of the screen (draggable, snapping to the left or right edge; on phones a small "peek" sits above the bottom sheet). Every mascot has **exactly one big eye**. It is brand and pedagogy at once: the eye _looks at what matters_.

- **Cast** (a data-driven `MascotConfig`: body primitive, palette, accessory, voice lines): **Moni** (a round-cornered cube bean; the default guide), **Lumi** (a lantern; logic and sets), **Sig** (a stack of blocks; statistics), **Vex** (arrow-headed; physics), **Bit** (a blinking-cursor eye; programming). Ship at least Moni plus two others fully animated. The rest may reuse the same rig.
- **Rendering:** procedural primitives only, no external models. In 3D mode each mascot gets its own small `<Canvas>` (at most 160 px, demand-driven, DPR up to 2). In 2D mode an SVG version of the same rig is used.
- **Behaviour state machine:** idle (breathe, blink, drift-look) · follow (the eye tracks the pointer) · cue (the eye and a soft spotlight go to `Step.gaze` entities) · celebrate / encourage / puzzled / sleepy / curious · speaking.
- **Interactions:** tap = a rotating tip, or "another way to see this" (switches the Unfold layer or the method). Press-hold on the mascot opens a radial quick menu (Hint · Why? · Another way · Formula · Mute). Drag to move. Double-tap = a fun fact for the current topic. A few harmless easter eggs for pokes.
- **Dialogue:** short lines (at most 12 words), warm and varied, from `dialogue/*.ts` with three or more variants per event and a cooldown of at least 8 s. Events: intro, step-enter, hint 1–3, correct, wrong, streak, idle-nudge, first-hold tutorial, level-up. A "Quiet mode" shows icons only. Optional text-to-speech through `speechSynthesis` (default off). Speech bubbles are `aria-live="polite"`.
- **Bond meter:** time spent with a mascot unlocks cosmetic hats and trails.
- **Settings:** choose a mascot, auto-mascot per domain, quiet, or off.

---

## 11. Visual language, themes and voice

**Design process [MUST].** Before any UI code, write `docs/DESIGN.md`: a compact token system (4–6 named hex values, type roles, a layout concept with ASCII wireframes, and principles). Then critique it against the generic defaults below and revise anything that reads like a template rather than a choice made for Monomath. Record what you changed and why.

**Avoid the generic look.** No cream background with a serif and a terracotta accent. No near-black background with a single acid-green accent as the default. No identical rounded cards carrying the same soft grey shadow (vary radius and elevation with hierarchy). No tracked-out ALL-CAPS eyebrow labels above headings. No "A · B · C" meta strings. No accenting a single word in a headline. No numbered markers unless the content really is a sequence (the step list is). No fade-up-on-scroll entrances and no hover effects on every card. Motion that is not triggered by the learner is rare and deliberate: one orchestrated moment (the eye opening on load). Everything else answers the learner's action.

**Visual DNA: a maker's bench.** Ground the look in the subject's own materials: cutting mats, graph paper, Cuisenaire rods, abacus beads, drafting tools.

- **Stage (3D and 2D):** a teal-green self-healing cutting mat with a fine measurement grid and angle ticks. Manipulatives are chunky, matte, rod-coloured blocks, spheres and cylinders with rounded edges and soft contact shadows (three-point lighting plus a hemisphere fill, no textures, no imported models).
- **Boldness lives in the stage and the mascots.** UI chrome stays calm, quiet and highly legible so the diorama is the memorable thing.
- **Wordmark:** `monomath` set in the display face, where the first "o" is an eye that blinks once on load. The favicon is the eye.
- **Type:** _Bricolage Grotesque_ for display, headings and mascot speech. _Atkinson Hyperlegible_ for UI and body, chosen because it keeps 1 / l / I and 0 / O distinct, which matters for maths. _JetBrains Mono_ for code. Maths is set in KaTeX. Keep text lines under 80 characters and set a clear type scale. If a font is unavailable in @fontsource, use the closest equivalent and note it in `DECISIONS.md`.
- **Starting palette (adjust until contrast passes):** Mat `#1F7A6B` · Paper `#F5F7F6` · Ink `#10201C` · Highlight glow `#FFE066`. Domain hues: Math cobalt `#2F6BFF`, Logic amber `#FFB400`, Statistics magenta `#E0449C`, Physics vermilion `#FF5A36`, Code violet `#7B4DFF`.
- **Colour semantics (consistent everywhere):** whole or quantity = the domain hue; part = a lighter tint; result = white with a gold edge; highlight = white outline plus glow; error = coral with a gentle shake. **Never colour alone:** pair colour with shape, pattern or icon (a true lantern is lit and shows ✓; a false one is dark and shows ✕).
- **Motion:** 250–600 ms, ease-out-back snaps, squash-and-stretch up to 8%, confetti only on a Boss win or a level-up. Honour `prefers-reduced-motion` (fades and static states instead).

**Themes [MUST, at least 7].** A `Theme` is CSS custom properties plus a Three palette (background, floor, lights, material tints, fog, optional bloom) plus a mascot skin plus an SFX pack. Switching is instant (300 ms crossfade), persisted, and defaults from `prefers-color-scheme` on first run.

1. **Bench** (default; the mat above)
2. **Mono** (a single hue; meaning carried by lightness and pattern; the namesake theme)
3. **Blueprint** (white hairline art on deep blue, an engineering-drawing feel)
4. **Chalkboard** (slate-green board, chalk-dust particles, a hand-drawn line style)
5. **Neon Grid** (deep indigo with magenta and cyan, synthwave; bloom only on the High quality tier)
6. **Observatory** (deep space, star particles, gold accents)
7. **High Contrast** (WCAG AAA, thicker outlines)
8. [COULD] **Terminal** (green phosphor, for the Code domain)

Every theme must pass WCAG AA for text and UI, and the 3D stage must stay legible in all of them.

**Voice and microcopy.** Plain verbs, sentence case, active voice. A button says exactly what happens ("Save notelet", not "Submit"), and an action keeps the same name through the whole flow ("Save notelet", then the toast "Notelet saved"). Name things by what learners understand. Errors say what went wrong and how to fix it, without apologising. Empty states are invitations to act.

---

## 12. The labs

Each lab is a typed module `LabDefinition { id, title, domain, prerequisites[], bridges[], scenes, solvers[], challenges[], predicts[], mascotScript, dialDefaults }`.

**Lab Definition of Done (applies to every lab):**

1. 2D and 3D come from the same `SceneSpec` (identical entity and step ids).
2. The Unfold Dial works across at least 3 layers.
3. Every visual symbol is tethered.
4. At least 3 worked examples with Quick / Standard / Deep text, each with at least 1 Predict.
5. At least 5 verified Prove challenges (seeded generators) plus 1 Boss.
6. Mascot lines for intro, hints, correct, wrong and idle.
7. Keyboard, touch and reduced-motion variants.
8. Unit tests for solvers and challenge validators.
9. Notelets work inside the lab, in 2D and 3D.
10. Bridges declared.
11. Within the performance budgets of §13.

**Code layer (all labs):** Python by default; JavaScript, R (statistics) and SQL (sets and aggregation) where they fit. These are static, curated, syntax-highlighted snippets using a small lazy-loaded highlighter.

### MATH

**M1 Fractions and parts of a whole [MUST].** Pies, bars and block-stacks of one unit whole (switch the shape; the maths is the same). Cut, slide and merge slices with a snap. Adding and subtracting: slices _re-cut themselves_ into a common denominator (the cut lines animate) before merging. Multiplying: an area model, where the unit square is cut by the two fractions and the overlap is the product. Dividing: "how many fit?" with measuring bars. Equivalent fractions are the same area with different cuts. Improper ↔ mixed is stacking whole pies. Dial: clay pies → labelled areas → `a/b` → a short `Fraction` snippet. Explainers: `3/4 + 1/6`, `5/8 − 1/4`, `2/3 × 3/5`, `3/4 ÷ 1/8`, mixed numbers, simplifying.

**M2 Sets [MUST].** Venn and Euler diagrams as translucent bubbles (spheres in 3D, circles in 2D) holding element tokens. Drag tokens in and out. ∪ ∩ \ ᶜ Δ animate by moving and glowing tokens. Subset is nesting. **Set-builder notation is a sieve:** elements fall through a filter whose holes are the predicate. The **power set is a 3D cube lattice** (the 2³ subsets sit on cube corners, and each edge adds one element). A Cartesian product is a grid plane, a relation is a selection of cells, and a **function is "every column has exactly one point"**. Bridge: SQL, where `WHERE`, `UNION`, `INTERSECT`, `EXCEPT` and `CROSS JOIN` are shown as the same set pictures. Explainers: `A ∪ B`, `A ∩ (B ∪ C)`, `(A \ B)ᶜ`, `{x | x even, x < 10}`.

**M3 Matrices and transformations [MUST].** A matrix is a grid of blocks _and_ a machine that warps space. 2×2 and 3×3 matrices deform a visible lattice and the unit square or cube: the columns show where the basis vectors land, the determinant is the area or volume scale (a negative one flips the square over), and eigenvectors are the directions that only stretch. Multiplication: a row-light sweeps a column, and products spawn and merge into the result cell. Also add, transpose, determinant, a 2×2 inverse, and solving `Ax = b` as intersecting lines or planes. Dial: blocks → lattice → symbols → nested loops / NumPy.

**M4 Functions and graphs [MUST].** Draggable, minimal graphs: axes with a faint grid, parameter sliders (`a·x² + b·x + c`, `sin`, exponentials), tap a point for its coordinates, pinch or scroll to zoom. A **trace ball** rolls along the curve. Slope is the steepness of the hill under the ball, and the tangent line can be dragged. **Riemann rectangles** with an `n` slider thin into the integral (a Bridge to Σ). Roots are where the curve meets the floor, and linear systems are crossings. In 3D, curves are raised ribbons on a graph table, plus `z = f(x, y)` surfaces with a draggable slice plane. Graphs feel 2D-first even in 3D mode. Explainers: `y = 2x + 1`, `x² − 4x + 3 = 0` (by factoring, by completing the square with literal square tiles, and by the formula), `d/dx (3x² + 2x)`, `∫₀³ x² dx`.

**[SHOULD]:** Equations (a balance scale and algebra tiles), number lines and operations, trigonometry (a unit circle whose rolling point draws the sine wave), graph theory (draggable nodes, BFS / DFS as a ripple, Dijkstra as flooding water).

### LOGIC

**L1 Propositional logic: Truth Lanterns [MUST].** Each variable is a switch. Each row of the truth table is a _world_, shown as a grid of lanterns (lit = true, dark = false, plus ✓ / ✕ for colour-blind safety). Connectives are chunky gates that physically combine their inputs, and tapping a row lights its circuit. **Bridge to sets:** the Unfold Dial turns the table into a Venn diagram in which the formula's truth set is the lit region, so a tautology is fully lit, a contradiction is dark, an equivalence is two identical regions, and De Morgan's laws become visible. Also a gate-circuit view and the Boolean expression. Argument validity is a search for a counter-world. Explainers: `(p → q) ∧ ¬q`, `¬(p ∧ q) ≡ ¬p ∨ ¬q`, "is this argument valid?".

**[SHOULD]:** Quantifiers (∀ = every lantern in the room is lit; ∃ = a searchlight finds one), **Induction Dominoes** (the base case is the first push, the inductive step is each domino toppling the next, and a proof by contradiction is a tower that cannot stand), proof stepping-stones (natural deduction as a path across a stream).

### STATISTICS

**S1 Summation Σ: the Hopper [MUST].** Σᵢ₌ₐᵇ f(i) is a machine. An index "walker" steps from a to b. At each stop the term f(i) is built as a block and dropped into a hopper, and the running total is a growing stack with a live counter. In the SYMBOL layer the Σ symbol _is_ that machine; in the CODE layer it is a `for` loop (and R `sum`, SQL `SUM`). Variants: Σ i, Σ i², Gauss's pairing trick (the stack folds onto itself), and double sums as filling a grid row by row versus column by column. Over a dataset: the **mean is the balance point of a seesaw**, **variance is literal squares of the deviations whose areas add up**, and the standard deviation is the radius of a ring around the mean. Explainers: `Σ_{i=1}^{5} (2i+1)`, `Σ i²`, "mean and variance of 4, 8, 6, 5, 3".

**S2 Distributions and the Galton board [MUST].** Balls fall through pegs (a binomial animation, not a rigid-body simulation) and pile into a histogram that grows into the bell curve. Sliders for pegs, bias and ball count. The central limit theorem: dice and coin sums build a histogram live, with the normal curve overlaid. Tap a bar for its probability, and shade P(a ≤ X ≤ b) as an area.

**[SHOULD]:** Data Towers (paste numbers, get towers, with mean / median / mode markers), probability and Bayes (probability trees, and a "1000 people" dot grid so that conditional probability is an area), regression (a best-fit line with _residual squares_ that shrink as the line improves, plus r), confidence intervals (hoops that catch the true-mean pin 95% of the time), hypothesis tests (the p-value as a tail area).

### PHYSICS

_Principle:_ **deterministic, scrubbable simulations.** Use a fixed time step, state snapshots, and analytic formulas wherever possible so the symbolic layer can tether to real values. No black-box physics engine in the explainer labs (a free-play sandbox may use Rapier [COULD]).

**P1 Kinematics: Ghost Trails and Graph Twins [MUST].** A cart or ball moves. **Ghost trails** (stroboscopic copies at equal time intervals) make velocity and acceleration visible as spacing. **Graph twins:** the x–t, v–t and a–t graphs are live-linked to the motion. Scrub any graph and the object moves; drag the object and the graphs redraw; the area under v–t fills as displacement. Sliders for v₀, a and t. Explainers: "A car starts at rest and accelerates at 3 m/s² for 5 s. Find v and x." The chosen kinematic equation is shown visibly (variable cards snap into the formula, and unit-snap shows the units cancelling).

**[SHOULD]:**

- **Forces and vectors:** tap an object and its forces peel off as labelled arrows into an automatic free-body diagram. Drag arrow tips. Tip-to-tail addition shows a ghost parallelogram. An inclined plane resolves into components.
- **Energy as liquid:** kinetic, potential and thermal energy are tanks that pour into each other on a coaster track, and the total-energy line stays level.
- **Waves:** superposition of rope pulses, a ripple tank.
- **Circuits:** a water-flow analogy toggle (voltage is height, current is beads, a resistor is a narrow pipe).
- **Fields:** flowing particles as field lines, and potential as a landscape where a test charge rolls.
- **Optics:** ray bundles through draggable lenses.
- **Unit Snap:** dimensional analysis as connectors that cancel.
- **Sketch-then-Simulate** across physics labs: the learner draws or drags a predicted path or graph first, then the simulation reveals the truth.

### PROGRAMMING

_Principle:_ **show the machine.** Code on the left, the **Mono Machine** on the right, and a glowing program-counter runner moving through both. Every line, token and machine part is tethered.

**C1 Memory, types and control flow: the Workshop [MUST].**

- Variables are **crates** on a shelf, with a name tag, a value, and a **type shown as the lid shape** (round number, flat string, diamond boolean, hexagon list, folder object). Mismatched types visibly do not fit, which makes a type error tangible.
- Assignment is a conveyor delivering a value token.
- **Scope is nested translucent domes.** Leaving a dome pops its crates.
- `if` is a fork with a lever. `for` / `while` is a circular track with a lap-counter lamp. `break` and `continue` are exits.
- **References are ropes** between crates and heap "islands", so aliasing and mutation are visible.
- A **time-travel scrubber** (step in, over and out, back and forward, breakpoints) runs over a recorded execution trace.
- JavaScript is editable and runs in a sandboxed step interpreter inside a Web Worker (a tree-walking interpreter such as JS-Interpreter, or acorn plus a custom evaluator). **Never `eval`.** Cap the steps (for example 5,000) to stop infinite loops, and show friendly error crates.

**C2 Algorithms, recursion and the call stack [MUST].** Arrays are shelves with indices. Sorting is animated bars with a scale-blip per comparison and a live operation counter (bubble, insertion, selection, merge, quick). Binary search halves a lit window. The **call stack is a tower of frame trays** (each shows its locals): recursion grows the tower and unwinding sends return values down it (factorial; Fibonacci as a call tree that grows into a literal tree; Towers of Hanoi). [SHOULD] A Big-O **growth terrain**: run with an `n` slider and watch ops(n) rise as a flat plain, a hill, a ramp or a cliff.

**Rosetta Mode [SHOULD].** The same preset program shown side by side in Python, JavaScript, C, C++ and Java (Rust and Go [COULD]), with **role-coloured tokens** (declaration, assignment, operator, call, control, literal) identical across languages, so dialect differences become visible while the machine view stays the same. Tapping a token in any language lights the same machine part. Only JavaScript is executable in v1; the other languages are curated static snippets for the presets.

**[SHOULD]:**

- **Data structures:** stacks and queues as tubes, linked lists as chains, trees that grow, graphs as constellations with BFS / DFS ripples, hash tables as lockers.
- **Functional pipelines as conveyor belts:** `map` machines transform, `filter` sieves, `reduce` bins collect.
- **Paradigm Lens:** the same task as imperative, functional and object-oriented code (objects as small robots passing messages).
- **Bug Hunt:** the machine runs and the learner taps the first step where the state diverges from what they predicted.
- **Parsons puzzles:** drag the lines into order.
- **Syntax Anatomy:** tap any token for a plain-English definition.
- **Async as a restaurant:** promises are pagers and the event loop is a rotating kitchen pass.

---

## 13. UX, mobile, accessibility, performance

**Mobile [MUST].** Usable from 360 px width in portrait and landscape. `viewport-fit=cover` with `env(safe-area-inset-*)`, `100dvh`, touch targets of at least 44 px, inputs of at least 16 px (no iOS zoom), a bottom sheet with three snap points, thumb-reachable controls, one-finger orbit and two-finger pinch/pan, `overscroll-behavior: none` on the stage, no hover-only functionality, and rotation or resize without losing state.

**Desktop.** A full keyboard map: ← → steps, Space play/pause, `D` toggles 2D/3D, `U` focuses the Unfold Dial (← → adjusts it), `N` notelet, `S` summary, `M` Monomap, `T` theme, `?` help overlay. Shortcuts are disabled while a text field has focus.

**Onboarding (about 45 s, skippable, replayable).** Meet the mascot → drag the Unfold Dial → tap a tether → hold anywhere to make a first notelet → open the summary orb.

**Accessibility [MUST, WCAG 2.2 AA].**

- Everything is operable by keyboard, with visible focus and semantic landmarks.
- `aria-live` narration of each step from `Step.aria`, and a DOM mirror of all 3D labels.
- Never colour-only encoding. Reduced-motion and reduced-transparency support. Text scaling up to 200%.
- Screen-reader-friendly maths (KaTeX with its MathML output).
- A pointer-free alternative for every drag (buttons or keys), plus the hold-gesture fallbacks of §7.

**Performance [MUST].**

- 60 fps on desktop and at least 30 fps on a mid-range phone in the heaviest lab.
- Initial JS of at most 200 KB gzipped. Three, KaTeX and each lab are lazy chunks (target: the Three chunk under 300 KB gz, each lab under 80 KB gz).
- LCP under 2.5 s on 4G mobile for the Monomap shell. No layout thrash. Pause rendering when the tab is hidden.
- Lighthouse mobile: Performance ≥ 80, Accessibility ≥ 95, Best Practices ≥ 95. Installable PWA, fully usable offline after the first load.

**Robustness.** WebGL unavailable or lost → automatic 2D with a toast. Storage unavailable → in-memory mode with a banner. An error boundary per lab. Versioned local data with migrations. Notelet drafts are never lost.

**Sound and haptics.** UI sounds are synthesised with WebAudio (snap, pop, success, tick), with no audio files. Default off, offered during onboarding. Haptics through `navigator.vibrate` where supported.

**Settings screen.** Dimension (Auto / 3D / 2D), theme, mascot (pick / quiet / off), motion (full / reduced), sound and haptics, text size, dock side, carousel style, hold duration, learner level, export / import / reset data, and a Credits page (creator name configurable in `src/config/brand.ts`, default "Airator"). English only in v1, but every string goes through a string table so it is i18n-ready.

**Privacy.** No accounts, no analytics, no third-party requests. Everything stays on the device.

---

## 14. Milestones and acceptance criteria

**M0 Foundation.** Vite + React + TypeScript (strict), ESLint and Prettier, Vitest, Playwright, a CI workflow (typecheck, lint, test, build), `AGENTS.md` / `docs/BRIEF.md` / `PLAN.md` / `DECISIONS.md` / `docs/DESIGN.md`, the theme system with at least 2 themes switching live, a persisted settings store, the app shell and router, the PWA scaffold, the storage layer, the accessibility baseline, and self-hosted fonts. _Accept:_ `npm run check` is green; the app installs and loads offline; theme and settings persist across a reload.

**M1 Dual-render engine.** `SceneSpec` types, the timeline and tween engine, `ThreeStage` and `SvgStage`, the flatten transition, the Unfold Dial, tethers, camera framing, quality tiers, and the Explainer Player UI (desktop panel and mobile sheet) running a "Hello Blocks" demo scene. _Accept:_ toggling 2D/3D mid-step preserves state; the dial morphs; tethers pulse both ways; unit tests prove timeline determinism (seek and reverse are exact); an e2e test covers toggling and stepping; the performance probe works.

**M2 Notelets and the summary carousel.** Everything in §7 and §8. _Accept:_ Playwright tests for a hold over empty space, over a button (no click fires), and over the 3D canvas (the camera does not move), plus a mobile-viewport test. For the desktop, use `page.mouse.down()`, a wait, then `up()`. For touch, use CDP `Input.dispatchTouchEvent` or synthetic PointerEvents. A notelet survives a reload. Jump to context restores dimension, step and dial. The carousel is tested with 1, 2, 7 and 40 notelets. The reduced-motion fallback works. A keyboard-only flow works. Unit tests cover the hold state machine and the carousel geometry.

**M3 Mascots, gamification core and onboarding.** §9 and §10, the Trophy Shelf, Echoes and the first-run tutorial. _Accept:_ XP, streak and gems persist; mascot gaze follows `Step.gaze`; quiet and off modes work; the SRS scheduler is unit-tested with a fake clock.

**M4 Vertical slice: Fractions (the full loop).** The complete M1 lab, including the Problem Bar, solver, Predicts, Prove challenges, Boss, Echoes, mascot script and Bridges. Then write `docs/ADD_A_LAB.md` from that experience. _Accept:_ the Lab Definition of Done is fully met, and a new contributor can add a trivial lab in 30 minutes by following the doc.

**M5 Remaining MUST labs,** in this order: Sets → Propositional logic → Σ Summation → Matrices → Functions and graphs → Distributions / Galton → Kinematics → Memory, types and control flow → Algorithms and recursion. Each meets the Lab Definition of Done before the next begins. Update `PLAN.md` as you go.

**M6 Monomap, Bridges, all themes, polish.** The constellation home (3D) and node map (2D), Bridges, the remaining themes, settings completeness, performance and accessibility passes, the Lighthouse budgets, an offline test, and a final QA sweep.

**M7 SHOULD labs** (most impactful first), then COULDs.

---

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
