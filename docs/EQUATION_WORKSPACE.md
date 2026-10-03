# Equation workspace: bounded, local and truthful

This describes a graph workspace for learner-entered equations. It does not claim that a general plotter can produce hand-authored proofs or solve every equation. The supported real-valued grammar, current plotting window and sampling limits are visible to the learner. A supported expression produces a graph, surface or precise constant/empty-result explanation; unsupported input gets an actionable reason and supported examples.

## Evidence from the installed parser

The repository has mathjs **15.2.0**, verified in `node_modules/mathjs/package.json`. Local Node probes with its public `parse` API produced:

| Input | Installed parser result | Consequence |
| --- | --- | --- |
| `y = sin(x)` | `AssignmentNode` | Equality must be separated from assignment execution. |
| `x^2 + y^2 = 4` | Throws “Invalid left hand side of assignment operator =” | Passing a complete implicit equation directly to `parse/evaluate` will fail. |
| `z = x^2 + y^2` | `AssignmentNode` | Surface classification happens before numeric interpretation. |
| `y == sin(x)` | `OperatorNode` with `fn: equal` | Boolean comparison is not a numeric residual. |
| `2x` | `OperatorNode` with `fn: multiply`, implicit multiplication | Preserve the parser’s operator semantics rather than rewriting this with ad hoc string replacement. |
| `ln(x)` | `FunctionNode` with SymbolNode `fn: ln` | A successfully parsed function is not automatically supported or defined. |
| `f(x)=x^2` | `FunctionAssignmentNode` | User-defined executable functions are outside the first workspace grammar. |
| `a; b` | `BlockNode` | Reject statements and multi-expression programs. |

The installed `types/index.d.ts` and `lib/esm/expression/node` sources expose ConstantNode.value, SymbolNode.name, OperatorNode.fn/args/implicit, FunctionNode.fn/args and ParenthesisNode.content. FunctionNode can hold an AccessorNode as its callee; checking only its display name is insufficient.

## Pipeline

```text
Problem Bar / authored equation block
  → bounded lexical normalization + equation classifier
  → mathjs parse of each expression side
  → recursive AST allowlist + real-domain validation
  → small serializable numeric AST
  → local Worker: bounded numeric interpretation and sampling
  → shared GraphSpec + result diagnostics
  → SVG graph / Three graph table or surface
```

Use mathjs for parsing and notation conversion. Interpret the approved AST with a fixed numeric operator/function table. Do not call JavaScript `eval`, `new Function`, mathjs `evaluate/compile` on raw input, a persistent mathjs Parser, runtime imports named by the expression, or a network service. Parsing alone must never write to a scope or create a function.

The AST worker is shipped locally and lazy-loaded with the workspace; precache its parser/worker/render chunks for offline use. Do not add another expression parser or full symbolic CAS merely to draw these plots. Measure the mathjs chunk and keep it outside initial shell JS.

## Classification and supported outcomes

A small lexical scanner tracks brackets and accepts exactly one top-level `=` (or normalized `==`). Parse the left and right sides independently. Reject chained/nested equalities, assignment statements, semicolon blocks and blank sides. Normalize Unicode minus, multiplication, division and π deliberately; retain the source for display. Do not silently turn an inequality into equality.

| Form | Classification | Output |
| --- | --- | --- |
| `y = f(x, parameters)` or `f(x, parameters) = y` | Explicit 2D | One sampled curve on labelled x/y axes. RHS cannot depend on y or z. |
| Bare `sin(x)` / `a*x^2+b*x+c` | Explicit 2D shorthand | Clearly state the interpretation `y = …`. |
| `x^2+y^2=4`, `y^2=x`, `x=2`, `x^2=4` | Implicit 2D | Zero contour of `F(x,y) = left − right`; `x=2` is a vertical line and `x^2=4` gives two vertical solution lines. |
| `z = f(x,y,parameters)` or reversed | Surface 3D | Sampled height surface over an x/y grid. RHS cannot depend on z. A function of x alone is a surface constant along y. |
| Bare expression containing x and y | Surface shorthand, or explicit mode choice | Show “Interpreted as z = …” before rendering, and offer Curve / Relation / Surface selection when interpretation could surprise the learner. |
| `y=2` / bare `2` | Constant explicit function | A horizontal line, plus value 2. |
| `z=2` | Constant surface | A plane at height 2. |
| `2=2` | Constant true relation | Explain “Every point in this view satisfies the equation”; do not invent a zero curve. |
| `2=3` | Constant false relation | Explain “No points satisfy this equation.” |
| `sqrt(-1)` | Outside real domain | Clear “This has no real value” feedback; no fabricated real graph. |

