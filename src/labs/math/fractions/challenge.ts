import type { LabChallenge } from '../../../core/labs/types';
import {
  equalFractions,
  fractionText,
  gcd,
  isEquivalentAnswer,
  lcm,
  normalizeFraction,
} from '../../../core/solvers/fractions';
import type { Fraction } from '../../../core/solvers/fractions';

export interface FractionBuildState {
  denominator: number;
  selected: number[];
  units?: number;
  sign?: -1 | 0 | 1;
  leftCuts?: number;
  rightCuts?: number;
  removed?: number[];
  rows?: number;
  columns?: number;
  horizontalSelected?: number[];
  verticalSelected?: number[];
  groups?: number;
  fits?: number;
  symbolAnswer?: string;
  code?: string;
}
export const fractionChallengeKinds = [
  'shade',
  'equivalent',
  'add',
  'subtract',
  'multiply',
  'divide',
  'mixed',
  'simplify',
] as const;
export type FractionChallengeKind = (typeof fractionChallengeKinds)[number];
export interface FractionChallenge extends LabChallenge<FractionBuildState> {
  kind: FractionChallengeKind;
  seed: number;
  givens: { a: Fraction; b?: Fraction };
  target: Fraction;
  requiredDenominator: number;
}
const range = (count: number) => Array.from({ length: count }, (_, i) => i);
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
function validIndices(values: unknown, capacity: number): values is number[] {
  return (
    Array.isArray(values) &&
    values.length <= capacity &&
    new Set(values).size === values.length &&
    values.every((v) => Number.isInteger(v) && v >= 0 && v < capacity)
  );
}
export function validBuildState(state: FractionBuildState): boolean {
  if (!state || typeof state !== 'object') return false;
  const units = state.units ?? 1;
  return (
    Number.isInteger(state.denominator) &&
    state.denominator >= 1 &&
    state.denominator <= 24 &&
    Number.isInteger(units) &&
    units >= 1 &&
    units <= 4 &&
    validIndices(state.selected, state.denominator * units) &&
    [undefined, -1, 0, 1].includes(state.sign)
  );
}
export function buildValue(state: FractionBuildState): Fraction | null {
  if (!validBuildState(state)) return null;
  return normalizeFraction({ n: state.selected.length * (state.sign ?? 1), d: state.denominator });
}
export function createFractionChallenge(
  kind: FractionChallengeKind,
  seed: number,
): FractionChallenge {
  const random = seeded(seed);
  const pick = (max: number) => Math.floor(random() * max);
  let a: Fraction = { n: 3, d: 4 },
    b: Fraction | undefined,
    target: Fraction = { n: 3, d: 4 },
    denominator = 4;
  let prompt = '',
    setup: FractionBuildState = { denominator: 4, selected: [], units: 1, sign: 1 };
  let structural: (s: FractionBuildState) => boolean = () => true;
  if (kind === 'shade') {
    denominator = [4, 6, 8][pick(3)];
    a = { n: 1 + pick(denominator - 1), d: denominator };
    target = normalizeFraction(a);
    prompt = `Shade exactly ${fractionText(a)} of one whole.`;
  } else if (kind === 'equivalent') {
    const d = [2, 3, 4, 6][pick(4)],
      n = 1 + pick(d - 1);
    a = normalizeFraction({ n, d });
    denominator = a.d * 2;
    target = a;
    prompt = `Show ${fractionText(a)} using ${denominator} equal cuts.`;
  } else if (kind === 'add') {
    const pairs: [[number, number], [number, number], [number, number]] = [
      [3, 4],
      [4, 6],
      [6, 8],
    ];
    const [d, e] = pairs[pick(3)];
    a = { n: 1, d };
    b = { n: 1, d: e };
    denominator = lcm(d, e);
    target = normalizeFraction({ n: denominator / d + denominator / e, d: denominator });
    prompt = `Recut ${fractionText(a)} + ${fractionText(b)} into common parts, then build the result.`;
    setup = { denominator: d, selected: [], units: 1, sign: 1, leftCuts: d, rightCuts: e };
    structural = (s) => s.leftCuts === denominator && s.rightCuts === denominator;
  } else if (kind === 'subtract') {
    denominator = [4, 6, 8][pick(3)];
    a = { n: denominator - 1, d: denominator };
    b = { n: 1, d: 2 };
    const count = a.n - denominator / 2;
    target = normalizeFraction({ n: count, d: denominator });
    prompt = `Start at ${fractionText(a)}, remove ${fractionText(b)}, and keep what remains.`;
    setup = { denominator, selected: range(a.n), units: 1, sign: 1, removed: [] };
    structural = (s) =>
      validIndices(s.removed, a.n) &&
      s.removed.length === denominator / 2 &&
      s.selected.every((i) => i < a.n) &&
      range(a.n).every((i) => s.selected.includes(i) !== s.removed!.includes(i));
  } else if (kind === 'multiply') {
    const columns = 3 + pick(2),
      rows = 2 + pick(3);
    a = { n: columns - 1, d: columns };
    b = { n: rows - 1, d: rows };
    denominator = columns * rows;
    target = normalizeFraction({ n: a.n * b.n, d: denominator });
    prompt = `Select ${fractionText(a)} of the columns and ${fractionText(b)} of the rows. Shade their overlap.`;
    setup = {
      denominator,
      selected: [],
      units: 1,
      sign: 1,
      rows,
      columns,
      horizontalSelected: [],
      verticalSelected: [],
    };
    structural = (s) =>
      s.rows === rows &&
      s.columns === columns &&
      validIndices(s.horizontalSelected, columns) &&
      validIndices(s.verticalSelected, rows) &&
      s.horizontalSelected.length === a.n &&
      s.verticalSelected.length === b!.n &&
      range(denominator).every(
        (i) =>
          s.selected.includes(i) ===
          (s.horizontalSelected!.includes(i % columns) &&
            s.verticalSelected!.includes(Math.floor(i / columns))),
      );
  } else if (kind === 'divide') {
    denominator = [4, 6, 8][pick(3)];
    const fits = 2 + pick(denominator - 2);
    a = { n: fits, d: denominator };
    b = { n: 1, d: denominator };
    target = { n: fits, d: 1 };
    prompt = `Fill ${fractionText(a)} with ${fractionText(b)} measuring bars. How many fit?`;
    setup = { denominator, selected: [], units: 1, sign: 1, fits: 0 };
    structural = (s) =>
      s.selected.length === fits &&
      s.fits === fits &&
      range(fits).every((i) => s.selected.includes(i));
  } else if (kind === 'mixed') {
    denominator = 4;
    const whole = 1 + pick(2),
      remainder = 1 + pick(3);
    a = { n: whole * denominator + remainder, d: denominator };
    target = normalizeFraction(a);
    prompt = `Arrange ${fractionText(a)} as complete wholes and a remaining part.`;
    setup = { denominator, selected: [], units: whole + 1, sign: 1 };
    structural = (s) =>
      s.units === whole + 1 &&
      range(whole * denominator).every((i) => s.selected.includes(i)) &&
      s.selected.filter((i) => i >= whole * denominator).length === remainder;
  } else {
    const d = [2, 3, 4][pick(3)],
      n = 1 + pick(d - 1),
      factor = 2 + pick(3);
    a = { n: n * factor, d: d * factor };
    target = normalizeFraction(a);
    denominator = target.d;
    prompt = `Group the parts of ${a.n}/${a.d} to show the same amount in lowest terms.`;
    setup = { denominator: a.d, selected: range(a.n), units: 1, sign: 1, groups: 1 };
    structural = (s) => s.groups === gcd(a.n, a.d) && gcd(s.selected.length, s.denominator) === 1;
  }
  if (!['add', 'subtract', 'multiply', 'divide', 'mixed', 'simplify'].includes(kind))
    setup = { denominator, selected: [], units: 1, sign: 1 };
  const goal = (s: FractionBuildState) => {
    if (
      !validBuildState(s) ||
      s.denominator !== denominator ||
      (s.sign ?? 1) !== 1 ||
      !structural(s)
    )
      return false;
    return kind === 'divide' ? true : equalFractions(buildValue(s)!, target);
  };
  const expectedCount = kind === 'divide' ? target.n : target.n * (denominator / target.d);
  return {
    id: `fractions-${kind}-${seed >>> 0}`,
    kind,
    seed: seed >>> 0,
    prompt,
    givens: { a, b },
    target,
    requiredDenominator: denominator,
    setup,
    hints: [
      'Keep one whole the same size.',
      `Use ${denominator} equal parts; follow the selected pieces.`,
      `The target uses ${expectedCount} selected parts. ${kind === 'multiply' ? 'Only the overlap counts.' : kind === 'subtract' ? 'Record exactly which parts were removed.' : ''}`,
    ],
    xp: 25,
    goal,
  };
}
export interface FractionBoss {
  id: string;
  prompt: string;
  setup: FractionBuildState;
  givens: { a: Fraction; b: Fraction };
  target: Fraction;
  requiredDenominator: number;
  codeOptions: string[];
  xp: number;
  phases: {
    id: 'read' | 'build' | 'code';
    title: string;
    prompt: string;
    goal: (state: FractionBuildState) => boolean;
  }[];
  goal: (state: FractionBuildState) => boolean;
  hints: [string, string, string];
}
export function createFractionBoss(seed: number): FractionBoss {
  const practice = createFractionChallenge('add', seed),
    a = practice.givens.a,
    b = practice.givens.b!;
  const code = `Fraction(${a.n}, ${a.d}) + Fraction(${b.n}, ${b.d})`;
  const read = (s: FractionBuildState) =>
    typeof s.symbolAnswer === 'string' &&
    s.symbolAnswer.length <= 160 &&
    isEquivalentAnswer(s.symbolAnswer, practice.target);
  const build = practice.goal;
  const write = (s: FractionBuildState) =>
    typeof s.code === 'string' &&
    s.code.length <= 512 &&
    s.code.replace(/\s+/g, '') === code.replace(/\s+/g, '');
  return {
    id: `fractions-boss-${seed >>> 0}`,
    prompt: 'Read the sum, build its equal parts, then connect it to exact Python code.',
    setup: practice.setup,
    givens: { a, b },
    target: practice.target,
    requiredDenominator: practice.requiredDenominator,
    codeOptions: [
      code,
      `Fraction(${a.n + b.n}, ${a.d + b.d})`,
      `Fraction(${a.n}, ${a.d}) * Fraction(${b.n}, ${b.d})`,
    ],
    xp: 100,
    hints: practice.hints,
    phases: [
      { id: 'read', title: 'Read the symbols', prompt: 'Predict the exact sum.', goal: read },
      { id: 'build', title: 'Build the shape', prompt: practice.prompt, goal: build },
      {
        id: 'code',
        title: 'Connect the code',
        prompt: 'Choose the Fraction computation matching this sum.',
        goal: write,
      },
    ],
    goal: (s) => read(s) && build(s) && write(s),
  };
}
