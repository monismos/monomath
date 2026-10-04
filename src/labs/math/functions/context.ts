import { parseFunctionInput } from '../../../core/solvers/functions';
import {
  blankFunctionBuild,
  validFunctionBuild,
  functionChallengeKinds,
  type FunctionBuild,
  type FunctionChallengeKind,
} from './challenge';
export type FunctionMode = 'watch' | 'play' | 'prove' | 'boss';
export interface FunctionVariant {
  version: 1;
  mode: FunctionMode;
  kind: FunctionChallengeKind;
  seed: number;
  expression: string;
  method: string;
  trace: number;
  slice: number;
  zoom: number;
  n: number;
  tangent: boolean;
  rectangles: boolean;
  compare: boolean;
  compareSlope: number;
  compareIntercept: number;
  tryFirst: boolean;
  guess: string;
  hint: number;
  phase: number;
  build: FunctionBuild;
}
export const initialFunctionVariant = (): FunctionVariant => ({
  version: 1,
  mode: 'watch',
  kind: 'line',
  seed: 12345,
  expression: 'y=2*x+1',
  method: 'rule',
  trace: 1,
  slice: 1,
  zoom: 1,
  n: 4,
  tangent: true,
  rectangles: false,
  compare: false,
  compareSlope: -1,
  compareIntercept: 4,
  tryFirst: false,
  guess: '',
  hint: 0,
  phase: 0,
  build: blankFunctionBuild(),
});
export function readFunctionVariant(raw?: string): FunctionVariant {
  const fallback = initialFunctionVariant();
  if (!raw || raw.length > 7000) return fallback;
  try {
    const s = JSON.parse(raw) as FunctionVariant;
    if (
      s.version !== 1 ||
      !['watch', 'play', 'prove', 'boss'].includes(s.mode) ||
      !functionChallengeKinds.includes(s.kind) ||
      !Number.isInteger(s.seed) ||
      s.seed < 0 ||
      s.seed > 4294967295 ||
      typeof s.expression !== 'string' ||
      !parseFunctionInput(s.expression).ok ||
      !['rule', 'geometry', 'factor', 'square', 'formula'].includes(s.method) ||
      !Number.isFinite(s.trace) ||
      Math.abs(s.trace) > 4 ||
      !Number.isFinite(s.slice) ||
      Math.abs(s.slice) > 3 ||
      !Number.isFinite(s.zoom) ||
      s.zoom < 0.5 ||
      s.zoom > 2 ||
      !Number.isInteger(s.n) ||
      s.n < 1 ||
      s.n > 16 ||
      !['tangent', 'rectangles', 'compare', 'tryFirst'].every(
        (k) => typeof s[k as keyof FunctionVariant] === 'boolean',
      ) ||
      ![s.compareSlope, s.compareIntercept].every(
        (v) => Number.isInteger(v) && Math.abs(v) <= 12,
      ) ||
      typeof s.guess !== 'string' ||
      s.guess.length > 32 ||
      !Number.isInteger(s.hint) ||
      s.hint < 0 ||
      s.hint > 3 ||
      !Number.isInteger(s.phase) ||
      s.phase < 0 ||
      s.phase > 3 ||
      !validFunctionBuild(s.build)
    )
      return fallback;
    return {
      version: 1,
      mode: s.mode,
      kind: s.kind,
      seed: s.seed,
      expression: s.expression,
      method: s.method,
      trace: s.trace,
      slice: s.slice,
      zoom: s.zoom,
      n: s.n,
      tangent: s.tangent,
      rectangles: s.rectangles,
      compare: s.compare,
      compareSlope: s.compareSlope,
      compareIntercept: s.compareIntercept,
      tryFirst: s.tryFirst,
      guess: s.guess,
      hint: s.hint,
      phase: s.phase,
      build: {
        coefficients: [...s.build.coefficients],
        points: [...s.build.points],
        included: [...s.build.included],
        markers: [...s.build.markers],
        tangent: s.build.tangent,
        heights: [...s.build.heights],
        claim: s.build.claim,
        ...(s.build.code === undefined ? {} : { code: s.build.code }),
      },
    };
  } catch {
    return fallback;
  }
}
