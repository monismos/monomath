import type { LabChallenge, LabBoss } from '../../../core/labs/types';
import {
  parseMatrixInput,
  solveMatrix,
  matrixMultiply,
  identityMatrix,
  equalQ,
  exactMatrixNumber,
  matrixText,
  parseMatrixNumber,
  matrixDet,
  type MatrixKind,
  type MatrixProblem,
  type MatrixSolution,
  type Matrix,
} from '../../../core/solvers/matrices';
import { fractionText } from '../../../core/solvers/fractions';
export const matrixChallengeKinds = [
  'add',
  'transpose',
  'multiply',
  'determinant',
  'inverse',
  'solve',
] as const;
export type MatrixChallengeKind = (typeof matrixChallengeKinds)[number];
export interface MatrixBuild {
  cells: Record<string, string>;
  included: string[];
  claim: string;
  classification: string;
  code?: string;
}
export const blankMatrixBuild = (): MatrixBuild => ({
  cells: {},
  included: [],
  claim: '',
  classification: '',
});
export interface MatrixChallenge extends LabChallenge<MatrixBuild> {
  kind: MatrixChallengeKind;
  seed: number;
  problem: MatrixProblem;
  solution: MatrixSolution;
  expected: Matrix;
  cellIds: string[];
}
export function validMatrixBuild(value: unknown, expected?: Matrix): value is MatrixBuild {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const s = value as MatrixBuild,
    id = (value: string) =>
      /^out-[0-2]-[0-2]$/.test(value) &&
      (!expected || !!expected[Number(value[4])]?.[Number(value[6])]);
  return (
    !!s.cells &&
    typeof s.cells === 'object' &&
    !Array.isArray(s.cells) &&
    Object.entries(s.cells).length <= 9 &&
    Object.entries(s.cells).every(
      ([key, v]) => id(key) && typeof v === 'string' && v.length <= 32,
    ) &&
    Array.isArray(s.included) &&
    s.included.length <= 9 &&
    new Set(s.included).size === s.included.length &&
    s.included.every((v) => typeof v === 'string' && id(v)) &&
    typeof s.claim === 'string' &&
    s.claim.length <= 32 &&
    ['', 'unique', 'infinite', 'none'].includes(s.classification) &&
    (s.code === undefined || (typeof s.code === 'string' && s.code.length <= 2000))
  );
}
export const cloneMatrixBuild = (s: MatrixBuild): MatrixBuild => ({
  cells: { ...s.cells },
  included: [...s.included],
  claim: s.claim,
  classification: s.classification,
  ...(s.code === undefined ? {} : { code: s.code }),
});
export function createMatrixChallenge(kind: MatrixChallengeKind, seed: number): MatrixChallenge {
  const unsigned = seed >>> 0,
    a = 1 + (unsigned % 3),
    b = 1 + (Math.floor(unsigned / 3) % 2),
    flip = unsigned % 2 ? -1 : 1;
  const inputs: Record<MatrixChallengeKind, string> = {
    add: `add([${a},1;0,${b}],[1,0;${flip},1])`,
    transpose: `transpose([${a},${b};${flip},2])`,
    multiply: `multiply([${a},1;0,${b}],[1,0;${flip},2])`,
    determinant: `determinant([${a},${b};${flip},2])`,
    inverse: `inverse([${a},1;${a - 1},1])`,
    solve: `solve([1,1;1,-1],[${a + b};${a - b}])`,
  };
  const p = parseMatrixInput(inputs[kind]);
  if (!p.ok) throw new Error(p.reason);
  const problem = p.problem,
    solution = solveMatrix(problem),
    expected = kind === 'determinant' ? problem.a : solution.result;
  const cellIds = expected.flatMap((row, i) => row.map((_, j) => `out-${i}-${j}`));
  const built = (s: MatrixBuild) =>
    validMatrixBuild(s, expected) &&
    s.included.length === cellIds.length &&
    cellIds.every(
      (id) =>
        s.included.includes(id) &&
        exactMatrixNumber(s.cells[id], expected[Number(id[4])][Number(id[6])]),
    );
  const goal = (s: MatrixBuild) => {
    if (!built(s)) return false;
    if (kind === 'determinant') return exactMatrixNumber(s.claim, solution.determinant);
    if (kind === 'solve') return s.classification === solution.classification;
    if (kind === 'inverse') {
      const matrix = expected.map((row, i) =>
        row.map((_, j) => parseMatrixNumber(s.cells[`out-${i}-${j}`])!),
      );
      return matrixMultiply(problem.a, matrix).every((row, i) =>
        row.every((v, j) => equalQ(v, identityMatrix(2)[i][j])),
      );
    }
    return true;
  };
  const hints: [string, string, string] = [
    'Build every output cell or basis endpoint; a claim alone is not a construction.',
    kind === 'multiply'
      ? 'Pair each A row with a B column, then add the products.'
      : kind === 'inverse'
        ? 'Compose your entered inverse with A. The product must be the identity.'
        : kind === 'solve'
          ? 'Substitute your vector into every equation.'
          : 'Keep row and column indices connected to their coordinates.',
    `Construct ${matrixText(expected)}.${kind === 'determinant' ? ` Signed scale: ${fractionText(solution.determinant)}.` : kind === 'solve' ? ` Classification: ${solution.classification}.` : ''}`,
  ];
  return {
    id: `matrices-${kind}-${unsigned}`,
    kind,
    seed: unsigned,
    problem,
    solution,
    expected,
    cellIds,
    setup: blankMatrixBuild(),
    prompt:
      kind === 'determinant'
        ? `Build each basis endpoint of ${problem.expression}, then claim its signed area scale.`
        : `Construct and include every output cell for ${problem.expression}.${kind === 'solve' ? ' Classify the common solution set.' : ''}`,
    hints,
    xp: 30,
    goal,
  };
}
export interface MatrixBoss extends LabBoss<MatrixBuild> {
  problem: MatrixProblem;
  solution: MatrixSolution;
  expected: Matrix;
  cellIds: string[];
  codeOptions: string[];
}
export function createMatrixBoss(seed: number): MatrixBoss {
  const c = createMatrixChallenge('determinant', seed),
    multiplyInput = parseMatrixInput(`multiply(${matrixText(c.problem.a)},[1,0;0,1])`);
  if (!multiplyInput.ok) throw new Error(multiplyInput.reason);
  const code = solveMatrix(multiplyInput.problem).code.python;
  const codeOptions = [
    code,
    code.replace('A[i][k] * B[k][j]', 'A[k][i] * B[k][j]'),
    code.replace('C[i][j] +=', 'C[i][j] ='),
  ];
  const read = (s: MatrixBuild) =>
    validMatrixBuild(s, c.expected) && exactMatrixNumber(s.claim, c.solution.determinant);
  const build = (s: MatrixBuild) =>
    validMatrixBuild(s, c.expected) &&
    s.included.length === c.cellIds.length &&
    c.cellIds.every(
      (id) =>
        s.included.includes(id) &&
        exactMatrixNumber(s.cells[id], c.expected[Number(id[4])][Number(id[6])]),
    );
  const connect = (s: MatrixBuild) => validMatrixBuild(s, c.expected) && s.code === code;
  return {
    id: `matrices-boss-${seed >>> 0}`,
    problem: c.problem,
    solution: c.solution,
    expected: c.expected,
    cellIds: c.cellIds,
    codeOptions,
    prompt: 'Read signed area, construct the basis images and connect the composition loop.',
    setup: blankMatrixBuild(),
    hints: c.hints,
    xp: 100,
    phases: [
      { id: 'read', title: 'Read signed area', prompt: 'What is the determinant?', goal: read },
      {
        id: 'build',
        title: 'Build basis images',
        prompt: 'Enter both coordinates of each basis image and include each coordinate.',
        goal: build,
      },
      {
        id: 'code',
        title: 'Connect the composition',
        prompt:
          'Which loop composes A with the identity without transposing A or discarding a product?',
        goal: connect,
      },
    ],
    goal: (s) => read(s) && build(s) && connect(s),
  };
}
export function enteredMatrix(s: MatrixBuild, expected: Matrix): Matrix {
  return expected.map((row, i) =>
    row.map((_, j) => {
      const id = `out-${i}-${j}`,
        v = parseMatrixNumber(s.cells[id]);
      return s.included.includes(id) && v && Math.abs(v.n / v.d) <= 100 ? v : { n: 0, d: 1 };
    }),
  );
}
export const buildDeterminant = (s: MatrixBuild, expected: Matrix) =>
  matrixDet(enteredMatrix(s, expected));
export const matrixOperationNames: Record<MatrixKind, string> = {
  transform: 'Transform space',
  add: 'Add cells',
  transpose: 'Transpose',
  multiply: 'Compose maps',
  determinant: 'Signed area',
  inverse: 'Reverse the map',
  solve: 'Intersect equations',
};
