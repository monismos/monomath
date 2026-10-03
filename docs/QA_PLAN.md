# Acceptance audit and Fractions vertical slice

This is a proposed verification plan derived from `AGENTS.md` and `docs/BRIEF.md`. A listed test is not evidence that it has passed. Keep milestone status in `PLAN.md`; attach commands and observed results there before committing a milestone.

## Gate rules

- Build M0 → M1 → M2 → M3 → M4 in that order. `npm run check` must pass for each milestone, alongside its acceptance tests. Build success alone does not prove UI, offline, accessibility, or performance acceptance.
- Run Playwright against the production preview when verifying service workers, cached chunks and offline operation. A development server is insufficient for that evidence.
- Exercise desktop Chromium at 1440 px and a touch profile at 360 px. Add portrait → landscape resize and 200% text scaling. Record unavailable browser/device checks as unverified.
- Fail tests on unexpected browser `pageerror`, console errors or warnings, and third-party network requests. Allow only deliberately handled, asserted failure-path messages.
- Use fake clocks for timers, gestures, SRS and daily XP limits. Use fixed seeds for challenges and repeat tests with boundary seeds.
- Pure logic tests check independent outcomes and invariants. Component tests verify the learner-visible interaction; e2e verifies connected flows. Avoid testing an implementation with a duplicate of that implementation.

## M0 — Foundation

| Acceptance case                     | Required observation                                                                                                                                                 |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh install and production launch | Every required npm script exists; strict typecheck, lint, unit tests and build pass; manifest, icon and service worker are served with correct content types.        |
| Live theme change                   | Both initial themes change DOM tokens and scene palette; readable selected/disabled/focus states; no restart required.                                               |
| Settings persistence                | Change theme, dimension and text size, reload, and observe the same values. First-run defaults respect the system theme without replacing stored preferences.        |
| Storage unavailable                 | Simulated IndexedDB open/write failure leaves the lesson usable in memory and displays a clear banner; no uncaught rejection.                                        |
| Version migration                   | A fixture from the previous schema upgrades without losing settings or notelet drafts; malformed imported data is rejected before mutation.                          |
| Offline shell                       | Visit production once, wait for service-worker readiness, reload offline, and use the shell with fonts present. Also test a direct route and an update/reload cycle. |
| Local assets and privacy            | Font requests, icons and all executable assets resolve locally. No runtime CDN, trackers, remote API, account or analytics requests.                                 |
| Accessibility baseline              | Semantic landmarks, labelled controls, visible keyboard focus, skip link, no colour-only status, ≥44 px touch targets and ≥16 px mobile inputs.                      |
| Cross-platform automation           | npm scripts use Node/npm tool CLIs; CI invokes the same public scripts. Avoid shell-specific copying, deleting or environment syntax.                                |

## M1 — Dual-render engine

### Deterministic logic

- Resolve the same `(spec, step, localTime, dial)` twice and compare deeply. Resolve frames out of order, then compare with forward resolution. Seeking backward must not retain entities added in a later step.
- Test time 0, just before an operation, exactly on its boundary, and the final frame. Test zero-duration ops, remove/add of a stable id, overlapping tweens and replay.
- Interpolate every numeric field and opacity at dial 0, 0.5, 1, 1.5, 2, 2.5 and 3. Discrete text/content swaps must be defined and identical in both renderers.
- Verify all entity ids are unique, parents exist, tether targets exist and token ids are valid. Labels and entities must use theme token names.
- Clock-based progress respects 0.5×, 1× and 2×; pause and a hidden tab do not advance simulation time unexpectedly.

### Connected UI

