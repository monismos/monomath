import {
  parseSummationInput,
  solveSummation,
  type SummationMethod,
} from '../../../core/solvers/summation';
import {
  blankSummationBuild,
  cloneSummationBuild,
  createSummationBoss,
  createSummationChallenge,
  summationChallengeKinds,
  validSummationBuildState,
  type SummationBuildState,
  type SummationChallengeKind,
} from './challenge';
export type SummationMode = 'watch' | 'play' | 'prove' | 'boss';
export interface SummationVariant {
  version: 1;
  mode: SummationMode;
  seed: number;
  kind: SummationChallengeKind;
  method: SummationMethod;
  view: 'auto' | 'machine' | 'structure';
  language: 'python' | 'r' | 'sql';
  expression: string;
  build: SummationBuildState;
  cursor: number;
  phase: number;
  hint: number;
  tryFirst: boolean;
  guess: string;
}
const integer = (value: unknown, min: number, max: number): value is number =>
  Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
export function initialSummationVariant(): SummationVariant {
  return {
    version: 1,
    mode: 'watch',
    seed: 12345,
    kind: 'linear',
    method: 'accumulate',
    view: 'auto',
    language: 'python',
    expression: 'sum(i=1..5, 2i + 1)',
    build: blankSummationBuild(),
    cursor: 0,
    phase: 0,
    hint: 0,
    tryFirst: false,
    guess: '',
  };
}
export function readSummationVariant(raw?: string): SummationVariant {
  try {
    if (!raw || raw.length > 12000) return initialSummationVariant();
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      !value ||
      value.version !== 1 ||
      !['watch', 'play', 'prove', 'boss'].includes(String(value.mode)) ||
      !summationChallengeKinds.includes(value.kind as SummationChallengeKind) ||
      !['accumulate', 'structure'].includes(String(value.method)) ||
      !['auto', 'machine', 'structure'].includes(String(value.view)) ||
      !['python', 'r', 'sql'].includes(String(value.language)) ||
      !integer(value.seed, 0, 4294967295) ||
      !integer(value.cursor, 0, 15) ||
      !integer(value.phase, 0, 3) ||
      !integer(value.hint, 0, 3) ||
      typeof value.expression !== 'string' ||
      typeof value.tryFirst !== 'boolean' ||
      typeof value.guess !== 'string' ||
      value.guess.length > 32 ||
      !validSummationBuildState(value.build)
    )
      return initialSummationVariant();
    const parsed = parseSummationInput(value.expression);
    if (!parsed.ok) return initialSummationVariant();
    const challenge =
      value.mode === 'boss'
        ? createSummationBoss(value.seed)
        : createSummationChallenge(value.kind as SummationChallengeKind, value.seed);
    const solution = value.mode === 'watch' ? solveSummation(parsed.problem) : challenge.solution;
    if (
      value.cursor >= solution.terms.length ||
      !validSummationBuildState(value.build, challenge.solution)
    )
      return initialSummationVariant();
    return {
      version: 1,
      mode: value.mode as SummationMode,
      seed: value.seed,
      kind: value.kind as SummationChallengeKind,
      method: value.method as SummationMethod,
      view: value.view as SummationVariant['view'],
      language: value.language as SummationVariant['language'],
      expression: parsed.problem.expression,
      build: cloneSummationBuild(value.build),
      cursor: value.cursor,
      phase: value.phase,
      hint: value.hint,
      tryFirst: value.tryFirst,
      guess: value.guess,
    };
  } catch {
    return initialSummationVariant();
  }
}
