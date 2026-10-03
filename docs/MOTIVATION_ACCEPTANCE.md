# Bounded M3/M4 acceptance checklist

Derived from `docs/BRIEF.md` §§6–10, §§12–15. This is a review plan; unchecked items are not verified. M2 must meet its gate before M3 is committed, and M3 must meet its gate before the full Fractions slice is committed.

## M3: one completed loop before expanding content

- [ ] **Persistent progress:** Watch 5 XP, correct Predict 10 (5 after a hint), Play milestone 5, Prove 25, Boss 100, Echo 8, notelet 3 for the first five that day. Values live in `gameConfig.ts`. Replay/reload/double-click cannot duplicate one completion’s award. Level thresholds follow `100 × L^1.4` cumulative XP.
- [ ] **Gems:** Observe/Play/Prove facets reflect actual events and persist. Mastery requires two successful Echoes on different local dates; two ratings on the same day do not qualify.
- [ ] **Daily rhythm:** Three attainable small daily tasks, a persistent streak and a weekly freeze work across midnight/reload. Missed days and wrong answers use kind copy and never lock learning behind lives or default timers.
- [ ] **SRS:** A pure scheduler with fake-clock tests covers 1/3/7/14-day boxes, Again/Good, due ordering, reload and two distinct-day successes. Missed Predicts become skill micro-challenges with fresh seeds; starred notelets use Reveal → Again/Good recall cards with context.
- [ ] **Real Trophy Shelf:** Procedural trophies in 3D and tiles in 2D distinguish earned and locked achievements. About 24 data-driven achievements can include future-lab goals, but their locked status remains honest until those event sources exist. Hats/skins/toys have a real earn/apply path where offered.
- [ ] **Guide parity:** Moni plus at least two other complete rigs, exactly one eye each, use procedural shapes. Their 2D SVG rigs and small demand-driven 3D canvases match the chosen guide; auto/domain, selected, quiet and off modes persist.
- [ ] **Teaching gaze:** Forward step, seek backward and dial/mode changes keep the eye and spotlight on the actual `Step.gaze` entities. Missing targets have a harmless fallback. Quiet retains cues/icons; off removes the guide and its animation cost.
- [ ] **Guide interaction and dialogue:** Tip/another-method, dock drag plus keyboard alternative, a visible quick-menu action and double-tap fact work. Every dialogue event has ≥3 variants of ≤12 words and ≥8-second cooldown; bubbles are polite live regions. Optional speech starts off. Bond cosmetics reflect actual usage.
- [ ] **Tutorial:** A skippable, replayable sequence demonstrates the live 3/4 pie → dial → tether → hold notelet → summary. Advance on the actual learner action or provide an explicit accessible Next; do not claim success merely because a timer ran. Audio/haptics are offered as optional preferences.
- [ ] **Evidence:** Run check, relevant pure/component tests and one connected desktop/touch/keyboard flow. Reload verifies XP, streak, facets, guide settings and due Echo. A fake clock proves SRS; manual clicking through four boxes does not prove scheduling.

## M4: complete Fractions vertical slice

