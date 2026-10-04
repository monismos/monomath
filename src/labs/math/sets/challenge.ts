import type { LabChallenge } from '../../../core/labs/types';
import {
  cartesianProduct,
  cloneSets,
  evaluateSetExpression,
  formatSet,
  isFunctionRelation,
  isSubset,
  parseSetAnswer,
  parseSetExpression,
  powerSet,
  sameSet,
  validFiniteSet,
  validSetsConfig,
} from '../../../core/solvers/sets';
import type { SetsConfig, SetsProblem } from '../../../core/solvers/sets';

export interface SetsBuildState {
  universe: number[];
  a: number[];
  b: number[];
  selected: number[];
  subsets?: number[][];
  pairs?: [number, number][];
  symbolAnswer?: string;
  code?: string;
}
export const setsChallengeKinds = [
  'union',
  'intersection',
  'difference',
  'complement',
  'symmetric',
  'subset',
  'builder',
  'power',
  'product',
  'function',
] as const;
export type SetsChallengeKind = (typeof setsChallengeKinds)[number];
export interface SetsChallenge extends LabChallenge<SetsBuildState> {
  kind: SetsChallengeKind;
  seed: number;
  problem: SetsProblem;
  givens: SetsConfig;
  target: number[];
  targetSubsets?: number[][];
  targetPairs?: [number, number][];
}
function seeded(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}
const pairKey = (pair: [number, number]) => `${pair[0]},${pair[1]}`;
const subsetKey = (subset: number[]) => [...subset].sort((a, b) => a - b).join(',');
export function validSetsBuildState(value: unknown, givens?: SetsConfig): value is SetsBuildState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as SetsBuildState;
  if (
    ![state.universe, state.a, state.b, state.selected].every((v) => validFiniteSet(v)) ||
    ![state.a, state.b, state.selected].every((v) => isSubset(v, state.universe))
  )
    return false;
  if (givens && (!validSetsConfig(givens) || !sameSet(state.universe, givens.U))) return false;
  if (
    state.subsets !== undefined &&
    (!Array.isArray(state.subsets) ||
      state.subsets.length > 8 ||
      state.a.length > 3 ||
      !state.subsets.every((v) => validFiniteSet(v, 3) && isSubset(v, state.universe)) ||
      new Set(state.subsets.map(subsetKey)).size !== state.subsets.length)
  )
    return false;
  if (
    state.pairs !== undefined &&
    (!Array.isArray(state.pairs) ||
      state.pairs.length > 64 ||
      !state.pairs.every(
        (pair) =>
          Array.isArray(pair) &&
          pair.length === 2 &&
          pair.every((value) => state.universe.includes(value)),
      ) ||
      new Set(state.pairs.map(pairKey)).size !== state.pairs.length)
  )
    return false;
  return (
    (state.symbolAnswer === undefined ||
      (typeof state.symbolAnswer === 'string' && state.symbolAnswer.length <= 256)) &&
    (state.code === undefined || (typeof state.code === 'string' && state.code.length <= 512))
  );
}
const operations = {
  union: 'A ∪ B',
  intersection: 'A ∩ B',
  difference: 'A \\ B',
  complement: 'Aᶜ',
  symmetric: 'A Δ B',
};
export function createSetsChallenge(kind: SetsChallengeKind, seed: number): SetsChallenge {
  const random = seeded(seed),
    values = Array.from({ length: 10 }, (_, i) => i);
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  const U = values.slice(0, 6).sort((a, b) => a - b),
    A = [U[0], U[2], U[4]],
    B = [U[1], U[2], U[3]],
    C = [U[3], U[5]];
  let givens: SetsConfig = { A, B, C, U },
    expression = kind in operations ? operations[kind as keyof typeof operations] : 'A',
    prompt = '',
    target: number[] = [],
    targetSubsets: number[][] | undefined,
    targetPairs: [number, number][] | undefined;
  if (kind === 'subset') {
    givens = { ...givens, A: U.slice(0, 4) };
    target = [U[0], U[2]];
    prompt = `Nest ${formatSet(target)} inside A=${formatSet(givens.A)}. Select precisely that subset.`;
  } else if (kind === 'builder') {
    expression = `{x | x ${seed % 2 ? 'odd' : 'even'}, x < ${U[4] + 1}}`;
    target = evaluateSetExpression(parseSetExpression(expression), givens);
    prompt = `Use the sieve to select ${expression} from U=${formatSet(U)}.`;
  } else if (kind === 'power') {
    givens = { ...givens, A: U.slice(0, 2 + (seed % 2)), B: [] };
    targetSubsets = powerSet(givens.A);
    prompt = `Choose every subset of A=${formatSet(givens.A)}, including the empty and complete sets.`;
  } else if (kind === 'product' || kind === 'function') {
    givens = { ...givens, A: U.slice(0, 3), B: U.slice(3, 5) };
    targetPairs =
      kind === 'product'
        ? cartesianProduct(givens.A, givens.B)
        : givens.A.map((a, i) => [a, givens.B[(i + (seed >>> 0)) % givens.B.length]]);
    prompt =
      kind === 'product'
        ? `Select every ordered pair in A × B, with A=${formatSet(givens.A)} and B=${formatSet(givens.B)}.`
        : `Connect each input in A=${formatSet(givens.A)} to exactly one output in B=${formatSet(givens.B)}. Any such mapping is a function.`;
  } else {
    target = evaluateSetExpression(parseSetExpression(expression), givens);
    prompt = `Keep A=${formatSet(givens.A)} and B=${formatSet(givens.B)}, then select ${expression} inside U=${formatSet(U)}.`;
  }
  const setup: SetsBuildState = {
    universe: [...givens.U],
    a: [...givens.A],
    b: [...givens.B],
    selected: [],
    ...(kind === 'power' ? { subsets: [] } : {}),
    ...(['product', 'function'].includes(kind) ? { pairs: [] } : {}),
  };
  const goal = (state: SetsBuildState) => {
    if (
      !validSetsBuildState(state, givens) ||
      !sameSet(state.a, givens.A) ||
      !sameSet(state.b, givens.B)
    )
      return false;
    if (kind === 'power')
      return (
        state.selected.length === 0 &&
        !!state.subsets &&
        state.subsets.length === targetSubsets!.length &&
        targetSubsets!.every((expected) =>
          state.subsets!.some((actual) => sameSet(actual, expected)),
        )
      );
    if (kind === 'product')
      return (
        state.selected.length === 0 &&
        !!state.pairs &&
        state.pairs.length === targetPairs!.length &&
        targetPairs!.every((expected) =>
          state.pairs!.some((actual) => pairKey(actual) === pairKey(expected)),
        )
      );
    if (kind === 'function')
      return (
        state.selected.length === 0 &&
        !!state.pairs &&
        isFunctionRelation(state.pairs, givens.A, givens.B)
      );
    return (
      sameSet(state.selected, target) && (kind !== 'subset' || isSubset(state.selected, state.a))
    );
  };
  const expectedCount =
    kind === 'power'
      ? targetSubsets!.length
      : kind === 'product'
        ? targetPairs!.length
        : kind === 'function'
          ? givens.A.length
          : target.length;
  const finalHint =
    kind === 'function'
      ? 'Every input needs one connection; shared outputs are allowed.'
      : kind === 'power'
        ? `There are ${expectedCount} subsets. Include {} and ${formatSet(givens.A)}.`
        : kind === 'product'
          ? `Every input pairs with every output: ${expectedCount} distinct pairs.`
          : `The selected result is ${formatSet(target)}.`;
  return {
    id: `sets-${kind}-${seed >>> 0}`,
    kind,
    seed: seed >>> 0,
    problem: { expression, sets: cloneSets(givens) },
    givens: cloneSets(givens),
    target,
    setup,
    targetSubsets,
    targetPairs,
    prompt,
    hints: [
      'Keep the requested input memberships and universe fixed.',
      kind === 'power'
        ? 'Each cube corner corresponds to a distinct subset.'
        : kind === 'product' || kind === 'function'
          ? 'A grid column is an input; a selected point chooses an output.'
          : kind === 'builder'
            ? 'An element passes only when every filter condition holds.'
            : 'Test each universe element against the complete operation.',
      finalHint,
    ],
    xp: 25,
    goal,
  };
}
export interface SetsBoss {
  id: string;
  prompt: string;
  problem: SetsProblem;
  givens: SetsConfig;
  target: number[];
  setup: SetsBuildState;
  codeOptions: string[];
  hints: [string, string, string];
  xp: number;
  phases: {
    id: 'read' | 'build' | 'code';
    title: string;
    prompt: string;
    goal: (state: SetsBuildState) => boolean;
  }[];
  goal: (state: SetsBuildState) => boolean;
}
export function createSetsBoss(seed: number): SetsBoss {
  const kinds = ['union', 'intersection', 'difference'] as const,
    practice = createSetsChallenge(kinds[(seed >>> 0) % 3], seed);
  const codeFor = {
      union: 'SELECT value FROM A UNION SELECT value FROM B',
      intersection: 'SELECT value FROM A INTERSECT SELECT value FROM B',
      difference: 'SELECT value FROM A EXCEPT SELECT value FROM B',
    },
    correct = codeFor[practice.kind as keyof typeof codeFor];
  const read = (state: SetsBuildState) => {
    const answer = parseSetAnswer(state?.symbolAnswer);
    return !!answer && sameSet(answer, practice.target);
  };
  const write = (state: SetsBuildState) =>
    typeof state?.code === 'string' &&
    state.code.length <= 512 &&
    state.code.trim().replace(/\s+/g, ' ').toUpperCase() === correct.toUpperCase();
  return {
    id: `sets-boss-${seed >>> 0}`,
    prompt:
      'Read the set symbols, build the actual memberships and selected result, then choose the matching SQL rows.',
    problem: practice.problem,
    givens: practice.givens,
    target: practice.target,
    setup: practice.setup,
    codeOptions: [correct, ...Object.values(codeFor).filter((code) => code !== correct)],
    hints: practice.hints,
    xp: 100,
    phases: [
      {
        id: 'read',
        title: 'Read the symbols',
        prompt: `Predict ${practice.problem.expression} as a finite set.`,
        goal: read,
      },
      { id: 'build', title: 'Build the memberships', prompt: practice.prompt, goal: practice.goal },
      {
        id: 'code',
        title: 'Connect SQL rows',
        prompt: 'Choose the SQL set operation matching the symbolic expression.',
        goal: write,
      },
    ],
    goal: (state) => read(state) && practice.goal(state) && write(state),
  };
}