If a nonconstant implicit plot finds no contour, say “No contour was found in this window,” with controls to change the window/detail. Finite sampling is not proof that no real solution exists. A parsed constant expression is evaluated once; a constant relation is handled without constructing a full grid.

For constant equalities, basic literal arithmetic can use exact rational comparison (including decimal literals). Other constant expressions should report approximate numeric agreement within a documented tolerance, rather than asserting an exact identity from floating-point subtraction. Include `0.1+0.2=0.3` and `sin(pi)=0` in these precision tests.

General implicit 3D equations such as `x^2+y^2+z^2=1` require an isosurface method and are explicitly unsupported in this first workspace. Do not render them as a height function or call them solved.

## Numeric AST contract

Allow only:

- Finite real numeric ConstantNode; parentheses.
- Axis symbols appropriate to the classified mode, approved parameter names, and constants `pi`/`e`.
- Unary `+`/`−`, binary `+`, `−`, `*`, `/`, `^`. Check OperatorNode.fn, argument count and operand types; do not accept all operators merely because the node type is approved.
- Direct SymbolNode calls from a fixed table: `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sqrt`, `abs`, `exp`, `log`, `log10`, `floor`, `ceil`, `min`, `max`. Define arities explicitly. Treat `ln` as a documented natural-log alias; define `log(x)` as natural log and, if offered, `log(x,b)` with b>0 and b≠1. Angles are radians unless a visible global angle setting changes the evaluator consistently.

Reject Accessor/Index/Array/Object/Range/Block/Assignment/FunctionAssignment/Conditional/Relational nodes, dynamic callees, units, strings, complex values, factorial, bitwise/logical operators, aggregates, mutation, random functions, unknown functions and reserved/prototype names. These are explicit unsupported cases, not successful empty graphs. Inequality regions, parametric curves, integrals, derivatives, matrices and arbitrary custom functions can be later adapters with separate validators.

Return `{valid:true,value:number}` or `{valid:false,reason}` for each sample. Division by zero, negative square-root input, nonpositive log input, invalid inverse-trig input, overflow and nonreal powers return invalid samples. `0^0` has a stated workspace convention or is rejected; do not leave it accidental. Preserve domain exclusions from the original AST even if an algebraic rewrite would cancel them.

Recommended parser guards: source ≤1,024 characters, ≤128 AST nodes, nesting/depth ≤24, ≤4 free parameters, finite numeric literals, finite viewport bounds and a nonzero finite viewport span. Apply cheap length/bracket guards before parser work; parse in the worker and enforce a request deadline so malformed deep input cannot block the UI.

## Discontinuities and asymptotes

For explicit curves, begin with 256 intervals and adaptively sample midpoints where curvature, jumps or domain guards need detail. Store multiple polyline segments: invalid regions create gaps, not points with y=0. Clip finite offscreen coordinates without connecting across a hidden pole.

Carry domain guards alongside the numeric AST. Before connecting two samples, check whether a denominator can cross zero, a log/sqrt argument crosses its domain boundary, or tan’s argument can cross `π/2 + kπ`. Use conservative interval checks for simple/affine subexpressions and bounded refinement elsewhere. `tan(π/2)` may return a huge finite number from floating-point arithmetic; Number.isFinite alone cannot detect that pole.

