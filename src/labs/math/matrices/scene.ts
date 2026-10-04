import type { Entity, SceneSpec, Vec3, Step } from '../../../core/scene/spec';
import {
  numQ,
  matrixDet,
  type Matrix,
  type MatrixProblem,
  type MatrixSolution,
} from '../../../core/solvers/matrices';
import { fractionText } from '../../../core/solvers/fractions';
import {
  cubeFaces,
  cubePoints,
  linePrism,
  applyMatrix,
  realEigenvectors,
  equationSlice,
  nullSpace,
} from './geometry';
import { enteredMatrix, type MatrixBuild } from './challenge';
export interface MatrixSceneOptions {
  view?: 'auto' | 'blocks' | 'lattice';
  language?: 'python' | 'numpy';
  build?: MatrixBuild;
  expected?: Matrix;
  cursor?: number;
  eigen?: boolean;
}
export function matrixScene(
  p: MatrixProblem,
  s: MatrixSolution,
  o: MatrixSceneOptions = {},
): SceneSpec {
  const n = p.a.length,
    practice = !!o.build,
    view = o.view ?? 'auto',
    language = o.language ?? 'python';
  const output = o.expected ?? s.result,
    entered = o.build ? enteredMatrix(o.build, output) : output;
  const target =
    p.kind === 'solve' ? p.a : p.kind === 'determinant' ? (practice ? entered : p.a) : entered;
  const mapToken = p.kind === 'determinant' ? 'A' : 'C';
  const magnitudes = [...p.a, ...target].map((row) =>
    row.reduce((sum, v) => sum + Math.abs(numQ(v)), 0),
  );
  const systemBound =
    p.kind === 'solve' ? Math.max(3, ...s.result.flat().map((v) => Math.abs(numQ(v)) + 1)) : 2;
  const max = Math.max(1, ...magnitudes);
  const scale =
    p.kind === 'solve' ? (n === 3 ? 1.1 : 2.2) / systemBound : (n === 3 ? 1.1 : 2.2) / max;
  const origin: Vec3 = [0.65, n === 3 ? 1.35 : 0.12, 0];
  const world = (v: number[]): Vec3 => [
    origin[0] + (v[0] ?? 0) * scale,
    origin[1] + (n === 3 ? (v[2] ?? 0) * scale : 0),
    origin[2] + (v[1] ?? 0) * scale,
  ];
  const color = (j: number) => ['whole', 'part', 'mint'][j];
  const entities: Entity[] = [],
    geometryIds: string[] = [];
  const mesh = (
    id: string,
    points: Vec3[],
    faces: number[][],
    paint: string,
    tether: string,
    opacity = 1,
  ): Entity => {
    const entity: Entity = {
      id,
      kind: 'mesh',
      pos: [0, 0, 0],
      points,
      faces,
      color: paint,
      tether,
      opacity,
      layers: {
        thing: { scale: view === 'auto' ? [0, 0, 0] : view === 'blocks' ? [0, 0, 0] : [1, 1, 1] },
        shape: { scale: view === 'blocks' ? [0, 0, 0] : [1, 1, 1] },
        symbol: { scale: view === 'blocks' ? [0, 0, 0] : [1, 1, 1] },
        code: { scale: view === 'blocks' ? [0, 0, 0] : [1, 1, 1] },
      },
    };
    entities.push(entity);
    geometryIds.push(id);
    return entity;
  };
  const label = (
    id: string,
    text: string,
    pos: Vec3,
    tether: string,
    paint = 'paper',
    opacity = 1,
  ): Entity => {
    const e: Entity = {
      id,
      kind: 'label',
      pos,
      text: { plain: text },
      color: paint,
      tether,
      opacity,
    };
    entities.push(e);
    return e;
  };
  const cellPos = (side: 'a' | 'b' | 'out', i: number, j: number): Vec3 => [
    (side === 'a' ? -2.6 : side === 'b' ? 0 : 2.5) + (j - (n - 1) / 2) * 0.56,
    0.15,
    ((n - 1) / 2) * 0.58 - i * 0.58,
  ];
  const cells = (matrix: Matrix, side: 'a' | 'b' | 'out', paint: string) => {
    matrix.forEach((row, i) =>
      row.forEach((value, j) => {
        const id = `${side}-${i}-${j}`,
          pos = cellPos(side, i, j),
          included = practice && side === 'out' ? o.build!.included.includes(id) : true;
        const visible = side !== 'out' || practice;
        const e: Entity = {
          id,
          kind: 'block',
          pos,
          size: [0.49, 0.19, 0.49],
          color: paint,
          tether: id,
          opacity: included ? 1 : 0.25,
          layers: {
            thing: { scale: view === 'lattice' ? [0, 0, 0] : [1, 1, 1] },
            shape: { scale: view === 'blocks' ? [1, 1, 1] : [0, 0, 0] },
            symbol: { scale: view === 'blocks' ? [1, 1, 1] : [0, 0, 0] },
            code: { scale: view === 'blocks' ? [1, 1, 1] : [0, 0, 0] },
          },
        };
        entities.push(e);
        const text =
          side === 'out' ? (practice ? o.build!.cells[id] || '?' : '?') : fractionText(value);
        label(`label-${id}`, text, [pos[0], 0.28, pos[2]], id).layers = e.layers;
        if (!visible) e.opacity = 0.3;
      }),
    );
  };
  cells(p.a, 'a', 'whole');
  if (p.b) cells(p.b, 'b', 'mint');
  cells(output, 'out', 'part');
  label('matrix-A', 'A', [-2.6, 0.35, 1.35], 'A').layers = entities[0].layers;
  if (p.b)
    label('matrix-B', p.kind === 'solve' ? 'b' : 'B', [0, 0.35, 1.35], 'B').layers =
      entities[0].layers;
  label(
    'matrix-C',
    p.kind === 'determinant' ? (practice ? 'Basis you build' : 'det(A)') : 'C',
    [2.5, 0.35, 1.35],
    'C',
  ).layers = entities[0].layers;
  const warpOps: Step['ops'] = [];
  const attach = (e: Entity, mathPoints: number[][], width?: number) => {
    const initial = mathPoints.map((v) => world(v)),
      final = mathPoints.map((v) => world(applyMatrix(target, v)));
    const targetPoints = width ? linePrism(final[0], final[1], width) : final;
    if (practice) e.points = targetPoints;
    else {
      e.points = width ? linePrism(initial[0], initial[1], width) : initial;
      warpOps.push({ t: 'tween', id: e.id, to: { points: targetPoints }, ease: 'inOut' });
    }
  };
  if (p.kind !== 'solve') {
    const unitMath =
      n === 2
        ? [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
          ]
        : cubePoints;
    const unit = mesh(
      'unit',
      [],
      n === 2 ? [[0, 1, 2, 3]] : cubeFaces,
      'mint',
      p.kind === 'determinant' ? 'det' : 'C',
      0.55,
    );
    attach(unit, unitMath);
    const unitName = n === 2 ? 'Unit square' : 'Unit cube';
    const unitDescription = `${unitName} mapped by ${mapToken}; signed scale ${fractionText(matrixDet(target))}.`;
    unit.text = { plain: practice ? unitDescription : `${unitName} before transformation.` };
    if (!practice)
      warpOps.push({ t: 'tween', id: unit.id, to: { text: { plain: unitDescription } } });
    // A plane of the lattice plus depth rails in 3D keeps the transformed volume readable.
    for (let axis = 0; axis < 2; axis++)
      for (let k = -2; k <= 2; k++) {
        const a = Array(n).fill(0) as number[],
          b = [...a];
        a[axis] = -1;
        b[axis] = 1;
        a[1 - axis] = b[1 - axis] = k / 2;
        const id = `lattice-${axis}-${k + 2}`,
          line = mesh(id, [], cubeFaces, 'paper', mapToken, 0.24);
        attach(line, [a, b], 0.012);
      }
    if (n === 3)
      for (let x = 0; x <= 1; x++)
        for (let y = 0; y <= 1; y++) {
          const line = mesh(`depth-${x}-${y}`, [], cubeFaces, 'paper', mapToken, 0.35);
          attach(
            line,
            [
              [x, y, 0],
              [x, y, 1],
            ],
            0.018,
          );
        }
    for (let j = 0; j < n; j++) {
      const axis = Array(n).fill(0) as number[];
      axis[j] = 1;
      const line = mesh(`basis-${j}`, [], cubeFaces, color(j), mapToken);
      attach(line, [Array(n).fill(0), axis], 0.035);
      const endpoint = applyMatrix(target, axis),
        initial = world(axis),
        final = world(endpoint);
      const marker: Entity = {
        id: `tip-${j}`,
        kind: 'sphere',
        pos: practice ? final : initial,
        size: [0.065, 0.065, 0.065],
        color: color(j),
        tether: mapToken,
        layers: line.layers,
      };
      entities.push(marker);
      geometryIds.push(marker.id);
      const text = label(
        `basis-label-${j}`,
        `e${j + 1}`,
        [...(practice ? final : initial)] as Vec3,
        mapToken,
        color(j),
      );
      text.pos[2] += 0.16 + j * 0.3;
      text.layers = line.layers;
      if (!practice) {
        warpOps.push({ t: 'tween', id: marker.id, to: { pos: final } });
        warpOps.push({
          t: 'tween',
          id: text.id,
          to: {
            pos: [final[0], final[1] + 0.1, final[2] + 0.16 + j * 0.3],
          },
        });
      }
    }
    const eigens = realEigenvectors(target);
    eigens.slice(0, 3).forEach((eigen, j) => {
      const direction = eigen.direction,
        ends = [direction.map((v) => -v * 1.5), direction.map((v) => v * 1.5)].map(world);
      const line = mesh(
        `eigen-${j}`,
        linePrism(ends[0], ends[1], 0.028),
        cubeFaces,
        'highlight',
        mapToken,
        practice && o.eigen ? 1 : 0,
      );
      const text = label(
        `eigen-label-${j}`,
        `λ ≈ ${eigen.value.toFixed(3)}`,
        [-1.5 + j * 1.5, 0.2, 1.7],
        mapToken,
        'highlight',
        practice && o.eigen ? 1 : 0,
      );
      text.layers = line.layers;
      if (o.eigen && !practice) {
        warpOps.push(
          { t: 'tween', id: line.id, to: { opacity: 1 } },
          { t: 'tween', id: text.id, to: { opacity: 1 } },
        );
      }
    });
  } else {
    p.a.forEach((row, index) => {
      const slice = equationSlice(row.map(numQ), numQ(p.b![index][0]), systemBound),
        points = slice.map(world);
      if (points.length >= 2) {
        const e = mesh(
          `equation-${index}`,
          n === 2 ? linePrism(points[0], points[1], 0.025) : points,
          n === 2 ? cubeFaces : [points.map((_, i) => i)],
          color(index),
          'A',
          n === 2 ? 1 : 0.36,
        );
        label(
          `equation-label-${index}`,
          `Equation ${index + 1}`,
          [points[0][0], points[0][1] + 0.1, points[0][2] + 0.12],
          'A',
          color(index),
        ).layers = e.layers;
      }
    });
    const point = world((practice ? entered : s.result).map((row) => numQ(row[0])));
    const e: Entity = {
      id: 'intersection',
      kind: 'sphere',
      pos: point,
      size: [0.1, 0.1, 0.1],
      color: 'highlight',
      tether: 'C',
      opacity: practice || s.classification !== 'none' ? 1 : 0,
      layers: {
        thing: { scale: view === 'lattice' ? [1, 1, 1] : [0, 0, 0] },
        shape: { scale: [1, 1, 1] },
        symbol: { scale: [1, 1, 1] },
        code: { scale: [1, 1, 1] },
      },
    };
    entities.push(e);
    if (!practice) {
      e.opacity = 0;
      warpOps.push({ t: 'tween', id: e.id, to: { opacity: s.classification === 'none' ? 0 : 1 } });
    }
    if (s.classification === 'infinite' && !practice)
      nullSpace(p.a)
        .slice(0, 2)
        .forEach((direction, index) => {
          const particular = s.result.map((row) => numQ(row[0])),
            a = world(particular.map((v, j) => v - systemBound * direction[j])),
            b = world(particular.map((v, j) => v + systemBound * direction[j]));
          const e = mesh(`free-${index}`, linePrism(a, b, 0.04), cubeFaces, 'highlight', 'C', 0);
          warpOps.push({ t: 'tween', id: e.id, to: { opacity: 1 } });
        });
  }
  label('result-label', 'Predict before the reveal', [0, 0.2, 2.3], 'C');
  if (p.kind === 'multiply') {
    for (let k = 0; k < n; k++) {
      const e: Entity = {
        id: `product-${k}`,
        kind: 'block',
        pos: [0, 0.15, -1.6],
        size: [0.2, 0.15, 0.2],
        color: color(k),
        tether: 'C',
        opacity: 0,
      };
      entities.push(e);
      label(`product-label-${k}`, '', [0, 0.3, -1.6], 'C', color(k), 0);
    }
  }
  const steps = s.steps.map((step, index): Step => {
    const next = { ...step, ops: [...step.ops], tethers: [...step.tethers] };
    if (index === 2 && !practice) next.ops.push(...warpOps);
    const match = /^matrix-cell-(\d)-(\d)$/.exec(step.id);
    if (match) {
      const i = Number(match[1]),
        j = Number(match[2]),
        id = `out-${i}-${j}`;
      if (!practice)
        next.ops.push(
          { t: 'tween', id: `label-${id}`, to: { text: { plain: fractionText(s.result[i][j]) } } },
          { t: 'tween', id, to: { opacity: 1 } },
        );
      if (p.kind === 'multiply') {
        const end = cellPos('out', i, j);
        s.products[id].forEach((value, k) => {
          next.ops.push({
            t: 'tween',
            id: `product-${k}`,
            to: { pos: cellPos('a', i, k), opacity: 1 },
            at: [0, 0.2],
          });
          next.ops.push({
            t: 'tween',
            id: `product-${k}`,
            to: {
              pos: [end[0] + (k - (n - 1) / 2) * 0.12, 0.5, end[2]],
              size: [0.12, 0.1 + Math.min(1, Math.abs(numQ(value)) * 0.025), 0.12],
              opacity: 1,
            },
            at: [0.2, 0.8],
          });
          next.ops.push({ t: 'tween', id: `product-${k}`, to: { opacity: 0 }, at: [0.8, 1] });
          next.ops.push({
            t: 'tween',
            id: `product-label-${k}`,
            to: {
              pos: [(k - (n - 1) / 2) * 0.8, 0.2, -1.6],
              text: {
                plain: `${fractionText(p.a[i][k])}×${fractionText(p.b![k][j])}=${fractionText(value)}`,
              },
              opacity: 1,
            },
          });
        });
      }
      next.ops.push({ t: 'pulse', ids: next.tethers.flatMap((t) => t.entities) });
    }
    if (index === stepsLength(s) - 1) {
      next.ops.push({
        t: 'tween',
        id: 'result-label',
        to: {
          text: {
            plain:
              p.kind === 'solve'
                ? `${s.classification}: ${s.answer}`
                : `${p.kind === 'determinant' ? 'det(A)' : 'det(C)'} = ${fractionText(matrixDet(target))}`,
          },
        },
      });
      if (p.kind === 'multiply')
        for (let k = 0; k < n; k++)
          next.ops.push({ t: 'tween', id: `product-${k}`, to: { opacity: 0 } });
    }
    // Both directions of each tether include the geometry representing that token.
    next.tethers = next.tethers.map((t) => ({
      ...t,
      entities: [
        ...new Set([
          ...t.entities.filter((id) => entities.some((e) => e.id === id)),
          ...(t.token === 'A'
            ? geometryIds.filter((id) => entities.find((e) => e.id === id)?.tether === 'A')
            : t.token === 'C'
              ? [
                  ...geometryIds.filter((id) => entities.find((e) => e.id === id)?.tether === 'C'),
                  'result-label',
                  ...(p.kind === 'solve' ? ['intersection'] : []),
                ]
              : []),
        ]),
      ],
    }));
    next.gaze =
      index < 2
        ? p.a[0].map((_, j) => `a-0-${j}`)
        : p.kind === 'solve'
          ? ['intersection']
          : ['unit', 'basis-0', 'basis-1'];
    return next;
  });
  if (practice)
    steps.forEach((step) => {
      step.predict = undefined;
      step.ops = step.ops.filter((op) => op.t === 'pulse');
    });
  if (practice)
    entities.find((e) => e.id === 'result-label')!.text = {
      plain:
        p.kind === 'determinant'
          ? 'Your entered basis determines the signed scale'
          : 'Your entered cells build this output',
    };
  return {
    id: `matrices:${p.expression}`,
    entities,
    steps,
    code: s.code[language],
    codeLanguage: language === 'numpy' ? 'python' : language,
    codeBindings: {
      A: 'A',
      B: 'B',
      C: 'C',
      det: 'det',
      i: 'A',
      j: 'B',
      k: 'C',
      images: 'A',
      basis: 'A',
      x: 'C',
    },
  };
}
const stepsLength = (s: MatrixSolution) => s.steps.length;
