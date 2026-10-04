import { parseMatrixInput, solveMatrix, type MatrixMethod } from '../../../core/solvers/matrices';
import {
  blankMatrixBuild,
  cloneMatrixBuild,
  validMatrixBuild,
  createMatrixChallenge,
  createMatrixBoss,
  matrixChallengeKinds,
  type MatrixBuild,
  type MatrixChallengeKind,
} from './challenge';
export type MatrixMode = 'watch' | 'play' | 'prove' | 'boss';
export interface MatrixVariant {
  version: 1;
  mode: MatrixMode;
  seed: number;
  kind: MatrixChallengeKind;
  method: MatrixMethod;
  view: 'auto' | 'blocks' | 'lattice';
  language: 'python' | 'numpy';
  expression: string;
  build: MatrixBuild;
  cursor: number;
  phase: number;
  hint: number;
  tryFirst: boolean;
  guess: string;
  eigen: boolean;
}
export const initialMatrixVariant = (): MatrixVariant => ({
  version: 1,
  mode: 'watch',
  seed: 12345,
  kind: 'multiply',
  method: 'cells',
  view: 'auto',
  language: 'python',
  expression: 'transform([1,1;0,1])',
  build: blankMatrixBuild(),
  cursor: 0,
  phase: 0,
  hint: 0,
  tryFirst: false,
  guess: '',
  eigen: false,
});
const integer = (v: unknown, min: number, max: number): v is number =>
  Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max;
export function readMatrixVariant(raw?: string): MatrixVariant {
  try {
    if (!raw || raw.length > 9000) return initialMatrixVariant();
    const s = JSON.parse(raw) as MatrixVariant;
    if (
      !s ||
      s.version !== 1 ||
      !['watch', 'play', 'prove', 'boss'].includes(s.mode) ||
      !matrixChallengeKinds.includes(s.kind) ||
      !['cells', 'columns'].includes(s.method) ||
      !['auto', 'blocks', 'lattice'].includes(s.view) ||
      !['python', 'numpy'].includes(s.language) ||
      !integer(s.seed, 0, 4294967295) ||
      !integer(s.cursor, 0, 8) ||
      !integer(s.phase, 0, 3) ||
      !integer(s.hint, 0, 3) ||
      typeof s.expression !== 'string' ||
      typeof s.eigen !== 'boolean' ||
      typeof s.tryFirst !== 'boolean' ||
      typeof s.guess !== 'string' ||
      s.guess.length > 32 ||
      !validMatrixBuild(s.build)
    )
      return initialMatrixVariant();
    const p = parseMatrixInput(s.expression);
    if (!p.ok) return initialMatrixVariant();
    const challenge =
        s.mode === 'boss' ? createMatrixBoss(s.seed) : createMatrixChallenge(s.kind, s.seed),
      solution = s.mode === 'watch' ? solveMatrix(p.problem) : challenge.solution;
    const expected = s.mode === 'watch' ? solution.result : challenge.expected;
    if (
      s.cursor >= expected.flat().length ||
      !validMatrixBuild(s.build, s.mode === 'watch' ? undefined : expected)
    )
      return initialMatrixVariant();
    return {
      version: 1,
      mode: s.mode,
      seed: s.seed,
      kind: s.kind,
      method: s.method,
      view: s.view,
      language: s.language,
      expression: p.problem.expression,
      build: cloneMatrixBuild(s.build),
      cursor: s.cursor,
      phase: s.phase,
      hint: s.hint,
      tryFirst: s.tryFirst,
      guess: s.guess,
      eigen: s.eigen,
    };
  } catch {
    return initialMatrixVariant();
  }
}
