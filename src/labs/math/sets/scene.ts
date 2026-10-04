import type { Entity, Op, SceneSpec, Step, Vec3 } from '../../../core/scene/spec';
import {
  cartesianProduct,
  formatSet,
  isSubset,
  powerSet,
  sameSet,
  validSetsConfig,
} from '../../../core/solvers/sets';
import type { SetMethod, SetsConfig, SetsProblem, SetsSolution } from '../../../core/solvers/sets';
import { validSetsBuildState } from './challenge';
import type { SetsBuildState } from './challenge';

export type SetsView = 'venn' | 'euler' | 'sieve' | 'power' | 'product' | 'relation';
const MAX_ENTITIES = 96;
export const setTokenId = (value: number) =>
  value < 0 ? `token-neg-${Math.abs(value)}` : `token-${value}`;
export function setTokenValue(id: string): number | null {
  const match = /^token-(neg-)?(\d+)$/.exec(id);
  return match ? Number(match[2]) * (match[1] ? -1 : 1) : null;
}
interface Region {
  name: 'A' | 'B' | 'C';
  center: [number, number];
  radius: number;
}
const bindings = { A: 'a', B: 'b', C: 'c', U: 'u', result: 'result' };
const canonical = (values: number[]) => [...values].sort((a, b) => a - b);
function title(id: string, text: string, pos: Vec3, tether = 'result'): Entity {
  return {
    id,
    kind: 'label',
    pos,
    color: 'paper',
    text: { plain: text },
    tether,
    scale: [0.78, 0.78, 0.78],
    layers: { code: { opacity: 0 } },
  };
}
function bar(id: string, a: Vec3, b: Vec3, description: string, color = 'paper'): Entity {
  const dx = b[0] - a[0],
    dz = b[2] - a[2],
    length = Math.hypot(dx, dz);
  return {
    id,
    kind: 'bar',
    pos: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
    rot: [0, -Math.atan2(dz, dx), 0],
    size: [length, 0.035, 0.035],
    color,
    opacity: 0.4,
    text: { plain: description },
    tether: 'result',
    layers: { code: { opacity: 0.025 } },
  };
}
function token(value: number, pos: Vec3, selected = false): Entity {
  return {
    id: setTokenId(value),
    kind: 'token',
    pos,
    text: { plain: `${value}${selected ? ' ✓' : ''}` },
    color: selected ? 'highlight' : 'paper',
    glow: selected ? 0.24 : 0,
    tether: 'result',
    scale: [0.78, 0.78, 0.78],
    layers: {
      shape: { pos: [pos[0], 0.28, pos[2]] },
      symbol: { pos: [pos[0], 0.18, pos[2]], scale: [0.7, 0.7, 0.7] },
      code: { opacity: 0.04 },
    },
  };
}
function frame(): Entity[] {
  const x = 3.45,
    z = 3.15,
    y = 0.015;
  return [
    bar('universe-left', [-x, y, -z], [-x, y, z], 'Left boundary of universe U'),
    bar('universe-right', [x, y, -z], [x, y, z], 'Right boundary of universe U'),
    bar('universe-top', [-x, y, z], [x, y, z], 'Top boundary of universe U'),
    bar('universe-bottom', [-x, y, -z], [x, y, -z], 'Bottom boundary of universe U'),
    title('universe', 'U: every displayed element', [0, 0.05, 3.35], 'u'),
  ];
}
function regionLayout(sets: SetsConfig, view: SetsView, three: boolean): Region[] {
  if (three)
    return [
      { name: 'A', center: [-1.15, 0.55], radius: 1.95 },
      { name: 'B', center: [1.15, 0.55], radius: 1.95 },
      { name: 'C', center: [0, -1.25], radius: 1.95 },
    ];
  if (view === 'euler') {
    if (sameSet(sets.A, sets.B))
      return [
        { name: 'A', center: [0, 0], radius: 2.05 },
        { name: 'B', center: [0, 0], radius: 2.05 },
      ];
    if (isSubset(sets.A, sets.B))
      return [
        { name: 'A', center: [-0.12, 0.05], radius: 1.05 },
        { name: 'B', center: [0, 0], radius: 2.25 },
      ];
    if (isSubset(sets.B, sets.A))
      return [
        { name: 'A', center: [0, 0], radius: 2.25 },
        { name: 'B', center: [0.12, 0.05], radius: 1.05 },
      ];
    if (!sets.A.some((value) => sets.B.includes(value)))
      return [
        { name: 'A', center: [-1.65, 0], radius: 1.42 },
        { name: 'B', center: [1.65, 0], radius: 1.42 },
      ];
  }
  return [
    { name: 'A', center: [-1.15, 0], radius: 2 },
    { name: 'B', center: [1.15, 0], radius: 2 },
  ];
}
function contains(region: Region, x: number, z: number) {
  return Math.hypot(x - region.center[0], z - region.center[1]) < region.radius;
}
function membershipPoints(
  values: number[],
  sets: SetsConfig,
  regions: Region[],
): Map<number, Vec3> {
  const result = new Map<number, Vec3>();
  const masks = new Map<string, number[]>();
  for (const value of values) {
    const mask = regions.map((r) => (sets[r.name].includes(value) ? '1' : '0')).join('');
    masks.set(mask, [...(masks.get(mask) ?? []), value]);
  }
  for (const [mask, members] of masks) {
    const candidates: [number, number][] = [];
    for (let ix = -10; ix <= 10; ix++)
      for (let iz = -10; iz <= 10; iz++) {
        const x = ix * 0.3,
          z = iz * 0.3;
        if (
          regions.every(
            (r, i) =>
              Math.abs(Math.hypot(x - r.center[0], z - r.center[1]) - r.radius) > 0.1 &&
              contains(r, x, z) === (mask[i] === '1'),
          )
        )
          candidates.push([x, z]);
      }
    const inside = regions.filter((_, i) => mask[i] === '1');
    const preferred: [number, number] = inside.length
      ? [
          inside.reduce((n, r) => n + r.center[0], 0) / inside.length,
          inside.reduce((n, r) => n + r.center[1], 0) / inside.length,
        ]
      : [0, 2.75];
    candidates.sort(
      (a, b) =>
        Math.hypot(a[0] - preferred[0], a[1] - preferred[1]) -
          Math.hypot(b[0] - preferred[0], b[1] - preferred[1]) ||
        a[1] - b[1] ||
        a[0] - b[0],
    );
    const chosen: [number, number][] = [];
    for (const value of canonical(members)) {
      const point = candidates.find((p) =>
        chosen.every((q) => Math.abs(p[0] - q[0]) > 0.55 || Math.abs(p[1] - q[1]) > 0.37),
      );
      if (!point)
        throw new RangeError(
          'This membership region is too crowded for readable element tokens. Use a smaller universe in this view.',
        );
      chosen.push(point);
      result.set(value, [point[0], 0.55, point[1]]);
    }
  }
  return result;
}
function venn(sets: SetsConfig, selected: number[], view: SetsView, three = false): Entity[] {
  const regions = regionLayout(sets, view, three),
    positions = membershipPoints(canonical(sets.U), sets, regions);
  const entities = frame();
  for (const region of regions) {
    const id = `set-${region.name.toLowerCase()}`,
      pos: Vec3 = [region.center[0], 0.85, region.center[1]];
    entities.push({
      id,
      kind: 'sphere',
      pos,
      size: [region.radius, region.radius, region.radius],
      color: region.name === 'A' ? 'whole' : region.name === 'B' ? 'part' : 'code',
      opacity: 0.19,
      text: { plain: `Set ${region.name}: ${formatSet(sets[region.name])}` },
      tether: region.name.toLowerCase(),
      layers: {
        shape: { pos: [pos[0], 0.12, pos[2]], scale: [1, 0.045, 1] },
        symbol: { pos: [pos[0], 0.08, pos[2]], scale: [1, 0.02, 1] },
        code: { opacity: 0.025 },
      },
    });
    entities.push(
      title(
        `${id}-label`,
        `${region.name}${sets[region.name].length ? '' : ' = ∅'}`,
        [region.center[0], 0.32, region.center[1] + region.radius + 0.16],
        region.name.toLowerCase(),
      ),
    );
  }
  for (const value of canonical(sets.U))
    entities.push(token(value, positions.get(value)!, selected.includes(value)));
  entities.push(
    title(
      'result',
      selected.length ? `Selected ${formatSet(selected)}` : 'Result tray',
      [0, 0.08, -3.38],
    ),
  );
  return entities;
}
function rowPoint(index: number, count: number, z: number, centerX = 0): Vec3 {
  const columns = Math.min(6, Math.max(1, count));
  return [
    centerX + ((index % columns) - (columns - 1) / 2) * 0.61,
    0.55,
    z - Math.floor(index / columns) * 0.47,
  ];
}
function sieve(sets: SetsConfig, selected: number[], resolved: boolean): Entity[] {
  const entities = frame();
  entities.push(
    bar(
      'set-a',
      [-1.4, 0.06, 0.3],
      [1.4, 0.06, 0.3],
      'Predicate sieve: test each universe element',
      'whole',
    ),
  );
  entities.push(title('set-a-label', 'Predicate sieve', [0, 0.35, 0.95], 'a'));
  entities.push(title('set-b', 'Rejected by the condition', [1.75, 0.18, -1.75], 'b'));
  entities.push(title('result', 'Pass the condition', [-1.75, 0.18, -1.75]));
  const passed = canonical(sets.U.filter((n) => selected.includes(n))),
    failed = canonical(sets.U.filter((n) => !selected.includes(n)));
  for (const [i, value] of canonical(sets.U).entries()) {
    const pass = selected.includes(value),
      group = pass ? passed : failed;
    const pos = resolved
      ? ([
          (pass ? -1.6 : 1.6) + ((group.indexOf(value) % 3) - 1) * 0.58,
          0.55,
          -0.45 - Math.floor(group.indexOf(value) / 3) * 0.45,
        ] as Vec3)
      : rowPoint(i, sets.U.length, 2.25);
    entities.push(token(value, pos, resolved && pass));
    if (resolved && !pass) entities[entities.length - 1].text = { plain: `${value} ×` };
  }
  return entities;
}
function cubePosition(mask: number, n: number): Vec3 {
  return [
    n ? (mask & 1 ? 1.3 : -1.3) : 0,
    n === 3 ? (mask & 4 ? 3 : 0.4) : 0.55,
    n >= 2 ? (mask & 2 ? 1.3 : -1.3) : 0,
  ];
}
function subsetScene(a: number[], selected: number[][]): Entity[] {
  const source = canonical(a),
    subsets = powerSet(source),
    n = source.length,
    entities: Entity[] = [];
  entities.push(title('set-a', `A = ${formatSet(source)}`, [-2.25, 0.15, 2.45], 'a'));
  entities.push(title('set-b', `${subsets.length} possible subsets`, [2.0, 0.15, 2.45], 'b'));
  entities.push(title('universe', 'Each corner is one subset of A', [0, 0.08, -2.35], 'u'));
  entities.push(
    title('result', `${selected.length} of ${subsets.length} subsets selected`, [0, 0.08, -2.8]),
  );
  for (let mask = 0; mask < subsets.length; mask++) {
    const pos = cubePosition(mask, n),
      picked = selected.some((subset) => sameSet(subset, subsets[mask]));
    entities.push({
      id: `subset-node-${mask}`,
      kind: 'sphere',
      pos,
      size: [0.11, 0.11, 0.11],
      color: picked ? 'highlight' : 'mint',
      opacity: 0.65,
      text: { plain: `Corner ${mask}: ${formatSet(subsets[mask])}` },
      tether: 'result',
      layers: { code: { opacity: 0.025 } },
    });
    entities.push({
      id: `subset-${mask}`,
      kind: 'token',
      pos: [pos[0], pos[1] + 0.2, pos[2]],
      color: picked ? 'highlight' : 'paper',
      scale: [0.65, 0.65, 0.65],
      text: { plain: `${formatSet(subsets[mask])}${picked ? ' ✓' : ''}` },
      tether: 'result',
      layers: {
        shape: { scale: [0.62, 0.62, 0.62] },
        symbol: { scale: [0.6, 0.6, 0.6] },
        code: { opacity: 0.04 },
      },
    });
    for (let bit = 0; bit < n; bit++)
      if (!(mask & (1 << bit))) {
        const to = cubePosition(mask | (1 << bit), n),
          description = `Add ${source[bit]}: ${formatSet(subsets[mask])} → ${formatSet(subsets[mask | (1 << bit)])}`;
        if (bit === 2)
          for (let dot = 1; dot <= 3; dot++)
            entities.push({
              id: `edge-${mask}-${bit}-${dot}`,
              kind: 'sphere',
              pos: [pos[0], pos[1] + ((to[1] - pos[1]) * dot) / 4, pos[2]],
              size: [0.045, 0.045, 0.045],
              color: 'paper',
              opacity: 0.5,
              text: { plain: description },
              tether: 'result',
              layers: { code: { opacity: 0.025 } },
            });
        else entities.push(bar(`edge-${mask}-${bit}`, pos, to, description));
      }
  }
  return entities;
}
function pairScene(a: number[], b: number[], pairs: [number, number][]): Entity[] {
  const columns = canonical(a),
    rows = canonical(b),
    dx = columns.length > 1 ? 5.8 / (columns.length - 1) : 1,
    dz = rows.length > 1 ? 3.6 / (rows.length - 1) : 1;
  const x = (i: number) => (columns.length > 1 ? -2.9 + i * dx : 0),
    z = (j: number) => (rows.length > 1 ? -1.8 + j * dz : 0);
  const entities: Entity[] = [
    title('set-a', 'A: input columns', [0, 0.08, -2.65], 'a'),
    title('set-b', 'B: output rows', [-3.25, 0.08, 2.45], 'b'),
    title('universe', 'Ordered pairs from A × B', [0, 0.08, 2.95], 'u'),
    title('result', `${pairs.length} ordered pairs selected`, [0, 0.08, -3.14]),
  ];
  for (let i = 0; i <= columns.length; i++) {
    const px = columns.length === 1 ? (i ? 0.5 : -0.5) : -2.9 - dx / 2 + i * dx;
    entities.push(
      bar(
        `column-line-${i}`,
        [px, 0.025, -1.8 - dz / 2],
        [px, 0.025, 1.8 + dz / 2],
        'A column boundary',
        'mint',
      ),
    );
  }
  for (let j = 0; j <= rows.length; j++) {
    const pz = rows.length === 1 ? (j ? 0.5 : -0.5) : -1.8 - dz / 2 + j * dz;
    entities.push(
      bar(
        `row-line-${j}`,
        [-2.9 - dx / 2, 0.025, pz],
        [2.9 + dx / 2, 0.025, pz],
        'B row boundary',
        'mint',
      ),
    );
  }
  columns.forEach((value, i) =>
    entities.push(title(`column-${i}`, String(value), [x(i), 0.12, -2.35], 'a')),
  );
  rows.forEach((value, j) =>
    entities.push(title(`row-${j}`, String(value), [-3.42, 0.12, z(j)], 'b')),
  );
  for (let j = 0; j < rows.length; j++)
    for (let i = 0; i < columns.length; i++) {
      const left = columns[i],
        right = rows[j],
        picked = pairs.some(([a, b]) => a === left && b === right),
        id = j * columns.length + i;
      entities.push({
        id: `cell-${id}`,
        kind: 'block',
        pos: [x(i), picked ? 0.17 : 0.04, z(j)],
        size: [Math.min(0.48, dx * 0.65), picked ? 0.18 : 0.035, Math.min(0.44, dz * 0.65)],
        color: picked ? 'whole' : 'mint',
        opacity: picked ? 1 : 0.24,
        text: { plain: `Pair (${left}, ${right})${picked ? ', selected' : ', not selected'}` },
        tether: 'result',
        layers: {
          shape: { scale: [0.92, 0.45, 0.92] },
          symbol: { scale: [0.8, 0.3, 0.8] },
          code: { opacity: 0.035 },
        },
      });
      if (picked)
        entities.push({
          id: `pair-mark-${id}`,
          kind: 'label',
          pos: [x(i), 0.31, z(j)],
          text: { plain: '✓' },
          color: 'paper',
          scale: [0.72, 0.72, 0.72],
          tether: 'result',
          layers: { code: { opacity: 0 } },
        });
    }
  return entities;
}
function ensureBudget(entities: Entity[]): Entity[] {
  if (entities.length > MAX_ENTITIES || entities.filter((e) => e.kind === 'sphere').length > 25)
    throw new RangeError(
      'This arrangement exceeds the readable visual workspace. Use smaller sets for this view.',
    );
  return entities;
}
export function canRenderSetsScene(problem: SetsProblem, view: SetsView): boolean {
  if (!validSetsConfig(problem.sets)) return false;
  if (view === 'power') return problem.sets.A.length <= 3;
  if (view === 'product' || view === 'relation') {
    const a = problem.sets.A.length,
      b = problem.sets.B.length;
    return a * b <= 64 && 2 * a * b + 2 * a + 2 * b + 6 <= MAX_ENTITIES;
  }
  try {
    if (view === 'sieve') return true;
    venn(problem.sets, [], view, /\bC\b/.test(problem.expression));
    return true;
  } catch {
    return false;
  }
}
function buildStep(
  titleText: string,
  description: string,
  entities: Entity[],
  latex: string,
): Step {
  const refs = ['set-a', 'set-b', 'set-c', 'universe', 'result'].filter((id) =>
    entities.some((e) => e.id === id),
  );
  return {
    id: 'arrange',
    title: titleText,
    latexAfter: latex,
    say: {
      quick: description,
      standard: description,
      deep: `${description} Inspect the labelled elements and use the same arrangement in either dimension. Selected items carry a check mark as well as a colour change.`,
    },
    ops: [],
    tethers: refs.map((id) => ({
      token: id === 'universe' ? 'u' : id === 'result' ? 'result' : id.slice(4),
      entities: [id],
      color: id === 'set-a' ? 'whole' : id === 'set-b' ? 'part' : 'paper',
    })),
    gaze: refs,
    aria: description,
  };
}
export function setBuildScene(
  build: SetsBuildState,
  view: SetsView,
  givens?: SetsConfig,
): SceneSpec {
  if (!validSetsBuildState(build, givens))
    throw new RangeError('Use finite set elements and valid selected subsets or ordered pairs.');
  const sets: SetsConfig = {
    A: canonical(build.a),
    B: canonical(build.b),
    C: [],
    U: canonical(build.universe),
  };
  const entities = ensureBudget(
    view === 'power'
      ? subsetScene(build.a, build.subsets ?? [])
      : view === 'product' || view === 'relation'
        ? pairScene(build.a, build.b, build.pairs ?? [])
        : view === 'sieve'
          ? sieve(sets, build.selected, true)
          : venn(sets, build.selected, view),
  );
  const special = view === 'power' || view === 'product' || view === 'relation';
  const description =
    view === 'power'
      ? 'Choose the subsets represented by the cube corners. Each edge adds exactly one element.'
      : view === 'product'
        ? 'Choose ordered pairs in the A-column and B-row grid.'
        : view === 'relation'
          ? 'Build a relation; a function chooses exactly one output in each input column.'
          : view === 'sieve'
            ? 'Selected elements pass the sieve; unselected elements remain on the rejected side.'
            : 'Move universe elements between their real A-only, B-only, shared and outside memberships; choose result members separately.';
  const code = `A = set(${JSON.stringify(sets.A)})\nB = set(${JSON.stringify(sets.B)})\nU = set(${JSON.stringify(sets.U)})\n${view === 'power' ? `result = ${JSON.stringify(build.subsets ?? [])}` : special ? `result = ${JSON.stringify(build.pairs ?? [])}` : `result = set(${JSON.stringify(canonical(build.selected))})`}`;
  const latex =
    view === 'power'
      ? String.raw`\mathcal{P}(A)`
      : special
        ? String.raw`A \times B`
        : String.raw`\htmlClass{tk-result}{\{${canonical(build.selected).join(',')}\}}`;
  return {
    id: 'sets-build',
    entities,
    steps: [buildStep('Your live set arrangement', description, entities, latex)],
    code,
    codeLanguage: 'Python',
    codeBindings: bindings,
  };
}
export function setScene(
  problem: SetsProblem,
  solution: SetsSolution,
  view: SetsView,
  method: SetMethod = solution.method,
): SceneSpec {
  const actualView = solution.kind === 'builder' ? 'sieve' : view;
  if (!canRenderSetsScene(problem, actualView))
    throw new RangeError(
      'This set view needs fewer elements to remain readable. The exact set result is still available.',
    );
  const special = actualView === 'power' || actualView === 'product' || actualView === 'relation';
  if (special) {
    const build: SetsBuildState = {
      universe: problem.sets.U,
      a: problem.sets.A,
      b: problem.sets.B,
      selected: [],
      ...(actualView === 'power'
        ? { subsets: powerSet(problem.sets.A) }
        : { pairs: cartesianProduct(problem.sets.A, problem.sets.B) }),
    };
    const scene = setBuildScene(build, actualView);
    return {
      ...scene,
      id: `sets:${problem.expression}:${JSON.stringify(problem.sets)}:${method}`,
      steps: solution.steps.map((step) => ({
        ...step,
        ops: [],
        tethers: step.tethers.filter((t) =>
          t.entities.every((id) => scene.entities.some((e) => e.id === id)),
        ),
      })),
      code: solution.code.python,
    };
  }
  const entities = ensureBudget(
    actualView === 'sieve'
      ? sieve(problem.sets, solution.result, false)
      : venn(problem.sets, [], actualView, /\bC\b/.test(problem.expression)),
  );
  const final = solution.steps.length - 1,
    resultEntity = entities.find((e) => e.id === 'result')!;
  resultEntity.opacity = 0;
  resultEntity.text = { plain: `Result ${formatSet(solution.result)}` };
  const steps = solution.steps.map((step, index) => {
    const ops: Op[] = step.ops.filter((op) =>
      op.t === 'camera' || op.t === 'pulse'
        ? op.t === 'camera' || op.ids.every((id) => entities.some((e) => e.id === id))
        : op.t === 'add' || op.t === 'morph' || entities.some((e) => e.id === op.id),
    );
    if (index === 1)
      ops.push({
        t: 'pulse',
        ids: entities
          .filter((e) => ['set-a', 'set-b', 'set-c', 'universe'].includes(e.id))
          .map((e) => e.id),
      });
    if (index === final) {
      ops.push({ t: 'tween', id: 'result', to: { opacity: 1 }, ms: 420 });
      const passed = canonical(solution.result),
        failed = canonical(problem.sets.U.filter((value) => !passed.includes(value)));
      for (const value of canonical(problem.sets.U)) {
        const selected = passed.includes(value),
          group = selected ? passed : failed;
        const target =
          actualView === 'sieve'
            ? ([
                (selected ? -1.6 : 1.6) + ((group.indexOf(value) % 3) - 1) * 0.58,
                0.55,
                -0.45 - Math.floor(group.indexOf(value) / 3) * 0.45,
              ] as Vec3)
            : selected
              ? rowPoint(passed.indexOf(value), passed.length, -2.5)
              : undefined;
        ops.push({
          t: 'tween',
          id: setTokenId(value),
          to: {
            ...(target ? { pos: target } : {}),
            color: selected ? 'highlight' : 'paper',
            glow: selected ? 0.22 : 0,
            opacity: selected ? 1 : 0.25,
          },
          ms: 500,
          ease: 'outCubic',
        });
      }
      if (actualView !== 'sieve')
        for (const entity of entities.filter(
          (e) => e.id === 'set-a' || e.id === 'set-b' || e.id === 'set-c',
        ))
          ops.push({ t: 'tween', id: entity.id, to: { opacity: 0.055 }, ms: 480 });
    }
    return { ...step, ops };
  });
  return {
    id: `sets:${problem.expression}:${JSON.stringify(problem.sets)}:${method}`,
    entities,
    steps,
    code: solution.code.python,
    codeLanguage: 'Python',
    codeBindings: bindings,
  };
}