- Toggle 3D → 2D → 3D halfway through a step: preserve step id, exact local time, dial, selected entity, problem state and paused/playing state. Do the same during a drag and after resize.
- Flatten crossfade is visible and obeys reduced motion. Preserve the scene’s scale and centre so object positions do not jump during the transition.
- Select a token with keyboard or touch: its actual visual objects highlight and the beam reaches the token. Select the object: the token highlights. Shared colour also has outline/pattern/text meaning.
- Dial changes geometry and labels continuously; the CODE layer is a curated program for the same example, with line-to-object tethers.
- Step clicks and scrubber movement update the scene and current card in both directions. Prev/Next, replay, pause, speed and mobile sheet snap positions are functional.
- Auto-frame focuses the current step outside the desktop panel/mobile sheet. Camera reset, orbit, wheel/pinch zoom and keyboard alternatives work.
- Force WebGL2 unavailable, force context loss, and retry: a friendly 2D fallback preserves lesson state. Quality override is persisted; the two-second performance probe makes an observable choice.
- Confirm demand rendering settles while idle, pauses when hidden and does not trigger React renders every frame. A DOM mirror supplies every 3D label.

## M2 — Notelets and summary

### Hold state machine boundary cases

Default completion is 500 ms, configurable 350–900 ms. Feedback starts at 150 ms. Test early release at threshold minus 1 ms, completion exactly at the threshold, and completion with a held pointer beyond the threshold; each successful hold opens one composer only.

- Mouse accepts only primary left button. Touch and pen accept one primary pointer. Right click, secondary pointer and non-primary pen do not create a notelet.
- Movement under 10 px (mouse/pen) or 12 px (touch) allows completion; movement at and beyond the specified boundary has one documented rule and matching tests.
- Early release, movement over slop, pinch, `pointercancel`, scroll and document-hidden cancel charging without click suppression leaking into a later normal click.
- After success, the following click on the original target is swallowed once; an unrelated later click works. The 400 ms expiry cannot leave controls disabled.
- Text input, textarea and contenteditable preserve native long-press behavior; `N` and Add notelet → tap-to-place are available alternatives.

### Mandatory surface matrix

Test empty space, button, text, 3D canvas, SVG entity, carousel, settings and mascot, using real `mouse.down`/`up` and mobile CDP touch or Pointer Events. Observe one notelet; no button activation, camera drift, menu, selected text, image drag, double-tap zoom or accidental scroll. Global hold-anywhere is the stronger contract; a mascot quick menu should have a distinct visible action if it conflicts.

### Composer, anchors and persistence

- Clamp the composer at all four corners and against a changing `visualViewport` when the software keyboard appears; textarea remains visible at 360 px.
- Accept 0/1/500 characters with clear behavior; block excess content without destroying existing text. Save, Ctrl/Cmd+Enter, Esc, blur draft recovery and reload draft recovery behave consistently.
- Save both a UI anchor and a scene entity anchor. Move an entity, resize and switch dimension; the pin follows the stable entity id/local hit location.
- Reload and Jump: restore route, problem parameters, step, local time, dimension, dial, selection and theme where saved. Handle a removed entity/step gracefully by using the normalized fallback anchor.
- Edit, move, star, Make Echo, hide/show, Shift peek, delete and Undo all persist correctly. Cluster more than five overlapping pins without hiding access to any note.
- Export JSON and Markdown, import a valid export, reject invalid versions/oversized or malformed input without losing data, and confirm Delete all. Verify text is always rendered safely.

### Carousel edge cases

- Counts 0, 1, 2, 7 and 40 never produce NaN, infinite transforms or invisible active cards. `tan(π/n)` needs explicit handling for 0/1/2; do not rely on the ring formula there.
- At 40 notes, the helix/window has at most 15 rendered cards, but every item remains reachable. Keys, Home/End, wheel, swipe, side-card tap and drag snap agree on the active id.
- Filtering/searching/sorting preserve a valid active item. Deleting the active, last or only item updates focus sensibly. Duplicate timestamps have a stable tie-breaker.
- Reduced motion and Flat use a usable scroll-snap strip; Grid/List also work. `aria-roledescription`, roving tabindex and polite active-note announcement are present. Opening and closing restores focus.

## M3 — Mascots, progress and onboarding

