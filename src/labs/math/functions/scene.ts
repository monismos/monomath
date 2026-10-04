import type { Entity, SceneSpec, Vec3 } from '../../../core/scene/spec';
import {
  valueAt,
  slopeAt,
  tidy,
  type FunctionProblem,
  type FunctionSolution,
} from '../../../core/solvers/functions';
import { clipGraphLine } from '../../../core/graphing/coordinates';
import { linePrism, cubeFaces } from '../matrices/geometry';
import { numeric, type FunctionBuild } from './challenge';
export interface FunctionSceneOptions {
  trace: number;
  slice: number;
  zoom: number;
  n: number;
  tangent: boolean;
  rectangles: boolean;
  compare?: [number, number];
  build?: FunctionBuild;
  kind?: string;
}
export function plottedProblem(p: FunctionProblem, build?: FunctionBuild): FunctionProblem {
  if (!build) return p;
  const coefficients = [...build.coefficients];
  return {
    ...p,
    model: { type: 'polynomial', coefficients },
    ...(p.surface
      ? {
          surface: [coefficients[2] ?? 0, p.surface[1], coefficients[0] ?? 0] as [
            number,
            number,
            number,
          ],
        }
      : {}),
  };
}
export function midpointHeights(p: FunctionProblem, n: number, slice = 0) {
  const dx = (p.upper - p.lower) / n;
  return Array.from({ length: n }, (_, i) => valueAt(p, p.lower + (i + 0.5) * dx, slice));
}
export function midpointSum(p: FunctionProblem, n: number) {
  return midpointHeights(p, n).reduce((sum, h) => sum + (h * (p.upper - p.lower)) / n, 0);
}
export function lineCrossing(coefficients: number[], other: [number, number]) {
  const [intercept, slope] = coefficients,
    [otherSlope, otherIntercept] = other;
  if (slope === otherSlope)
    return { kind: intercept === otherIntercept ? 'coincident' : 'parallel' } as const;
  const x = (otherIntercept - intercept) / (slope - otherSlope);
  return { kind: 'point', x, y: slope * x + intercept } as const;
}
export function functionScene(
  p: FunctionProblem,
  s: FunctionSolution,
  o: FunctionSceneOptions,
): SceneSpec {
  const actual = plottedProblem(p, o.build),
    surface = !!p.surface,
    trace = o.trace,
    slice = o.slice,
    practice = !!o.build;
  const xmin = (surface ? -3 : p.kind === 'integral' ? Math.min(-1, p.lower - 1) : -4) / o.zoom,
    xmax = (surface ? 3 : p.kind === 'integral' ? Math.max(4, p.upper + 1) : 4) / o.zoom;
  const samples = Array.from({ length: 97 }, (_, i) => {
    const x = xmin + ((xmax - xmin) * i) / 96;
    return { x, y: valueAt(actual, x, slice) };
  });
  const finite = samples.filter((p) => Number.isFinite(p.y));
  const maxAbs = Math.max(
    2,
    ...finite.map((p) => Math.abs(p.y)),
    ...(practice ? o.build!.heights.map((v) => Math.abs(numeric(v))) : []),
    ...(practice ? o.build!.points.map((v) => Math.abs(numeric(v))) : []),
  );
  const ymin = -maxAbs * 1.1,
    ymax = maxAbs * 1.1,
    scale = 3.2 / (ymax - ymin);
  const world = (x: number, y: number): Vec3 => [
    ((x - xmin) / (xmax - xmin)) * 6 - 3,
    0.07,
    y * scale,
  ];
  const heightBound = surface
    ? Math.max(
        2,
        ...[xmin, xmax].flatMap((x) => [xmin, xmax].map((y) => Math.abs(valueAt(actual, x, y)))),
      )
    : maxAbs;
  const surfaceWorld = (x: number, y: number, z: number): Vec3 => [
    x * o.zoom,
    0.2 + (z / heightBound) * 1.8,
    y * o.zoom * 0.6,
  ];
  const entities: Entity[] = [];
  const add = (e: Entity) => {
    entities.push(e);
    return e;
  };
  const mesh = (
    id: string,
    points: Vec3[],
    faces: number[][],
    color: string,
    tether: string,
    opacity = 1,
  ) => add({ id, kind: 'mesh', pos: [0, 0, 0], points, faces, color, tether, opacity });
  const segment = (
    id: string,
    a: Vec3,
    b: Vec3,
    color: string,
    tether: string,
    opacity = 1,
    width = 0.014,
  ) => mesh(id, linePrism(a, b, width), cubeFaces, color, tether, opacity);
  const label = (id: string, text: string, pos: Vec3, tether: string, color = 'paper') =>
    add({ id, kind: 'label', pos, text: { plain: text }, color, tether });
  const ribbon = (id: string, points: Vec3[], color: string, tether: string, width = 0.026) => {
    const vertices: Vec3[] = [],
      faces: number[][] = [];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1],
        b = points[i],
        k = vertices.length;
      vertices.push(
        [a[0], a[1] + width, a[2] - width],
        [a[0], a[1] + width, a[2] + width],
        [b[0], b[1] + width, b[2] + width],
        [b[0], b[1] + width, b[2] - width],
      );
      faces.push([k, k + 1, k + 2, k + 3]);
    }
    return mesh(id, vertices, faces, color, tether);
  };
  segment('x-axis', [-3.1, 0.01, 0], [3.1, 0.01, 0], 'paper', 'point', 0.45);
  segment(
    'y-axis',
    [world(0, 0)[0], 0.01, -1.7],
    [world(0, 0)[0], 0.01, 1.7],
    'paper',
    'point',
    0.45,
  );
  label('axis-x', 'x', [3.1, 0.12, 0.1], 'point');
  label(
    'axis-y',
    surface ? 'y / height z' : 'y',
    [surface ? -1.8 : world(0, 0)[0] - 0.3, 0.1, 1.85],
    'point',
  );
  label('window-left', tidy(xmin), [-3, 0.1, -0.28], 'point');
  label('window-right', tidy(xmax), [3, 0.1, -0.28], 'point');
  for (let i = 1; i < 6; i++)
    segment(`grid-x-${i}`, [-3 + i, 0, -1.6], [-3 + i, 0, 1.6], 'paper', 'point', 0.12, 0.006);
  for (let i = 1; i < 4; i++)
    segment(
      `grid-y-${i}`,
      [-3, 0, -1.6 + i * 0.8],
      [3, 0, -1.6 + i * 0.8],
      'paper',
      'point',
      0.12,
      0.006,
    );
  const curve = ribbon(
    'curve',
    finite.map((p) => world(p.x, p.y)),
    'mint',
    'curve',
  );
  curve.layers = {
    thing: { scale: [1, 0.5, 1] },
    shape: { scale: [1, 1, 1] },
    symbol: { scale: [1, 0.85, 1] },
    code: { scale: [1, 0.65, 1] },
  };
  if (
    o.compare &&
    actual.model.type === 'polynomial' &&
    actual.model.coefficients.length === 2 &&
    !surface
  ) {
    const [m, b] = o.compare,
      ends = clipGraphLine(
        { xmin, xmax, ymin, ymax, zmin: -1, zmax: 1 },
        { x: xmin, y: m * xmin + b },
        { x: xmax, y: m * xmax + b },
      );
    ribbon('compare', ends ? ends.map((p) => world(p.x, p.y)) : [], 'whole', 'compare');
    const crossing = lineCrossing(actual.model.coefficients, o.compare);
    if (crossing.kind === 'point') {
      const pos = world(crossing.x, crossing.y);
      add({
        id: 'crossing',
        kind: 'sphere',
        pos: [pos[0], 0.18, pos[2]],
        size: [0.1, 0.1, 0.1],
        color: 'highlight',
        tether: 'point',
        opacity:
          crossing.x >= xmin && crossing.x <= xmax && crossing.y >= ymin && crossing.y <= ymax
            ? 1
            : 0,
        text: { plain: `Line crossing (${tidy(crossing.x)},${tidy(crossing.y)})` },
      });
    }
  }
  const py =
    practice && o.build!.included.includes('p1')
      ? numeric(o.build!.points[1])
      : valueAt(actual, trace, slice);
  const tracePos = surface ? surfaceWorld(trace, slice, py) : world(trace, py);
  const ball = add({
    id: 'trace',
    kind: 'sphere',
    pos: [tracePos[0], tracePos[1] + 0.09, tracePos[2]],
    size: [0.085, 0.085, 0.085],
    color: 'part',
    tether: 'point',
    text: {
      plain: practice
        ? `Trace (${tidy(trace)},${surface ? tidy(slice) + ',' : ''}${tidy(py)})`
        : 'Trace point on the rule',
    },
  });
  ball.layers = {
    thing: { size: [0.17, 0.17, 0.17] },
    shape: { size: [0.085, 0.085, 0.085] },
    symbol: { size: [0.065, 0.065, 0.065] },
    code: { size: [0.06, 0.06, 0.06] },
  };
  const traceLabel = label(
    'trace-label',
    surface ? 'Trace height' : 'Trace point',
    [tracePos[0], tracePos[1] + 0.22, tracePos[2] + 0.25],
    'point',
    'part',
  );
  traceLabel.layers = {
    thing: { scale: [1, 1, 1] },
    shape: { scale: [1, 1, 1] },
    symbol: { scale: [0, 0, 0] },
    code: { scale: [0, 0, 0] },
  };
  const tangentSlope = practice ? numeric(o.build!.tangent) : slopeAt(actual, trace);
  const range = xmax - xmin;
  const tangentEnds = clipGraphLine(
    { xmin, xmax, ymin, ymax, zmin: -1, zmax: 1 },
    { x: trace - range, y: py - tangentSlope * range },
    { x: trace + range, y: py + tangentSlope * range },
  );
  segment(
    'tangent',
    tangentEnds ? world(tangentEnds[0].x, tangentEnds[0].y) : [0, 0, 0],
    tangentEnds ? world(tangentEnds[1].x, tangentEnds[1].y) : [0, 0, 0],
    'whole',
    'slope',
    o.tangent && !surface ? 1 : 0,
    0.021,
  );
  segment(
    'run',
    world(trace, py),
    world(trace + 1, py),
    'whole',
    'slope',
    o.tangent && !surface ? 0.7 : 0,
    0.015,
  );
  segment(
    'rise',
    world(trace + 1, py),
    world(trace + 1, py + tangentSlope),
    'part',
    'slope',
    o.tangent && !surface ? 0.7 : 0,
    0.015,
  );
  // Concrete columns morph into plotted points while keeping their input/output relation.
  [-1, 0, 1, 2].forEach((x, i) => {
    const value = valueAt(actual, x, slice),
      pos = surface ? surfaceWorld(x, slice, value) : world(x, value),
      height = surface ? (Math.abs(value) / heightBound) * 1.8 : Math.abs(value) * scale;
    const block = add({
      id: `sample-${i}`,
      kind: 'block',
      pos: surface ? [pos[0], 0.2 + (pos[1] - 0.2) / 2, pos[2]] : [pos[0], 0.05, pos[2] / 2],
      size: surface ? [0.12, Math.max(0.04, height), 0.12] : [0.16, 0.1, Math.max(0.04, height)],
      color: value < 0 ? 'whole' : 'part',
      tether: 'curve',
      text: { plain: `Input ${x}, output ${tidy(value)}` },
    });
    block.layers = {
      thing: { scale: [1, 1, 1] },
      shape: { pos, scale: [0.4, 0.4, 0.4] },
      symbol: { pos, scale: [0.15, 0.15, 0.15] },
      code: { scale: [0, 0, 0] },
    };
  });
  const rootMarkers = practice ? o.build!.markers : s.roots;
  [0, 1].forEach((i) => {
    const root = rootMarkers[i],
      pos = world(root ?? 0, 0),
      e = add({
        id: `root-${i}`,
        kind: 'sphere',
        pos: [pos[0], 0.13, pos[2]],
        size: [0.075, 0.075, 0.075],
        color: 'highlight',
        tether: 'roots',
        opacity: root === undefined ? 0 : 1,
        text: { plain: `Root marker x=${tidy(root ?? 0)}` },
      });
    if (!practice) e.opacity = 0;
  });
  const dx = (p.upper - p.lower) / o.n,
    heights = practice ? o.build!.heights.map((v) => numeric(v)) : midpointHeights(actual, o.n);
  for (let i = 0; i < 16; i++) {
    const x = p.lower + i * dx,
      h = heights[i] ?? 0,
      a = world(x, 0),
      b = world(x + dx, h);
    const e = mesh(
      `rectangle-${i}`,
      [
        [a[0], 0.035, 0],
        [b[0], 0.035, 0],
        [b[0], 0.035, b[2]],
        [a[0], 0.035, b[2]],
      ],
      [[0, 1, 2, 3]],
      h < 0 ? 'whole' : 'part',
      'area',
      o.rectangles && i < o.n && !surface ? 0.65 : 0,
    );
    e.text = {
      plain: `Rectangle ${i + 1}: width ${tidy(dx)}, signed height ${tidy(h)}, area ${tidy(dx * h)}`,
    };
  }
  [0, 1].forEach((i) => {
    const x = i,
      pos = world(x, numeric(o.build?.points[i] ?? ''));
    add({
      id: `construction-${i}`,
      kind: 'sphere',
      pos: [pos[0], 0.14, pos[2]],
      size: [0.1, 0.1, 0.1],
      color: 'highlight',
      tether: 'point',
      opacity: practice && o.build!.included.includes(`p${i}`) ? 1 : 0,
      text: { plain: `Constructed point (${x},${tidy(numeric(o.build?.points[i] ?? ''))})` },
    });
  });
  if (surface) {
    const vertices: Vec3[] = [],
      faces: number[][] = [];
    for (let j = 0; j < 16; j++)
      for (let i = 0; i < 16; i++) {
        const x = xmin + ((xmax - xmin) * i) / 15,
          y = xmin + ((xmax - xmin) * j) / 15;
        vertices.push(surfaceWorld(x, y, valueAt(actual, x, y)));
        if (i < 15 && j < 15) {
          const k = j * 16 + i;
          faces.push([k, k + 1, k + 17, k + 16]);
        }
      }
    const e = mesh('surface', vertices, faces, 'mint', 'curve', 0.55);
    e.text = { plain: 'Quadratic height surface: each (x,y) has one z.' };
    const points = Array.from({ length: 65 }, (_, i) => {
      const x = xmin + ((xmax - xmin) * i) / 64;
      return surfaceWorld(x, slice, valueAt(actual, x, slice));
    });
    ribbon('slice', points, 'part', 'slice', 0.035);
    mesh(
      'slice-plane',
      [
        [-3, 0.05, slice * o.zoom * 0.6],
        [3, 0.05, slice * o.zoom * 0.6],
        [3, 2.4, slice * o.zoom * 0.6],
        [-3, 2.4, slice * o.zoom * 0.6],
      ],
      [[0, 1, 2, 3]],
      'whole',
      'slice',
      0.16,
    );
    curve.opacity = 0;
    curve.layers = undefined;
  }
  // Completing a monic quadratic: two removed strips and their restored overlap.
  const squareAllowed =
    p.kind === 'roots' &&
    s.method === 'square' &&
    p.model.type === 'polynomial' &&
    p.model.coefficients[2] === 1 &&
    p.model.coefficients[1] < 0 &&
    Math.abs(p.model.coefficients[1]) <= 6;
  const half = p.model.type === 'polynomial' ? Math.abs((p.model.coefficients[1] ?? 0) / 2) : 0,
    tileX = Math.max(4, half + 1),
    factor = 2.8 / tileX;
  const tile = (
    id: string,
    x: number,
    z: number,
    w: number,
    d: number,
    color: string,
    text: string,
  ) => {
    const e = add({
      id,
      kind: 'block',
      pos: [-1.7 + (x + w / 2) * factor, 0.32, 0.2 + (z + d / 2) * factor],
      size: [w * factor, 0.09, d * factor],
      color,
      tether: 'square',
      opacity: 0,
      text: { plain: text },
    });
    e.layers = {
      thing: { scale: [1, 1, 1] },
      shape: { scale: [1, 1, 1] },
      symbol: { scale: [0, 0, 0] },
      code: { scale: [0, 0, 0] },
    };
    return e;
  };
  tile('square-base', 0, 0, tileX, tileX, 'mint', `Original square x²; displayed x=${tileX}`);
  tile('square-left', 0, 0, half, tileX, 'whole', `Remove strip area ${half}x`);
  tile('square-bottom', 0, 0, tileX, half, 'whole', `Remove strip area ${half}x`);
  tile('square-corner', 0, 0, half, half, 'part', `Restore overlap area ${half * half}`);
  tile(
    'square-result',
    half,
    half,
    tileX - half,
    tileX - half,
    'part',
    `Remaining square (x−${half})²`,
  );
  const tileNote = label('tile-caption', `x=${tileX}`, [-2.4, 0.3, 1.6], 'square');
  tileNote.opacity = 0;
  const tileLabels = [
    ['tile-left', `−${half}x`, half / 2, (half + tileX) / 2],
    ['tile-bottom', `−${half}x`, (half + tileX) / 2, half / 2],
    ['tile-corner', `+${half * half}`, half / 2, half / 2],
    ['tile-result', `(x−${half})²`, (half + tileX) / 2, (half + tileX) / 2],
  ] as const;
  tileLabels.forEach(([id, text, x, z]) => {
    const e = label(id, text, [-1.7 + x * factor, 0.48, 0.2 + z * factor], 'square');
    e.opacity = 0;
    e.layers = {
      thing: { scale: [1, 1, 1] },
      shape: { scale: [1, 1, 1] },
      symbol: { scale: [0, 0, 0] },
      code: { scale: [0, 0, 0] },
    };
  });
  const steps = s.steps.map((step, index) => {
    const next = {
      ...step,
      ops: [...step.ops],
      tethers: step.tethers
        .map((t) => ({
          ...t,
          entities: [
            ...t.entities,
            ...(t.token === 'curve'
              ? ['sample-0', 'sample-1', 'sample-2', 'sample-3']
              : t.token === 'point'
                ? ['construction-0', 'construction-1']
                : []),
          ].filter((id) => entities.some((e) => e.id === id)),
        }))
        .filter((t) => t.entities.length),
      gaze: surface ? ['slice', 'trace'] : ['trace'],
    };
    if (entities.some((e) => e.id === 'compare')) {
      next.latexAfter += `,\\quad \\htmlClass{tk-compare}{g(x)=${o.compare![0]}x+(${o.compare![1]})}`;
      next.tethers.push({ token: 'compare', entities: ['compare'], color: 'whole' });
      if (entities.some((e) => e.id === 'crossing'))
        next.tethers.find((t) => t.token === 'point')?.entities.push('crossing');
    }
    if (index === 2 && !practice) {
      next.ops.push({
        t: 'tween',
        id: 'trace',
        to: {
          text: { plain: `Trace (${tidy(trace)},${surface ? tidy(slice) + ',' : ''}${tidy(py)})` },
        },
      });
      rootMarkers.forEach((_, i) =>
        next.ops.push({ t: 'tween', id: `root-${i}`, to: { opacity: 1 } }),
      );
    }
    if (squareAllowed) {
      if (index === 2) {
        [
          'square-base',
          'square-left',
          'square-bottom',
          'square-corner',
          'square-result',
          'tile-caption',
          ...tileLabels.map((t) => t[0]),
        ].forEach((id) =>
          next.ops.push({ t: 'tween', id, to: { opacity: id === 'square-base' ? 0.2 : 1 } }),
        );
        [
          'curve',
          'trace',
          'trace-label',
          'tangent',
          'rise',
          'run',
          ...Array.from({ length: 4 }, (_, i) => `sample-${i}`),
        ].forEach((id) => next.ops.push({ t: 'tween', id, to: { opacity: 0 } }));
      }
      if (index === s.steps.length - 2) {
        [
          'square-base',
          'square-left',
          'square-bottom',
          'square-corner',
          'square-result',
          'tile-caption',
          ...tileLabels.map((t) => t[0]),
        ].forEach((id) => next.ops.push({ t: 'tween', id, to: { opacity: 0 } }));
        ['curve', 'trace', 'trace-label'].forEach((id) =>
          next.ops.push({ t: 'tween', id, to: { opacity: 1 } }),
        );
      }
    }
    if (practice) next.predict = undefined;
    return next;
  });
  return {
    id: `functions:${p.expression}`,
    entities,
    steps,
    code: s.code,
    codeLanguage: 'python',
    codeBindings: {
      f: 'curve',
      point: 'point',
      points: 'point',
      slope: 'slope',
      area: 'area',
      dx: 'area',
      n: 'area',
      roots: 'roots',
      slice_y: 'slice',
      height: 'slice',
    },
  };
}