Required regression examples:

- `y=1/x`: two branches and a gap at x=0; never a vertical joining stroke.
- `y=tan(x)`: separate branches around poles.
- `y=(x^2-1)/(x-1)`: keep the excluded point at x=1; cancelling factors must not heal the hole.
- `y=sqrt(x)` and `y=log(x)`: only real-domain samples.
- `y=abs(x)`: continuous corner; any displayed slope is approximate and does not claim differentiability at zero.
- `y=floor(x)`: a step discontinuity is not joined by a sloping segment; use jumps/gaps or an explicit step renderer.
- `y=sin(1000*x)`: bounded sampling and a visible resolution notice when detail cannot be resolved. Do not claim a finite sample proves the exact oscillation structure.

Heuristic jump/curvature detection alone cannot prove continuity for an arbitrary expression. State that graphs are sampled, and expose exhausted-detail diagnostics. The workspace must preserve truthful gaps for known poles and never imply a sampled graph is a complete analytic proof.

## Implicit contours

Use marching squares on a fixed grid of finite residual samples, with deterministic tie rules for exact zeros and a centre/asymptotic-decider check for saddle cells. Refine/interpolate edge candidates within the shared evaluation budget. Mask cells with invalid domain samples or detected singularities; re-evaluate candidate contour points and reject false crossings caused by a pole.

This last check is essential for `1/x-y=0`: opposite signs across x=0 must not create a false vertical contour. Preserve known domain guards even when all four corner samples are finite.

Even-multiplicity roots can have no sign change: `(x^2+y^2-1)^2=0` may be missed by plain marching squares. A small proven rewrite `(g)^n=0 → g=0` for positive integer n can recover this case while retaining original domain guards. Otherwise show the sampling limitation. Isolated roots, very small loops and identically zero sampled fields need separate diagnostics; do not label a few zero samples “all points” unless the expression is proven constant/identically zero by a supported rule.

## Surface sampling and shared geometry

For z=f(x,y), evaluate a bounded height grid and build one BufferGeometry; never create a React component/mesh per sample. Omit triangles whose vertices/domain probes are invalid or straddle a known discontinuity. Clamp the visible height range with a clear clipping indication; retain the unclipped numeric value for an inspected point.

One renderer-independent `GraphSpec` carries axes, viewport, separate curve/contour segments, sampled vertices/indices, domain masks, parameters, labels and diagnostics. SVG consumes its 2D data; Three renders curve ribbons on a graph table or its surface mesh. A first-class 2D surface mode can show labelled contours/heatmap and a selected slice through the same sampled grid—do not silently replace a surface with an unrelated curve.

Extend the scene description with typed polyline/surface geometry rather than representing a graph as thousands of `sphere` entities. Selection, trace position, dimension and parameters live outside renderer instances. An axis coordinate readout and accessible point table/summary mirror the geometry. Curve/surface note anchors use stable graph id plus domain x or (x,y) coordinates, not a transient mesh triangle/vertex index.

## Parameters and interaction

Collect free scalar SymbolNodes only after excluding axis/constants and FunctionNode callees. In `y=a*x^2+b*x+c`, a/b/c become three labelled sliders; sin is a function name, never a slider. Unknown function `foo(x)` is rejected rather than treated as multiplication or a parameter.

Default new parameter values are 1, with a sensible finite slider range such as −5…5 and step 0.1; polynomial presets can supply a=1,b=0,c=0. Offer numeric input, Reset and keyboard operation. Limit the number of sliders to four, and require min<max plus finite values if ranges are editable.

Debounce typed input (about 200–250 ms) and coalesce parameter sampling requests (≤20–30 Hz). Assign every worker job a generation id; newer input cancels/replaces stale work and stale responses cannot replace the visible graph. Preserve the last valid graph while showing invalid-input guidance. Pan/zoom, inspect a point, Reset view, mode toggle and resize keep the same input and parameter values.