- Each guide has exactly one eye; Moni and at least two others have complete rigs. 2D and 3D refer to the same gaze target. Off removes the guide; quiet keeps helpful icons without speech bubbles or speech synthesis.
- `Step.gaze` switches target at the right step, including when seeking backward. Missing targets fall back harmlessly. Dialogue has ≥3 variants per event, ≤12 words per line and an eight-second cooldown.
- Watch/Predict/Play/Prove/Boss/Echo award the configured XP once per completion identity. Replaying, refreshing or double-clicking must not farm the same completion. Notelet XP stops after five creations per local calendar day.
- Wrong answers do not remove XP, block access or introduce hearts/timers; the three-rung hint path stays available. Hints reduce correct-Predict XP as configured.
- Gem Observe/Play/Prove facets persist. Mastery needs two successful Echoes on distinct local days, not two clicks on one day.
- Fake-clock SRS verifies boxes at 1/3/7/14 days, Again reset, Good advancement, due ordering, reload and timezone/date boundaries. Use the learner’s local calendar rule for streaks and daily caps; test midnight and daylight-saving transitions.
- Trophy Shelf displays earned/unearned states accurately. First Hold, Dial Master, Tether Tapper and Flatlander derive from actual events and survive reload.
- Tutorial is skippable, replayable and keyboard/touch usable; each instruction corresponds to a functioning action. First screen is the interactive 3/4 pie, not a marketing page. Sound and speech start off.

## M4 — Exact Fractions scope

Use exact rational state for learning and challenge validation. A selected piece should identify its whole, denominator/cut, numerator contribution and occupied interval/cells. Appearance is derived from state; validators must not infer a quantity from pixels or accept a typed answer while the scene is wrong.

Normalize fractions to a positive denominator and divide by gcd. Reject zero denominator and division by zero before solving. Preserve the original input as context, but use canonical rational values for equality. Test signs, zero, improper results and unsimplified equivalents. Document supported input limits, and handle unsupported syntax with three nearest supported examples.

### Required worked examples and scene transformations

The three-example minimum does not remove the explicit fraction-operation requirements. Ship the following six families, each with complete Quick/Standard/Deep text, Why, replay, ≥1 committed Predict, tethered notation, narration and the CODE layer.

| Family and exact result   | Concrete scene and required steps                                                                                                                                         | Predict before reveal                                                                                             | Real alternate method                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `3/4 + 1/6 = 11/12`       | Same-size unit wholes; quarters become 12ths (`9/12`), sixths become 12ths (`2/12`); slide 9+2 equal slices into the result; demonstrate gcd 1.                           | “How many equal pieces should one whole use?” → 12; allow 24 as a valid common denominator when phrased that way. | Product denominator 24: `18/24 + 4/24 = 22/24 = 11/12`; show the extra cuts and subsequent grouping.     |
| `5/8 − 1/4 = 3/8`         | Cut the quarter into two eighths; remove two of five selected eighths; keep the unit outline visible.                                                                     | “How many eighths is 1/4?” → 2.                                                                                   | Remove one quarter region from a 5/8 bar, then count the three remaining eighths.                        |
| `2/3 × 3/5 = 2/5`         | One unit square split into 3 columns and 5 rows; two columns and three rows form six overlapping cells; `6/15` regroups into `2/5`.                                       | “How many of the 15 cells overlap?” → 6.                                                                          | Cancel-first: `(2×3)/(3×5) = 2/5`; explicitly show the matching factor 3, not cross-cancelling addition. |
| `3/4 ÷ 1/8 = 6`           | Three-quarter measuring bar; tile it with six one-eighth bars; quotient is the count of fits, not a smaller shaded area.                                                  | “How many 1/8 lengths fit?” → 6.                                                                                  | Reciprocal multiplication: `3/4 × 8/1 = 24/4 = 6`, tied back to how many eighths make a whole.           |
| `7/4 = 1 3/4` and inverse | Stack seven quarter pieces; four fill one pie, three fill the second; maintain each whole’s four cuts. Reverse combines one whole and three quarters into seven quarters. | “How many complete wholes can we fill?” → 1.                                                                      | Integer quotient/remainder: `7 = 1×4 + 3`; inverse `1×4 + 3 = 7`.                                        |
| `12/18 = 2/3`             | Eighteen equal cells with twelve selected; group adjacent cells in sixes into three larger equal parts, two selected; shaded area never changes.                          | “What size groups divide both counts?” → 6; smaller valid factors may make a partial simplification.              | Euclidean gcd: `18 = 1×12 + 6`, `12 = 2×6`; divide top and bottom by 6.                                  |

