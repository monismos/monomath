import { functionLineSeed } from './seed';
import type { LabBoss, LabChallenge } from '../../../core/labs/types';
import {
  parseFunctionInput,
  solveFunction,
  valueAt,
  slopeAt,
  closeNumber,
  type FunctionProblem,
} from '../../../core/solvers/functions';
export const functionChallengeKinds = ['line', 'roots', 'tangent', 'area', 'slice'] as const;
export type FunctionChallengeKind = (typeof functionChallengeKinds)[number];
export interface FunctionBuild {
  coefficients: number[];
  points: [string, string];
  included: string[];
  markers: number[];
  tangent: string;
  heights: string[];
  claim: string;
  code?: string;
}
export const blankFunctionBuild = (): FunctionBuild => ({
  coefficients: [0, 0],
  points: ['', ''],
  included: [],
  markers: [],
  tangent: '',
  heights: Array(4).fill('') as string[],
  claim: '',
});
export function validFunctionBuild(raw: unknown): raw is FunctionBuild {
  if (!raw || typeof raw !== 'object') return false;
  const s = raw as FunctionBuild;
  return (
    Array.isArray(s.coefficients) &&
    s.coefficients.length >= 1 &&
    s.coefficients.length <= 4 &&
    Array.from(s.coefficients).every((v) => Number.isInteger(v) && Math.abs(v) <= 12) &&
    Array.isArray(s.points) &&
    s.points.length === 2 &&
    Array.from(s.points).every((v) => typeof v === 'string' && v.length <= 32) &&
    Array.isArray(s.included) &&
    s.included.length <= 2 &&
    new Set(s.included).size === s.included.length &&
    Array.from(s.included).every((v) => ['p0', 'p1'].includes(v)) &&
    Array.isArray(s.markers) &&
    s.markers.length <= 2 &&
    Array.from(s.markers).every((v) => Number.isFinite(v) && Math.abs(v) <= 12) &&
    typeof s.tangent === 'string' &&
    s.tangent.length <= 32 &&
    Array.isArray(s.heights) &&
    s.heights.length <= 16 &&
    Array.from(s.heights).every((v) => typeof v === 'string' && v.length <= 32) &&
    typeof s.claim === 'string' &&
    s.claim.length <= 32 &&
    (s.code === undefined || (typeof s.code === 'string' && s.code.length <= 1000))
  );
}
export interface FunctionChallenge extends LabChallenge<FunctionBuild> {
  problem: FunctionProblem;
  kind: FunctionChallengeKind;
  trace: number;
  slice: number;
  n: number;
}
const parse = (raw: string) => {
  const p = parseFunctionInput(raw);
  if (!p.ok) throw new Error(p.reason);
  return p.problem;
};
export function createFunctionChallenge(
  kind: FunctionChallengeKind,
  seed: number,
): FunctionChallenge {
  const safe = seed >>> 0,
    m = functionLineSeed(safe).slope,
    b = functionLineSeed(safe).intercept,
    r1 = 1 + (safe % 2),
    r2 = r1 + 1 + (Math.floor(safe / 7) % 2),
    trace = 1,
    slice = 1;
  const raw =
    kind === 'line'
      ? `y=${m}*x+(${b})`
      : kind === 'roots'
        ? `x^2-${r1 + r2}*x+${r1 * r2}=0`
        : kind === 'tangent'
          ? `derivative(${m}*x^2+${b}*x)`
          : kind === 'area'
            ? `integral(${m}*x^2,0,2)`
            : `z=${m}*x^2+y^2+(${b})`;
  const problem = parse(raw),
    solution = solveFunction(problem);
  const c = problem.model.type === 'polynomial' ? problem.model.coefficients : [];
  const setup = {
    ...blankFunctionBuild(),
    coefficients: [...c].map(() => 0),
    heights: Array(4).fill('') as string[],
  };
  const matches = (s: FunctionBuild) =>
    s.coefficients.length === c.length && Array.from(s.coefficients).every((v, i) => v === c[i]);
  const point = (s: FunctionBuild, id: 'p0' | 'p1', x: number) =>
    s.included.includes(id) &&
    closeNumber(s.points[id === 'p0' ? 0 : 1], valueAt(problem, x, kind === 'slice' ? slice : 0));
  const check = (s: FunctionBuild) => {
    if (!validFunctionBuild(s)) return false;
    if (kind === 'line') return matches(s) && point(s, 'p0', 0) && point(s, 'p1', 1);
    if (kind === 'roots')
      return (
        matches(s) &&
        s.markers.length === solution.roots.length &&
        new Set(s.markers).size === s.markers.length &&
        Array.from(s.markers).every(
          (x) =>
            solution.roots.some((r) => Math.abs(r - x) < 1e-6) &&
            Math.abs(valueAt(problem, x)) < 1e-6,
        )
      );
    if (kind === 'tangent')
      return matches(s) && point(s, 'p1', trace) && closeNumber(s.tangent, slopeAt(problem, trace));
    if (kind === 'area') {
      const dx = (problem.upper - problem.lower) / 4;
      return (
        matches(s) &&
        s.heights.length === 4 &&
        Array.from(s.heights).every((h, i) =>
          closeNumber(h, valueAt(problem, problem.lower + (i + 0.5) * dx)),
        ) &&
        closeNumber(
          s.claim,
          s.heights.reduce((sum, h) => sum + numeric(h) * dx, 0),
        )
      );
    }
    return matches(s) && point(s, 'p1', trace) && closeNumber(s.claim, slice);
  };
  const prompts = {
    line: `Build y=${m}x+(${b}) and place its outputs at x=0 and x=1.`,
    roots: 'Build the quadratic and place every distinct root on its floor.',
    tangent: 'Build the curve, place its point at x=1 and set the actual tangent slope.',
    area: 'Build the polynomial and four midpoint rectangles. Claim their finite signed sum.',
    slice:
      'Build the x coefficients of this surface slice at y=1. Place the height at x=1 and claim the slice coordinate.',
  };
  const hints: [string, string, string] = [
    'Construct the rule before its coordinates.',
    'Substitute each stated input in the original rule.',
    kind === 'area'
      ? 'Each width is 0.5. The claim is the four-rectangle sum, not the exact integral.'
      : kind === 'roots'
        ? `The roots are ${solution.roots.join(' and ')}.`
        : `The output at x=1 is ${valueAt(problem, 1, kind === 'slice' ? 1 : 0)}.`,
  ];
  return {
    id: `functions:${kind}:${safe}`,
    kind,
    problem,
    trace,
    slice,
    n: 4,
    setup,
    prompt: prompts[kind],
    hints,
    xp: 30,
    goal: check,
  };
}
export function numeric(raw: string, fallback = 0): number {
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?\d+)?$/.test(raw.trim())) return fallback;
  const [a, b] = raw.trim().split('/').map(Number),
    v = a / (b ?? 1);
  return Number.isFinite(v) && Math.abs(v) <= 1000 ? v : fallback;
}
export interface FunctionBoss extends LabBoss<FunctionBuild> {
  problem: FunctionProblem;
  kind: 'line';
  trace: number;
  slice: number;
  n: number;
  codeOptions: string[];
}
export function createFunctionBoss(seed: number): FunctionBoss {
  const c = createFunctionChallenge('line', seed),
    slope = slopeAt(c.problem, 1);
  const codeOptions = [
    `def f(x):\n    return ${slope}*x + (${valueAt(c.problem, 0)})\npoints = [(x, f(x)) for x in [0, 1]]`,
    `def f(x):\n    return x*x + (${valueAt(c.problem, 0)})`,
    `def f(x):\n    return ${slope} + x`,
  ];
  const phases = [
    {
      id: 'slope',
      title: 'Read the change',
      prompt: 'Claim the slope: how much does the output rise for one input step?',
      goal: (s: FunctionBuild) => validFunctionBuild(s) && closeNumber(s.claim, slope),
    },
    { id: 'points', title: 'Build both points', prompt: c.prompt, goal: c.goal },
    {
      id: 'code',
      title: 'Connect the Python',
      prompt: 'Choose the rule that computes both actual points.',
      goal: (s: FunctionBuild) => s.code === codeOptions[0],
    },
  ];
  return {
    ...c,
    id: `functions:boss:${seed >>> 0}`,
    kind: 'line',
    xp: 80,
    phases,
    codeOptions,
    prompt: 'Connect the same line through its slope, plotted coordinates and Python.',
    goal: (s) => phases.every((p) => p.goal(s)),
  };
}