For authored lessons, store an equation block as versioned data: source, selected interpretation, parameter presets/ranges, viewport, optional prompts and graph id. Imported lessons run through the same parser/validator; they cannot embed executable callbacks or remote scripts. Personal lessons stay local and can export/import JSON suitable for keeping in a GitHub repository.

## Finite budgets

Use hard cumulative caps, including refinement and domain probes:

| Work | Starting budget | Hard cap / behavior |
| --- | --- | --- |
| Explicit curve | 256 intervals | ≤2,048 evaluations and ≤2,048 retained points per curve; max refinement depth 8. |
| Overlay series | One by default | ≤3 curves, ≤6,144 total explicit evaluations; labelled independently. |
| Implicit contour | 64×64 cells; low quality 32×32 | ≤20,000 total evaluations, ≤4,096 contour segments; increase detail only within caps. |
| Surface | 64×64 cells; low 32×32 | High tier at most 96×96 cells: 9,409 vertices and 18,432 triangles before masking; one mesh. |
| Request work | Parse once, reuse numeric AST | ≤128 nodes/evaluation, ≤2 million interpreted node visits/request, worker deadline about 500 ms with friendly detail feedback. |
| Geometry/upload | Shared typed buffers | Reuse/dispose buffers; remain within whole-scene 150 draw calls / 200k triangles, including guides/shadows. |

These are starting engineering limits to measure, not claims that all phones meet timing. If the evaluation/node/vertex cap is exhausted, report sampled detail limits and keep controls responsive. A slow expression is cancelled and leaves the last valid graph intact. Count all render work, not only the graph mesh. The parser and graph renderer must remain lazy chunks; the PWA must include those chunks for offline use after caching.

Suggested decision to record: “The equation workspace supports a visible real-valued AST grammar and finite sampled curves/contours/height surfaces; it preserves exact input and domain exclusions while reporting unsupported forms or unresolved detail rather than promising a general solver.”

## Acceptance checklist

- [ ] Equation classification handles y=f(x), reversed equality, implicit circle/parabola/vertical lines, z=f(x,y), bare-expression shorthand and constant true/false relations with clear outcomes.
- [ ] AST tests reject statements, assignments, accessors, dynamic calls, unknown functions, units, complex values, over-depth/over-length input and unsupported inequality/implicit-3D forms before execution.
- [ ] Numeric tests compare approved operations against independent mathjs results at finite real test points; function arities, radians, log convention and power/domain rules are explicit.
- [ ] Known poles/domain boundaries create honest gaps, including 1/x, tan, cancelled-factor holes, sqrt/log and implicit 1/x−y=0. No NaN/Infinity reaches geometry buffers.
- [ ] Contour fixtures cover a circle, x*y=0 saddle, vertical solution lines, no contour in the window, and an even-multiplicity zero case or its explicit limitation.
- [ ] Surface fixtures include x²+y², sin(x)*cos(y), a constant plane and 1/(x−y); masked cells do not produce bridge triangles.
- [ ] Parameter sliders/numeric inputs work by keyboard and touch; changing a parameter does not reset viewport, selection, dimension or unrelated lesson state.
- [ ] Resize, pan/zoom, mode toggle, reload and Jump restore source, interpretation, parameter values and view. Note anchors remain meaningful after resampling.
- [ ] Generation-id tests prove that a slow old result cannot overwrite new input; budget/deadline cancellation keeps the last valid graph and responsive controls.
- [ ] Stress expressions and large sampling requests stay within evaluation/node/mesh/triangle budgets; quality reductions and sampling notices are observable.
- [ ] SVG/Three share the numeric result; 2D surface view is useful; accessible axes, point values, labels, focus, reduced motion and a pointer-free inspection path are present.
- [ ] No eval/new Function, raw HTML, network evaluation or expression-selected imports; authored/imported equation blocks use the same validated data contract.
- [ ] npm run check, focused production desktop/touch e2e and offline workspace checks pass; README/ADD_A_LAB describe the actual supported grammar and limits without claiming universal symbolic solutions.