Pies, bars and block stacks are three shape choices for the same unit and selected rational value. Switching shapes must preserve values, selected pieces, notes, step and dial. Multiplication uses the mandated area model and division the mandated measurement model rather than reusing a generic pile of blocks for every operation.

### Continuous dial and tether mapping

THING is the chunky pie/bar/block object; SHAPE adds equal-cut outlines and labels; SYMBOL forms the numerator/denominator/operator/result; CODE reveals a curated Python `fractions.Fraction` computation. Intermediate dial positions interpolate layout/opacity rather than jumping between screens. Preserve entity ids across recuts with parent/group ids or an explicit deterministic morph mapping.

- Numerator ↔ selected pieces; denominator ↔ all equal cuts within one whole; operator ↔ recut/merge/overlap/measure mechanism; result ↔ assembled area or quotient count.
- Multiplication’s two factors tether to different axis strips, and product tethers to overlap cells. Division’s divisor tethers to the measuring unit, not the entire dividend.
- Equivalent fractions must keep the same total area and whole size while the cut count changes. Improper fractions need multiple whole outlines; never silently stretch one whole to fit.
- CODE line ↔ the same visual operands and result. Snippets are explanatory static content, locally highlighted, and do not run `eval`.

### Example explanation depth

For the addition recut step, concrete complete copy can be:

- Quick: “Cut both wholes into 12 equal pieces.”
- Standard: “Quarters and sixths have different piece sizes. Twelve is a multiple of both 4 and 6, so we can recut both wholes into twelfths.”
- Deep: “The unit whole stays the same. Each quarter becomes three twelfths and each sixth becomes two twelfths, so multiplying both numerator and denominator preserves each fraction’s area.”
- Why concept card: “A denominator names the size of each equal part. Addition counts parts of the same size. Recutting changes the number of parts while keeping their total area.”
- `aria`: “Each whole now has twelve equal parts. Nine parts are selected on the first whole and two on the second.”

Use the same per-step completeness for all families. Generic repeated explanations do not meet the depth requirement.

### Seeded Prove generators

Use at least five families; six are recommended to cover the operations. Seed generation must produce bounded, solvable scene setups and a stable replay identity. Test valid solved state, almost-solved state, wrong whole size, overlap, duplicate piece, invalid denominator and a changed seed. Validate exact rational state independently of display mode.

| Family              | Example verified goal                                      | Validator invariant                                                                                                                                         |
| ------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build a part        | “Shade exactly 7/8 using three pieces”: `1/2 + 1/4 + 1/8`. | Three distinct non-overlapping selected pieces from the same unit sum exactly to 7/8. If requiring specific piece count, equal total alone is insufficient. |
| Equivalent cuts     | “Show 3/4 using eighths.”                                  | Whole has eight equal cuts, six selected, exact area 3/4. A 3-of-4 picture is equal but does not satisfy the requested representation.                      |
| Recuts and addition | “Build 1/3 + 1/4 and merge the result.”                    | Both inputs are recut into a shared valid denominator; merged non-overlapping result is 7/12; original unit scale is retained.                              |
| Remove a part       | “Start with 7/8 and remove 1/2.”                           | Exactly 4/8 removed from the original 7/8; 3/8 remains. Do not accept a newly typed 3/8 without the removal state.                                          |
| Overlap product     | “Build the area of 3/4 × 2/3.”                             | A 4×3 unit grid has nine cells in the first factor, eight in the second and six in their intersection; overlap is 6/12 = 1/2.                               |
| Measure / regroup   | “Tile 5/6 with 1/6 bars,” or “Arrange 9/4 as mixed pies.”  | Five exact fit bars with no gap/overlap, or two complete unit pies and one quarter; check the requested representation as well as rational equality.        |

