import { evaluateAST, crossesDomain } from './evaluate';
import { hasSymbol } from './parser';
import type {
  NumericAST,
  ParsedGraph,
  GraphSpec,
  Viewport,
  Point2,
  WorkBudget,
  Evaluation,
  SurfaceData,
} from './types';
export function validViewport(view: Viewport): boolean {
  return ['x', 'y', 'z'].every((axis) => {
    const min = view[`${axis}min` as keyof Viewport],
      max = view[`${axis}max` as keyof Viewport];
    return (
      Number.isFinite(min) &&
      Number.isFinite(max) &&
      min < max &&
      max - min > 1e-9 &&
      Math.abs(min) < 1e8 &&
      Math.abs(max) < 1e8
    );
  });
}
function graphId(source: string) {
  let hash = 2166136261;
  for (const c of source) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619);
  return `graph-${(hash >>> 0).toString(16)}`;
}
export function sampleGraph(
  parsed: ParsedGraph,
  parameters: Record<string, number>,
  view: Viewport,
  detail: 'standard' | 'fine' = 'standard',
): GraphSpec {
  if (!validViewport(view)) throw new Error('Choose finite view bounds with a positive span.');
  const params = Object.fromEntries(parsed.parameters.map((name) => [name, parameters[name] ?? 1]));
  if (Object.values(params).some((n) => !Number.isFinite(n) || Math.abs(n) > 1e6))
    throw new Error('Parameters need finite values within ±1,000,000.');
  const max = parsed.mode === 'curve' ? 2048 : parsed.mode === 'surface' ? 20000 : 20000;
  const budget: WorkBudget = {
    evaluations: 0,
    nodeVisits: 0,
    maxEvaluations: max,
    maxNodeVisits: 2000000,
    deadline: performance.now() + 450,
    limited: false,
  };
  const sample = (ast: NumericAST, x = 0, y = 0): Evaluation => {
    if (++budget.evaluations > max || performance.now() > budget.deadline) {
      budget.limited = true;
      return { valid: false, reason: 'Sampling budget reached' };
    }
    return evaluateAST(ast, { ...params, x, y }, budget);
  };
  const graph: GraphSpec = {
    id: graphId(parsed.source),
    mode: parsed.mode,
    source: parsed.source,
    tex: parsed.tex,
    interpretation: parsed.interpretation,
    viewport: view,
    parameters: params,
    segments: [],
    outcome: 'graph',
    diagnostics: [],
    stats: { evaluations: 0, nodeVisits: 0, limited: false },
  };
  const constantCurve = parsed.mode === 'curve' && !hasSymbol(parsed.ast, 'x');
  const constantField =
    parsed.mode === 'relation' && !hasSymbol(parsed.ast, 'x') && !hasSymbol(parsed.ast, 'y');
  if (
    parsed.mode === 'constant' ||
    parsed.mode === 'constantRelation' ||
    constantCurve ||
    constantField
  ) {
    const result = sample(parsed.ast);
    if (!result.valid) {
      graph.outcome = 'outsideDomain';
      graph.diagnostics.push(result.reason ?? 'This expression has no real value.');
    } else if (parsed.mode === 'constant' || constantCurve) {
      graph.outcome = 'value';
      graph.value = result.value;
      graph.segments = [
        [
          { x: view.xmin, y: result.value! },
          { x: view.xmax, y: result.value! },
        ],
      ];
    } else {
      const exact = parsed.constantComparison;
      const equal = exact ? exact.equal : Math.abs(result.value!) <= 1e-10;
      graph.outcome = equal ? 'all' : 'none';
      graph.approximate = !exact;
      graph.diagnostics.push(
        exact
          ? 'Literal arithmetic compared exactly as rational numbers.'
          : 'Numeric agreement uses an absolute residual tolerance of 1e−10; it is approximate.',
      );
      graph.diagnostics.push(
        equal
          ? exact
            ? 'Every point satisfies this constant relation.'
            : 'The constant relation agrees within the stated numeric tolerance.'
          : 'No point satisfies this constant relation with the current parameter values.',
      );
    }
  } else if (parsed.mode === 'curve') {
    const step = (view.xmax - view.xmin) / 256,
      span = view.ymax - view.ymin;
    const values: { x: number; result: Evaluation }[] = [];
    const refine = (x0: number, r0: Evaluation, x1: number, r1: Evaluation, depth: number) => {
      if (budget.limited) return;
      const xm = (x0 + x1) / 2,
        rm = sample(parsed.ast, xm);
      const guard = crossesDomain(
        parsed.originalAst,
        { ...params, x: x0, y: 0 },
        { ...params, x: x1, y: 0 },
      );
      const jump =
        r0.valid &&
        r1.valid &&
        rm.valid &&
        (Math.abs(rm.value! - (r0.value! + r1.value!) / 2) > span * 0.015 ||
          Math.abs(r1.value! - r0.value!) > span * 0.6);
      const mixed = r0.valid !== r1.valid || rm.valid !== r0.valid;
      if (depth < 8 && (guard || jump || mixed) && budget.evaluations < max - 2) {
        refine(x0, r0, xm, rm, depth + 1);
        refine(xm, rm, x1, r1, depth + 1);
      } else {
        values.push({ x: x0, result: r0 });
        if (jump && depth >= 8)
          graph.diagnostics.push('Some fine detail could not be resolved in this view.');
      }
    };
    let x0 = view.xmin,
      r0 = sample(parsed.ast, x0);
    for (let i = 1; i <= 256 && !budget.limited; i++) {
      const x1 = view.xmin + i * step,
        r1 = sample(parsed.ast, x1);
      refine(x0, r0, x1, r1, 0);
      x0 = x1;
      r0 = r1;
    }
    values.push({ x: x0, result: r0 });
    let segment: Point2[] = [];
    const flush = () => {
      if (segment.length > 1) graph.segments.push(segment);
      segment = [];
    };
    for (let i = 0; i < values.length; i++) {
      const p = values[i];
      const previous = values[i - 1];
      if (
        !p.result.valid ||
        Math.abs(p.result.value!) > Math.max(Math.abs(view.ymin), Math.abs(view.ymax)) * 1e5
      ) {
        flush();
        continue;
      }
      if (
        previous &&
        (!previous.result.valid ||
          crossesDomain(
            parsed.originalAst,
            { ...params, x: previous.x, y: 0 },
            { ...params, x: p.x, y: 0 },
          ) ||
          Math.abs(p.result.value! - previous.result.value!) > span * 2)
      )
        flush();
      segment.push({ x: p.x, y: p.result.value! });
    }
    flush();
    if (!graph.segments.length) {
      graph.outcome = 'none';
      graph.diagnostics.push(
        'No real curve samples were found in this window. Try another window or check the real domain.',
      );
    }
    if (values.some((p) => !p.result.valid))
      graph.diagnostics.push('Gaps mark samples outside the real domain or unresolved detail.');
  } else if (parsed.mode === 'relation') {
    const n = detail === 'fine' ? 80 : 64,
      dx = (view.xmax - view.xmin) / n,
      dy = (view.ymax - view.ymin) / n;
    const field: Evaluation[] = [];
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++)
        field.push(sample(parsed.ast, view.xmin + i * dx, view.ymin + j * dy));
    const at = (i: number, j: number) => field[j * (n + 1) + i];
    let singular = 0,
      zeros = 0;
    for (let j = 0; j < n && !budget.limited; j++)
      for (let i = 0; i < n && !budget.limited; i++) {
        const points: Point2[] = [
          { x: view.xmin + i * dx, y: view.ymin + j * dy },
          { x: view.xmin + (i + 1) * dx, y: view.ymin + j * dy },
          { x: view.xmin + (i + 1) * dx, y: view.ymin + (j + 1) * dy },
          { x: view.xmin + i * dx, y: view.ymin + (j + 1) * dy },
        ];
        const f = [at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)];
        if (f.some((v) => !v.valid)) {
          singular++;
          continue;
        }
        if (
          crossesDomain(
            parsed.originalAst,
            { ...params, x: points[0].x, y: points[0].y },
            { ...params, x: points[2].x, y: points[2].y },
          )
        ) {
          singular++;
          continue;
        }
        const intersections: Point2[] = [];
        for (let e = 0; e < 4; e++) {
          const end = (e + 1) % 4,
            va = f[e].value!,
            vb = f[end].value!;
          if (va === 0 && vb === 0) {
            zeros++;
            if (graph.segments.length < 4096) graph.segments.push([points[e], points[end]]);
            continue;
          }
          if (va < 0 === vb < 0 && va !== 0 && vb !== 0) continue;
          const t = Math.abs(va - vb) < 1e-15 ? 0.5 : Math.max(0, Math.min(1, va / (va - vb)));
          const p = {
            x: points[e].x + (points[end].x - points[e].x) * t,
            y: points[e].y + (points[end].y - points[e].y) * t,
          };
          const check = sample(parsed.ast, p.x, p.y);
          if (
            !check.valid ||
            Math.abs(check.value!) > Math.max(1, Math.abs(va), Math.abs(vb)) * 0.25
          )
            continue;
          intersections.push(p);
        }
        const unique = intersections.filter(
          (p, k) =>
            !intersections
              .slice(0, k)
              .some((q) => Math.abs(p.x - q.x) + Math.abs(p.y - q.y) < 1e-10),
        );
        if (unique.length === 2) graph.segments.push(unique);
        else if (unique.length === 4) {
          const c = sample(
            parsed.ast,
            (points[0].x + points[2].x) / 2,
            (points[0].y + points[2].y) / 2,
          );
          const positive = c.valid && c.value! >= 0;
          graph.segments.push(
            positive === f[0].value! >= 0 ? [unique[0], unique[1]] : [unique[0], unique[3]],
            positive === f[0].value! >= 0 ? [unique[2], unique[3]] : [unique[1], unique[2]],
          );
        }
        if (graph.segments.length >= 4096) {
          budget.limited = true;
          break;
        }
      }
    if (!graph.segments.length) {
      graph.outcome = 'none';
      graph.diagnostics.push(
        'No contour was found in this window. Finite sampling can miss isolated roots or very small loops.',
      );
    }
    if (singular)
      graph.diagnostics.push(
        'Cells near domain exclusions are masked; no contour is drawn across them.',
      );
    if (zeros > n * n)
      graph.diagnostics.push(
        'Many sampled values are zero. This sampling result alone does not prove every point is a solution.',
      );
    graph.diagnostics.push(
      'Contours are a finite-grid approximation, not a complete symbolic solution.',
    );
  } else {
    const n = detail === 'fine' ? 96 : 64,
      dx = (view.xmax - view.xmin) / n,
      dy = (view.ymax - view.ymin) / n;
    const surface: SurfaceData = {
      vertices: [],
      indices: [],
      resolution: n,
      heights: [],
      valid: [],
      cellValid: Array(n * n).fill(false),
    };
    let clipped = 0;
    for (let j = 0; j <= n; j++)
      for (let i = 0; i <= n; i++) {
        const x = view.xmin + i * dx,
          y = view.ymin + j * dy,
          result = sample(parsed.ast, x, y);
        surface.valid.push(result.valid);
        surface.heights.push(result.valid ? result.value! : 0);
        const z = result.valid ? Math.max(view.zmin, Math.min(view.zmax, result.value!)) : 0;
        if (result.valid && z !== result.value) clipped++;
        surface.vertices.push(x, y, z);
      }
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const a = j * (n + 1) + i,
          b = a + 1,
          c = a + n + 1,
          d = c + 1;
        if (![a, b, c, d].every((id) => surface.valid[id])) continue;
        const x = view.xmin + i * dx,
          y = view.ymin + j * dy;
        if (
          crossesDomain(
            parsed.originalAst,
            { ...params, x, y },
            { ...params, x: x + dx, y: y + dy },
          )
        )
          continue;
        const centre = sample(parsed.originalAst, x + dx / 2, y + dy / 2);
        if (!centre.valid) continue;
        const corners = [a, b, c, d].map((id) => surface.heights[id]);
        if (Math.max(...corners) - Math.min(...corners) > (view.zmax - view.zmin) * 4) continue;
        surface.indices.push(a, b, d, a, d, c);
        surface.cellValid[j * n + i] = true;
      }
    graph.surface = surface;
    if (!surface.indices.length) {
      graph.outcome = 'none';
      graph.diagnostics.push('No real surface cells were found in this window.');
    }
    if (clipped)
      graph.diagnostics.push(
        'Heights outside the visible z range are clipped. Inspection keeps the original numeric value.',
      );
    if (surface.valid.some((v) => !v))
      graph.diagnostics.push('Domain exclusions make gaps in the mesh.');
  }
  graph.stats = {
    evaluations: Math.min(budget.evaluations, budget.maxEvaluations),
    nodeVisits: Math.min(budget.nodeVisits, budget.maxNodeVisits),
    limited: budget.limited,
  };
  if (budget.limited)
    graph.diagnostics.push(
      'Sampling detail limit reached. Try a smaller window or a simpler expression.',
    );
  graph.diagnostics = [...new Set(graph.diagnostics)];
  return graph;
}
