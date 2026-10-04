# Monomath design

Summation extends the maker bench with a magenta index walker, amber term blocks and a white accumulator stack. Dataset views use a literal balance beam and scaled square tiles; their labels carry exact values and units. Compact term controls sit below the shared stage, with large touch targets and no floating dashboard cards. Pairing, grid order and variance views respond to learner controls. Every geometric scale is shared within the scene so area and height comparisons stay truthful.

## Visual thesis

A learner's maker bench: quiet paper tools around a vivid, tactile cutting mat. The scene is the first screen and the main activity. The identity is an open eye, not a generic education dashboard.

## Compact tokens

Paper `#F5F7F6`; Ink `#10201C`; Mat `#1F7A6B`; Cobalt `#2F6BFF`; Glow `#FFE066`; Rule `#D7DEDA`.
Domain accents are semantic extensions: amber logic, magenta statistics, vermilion physics, violet code. All meaning also uses labels, patterns, or symbols.

Typography: Bricolage Grotesque for the wordmark and headings; Atkinson Hyperlegible for readable controls and body; JetBrains Mono for code. Body 16px; controls 14px; secondary text 12px; display 32–44px. All fonts are locally bundled. Comfortable line length is 65 characters.

## Desktop layout

```
+-----------------+---------------------------------------------------+
| eye monomath    | breadcrumb                 local XP  theme gear    |
|                +---------------------------------------------------+
| Workshop       | Fractions                         2D / 3D           |
| Monomap        | [editable problem........................] Solve    |
| Notelets       +--------------------------------+------------------+
| Trophy shelf   | teal cutting mat               | worked steps     |
|                | chunky physical pieces         | reasoning depth  |
| Domain gems    | pointer + token tethers         | predict / prove  |
|                | one-eyed guide                 |                  |
|                +--------------------------------+------------------+
| local progress | thing —— shape —— symbol —— code                  |
| help / prefs   | previous   play   seek   next              note orb |
+-----------------+---------------------------------------------------+
```

The sidebar is a tool rail, the stage has the largest area, and the step panel resembles a notebook with fine rules. The bench uses measurement ticks and material shadows rather than decorative cards.

## Mobile layout

```
+--------------------------------+
| eye monomath     map  2D/3D gear |
| fraction title and problem bar  |
|                                |
|      touchable cutting mat      |
|   one-eyed guide / hint         |
|                                |
| thing —— shape —— symbol —— code|
| previous     play      next     |
| step sheet: peek / half / full  |
+--------------------------------+
```

Controls are at least 44px. The sidebar becomes a drawer. The step panel uses three snap heights. Every drag also has buttons or keyboard controls.

## Hierarchy and material

The shell is flat with thin borders. Only the stage and active paper notelets carry shadows. Buttons have 8px corners, notebook panels 12px, stage 18px; no repeated floating rounded cards. Display text is dark and unaccented. The stage grid supports measurement, with low visual contrast behind the objects.

## Motion and interaction

Only the eye opens on arrival. Other movement responds to play, drag, dial, step, or mascot interaction. Durations are 250–600ms with reduced-motion support. Hover and focus reveal actual tethers; they do not arbitrarily lift cards. 2D and 3D consume the same coordinates and share state.

## Critique and revisions

Rejected a cream/serif/terracotta aesthetic because it implies a reading site. Replaced it with cool paper and readable grotesques. Rejected a near-black neon dashboard because it competes with the objects. Replaced identical shadow cards with a flat tool rail, ruled notebook, and elevated mat. Rejected spaced uppercase eyebrows and generic hero copy: the first screen is a functioning fraction scene. Numbers appear only on sequential solution steps. Domain colour lives primarily in manipulatives and small labelled gem marks.

## Secondary themes

Mono, Blueprint, Chalkboard, Neon Grid, Observatory, and High Contrast retain the geometry and hierarchy. Contrast is checked separately from appearance. A theme never changes scene semantics.

## Matrices bench

A paper matrix editor sits beside the established workbench. Cell buttons reveal the row and column that produce them. The lattice and unit square/cube deform by the same column images, with orientation described in words and arrows. The shape layer reveals basis coordinates; the symbol layer keeps those tethers; the code layer connects nested loops or NumPy. Proofs edit the actual output matrix or basis coordinates using full-size controls below the stage. Avoid a dashboard of decorative charts: each visible cell and vector represents a calculated or learner-entered value. Controls remain legible at 360 px, with no drag-only requirement.

## Functions: a graph table, not a dashboard

Keep the existing green workbench and one learner question per scene. Curves use a single raised ribbon shared by SVG and Three, with faint labelled axes, a trace ball and an adjustable tangent. Signed Riemann rectangles stay attached to their sampled heights. A surface and its highlighted slice share the same coordinate table. Completing the square uses actual removed strips and restored corner tiles, with signed area labels. The dial moves concrete coordinates into the diagram, equation and Python, while controls below remain thumb reachable. Avoid crowded endpoint captions; exact coordinates and approximation labels live beside the controls. General equations stay in the existing worker workspace; this lab explains a closed finite teaching subset.
