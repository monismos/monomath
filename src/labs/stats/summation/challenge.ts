import type { LabBoss, LabChallenge } from '../../../core/labs/types';
import {
  numericMatches,
  parseSumNumber,
  parseSummationInput,
  solveSummation,
  type SummationProblem,
  type SummationSolution,
} from '../../../core/solvers/summation';
import { fractionText, type Fraction } from '../../../core/solvers/fractions';

export interface SummationBuildState {
  included: string[];
  values: Record<string, string>;
  claim: string;
  balance: string;
  code?: string;
}
export const summationChallengeKinds = [
  'linear',
  'squares',
  'pairing',
  'double',
  'mean',
  'variance',
] as const;
export type SummationChallengeKind = (typeof summationChallengeKinds)[number];
export interface SummationChallenge extends LabChallenge<SummationBuildState> {
  kind: SummationChallengeKind;
  seed: number;
  problem: SummationProblem;
  solution: SummationSolution;
  expectedValues: Record<string, Fraction>;
  target: Fraction;
}
export const blankSummationBuild = (): SummationBuildState => ({
  included: [],
  values: {},
  claim: '',
  balance: '',
});
export function validSummationBuildState(
  value: unknown,
  solution?: SummationSolution,
): value is SummationBuildState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as SummationBuildState;
  const validId = (id: string) =>
    /^term-(?:[0-9]|1[0-5])$/.test(id) &&
    (!solution || solution.terms.some((term) => term.id === id));
  return (
    Array.isArray(state.included) &&
    state.included.length <= 16 &&
    new Set(state.included).size === state.included.length &&
    state.included.every((id) => typeof id === 'string' && validId(id)) &&
    !!state.values &&
    typeof state.values === 'object' &&
    !Array.isArray(state.values) &&
    Object.keys(state.values).length <= 16 &&
    Object.entries(state.values).every(
      ([id, text]) => validId(id) && typeof text === 'string' && text.length <= 32,
    ) &&
    typeof state.claim === 'string' &&
    state.claim.length <= 32 &&
    typeof state.balance === 'string' &&
    state.balance.length <= 32 &&
    (state.code === undefined || (typeof state.code === 'string' && state.code.length <= 1500))
  );
}
export function cloneSummationBuild(state: SummationBuildState): SummationBuildState {
  return {
    included: [...state.included],
    values: Object.fromEntries(Object.entries(state.values)),
    claim: state.claim,
    balance: state.balance,
    ...(state.code === undefined ? {} : { code: state.code }),
  };
}
function parsed(raw: string) {
  const result = parseSummationInput(raw);
  if (!result.ok) throw new Error(result.reason);
  return result.problem;
}
export function createSummationChallenge(
  kind: SummationChallengeKind,
  seed: number,
): SummationChallenge {
  const unsigned = seed >>> 0,
    count = 3 + (unsigned % 4),
    coefficient = 1 + (unsigned % 3),
    offset = 1 + (Math.floor(unsigned / 3) % 3);
  const inputs: Record<SummationChallengeKind, string> = {
    linear: `sum(i=1..${count}, ${coefficient}i+${offset})`,
    squares: `sum(i=0..${count - 1}, i^2)`,
    pairing: `sum(i=1..${count + 1}, i)`,
    double: `sum(i=1..${2 + (unsigned % 2)}, j=1..${2 + (Math.floor(unsigned / 2) % 2)}, i+j)`,
    mean: `data(${[offset, offset + 4, offset + 2, offset + 1, offset - 1].join(',')})`,
    variance: `data(${[offset, offset + 4, offset + 2, offset + 1, offset - 1].join(',')})`,
  };
  const problem = parsed(inputs[kind]),
    solution = solveSummation(problem);
  const target = kind === 'mean' ? solution.metrics!.mean : solution.result;
  const expectedValues = Object.fromEntries(
    solution.terms.map((term, index) => [
      term.id,
      kind === 'variance' ? solution.metrics!.deviationSquares[index] : { n: term.value, d: 1 },
    ]),
  );
  const construction = (state: SummationBuildState) =>
    validSummationBuildState(state, solution) &&
    state.included.length === solution.terms.length &&
    solution.terms.every(
      (term) =>
        state.included.includes(term.id) &&
        numericMatches(state.values[term.id], expectedValues[term.id]),
    ) &&
    (!solution.metrics || numericMatches(state.balance, solution.metrics.mean));
  const prompt =
    kind === 'variance'
      ? `Place the mean pin for ${problem.expression}, build and include every deviation square, then claim the population variance.`
      : kind === 'mean'
        ? `Build and include every equal-weight observation in ${problem.expression}, place the mean pin and claim the balance coordinate.`
        : `Build and include every term in ${problem.expression}, then claim their total. Both bounds are included.`;
  const hints: [string, string, string] = [
    solution.metrics
      ? 'The mean divides the observation total by the number of equal weights.'
      : 'The bounds are inclusive. Substitute the indices before adding.',
    kind === 'variance'
      ? 'Square each distance from the exact mean, then divide their total by n.'
      : kind === 'pairing'
        ? 'First and last terms make a pair. Two copies avoid an odd-middle problem.'
        : 'Every required term must enter once. Check your block values as well as the claim.',
    `Values: ${Object.values(expectedValues).map(fractionText).join(', ')}.${solution.metrics ? ` Mean pin: ${fractionText(solution.metrics.mean)}.` : ''} The claim is ${fractionText(target)}.`,
  ];
  return {
    id: `summation-${kind}-${unsigned}`,
    kind,
    seed: unsigned,
    problem,
    solution,
    expectedValues,
    target,
    setup: blankSummationBuild(),
    prompt,
    hints,
    xp: 30,
    goal: (state) => construction(state) && numericMatches(state.claim, target),
  };
}
export interface SummationBoss extends LabBoss<SummationBuildState> {
  problem: SummationProblem;
  solution: SummationSolution;
  expectedValues: Record<string, Fraction>;
  target: Fraction;
  codeOptions: string[];
}
export function createSummationBoss(seed: number): SummationBoss {
  const challenge = createSummationChallenge('linear', seed),
    { solution, problem } = challenge;
  if (problem.kind !== 'single') throw new Error('The Hopper Boss uses a single sum.');
  const correct = solution.code.python;
  const codeOptions = [
    correct,
    correct.replace(`range(${problem.a}, ${problem.b + 1})`, `range(${problem.a}, ${problem.b})`),
    correct.replace('total += term', 'total = term'),
  ];
  const read = (state: SummationBuildState) =>
    validSummationBuildState(state, solution) && numericMatches(state.claim, solution.result);
  const build = (state: SummationBuildState) =>
    validSummationBuildState(state, solution) &&
    state.included.length === solution.terms.length &&
    solution.terms.every(
      (term) =>
        state.included.includes(term.id) &&
        numericMatches(state.values[term.id], challenge.expectedValues[term.id]),
    );
  const code = (state: SummationBuildState) =>
    validSummationBuildState(state, solution) && state.code === correct;
  return {
    id: `summation-boss-${seed >>> 0}`,
    prompt:
      'Read the finite sum, build its actual contributions, then connect the inclusive Python loop.',
    problem,
    solution,
    target: solution.result,
    expectedValues: challenge.expectedValues,
    setup: blankSummationBuild(),
    codeOptions,
    hints: challenge.hints,
    xp: 100,
    phases: [
      {
        id: 'read',
        title: 'Read the sum',
        prompt: `What total does ${problem.expression} describe?`,
        goal: read,
      },
      {
        id: 'build',
        title: 'Build the contributions',
        prompt: 'Set each term block’s value and include every required term once.',
        goal: build,
      },
      {
        id: 'code',
        title: 'Connect the loop',
        prompt: 'Choose the loop that includes the upper bound and accumulates every term.',
        goal: code,
      },
    ],
    goal: (state) => read(state) && build(state) && code(state),
  };
}
export function buildNumber(raw: string | undefined): number | null {
  const value = parseSumNumber(raw);
  return value ? value.n / value.d : null;
}