- [ ] **All required models:** Three same-value shape choices (pie/bar/block stack); common-denominator recuts and merges; subtraction removes parts; multiplication uses overlap area; division uses measuring bars; equivalent cuts conserve area; improper/mixed numbers stack unit wholes.
- [ ] **Six worked families:** Add, subtract, multiply, divide, mixed/improper and simplify. The generic minimum of three worked examples does not omit named fraction operations. Each family has committed Predict, three hints, Quick/Standard/Deep, Why, replay and an actual alternate method. Use `FRACTION_FIXTURES.md` for exact results.
- [ ] **Problem Bar:** Free input/live KaTeX, examples, Surprise me, history and touch keypad route to the correct supported solver. Unsupported/undefined input receives clear guidance and three supported examples while the existing lesson stays usable.
- [ ] **Scene proof:** ≥5 seeded Prove generator families validate manipulated scene state and requested representation, plus a sequential multi-layer Boss. Equal typed answers alone cannot satisfy a build/recut/overlap challenge. Wrong guesses preserve progress and queue fresh Echo practice.
- [ ] **Four-layer contract:** One `SceneSpec` and stable ids power both renderers; the dial continuously morphs concrete parts, labelled cuts, symbols and curated Python Fraction code. Every meaningful token/line tethers to its real counterpart and works by touch/keyboard.
- [ ] **Integration:** Complete Watch → Predict → Play → Prove → Echo using local progress, Fractions dialogue and declared Bridges. A note at a noncentral piece hit survives reload and Jump restores the same problem, step, dial, selection and dimension.
- [ ] **Contributor and budgets:** Document the actual API in `ADD_A_LAB.md` and perform the short contributor exercise. Independent mathjs solver tests, seeded validator tests, content lint and relevant e2e pass. Guard visible cuts before entity allocation, lazy-load the lab, verify offline, and update PLAN/CONTENT_MAP honestly.

## Implementation cautions

1. **Completion identity:** Use one stable completion/event ledger for XP and facets. Render effects, animation frames, replay and component remounts are not completion events. Persist timestamps and event identity together.
2. **Clock rules:** Inject time into SRS logic. Store numeric timestamps plus local calendar-day keys for streaks/daily caps; never derive a local day with a UTC `toISOString().slice(0,10)`. Document whether due scheduling is elapsed hours or local-calendar days.
3. **Gesture priority:** Global hold-anywhere is the stronger contract. Provide a visible guide quick-menu affordance instead of stealing hold for a mascot-only menu. Dock dragging cancels a notelet hold after slop; keyboard movement remains available.
4. **Meaningful guide behavior:** A static eye decorated with a speech bubble does not demonstrate gaze cueing. Use the renderer’s current projected targets; pause offscreen/hidden animation and honour reduced motion.
5. **No synthetic success:** A “Prove” button must run a goal validator; a Boss needs all checkpoints; an Echo needs a due item and a persisted outcome. Do not award badges for opening an unimplemented screen.
6. **Atomic fractions:** `3/4 ÷ 1/8` is `(3/4)/(1/8)`. Keep sign/mixed-number conventions explicit. Mathematical exactness and visual cut-count limits are separate concerns; aggregation must show exact counts honestly.
7. **Context isolation:** Include lab, example/problem and stable step id when deciding which world pins/gaze/selection apply. Step index alone will collide as the next labs share the workshop route.

## Remaining M2 acceptance gaps from read-only review

This is a review snapshot, not the live milestone tracker; use PLAN.md for the latest gate evidence. The implementation addresses the earlier single-draft overwrite, unrelated-pointer click suppression, and local-point projection problems. The following require current acceptance evidence; no source was changed in this review.

### Import validation is incomplete

The initial review found missing consumed context fields and inherited colour keys; a subsequent source read confirms those fields, supported themes, integer step, bounded dial, anchor type/local point and own-property colours are now checked. Keep negative tests for incomplete context, invalid optional display fields, invalid image data and unsupported export versions. Reject the entire invalid import before changing stored notes. Source inspection alone does not verify a complete import/export interaction.

### Carousel keyboard and flat-view navigation need completion

Only the active article has `tabIndex=0`, but every rendered side/back card’s Star button remains tabbable. This exposes invisible controls and defeats roving focus. Arrow navigation changes the active index without moving focus to the new card; in the reduced-motion/Flat strip it also does not scroll that card into view. Verify Tab never lands on hidden/back controls, the announced active item includes its context/text, and Next/End visibly bring the selected card into view in the flat layout. Current simple count tests do not prove these behaviors.

### Required touch/camera evidence is narrower than the claimed surfaces

