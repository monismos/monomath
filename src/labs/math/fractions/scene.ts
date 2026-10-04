import type { Entity, Op, SceneSpec, Step, Vec3 } from '../../../core/scene/spec';
import type { Fraction, FractionProblem } from '../../../core/solvers/fractions';
import type { FractionBuildState } from './challenge';
import { validBuildState } from './challenge';
import { fractionLatex, fractionText } from '../../../core/solvers/fractions';
export type FractionShape = 'pie' | 'bar' | 'stack';
const MAX_SCENE_ENTITIES = 96;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a: number, b: number) => Math.abs(a * b) / gcd(a, b);
const pieceCount = (value: Fraction, cuts: number) =>
  Math.max(cuts, Math.ceil(Math.abs(value.n / value.d)) * cuts);
export function canRenderFractionScene(
  problem: FractionProblem,
  result: Fraction,
  method: string,
): boolean {
  const a = problem.a,
    b = problem.b,
    common = b ? (method === 'product' ? a.d * b.d : lcm(a.d, b.d)) : a.d;
  const values = [a, b].filter((value): value is Fraction => !!value);
  if (
    values.some(
      (value) =>
        !Number.isSafeInteger(value.n) ||
        !Number.isSafeInteger(value.d) ||
        value.d < 1 ||
        value.d > 24 ||
        Math.ceil(Math.abs(value.n / value.d)) > 4,
    )
  )
    return false;
  const recut = b && (problem.kind === 'add' || problem.kind === 'subtract');
  if (problem.kind === 'multiply' && b && a.d * b.d > 24) return false;
  if (problem.kind === 'divide' && (common > 24 || Math.ceil(Math.abs(result.n / result.d)) > 24))
    return false;
  if (problem.kind !== 'divide' && result.d > 24) return false;
  if (recut && common > 24) return false;
  const operands = pieceCount(a, a.d) + (b ? pieceCount(b, b.d) : 0);
  const recuts = recut ? pieceCount(a, common) + pieceCount(b!, common) : 0;
  const model =
    problem.kind === 'multiply' && b
      ? Math.max(a.d, Math.abs(a.n)) * Math.max(b.d, Math.abs(b.n))
      : problem.kind === 'divide'
        ? Math.max(1, Math.ceil(Math.abs(result.n / result.d)))
        : pieceCount(result, recut ? common : result.d);
  return (
    Number.isSafeInteger(model) &&
    model <= 96 &&
    operands + recuts + model + (b ? 3 : 2) <= MAX_SCENE_ENTITIES
  );
}
function pieces(
  prefix: string,
  value: Fraction,
  denominator: number,
  shape: FractionShape,
  center: Vec3,
  color: string,
  selected?: number[],
): Entity[] {
  const count = pieceCount(value, denominator);
  const amount = (Math.abs(value.n) * denominator) / value.d;
  if (
    !Number.isInteger(denominator) ||
    denominator < 1 ||
    denominator > 24 ||
    !Number.isSafeInteger(count) ||
    count > MAX_SCENE_ENTITIES ||
    !Number.isInteger(amount)
  )
    throw new RangeError('This model needs grouped cuts beyond the visual workspace limit.');
  return Array.from({ length: count }, (_, i) => {
    const unit = Math.floor(i / denominator),
      sector = i % denominator,
      angle = (sector * 2 * Math.PI) / denominator;
    const unitCount = count / denominator;
    const x = center[0] + ((unit % 3) - (Math.min(3, unitCount) - 1) / 2) * 1.9;
    const z = center[2] + (Math.floor(unit / 3) - (Math.ceil(unitCount / 3) - 1) / 2) * 1.9;
    const picked = selected ? selected.includes(i) : i < amount;
    const pos: Vec3 =
      shape === 'pie'
        ? [x, center[1], z]
        : shape === 'bar'
          ? [
              center[0] + ((sector - (denominator - 1) / 2) * 2.5) / denominator,
              center[1],
              center[2] + (unit - (unitCount - 1) / 2) * 0.55,
            ]
          : [center[0] + unit * 0.8, center[1] + sector * 0.14, center[2]];
    return {
      id: i === 0 ? prefix : `${prefix}-${i}`,
      kind: shape === 'pie' ? 'slice' : 'block',
      pos,
      size:
        shape === 'pie'
          ? [0.86, 0.18, 0.86]
          : shape === 'bar'
            ? [2.4 / denominator, 0.2, 0.42]
            : [0.65, 0.13, 0.65],
      arc: [angle + 0.008, angle + (2 * Math.PI) / denominator - 0.008],
      color: picked ? (value.n < 0 ? 'error' : color) : 'mint',
      opacity: picked ? 1 : 0.35,
      tether: prefix.split('-')[0],
      text: {
        plain: `${prefix.split('-')[0]} piece ${i + 1} of ${denominator}${picked ? ', selected' : ', unselected'}`,
      },
      layers: {
        shape: {
          pos: [pos[0] + Math.cos(angle) * 0.025, pos[1], pos[2] + Math.sin(angle) * 0.025],
        },
        symbol: { scale: [0.72, 0.72, 0.72] },
        code: { opacity: 0.08 },
      },
    };
  });
}
function label(id: string, text: string, pos: Vec3): Entity {
  return {
    id,
    kind: 'label',
    pos,
    color: 'paper',
    tether: id.split('-')[0],
    text: { plain: text },
    layers: {
      thing: { opacity: 0 },
      shape: { opacity: 1 },
      symbol: { opacity: 1 },
      code: { opacity: 0 },
    },
  };
}
export function fractionScene(
  problem: FractionProblem,
  result: Fraction,
  steps: Step[],
  shape: FractionShape,
  method: string,
): SceneSpec {
  if (!canRenderFractionScene(problem, result, method))
    throw new RangeError('This exact result exceeds the individual-piece visual workspace.');
  const a = problem.a,
    b = problem.b;
  const left = pieces('left-piece', a, a.d, shape, [-1.7, 0.06, 0.5], 'whole');
  const right = b ? pieces('right-piece', b, b.d, shape, [1.6, 0.06, 0.5], 'part') : [];
  const common = b ? (method === 'product' ? a.d * b.d : lcm(a.d, b.d)) : a.d;
  const resultCuts =
    problem.kind === 'add' || problem.kind === 'subtract' ? common : Math.min(24, result.d);
  let out = pieces('result-piece', result, resultCuts, shape, [0, 0.07, -1.5], 'result').map(
    (e) => ({ ...e, opacity: 0, layers: { ...e.layers, code: { opacity: 0 } } }),
  );
  if (problem.kind === 'divide' || problem.kind === 'multiply') out = [];
  const resultLabel: Entity = {
    ...label(
      'result-label',
      `${result.n}/${result.d}${problem.kind === 'divide' ? ' measuring units' : ''}`,
      [0, 0.02, -2.7],
    ),
    opacity: 0,
    layers: { code: { opacity: 0 } },
  };
  const entities = [
    ...left,
    ...right,
    ...out,
    label('left-label', `${a.n}/${a.d}${a.n < 0 ? ' (negative)' : ''}`, [-1.7, 0.02, 1.8]),
    ...(b ? [label('right-label', `${b.n}/${b.d}`, [1.6, 0.02, 1.8])] : []),
    resultLabel,
  ];
  let model: Entity[] = [];
  if (problem.kind === 'multiply' && b) {
    const columns = Math.max(a.d, Math.abs(a.n)),
      rows = Math.max(b.d, Math.abs(b.n));
    model = Array.from({ length: columns * rows }, (_, i) => {
      const col = i % columns,
        row = Math.floor(i / columns),
        overlap = col < Math.abs(a.n) && row < Math.abs(b.n);
      return {
        id: i === 0 ? 'result-piece' : `result-piece-${i}`,
        kind: 'block',
        pos: [
          ((col - (columns - 1) / 2) * 2.4) / a.d,
          0.05,
          ((row - (rows - 1) / 2) * 2.4) / b.d,
        ] as Vec3,
        size: [2.34 / a.d, 0.18, 2.34 / b.d] as Vec3,
        color: overlap
          ? a.n * b.n < 0
            ? 'error'
            : 'result'
          : col < Math.abs(a.n)
            ? 'whole'
            : row < Math.abs(b.n)
              ? 'part'
              : 'mint',
        opacity: 0,
        tether: overlap ? 'result' : col < Math.abs(a.n) ? 'left' : 'right',
        text: {
          plain: `Area cell ${i + 1}, unit column ${Math.floor(col / a.d) + 1}, unit row ${Math.floor(row / b.d) + 1}${overlap ? ', product overlap' : ''}`,
        },
        layers: {
          shape: { scale: [0.96, 0.96, 0.96] },
          symbol: { scale: [0.78, 0.78, 0.78] },
          code: { opacity: 0 },
        },
      };
    });
  }
  if (problem.kind === 'divide' && b) {
    const fits = Math.abs(result.n / result.d),
      count = Math.max(1, Math.ceil(fits));
    model = Array.from({ length: count }, (_, i) => ({
      id: i === 0 ? 'result-piece' : `result-piece-${i}`,
      kind: 'block',
      pos: [((i % 8) - 3.5) * 0.55, 0.08, -Math.floor(i / 8) * 0.55] as Vec3,
      size: [0.5 * (fits === 0 ? 1 : Math.min(1, fits - i)), 0.2, 0.35] as Vec3,
      color: fits === 0 ? 'mint' : result.n < 0 ? 'error' : 'result',
      opacity: 0,
      tether: 'result',
      text: {
        plain:
          fits === 0
            ? 'Empty measuring-unit outline: zero units fit'
            : `Measuring unit ${i + 1}${fits - i < 1 ? `, ${fractionText({ n: Math.abs(result.n) - i * result.d, d: result.d })} of a full unit` : ''}`,
      },
      layers: {
        shape: { scale: [0.96, 0.96, 0.96] },
        symbol: { scale: [0.8, 0.8, 0.8] },
        code: { opacity: 0 },
      },
    }));
  }
  entities.push(...model);
  const recut = common <= 24 && b && (problem.kind === 'add' || problem.kind === 'subtract');
  const recutEntities = recut
    ? [
        ...pieces('left-cut', a, common, shape, [-1.7, 0.06, 0.5], 'whole'),
        ...pieces('right-cut', b!, common, shape, [1.6, 0.06, 0.5], 'part'),
      ].map((e) => ({ ...e, opacity: 0, tether: e.id.startsWith('left') ? 'left' : 'right' }))
    : [];
  entities.push(...recutEntities);
  const authored = steps.map((step, index) => {
    const ops: Op[] = [...step.ops];
    if (step.id.endsWith('-rewrite') && recut) {
      [...left, ...right].forEach((e) =>
        ops.push({ t: 'tween', id: e.id, to: { opacity: 0 }, ms: 450 }),
      );
      recutEntities.forEach((e) =>
        ops.push({ t: 'tween', id: e.id, to: { opacity: e.color === 'mint' ? 0.35 : 1 }, ms: 450 }),
      );
    }
    if (model.length && index === 2) {
      [...left, ...right].forEach((e) =>
        ops.push({ t: 'tween', id: e.id, to: { opacity: 0.08 }, ms: 450 }),
      );
      model.forEach((e) => ops.push({ t: 'tween', id: e.id, to: { opacity: 0.8 }, ms: 450 }));
    }
    if (index === steps.length - 1) {
      [...left, ...right, ...recutEntities].forEach((e) =>
        ops.push({
          t: 'tween',
          id: e.id,
          to: { opacity: 0.08, pos: [e.pos[0] * 1.2, e.pos[1], e.pos[2] + 0.65] },
          ms: 450,
        }),
      );
      out.forEach((e, i) =>
        ops.push({
          t: 'tween',
          id: e.id,
          to: {
            opacity: i < Math.round((Math.abs(result.n) * resultCuts) / result.d) ? 1 : 0.3,
            pos: [e.pos[0], e.pos[1], e.pos[2] + 1.5],
          },
          ms: 450,
        }),
      );
      ops.push({ t: 'tween', id: 'result-label', to: { opacity: 1 }, ms: 450 });
    }
    const tethers = step.tethers.map((t) => ({
      ...t,
      entities:
        t.token === 'result' && problem.kind === 'multiply'
          ? model.some((e) => e.tether === 'result')
            ? model.filter((e) => e.tether === 'result').map((e) => e.id)
            : ['result-piece']
          : t.entities,
    }));
    return { ...step, ops, tethers };
  });
  const op = { add: '+', subtract: '-', multiply: '*', divide: '/' }[problem.kind as 'add'] ?? '';
  const code = `from fractions import Fraction\nleft = Fraction(${a.n}, ${a.d})\n${b ? `right = Fraction(${b.n}, ${b.d})\nresult = left ${op} right` : 'result = left'}\nprint(result)  # ${result.n}/${result.d}`;
  return { id: `fractions:${problem.raw}:${method}`, entities, steps: authored, code };
}
export function buildScene(
  state: FractionBuildState,
  shape: FractionShape,
  givens?: { a: Fraction; b?: Fraction },
): SceneSpec {
  if (!validBuildState(state)) throw new RangeError('Use bounded, distinct equal pieces.');
  if (
    state.fits !== undefined &&
    (!Number.isInteger(state.fits) || state.fits !== state.selected.length)
  )
    throw new RangeError('The measuring-unit count must match the placed bars.');
  if (
    (state.rows !== undefined || state.columns !== undefined) &&
    (!Number.isInteger(state.rows) ||
      !Number.isInteger(state.columns) ||
      state.rows! < 1 ||
      state.columns! < 1 ||
      state.rows! * state.columns! !== state.denominator)
  )
    throw new RangeError('The grid cuts must match its rows and columns.');
  const total = state.denominator * (state.units ?? 1);
  const quantity: Fraction = { n: total, d: state.denominator };
  const hasOperands = !!(givens?.b && state.leftCuts && state.rightCuts),
    hasGroups = !!(givens && state.groups);
  const extra =
    hasOperands && givens?.b
      ? pieceCount(givens.a, state.leftCuts!) + pieceCount(givens.b, state.rightCuts!) + 2
      : hasGroups && givens
        ? pieceCount(givens.a, givens.a.d) + 2
        : 0;
  if (total + extra > MAX_SCENE_ENTITIES)
    throw new RangeError('This construction needs too many individual pieces.');
  const center: Vec3 = hasOperands ? [0, 0.07, -1.3] : hasGroups ? [1.5, 0.07, 0] : [0, 0.07, 0];
  let entities = pieces(
    'result-piece',
    quantity,
    state.denominator,
    shape,
    center,
    'part',
    state.selected,
  );
  if (state.fits !== undefined)
    entities = Array.from({ length: state.denominator }, (_, i) => ({
      id: i === 0 ? 'result-piece' : `result-piece-${i}`,
      kind: 'block',
      pos: [((i - (state.denominator - 1) / 2) * 3.5) / state.denominator, 0.05, 0] as Vec3,
      size: [3.4 / state.denominator, 0.2, 0.45] as Vec3,
      color: state.selected.includes(i) ? 'part' : 'mint',
      opacity: state.selected.includes(i) ? 1 : 0.3,
      tether: 'result',
      text: { plain: `Measuring bar ${i + 1}${state.selected.includes(i) ? ', placed' : ''}` },
      layers: {
        shape: { scale: [0.96, 0.96, 0.96] },
        symbol: { scale: [0.8, 0.8, 0.8] },
        code: { opacity: 0.1 },
      },
    }));
  if (state.rows && state.columns) {
    const rows = state.rows,
      columns = state.columns;
    entities = Array.from({ length: rows * columns }, (_, i) => ({
      id: i === 0 ? 'result-piece' : `result-piece-${i}`,
      kind: 'block' as const,
      pos: [
        (((i % columns) - (columns - 1) / 2) * 3) / columns,
        0.04,
        ((Math.floor(i / columns) - (rows - 1) / 2) * 3) / rows,
      ] as Vec3,
      size: [2.9 / columns, 0.18, 2.9 / rows] as Vec3,
      color: state.selected.includes(i)
        ? 'result'
        : state.horizontalSelected?.includes(i % columns)
          ? 'whole'
          : state.verticalSelected?.includes(Math.floor(i / columns))
            ? 'part'
            : 'mint',
      opacity: state.selected.includes(i) ? 1 : 0.55,
      tether: 'result',
      text: { plain: `Cell ${i + 1}${state.selected.includes(i) ? ', overlap selected' : ''}` },
      layers: {
        shape: { scale: [0.95, 0.95, 0.95] },
        symbol: { scale: [0.75, 0.75, 0.75] },
        code: { opacity: 0.1 },
      },
    }));
  }
  if (givens && state.leftCuts && state.rightCuts && givens.b) {
    const operand = (prefix: string, value: Fraction, cuts: number, x: number) =>
      pieces(prefix, value, cuts, shape, [x, 0.05, 1.4], x < 0 ? 'whole' : 'part');
    entities.push(
      ...operand('left-piece', givens.a, state.leftCuts, -1.7),
      ...operand('right-piece', givens.b, state.rightCuts, 1.7),
      label(
        'left-label',
        `${(givens.a.n * state.leftCuts) / givens.a.d}/${state.leftCuts}`,
        [-1.7, 0.02, 2.45],
      ),
      label(
        'right-label',
        `${(givens.b.n * state.rightCuts) / givens.b.d}/${state.rightCuts}`,
        [1.7, 0.02, 2.45],
      ),
    );
  }
  if (givens && state.groups) {
    const groups = state.groups;
    if (
      !Number.isInteger(groups) ||
      groups < 1 ||
      groups > 24 ||
      givens.a.d % groups ||
      givens.a.n % groups
    )
      throw new RangeError('Each group must contain complete old selected and unselected cuts.');
    const original = pieces('left-piece', givens.a, givens.a.d, shape, [-1.5, 0.07, 0], 'whole');
    entities.push(
      ...original.map((entity, index) => {
        const group = Math.floor((index % givens.a.d) / groups),
          angle = ((group + 0.5) * groups * 2 * Math.PI) / givens.a.d;
        const offset: Vec3 =
          shape === 'pie'
            ? [Math.cos(angle) * 0.14, 0, Math.sin(angle) * 0.14]
            : shape === 'bar'
              ? [group * 0.07, 0, 0]
              : [0, group * 0.04, 0];
        const pos = entity.pos.map((value, i) => value + offset[i]) as Vec3;
        return {
          ...entity,
          pos,
          text: {
            plain: `Original cut ${index + 1}, group ${group + 1} of ${groups} old cuts${index < givens.a.n ? ', selected' : ''}`,
          },
          layers: {
            ...entity.layers,
            shape: { pos },
            symbol: { scale: [0.72, 0.72, 0.72] as Vec3 },
          },
        };
      }),
      label(
        'left-label',
        `${givens.a.n}/${givens.a.d}: ${groups} old cuts per group`,
        [-1.5, 0.02, 1.3],
      ),
      label('result-label', `${state.selected.length}/${state.denominator}`, [1.5, 0.02, 1.3]),
    );
  }
  if (entities.length > MAX_SCENE_ENTITIES)
    throw new RangeError('This construction needs too many individual pieces.');
  const division = state.fits !== undefined;
  const result = division
    ? String(state.fits)
    : fractionLatex({ n: state.selected.length * (state.sign ?? 1), d: state.denominator });
  const operandMath =
    hasOperands && givens?.b
      ? `\\htmlClass{tk-left}{${fractionLatex(givens.a)}}+\\htmlClass{tk-right}{${fractionLatex(givens.b)}}=`
      : hasGroups && givens
        ? `\\htmlClass{tk-left}{${fractionLatex(givens.a)}}\\longrightarrow`
        : '';
  return {
    id: 'fraction-build',
    entities,
    steps: [
      {
        id: 'build',
        title: 'Build your fraction',
        latexAfter: `${operandMath}\\htmlClass{tk-result}{${result}}${division ? '\\ \\text{measuring units}' : ''}`,
        say: {
          quick: division
            ? 'Count the placed measuring bars.'
            : hasGroups
              ? 'Group old cuts; preserve the selected amount.'
              : 'Select equal pieces.',
          standard:
            'The selected pieces are the state your proof checks. A gold piece is selected; its control also says “selected”.',
          deep: 'Changing cuts changes piece size; keep the unit whole fixed. Your exact piece count, recuts, removals and overlap are checked together.',
        },
        ops: [],
        tethers: [
          { token: 'result', entities: ['result-piece'], color: 'part' },
          ...(hasOperands
            ? [
                { token: 'left', entities: ['left-piece'], color: 'whole' },
                { token: 'right', entities: ['right-piece'], color: 'part' },
              ]
            : hasGroups
              ? [{ token: 'left', entities: ['left-piece'], color: 'whole' }]
              : []),
        ],
        aria: division
          ? `${state.fits} measuring bars placed. Each bar measures ${givens?.b ? fractionText(givens.b) : `1/${state.denominator}`} of the original whole.`
          : `${state.selected.length} selected equal pieces out of ${state.denominator} per whole.${hasGroups ? ` Each new group contains ${state.groups} old cuts.` : ''}`,
      },
    ],
    code: division
      ? `bars_placed = ${state.fits}\nresult = bars_placed  # measuring units`
      : hasGroups
        ? `original = Fraction(${givens!.a.n}, ${givens!.a.d})\ngroup_size = ${state.groups}\nresult = Fraction(${state.selected.length}, ${state.denominator})`
        : `selected = ${state.selected.length}\nparts_per_whole = ${state.denominator}\nresult = Fraction(selected, parts_per_whole)`,
  };
}