Parameter bounds should favor understandable denominators (for example 2–12, lcm ≤24 for recuts, grid cells ≤36) without presenting a visual cap as a mathematical limitation. If a typed supported problem exceeds the visual budget, provide accurate grouped pieces and an explicit count, or document/reject that input honestly.

### Boss and Echo loop

Boss: “Read 3/4 + 1/6; make equal cuts; assemble 11/12; complete the Python Fraction expression.” Validate three sequential scene/code-choice states: correct common cuts, exact assembled value, then the matching curated code tokens. Merely picking `11/12` once does not complete a multi-layer Boss. Wrong attempts keep progress and expose the hint ladder; Boss XP is awarded once.

Each missed Predict queues an Echo with the same skill and fresh seeded operands, not a duplicate answer. Starred notelets can become recall cards. Test fresh numbers, due-date persistence, Again/Good, and two different-day successes needed for mastery.

Declare Bridges to division/ratios, probability, area/multiplication and Python exact arithmetic. Links to unbuilt labs visibly identify Coming soon and do not open a stub.

### M4 solver and content test matrix

- Compare exact results with independent mathjs evaluation for a bounded table and generated cases. Cover `3/4+1/6`, Unicode minus/multiply/divide, whitespace, whole numbers, mixed numbers, zero numerator, negative operands, zero denominator, division by zero, repeated operators, incomplete input and unsupported syntax. Treat fraction literals as operands: `3/4 ÷ 1/8` means `(3/4)/(1/8)`, not left-associated `3/4/1/8`; normalize the independent mathjs expression accordingly. Document how `/` is used for fraction literals versus division, and prefer `÷` for an unambiguous operation in the keypad.
- Important arithmetic cases: `1/2+1/2=1`, `1/3−2/3=−1/3`, `0×7/8=0`, `1/2÷2=1/4`, `2/3÷4/5=5/6`, `8/4=2`, `0/9=0`, `−2/−4=1/2` if signed denominators are accepted. Never silently return an unrelated preset result.
- All alternate methods produce equal answers and distinct meaningful step sequences; their Predict checks match the selected method.
- Content lint traverses every example and every method: Quick/Standard/Deep present, `aria` nonempty, valid unique step ids, valid entity ids, resolvable tethers/gaze, ≥1 Predict per example, three hints and required dialogue events.
- Try-first accepts exact equivalents such as `22/24` for `11/12`, distinguishes wrong transformations, and excludes undefined expressions rather than accepting coincidental numeric samples.
- Complete Watch → Predict → Play → Prove → Echo in 2D and 3D, touch and keyboard. Note during the overlap step, reload, Jump, and observe restored operands/dial/selection. Confirm live KaTeX preview, example picker, Surprise me, history, math keypad, friendly unsupported input and the three recommendations.
- `docs/ADD_A_LAB.md` should describe the actual exported types and folders. Follow it in a temporary fixture to register a small lab, run content lint and render both modes; record the elapsed contributor exercise before asserting the 30-minute criterion.

## Evidence checklist before an M4 claim

- [ ] M0–M3 remain green; each earlier acceptance result is recorded.
- [ ] Six fraction families and three shape choices are functional.
- [ ] Complete per-step content, committed Predicts, Why and alternate methods.
- [ ] At least five seeded scene validators and a multi-layer Boss.
- [ ] Correct local XP, Echoes, mascot dialogue and Bridges.
- [ ] Same `SceneSpec` renders in 2D/3D with bidirectional tethers and continuous dial.
- [ ] Mouse, touch, keyboard and reduced-motion flows verified.
- [ ] Notes survive reload and restore the full fraction problem context.
- [ ] Solver, content lint, component/e2e checks and build pass.
- [ ] Initial JS ≤200 KB gzip, lab chunk target <80 KB gzip, heavy dependencies lazy; offline lab works after first visit.
- [ ] No unexpected console output; contributor lab exercise and accurate PLAN/CONTENT_MAP recorded.