The surface-matrix e2e uses `page.mouse` for text, empty space, canvas, settings and carousel even in the mobile profile. Only the button flow dispatches touch Pointer Events. The canvas flow checks composer presence but does not assert an unchanged camera. Add real touch/CDP or synthetic primary touch sequences on those surfaces, a pinch-cancel case, and before/after camera-state evidence for a completed stationary hold. Verify edit/double-tap, moving pins and a >5-pin cluster with touch and keyboard as well.

### Targeted follow-up checks before the gate

- [ ] Keyboard opens the summary, selects a specific note, edits/deletes/undoes it, and restores focus after closing.
- [ ] Composer stays visible with a short `visualViewport`/software keyboard, including `offsetTop`; `height − 330` must not put it above the visible area. Test 360 px width plus 200% text size.
- [ ] Settings/summary notes appear only in that screen context. A world pin belongs to its saved lab/problem, beyond matching route and numeric step.
- [ ] Add notelet → tap-to-place on a 3D piece performs a hit-test before capture. Its capture handler currently resets `stageHit` and stops propagation, so renderer pointerdown cannot supply a local hit point in that path.
- [ ] Saved thumbnails are actually displayed in summary/recall cards when available; missing thumbnails have a clear useful context fallback. The optional topic chip can be removed as requested.
- [ ] Hold duration 350–900 ms is configurable, cancellation clears charging/pressed state, normal clicks still work immediately after a hold, and native input long-press remains intact.

## Independent M3 source audit (2026-10-04)

Files were inspected while their owning agents were still implementing M3. No tests were run by this audit and no acceptance box is marked verified.

Observed sound structure:

- Awards use persisted `kind:key` identities; notelet XP counts positive awards by local day.
- `localDay` uses local calendar components; SRS uses local-day addition and deduplicated successful date keys. Echo rating checks that the item is due before rescheduling it.
- `isMastered` requires all three facets plus two distinct Echo days.
- Quiet renders an icon instead of the Three rig; off returns before the active guide component mounts. Normal rigs use demand rendering, and gaze reads renderer-projected entities.
- Progress export contains a plain versioned data object; callback providers live outside that object. This is the correct separation for JSON persistence.

Concrete repair requests sent to the motivation owner:

1. Raw `set(importedValue)` and raw hydration merge permit unvalidated extra JSON keys to replace store methods, even when required fields are valid. Import/hydration must copy only the closed GameData DTO.
2. A huge finite XP value can drive an unbounded level-counting loop. Use bounded/algebraic level calculation and a documented sensible XP limit. A huge finite dueAt is not a valid Date and can crash `toISOString`; validate timestamp ranges, real calendar dates/weeks, unique Echo ids and integer review counts.
3. The storage adapter’s failure notification must be one-shot. Queuing `useGame.setState({unavailable:true})` after every failed persisted write can recursively fail/persist/queue forever. Storage-unavailable mode must remain responsive.

Integration cautions sent to the parent/guide owner:

- Award Watch after the final reveal/checkpoints, not merely mounting a lesson. A subsequent source read confirms the parent added a final-step/unblocked guard; test the real completion flow.
- A Trophy Shelf Apply action must visibly apply the persisted selected cosmetic. A separate bond-only local hat toggle cannot fulfill that action’s effect unless the relationship is explicit.
- Direct tips/facts now claim the same dialogue cooldown; keep a regression test so manual guide taps do not bypass the eight-second event rule.

Focused verification needed after the repairs:

- [ ] Import/hydrate a valid JSON roundtrip; unknown method-like fields cannot replace callbacks.
- [ ] Reject huge XP/timestamps, malformed dates, duplicate Echo ids and malformed schedules without mutating prior progress.
- [ ] Mock throwing localStorage; one award remains usable, one unavailable notification appears and the microtask queue settles.
- [ ] Repeat one completion before/after reload; XP/facets do not duplicate. Six distinct notelets award only the first five that day.
- [ ] Fake-clock SRS tests exercise Again/Good, DST/local midnight and mastery on two genuine dates.
- [ ] Quiet/off stop the Three rig, a gaze cue tracks the real object in both dimensions, and an earned/applied cosmetic changes the visible guide.
