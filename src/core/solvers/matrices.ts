import type { Solver } from '../labs/types';
import type { Step } from '../scene/spec';
import { normalizeFraction, fractionText, fractionLatex, type Fraction } from './fractions';
export type Matrix = Fraction[][];
export const matrixKinds = [
  'transform',
  'add',
  'transpose',
  'multiply',
  'determinant',
  'inverse',
  'solve',
] as const;
export type MatrixKind = (typeof matrixKinds)[number];
export type MatrixMethod = 'cells' | 'columns';
export interface MatrixProblem {
  kind: MatrixKind;
  a: Matrix;
  b?: Matrix;
  expression: string;
}
export interface MatrixSolution {
  answer: string;
  result: Matrix;
  determinant: Fraction;
  steps: Step[];
  method: MatrixMethod;
  classification?: 'unique' | 'infinite' | 'none';
  reduced?: Matrix;
  products: Record<string, Fraction[]>;
  code: Record<'python' | 'numpy', string>;
}
export const q = (n: number, d = 1): Fraction => normalizeFraction({ n, d });
export const addQ = (a: Fraction, b: Fraction) => q(a.n * b.d + b.n * a.d, a.d * b.d);
export const subQ = (a: Fraction, b: Fraction) => q(a.n * b.d - b.n * a.d, a.d * b.d);
export const mulQ = (a: Fraction, b: Fraction) => q(a.n * b.n, a.d * b.d);
export const divQ = (a: Fraction, b: Fraction) => q(a.n * b.d, a.d * b.n);
export const numQ = (a: Fraction) => a.n / a.d;
export const equalQ = (a: Fraction, b: Fraction) => a.n === b.n && a.d === b.d;
export const identityMatrix = (n: number): Matrix =>
  Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => q(i === j ? 1 : 0)));
export const matrixText = (a: Matrix) =>
  `[${a.map((row) => row.map(fractionText).join(',')).join(';')}]`;
export const matrixTex = (a: Matrix, prefix?: string) =>
  `\\begin{bmatrix}${a.map((row, i) => row.map((value, j) => (prefix ? `\\htmlClass{tk-${prefix}-${i}-${j}}{${fractionLatex(value)}}` : fractionLatex(value))).join('&')).join('\\\\')}\\end{bmatrix}`;
const token = (id: string, tex: string) => `\\htmlClass{tk-${id}}{${tex}}`;
function determinantExpansion(
  a: Matrix,
  rows = a.map((_, i) => i),
  columns = a[0].map((_, i) => i),
): string {
  if (rows.length === 1)
    return token(`a-${rows[0]}-${columns[0]}`, fractionLatex(a[rows[0]][columns[0]]));
  return columns
    .map(
      (column, j) =>
        `${j === 0 ? '' : j % 2 ? '-' : '+'}${token(`a-${rows[0]}-${column}`, fractionLatex(a[rows[0]][column]))}\\cdot\\left(${determinantExpansion(
          a,
          rows.slice(1),
          columns.filter((_, k) => k !== j),
        )}\\right)`,
    )
    .join(' ');
}
export function triangularMatrix(a: Matrix) {
  const rows = a.map((row) => row.map((value) => ({ ...value })));
  let swaps = 0;
  for (let col = 0; col < a.length; col++) {
    const pivot = rows.findIndex((row, index) => index >= col && row[col].n !== 0);
    if (pivot < 0) continue;
    if (pivot !== col) {
      [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
      swaps++;
    }
    for (let row = col + 1; row < a.length; row++) {
      const factor = divQ(rows[row][col], rows[col][col]);
      rows[row] = rows[row].map((value, j) => subQ(value, mulQ(factor, rows[col][j])));
    }
  }
  return {
    rows,
    swaps,
    determinant: rows.reduce((value, row, index) => mulQ(value, row[index]), q(swaps % 2 ? -1 : 1)),
  };
}
export function matrixMultiply(a: Matrix, b: Matrix): Matrix {
  if (a[0].length !== b.length) throw new Error('Matrix dimensions must agree.');
  return a.map((row) =>
    b[0].map((_, j) => row.reduce((sum, value, k) => addQ(sum, mulQ(value, b[k][j])), q(0))),
  );
}
export function matrixDet(a: Matrix): Fraction {
  if (a.length === 1) return a[0][0];
  return a[0].reduce(
    (sum, value, j) =>
      addQ(
        sum,
        mulQ(
          q(j % 2 ? -1 : 1),
          mulQ(value, matrixDet(a.slice(1).map((row) => row.filter((_, k) => k !== j)))),
        ),
      ),
    q(0),
  );
}
export function reduceMatrix(a: Matrix): { matrix: Matrix; pivots: number[] } {
  const matrix = a.map((row) => row.map((value) => ({ ...value }))),
    pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < matrix[0].length - 1 && row < matrix.length; col++) {
    const pivot = matrix.findIndex((values, index) => index >= row && values[col].n !== 0);
    if (pivot < 0) continue;
    [matrix[row], matrix[pivot]] = [matrix[pivot], matrix[row]];
    const divisor = matrix[row][col];
    matrix[row] = matrix[row].map((value) => divQ(value, divisor));
    for (let other = 0; other < matrix.length; other++)
      if (other !== row) {
        const factor = matrix[other][col];
        matrix[other] = matrix[other].map((value, j) => subQ(value, mulQ(factor, matrix[row][j])));
      }
    pivots.push(col);
    row++;
  }
  return { matrix, pivots };
}
function parseLiteral(raw: string): Matrix | null {
  const rows = raw.slice(1, -1).split(';');
  if (![2, 3].includes(rows.length)) return null;
  const result = rows.map((row) => row.split(',').map((cell) => cell.trim()));
  if (!result[0].length || result.some((row) => row.length !== result[0].length)) return null;
  if (result.flat().some((cell) => !/^[-+]?\d{1,2}$/.test(cell) || Math.abs(Number(cell)) > 6))
    return null;
  return result.map((row) => row.map((cell) => q(Number(cell))));
}
export function parseMatrixInput(
  raw: string,
): { ok: true; problem: MatrixProblem } | { ok: false; reason: string } {
  const fail = {
    ok: false as const,
    reason:
      'Use transform, add, transpose, multiply, determinant, inverse or solve with 2×2/3×3 integer matrices (−6…6). Separate rows with ; and columns with ,.',
  };
  if (typeof raw !== 'string' || raw.length > 240) return fail;
  const match =
    /^\s*(transform|add|transpose|multiply|determinant|inverse|solve)\s*\(\s*(\[[\s\d,+;-]+\])\s*(?:,\s*(\[[\s\d,+;-]+\])\s*)?\)\s*$/.exec(
      raw.replaceAll('−', '-'),
    );
  if (!match) return fail;
  const kind = match[1] as MatrixKind,
    a = parseLiteral(match[2]),
    b = match[3] ? parseLiteral(match[3]) : undefined;
  if (!a || a.some((row) => row.length !== a.length)) return fail;
  if (['add', 'multiply', 'solve'].includes(kind) !== !!b) return fail;
  if (
    b &&
    (b.length !== a.length || b.some((row) => row.length !== (kind === 'solve' ? 1 : a.length)))
  )
    return fail;
  if (kind === 'inverse' && a.length !== 2)
    return {
      ...fail,
      reason: 'The inverse workbench accepts 2×2 matrices. Use a nonsingular matrix.',
    };
  if (kind === 'inverse' && matrixDet(a).n === 0)
    return {
      ...fail,
      reason:
        'This matrix is singular: its determinant is zero, so an inverse does not exist. Explore it with transform or solve.',
    };
  return {
    ok: true,
    problem: {
      kind,
      a,
      ...(b ? { b } : {}),
      expression: `${kind}(${matrixText(a)}${b ? `,${matrixText(b)}` : ''})`,
    },
  };
}
function codeFor(p: MatrixProblem) {
  const A = JSON.stringify(p.a.map((row) => row.map(numQ))),
    B = p.b ? JSON.stringify(p.b.map((row) => row.map(numQ))) : '';
  const n = p.a.length;
  let python = `A = ${A}\n`,
    numpy = `import numpy as np\nA = np.array(${A})\n`;
  if (p.b) {
    python += `B = ${B}\n`;
    numpy += `B = np.array(${B})\n`;
  }
  if (p.kind === 'multiply')
    python += `C = [[0 for j in range(${n})] for i in range(${n})]\nfor i in range(${n}):\n    for j in range(${n}):\n        for k in range(${n}):\n            C[i][j] += A[i][k] * B[k][j]`;
  else if (p.kind === 'add')
    python += `C = [[A[i][j] + B[i][j] for j in range(${n})] for i in range(${n})]`;
  else if (p.kind === 'transpose')
    python += `C = [[A[j][i] for j in range(${n})] for i in range(${n})]`;
  else if (p.kind === 'transform')
    python += `basis = [[1 if i == j else 0 for i in range(${n})] for j in range(${n})]\nimages = [[sum(A[i][k] * v[k] for k in range(${n})) for i in range(${n})] for v in basis]`;
  else if (p.kind === 'determinant' || p.kind === 'inverse') {
    python +=
      n === 2
        ? 'det = A[0][0]*A[1][1] - A[0][1]*A[1][0]'
        : 'a, b, c = A[0]\nd, e, f = A[1]\ng, h, i = A[2]\ndet = a*(e*i-f*h) - b*(d*i-f*g) + c*(d*h-e*g)';
    if (p.kind === 'inverse')
      python +=
        '\nfrom fractions import Fraction\nC = [[Fraction(A[1][1], det), Fraction(-A[0][1], det)],\n     [Fraction(-A[1][0], det), Fraction(A[0][0], det)]]';
  } else
    python +=
      'from fractions import Fraction\nR = [[Fraction(v) for v in row] + [Fraction(B[i][0])] for i, row in enumerate(A)]\nr = 0\nfor c in range(len(A)):\n    p = next((i for i in range(r, len(A)) if R[i][c]), None)\n    if p is None: continue\n    R[r], R[p] = R[p], R[r]\n    divisor = R[r][c]\n    R[r] = [v / divisor for v in R[r]]\n    for i in range(len(A)):\n        if i != r:\n            factor = R[i][c]\n            R[i] = [v - factor*w for v, w in zip(R[i], R[r])]\n    r += 1\n# A zero coefficient row with a nonzero last cell means no solution.\n# Otherwise rank < len(A) means free variables; full rank means unique.';
  const op: Record<MatrixKind, string> = {
    add: 'C = A + B',
    transpose: 'C = A.T',
    multiply: 'C = A @ B',
    transform: 'images = A @ np.eye(len(A))',
    determinant: 'det = np.linalg.det(A)',
    inverse: 'C = np.linalg.inv(A)',
    solve:
      'rank_A = np.linalg.matrix_rank(A)\nrank_aug = np.linalg.matrix_rank(np.column_stack((A, B)))\nif rank_aug > rank_A:\n    classification = "none"\nelif rank_A < len(A):\n    classification = "infinite"\nelse:\n    x = np.linalg.solve(A, B)',
  };
  numpy +=
    op[p.kind] + '\n# NumPy uses floating-point arithmetic; the workbench keeps exact fractions.';
  return { python, numpy };
}
export function solveMatrix(p: MatrixProblem, method: MatrixMethod = 'cells'): MatrixSolution {
  const parsed = parseMatrixInput(p.expression);
  if (!parsed.ok || JSON.stringify(parsed.problem) !== JSON.stringify(p))
    throw new Error('Matrix input must match its bounded canonical form.');
  const n = p.a.length,
    determinant = matrixDet(p.a),
    products: Record<string, Fraction[]> = {};
  let result = p.a,
    classification: MatrixSolution['classification'],
    reduced: Matrix | undefined;
  if (p.kind === 'add')
    result = p.a.map((row, i) => row.map((value, j) => addQ(value, p.b![i][j])));
  if (p.kind === 'transpose') result = p.a[0].map((_, j) => p.a.map((row) => row[j]));
  if (p.kind === 'multiply') {
    result = matrixMultiply(p.a, p.b!);
    result.forEach((row, i) =>
      row.forEach(
        (_, j) => (products[`out-${i}-${j}`] = p.a[i].map((value, k) => mulQ(value, p.b![k][j]))),
      ),
    );
  }
  if (p.kind === 'determinant') result = [[determinant]];
  if (p.kind === 'inverse')
    result = [
      [divQ(p.a[1][1], determinant), divQ(q(-p.a[0][1].n), determinant)],
      [divQ(q(-p.a[1][0].n), determinant), divQ(p.a[0][0], determinant)],
    ];
  if (p.kind === 'solve') {
    const elimination = reduceMatrix(p.a.map((row, i) => [...row, p.b![i][0]]));
    reduced = elimination.matrix;
    const impossible = reduced.some(
      (row) => row.slice(0, n).every((value) => !value.n) && row[n].n !== 0,
    );
    classification = impossible ? 'none' : elimination.pivots.length < n ? 'infinite' : 'unique';
    result = Array.from({ length: n }, () => [q(0)]);
    if (!impossible) elimination.pivots.forEach((col, row) => (result[col][0] = reduced![row][n]));
  }
  const answer =
    p.kind === 'solve'
      ? classification === 'none'
        ? 'No solution'
        : classification === 'infinite'
          ? `Infinitely many; one solution ${matrixText(result)}`
          : matrixText(result)
      : p.kind === 'determinant'
        ? fractionText(determinant)
        : matrixText(result);
  const ids = result.flatMap((row, i) => row.map((_, j) => `out-${i}-${j}`));
  const links = [
    {
      token: 'A',
      entities: p.a.flatMap((row, i) => row.map((_, j) => `a-${i}-${j}`)),
      color: 'whole',
    },
    { token: 'C', entities: ids, color: 'part' },
    {
      token: 'det',
      entities:
        p.kind === 'transform' || p.kind === 'determinant'
          ? ['unit', 'basis-0', 'basis-1', ...(n === 3 ? ['basis-2'] : [])]
          : p.a.flatMap((row, i) => row.map((_, j) => `a-${i}-${j}`)),
      color: 'mint',
    },
  ];
  const step = (
    id: string,
    title: string,
    after: string,
    quick: string,
    standard: string,
    deep: string,
    tethers = links,
  ): Step => ({
    id,
    title,
    latexAfter: after,
    say: { quick, standard, deep },
    aria: standard,
    ops: [],
    tethers,
    gaze: tethers[0]?.entities.slice(0, 3),
  });
  const steps: Step[] = [
    step(
      'matrix-read',
      'Read the machine',
      `${token('A', 'A')} = ${matrixTex(p.a, 'a')}${p.b ? `,\\quad ${token('B', p.kind === 'solve' ? 'b' : 'B')} = ${matrixTex(p.b, 'b')}` : ''}`,
      'Columns tell us where the axes land.',
      `A has ${n} rows and ${n} columns. A column is the image of one basis vector.`,
      'A linear map preserves addition and scalar multiplication. Knowing every basis image determines every point.',
    ),
    step(
      'matrix-predict',
      'Predict before the reveal',
      `${p.kind === 'determinant' ? token('det', '\\det(A)') : token('C', 'C')} = ?`,
      'Make a guess.',
      p.kind === 'solve'
        ? 'Will the equations have one, infinitely many, or no common solutions?'
        : 'Predict the first output cell before the machine reveals it.',
      'A prediction can be revised. It connects the symbolic computation to the scene before the result appears.',
    ),
  ];
  steps[1].predict = {
    kind: p.kind === 'solve' ? 'choice' : 'number',
    inputMode: 'text',
    prompt:
      p.kind === 'solve'
        ? 'How many solutions?'
        : p.kind === 'determinant'
          ? 'Predict the determinant.'
          : 'Predict the top-left output cell.',
    ...(p.kind === 'solve' ? { options: ['unique', 'infinite', 'none'] } : {}),
    check: (answer) =>
      p.kind === 'solve' ? answer === classification : exactMatrixNumber(answer, result[0][0]),
    hints: [
      'Read one row and one column.',
      p.kind === 'determinant'
        ? 'For 2×2, ad−bc. For 3×3, expand along a row.'
        : p.kind === 'solve'
          ? 'Compare independent equations with the number of unknowns.'
          : 'For multiplication, add every row-by-column product.',
      p.kind === 'solve'
        ? `Classification: ${classification}.`
        : `The first value is ${fractionText(result[0][0])}.`,
    ],
  };
  if (p.kind === 'solve') {
    steps.push(
      step(
        'matrix-reduce',
        'Keep equations equivalent',
        `R = ${matrixTex(reduced!)}`,
        'Eliminate without changing the solution set.',
        'Swap rows, scale a nonzero pivot row and subtract multiples of it from the other rows.',
        'Each row operation is reversible. A contradictory row 0=b with b≠0 proves inconsistency; missing pivots leave free coordinates.',
      ),
    );
    steps.push(
      step(
        'matrix-intersection',
        'Find the common set',
        classification === 'none' ? '\\varnothing' : `x = ${matrixTex(result)}`,
        classification === 'unique'
          ? 'The lines or planes meet at one point.'
          : classification === 'none'
            ? 'There is no common intersection.'
            : 'A free direction leaves infinitely many points.',
        classification === 'unique'
          ? `The common point is ${matrixText(result)}. Substituting into every original equation returns b.`
          : classification === 'none'
            ? 'At least one reduced row has zero coefficients and a nonzero right-hand side.'
            : 'Set free coordinates to zero to get the displayed particular solution; moving along any null direction gives another solution.',
        'Rank(A) counts independent constraints. A solution exists exactly when rank(A)=rank([A|b]); it is unique exactly when this rank equals the number of unknowns.',
      ),
    );
  } else {
    const cells = result.flatMap((row, i) => row.map((value, j) => ({ i, j, value })));
    if (method === 'columns') cells.sort((a, b) => a.j - b.j || a.i - b.i);
    cells.forEach(({ i, j, value }) => {
      const id = `out-${i}-${j}`;
      const how =
        p.kind === 'multiply'
          ? products[id].map(fractionText).join(' + ')
          : p.kind === 'add'
            ? `${fractionText(p.a[i][j])} + ${fractionText(p.b![i][j])}`
            : p.kind === 'transpose'
              ? `A[${j + 1},${i + 1}]`
              : p.kind === 'determinant'
                ? 'Signed area or volume'
                : p.kind === 'inverse'
                  ? 'Adjugate entry ÷ determinant'
                  : 'Basis coordinate';
      const rowIds = p.a[i]?.map((_, k) => `a-${i}-${k}`) ?? ['unit'];
      const operand = (side: 'a' | 'b', r: number, c: number) =>
        token(`${side}-${r}-${c}`, fractionLatex((side === 'a' ? p.a : p.b!)[r][c]));
      const calculation =
        p.kind === 'multiply'
          ? p.a[i].map((_, k) => `${operand('a', i, k)}\\cdot${operand('b', k, j)}`).join('+')
          : p.kind === 'add'
            ? `${operand('a', i, j)}+${operand('b', i, j)}`
            : p.kind === 'transpose'
              ? operand('a', j, i)
              : p.kind === 'transform'
                ? operand('a', i, j)
                : p.kind === 'determinant'
                  ? determinantExpansion(p.a)
                  : `\\frac{${i !== j ? '-' : ''}${operand('a', i === j ? 1 - i : i, i === j ? 1 - j : j)}}{${token('det', fractionLatex(determinant))}}`;
      steps.push(
        step(
          `matrix-cell-${i}-${j}`,
          p.kind === 'determinant' ? 'Measure the signed scale' : `Build cell ${i + 1},${j + 1}`,
          `${p.kind === 'determinant' ? token('det', '\\det(A)') : token('C', `C_{${i + 1},${j + 1}}`)} = ${calculation} = ${token(id, fractionLatex(value))}`,
          `${how} gives ${fractionText(value)}.`,
          p.kind === 'multiply'
            ? `Sweep row ${i + 1} of A through column ${j + 1} of B. Its products are ${how}; they add to ${fractionText(value)}.`
            : `${how} gives the exact value ${fractionText(value)}.`,
          p.kind === 'multiply'
            ? method === 'columns'
              ? 'B’s column is a combination of basis vectors; applying A combines its columns with the same weights. The resulting coordinate is this cell.'
              : 'The inner index k pairs entries A[i,k] and B[k,j]. Their products represent one coordinate of the composed map.'
            : p.kind === 'determinant'
              ? 'The determinant is signed. Its absolute value measures area or volume scale; its sign records orientation. A zero determinant collapses dimension.'
              : p.kind === 'inverse'
                ? 'Dividing the adjugate by a nonzero determinant creates the reverse map. Multiplying either way returns the identity.'
                : p.kind === 'transpose'
                  ? 'Transposing swaps the two indices. A row becomes a column; the operation does not generally undo a transformation.'
                  : 'The output follows the chosen operation exactly; the diagram binds this coordinate to its symbolic cell.',
          [
            { token: 'A', entities: rowIds, color: 'whole' },
            ...(p.b
              ? [{ token: 'B', entities: p.b.map((_, k) => `b-${k}-${j}`), color: 'mint' }]
              : []),
            { token: 'C', entities: [id], color: 'part' },
          ],
        ),
      );
    });
  }
  steps.push(
    step(
      'matrix-result',
      'Check the whole map',
      p.kind === 'solve'
        ? `${token('C', `\\text{${classification}}`)}${classification === 'none' ? '' : `,\\quad x = ${matrixTex(result, 'out')}`}`
        : p.kind === 'determinant'
          ? `${token('det', '\\det(A)')} = ${fractionLatex(determinant)}`
          : `${token('C', 'C')} = ${matrixTex(result, 'out')}`,
      `Result: ${answer}`,
      p.kind === 'transform' || p.kind === 'determinant'
        ? `The signed scale is ${fractionText(determinant)}; ${determinant.n < 0 ? 'orientation reverses' : determinant.n === 0 ? 'space collapses' : 'orientation is preserved'}.`
        : `Result: ${answer}.`,
      p.kind === 'inverse'
        ? 'Compose A with C in either order. Every basis vector returns to itself, so every vector returns to itself.'
        : p.kind === 'solve'
          ? 'Check every original equation. When free variables exist, a single particular solution does not describe the whole solution set.'
          : 'Stable cell ids preserve the same construction when the dial or scene dimension changes.',
    ),
  );
  if (method === 'columns' && p.kind === 'determinant') {
    const upper = triangularMatrix(p.a),
      cell = steps[2];
    cell.title = 'Eliminate below the diagonal';
    cell.latexAfter = `U = ${matrixTex(upper.rows)},\\quad ${token('det', '\\det(A)')} = (-1)^{${upper.swaps}} ${upper.rows.map((row, i) => fractionLatex(row[i])).join('\\cdot')} = ${fractionLatex(upper.determinant)}`;
    cell.say = {
      quick: 'Multiply pivots and account for row swaps.',
      standard: `Subtract row multiples to make a triangular matrix. ${upper.swaps} row swaps change the sign; the diagonal product gives ${fractionText(upper.determinant)}.`,
      deep: 'Adding a multiple of one row to another preserves determinant. Each row swap reverses its sign. A triangular determinant is the product of its diagonal.',
    };
    cell.aria = cell.say.standard;
  }
  if (method === 'columns' && p.kind === 'inverse') {
    const augmented = reduceMatrix(p.a.map((row, i) => [...row, ...identityMatrix(n)[i]])).matrix;
    steps
      .filter((step) => step.id.startsWith('matrix-cell'))
      .forEach((step) => {
        step.latexBefore = `[A\\mid I] \\longrightarrow ${matrixTex(augmented)}`;
        step.say.standard =
          'Reduce [A | I] to [I | C]. The same row operations that undo A construct the inverse C.';
        step.say.deep =
          'Elementary row operations multiply on the left by reversible matrices. Once their product sends A to I, that product is A⁻¹; applying it to I exposes the inverse.';
        step.aria = step.say.standard;
      });
  }
  if (method === 'columns' && p.kind === 'solve' && classification === 'unique') {
    const ratios = p.a[0].map((_, j) =>
      matrixDet(p.a.map((row, i) => row.map((value, k) => (k === j ? p.b![i][0] : value)))),
    );
    steps[2].title = 'Replace one column at a time';
    steps[2].latexAfter = `x = ${matrixTex(
      ratios.map((value) => [divQ(value, determinant)]),
      'out',
    )}`;
    steps[2].say = {
      quick: 'A determinant ratio gives each coordinate.',
      standard: `Cramer’s rule replaces each column of A by b. Numerators ${ratios.map(fractionText).join(', ')} divided by det(A)=${fractionText(determinant)} give the solution.`,
      deep: 'When det(A) is nonzero, the system has one solution. Multilinearity of determinant isolates one coefficient when its column is replaced by b; division by det(A) recovers that coordinate.',
    };
    steps[2].aria = steps[2].say.standard;
  }
  const cellLinks = [
    ...p.a.flatMap((row, i) =>
      row.map((_, j) => ({ token: `a-${i}-${j}`, entities: [`a-${i}-${j}`], color: 'whole' })),
    ),
    ...(p.b
      ? p.b.flatMap((row, i) =>
          row.map((_, j) => ({ token: `b-${i}-${j}`, entities: [`b-${i}-${j}`], color: 'mint' })),
        )
      : []),
    ...result.flatMap((row, i) =>
      row.map((_, j) => ({ token: `out-${i}-${j}`, entities: [`out-${i}-${j}`], color: 'part' })),
    ),
  ];
  steps.forEach((step) => {
    step.tethers = [...step.tethers, ...cellLinks];
  });
  return {
    answer,
    result,
    determinant,
    steps,
    method,
    classification,
    reduced,
    products,
    code: codeFor(p),
  };
}
export function parseMatrixNumber(raw: unknown): Fraction | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && Math.abs(raw) <= 999999) raw = String(raw);
  if (typeof raw !== 'string' || raw.length > 32) return null;
  const value = raw.trim().replaceAll('−', '-');
  const fraction = /^([+-]?\d{1,6})(?:\/([+-]?\d{1,6}))?$/.exec(value);
  if (fraction) {
    if (fraction[2] && Number(fraction[2]) === 0) return null;
    return q(Number(fraction[1]), Number(fraction[2] ?? 1));
  }
  const decimal = /^([+-]?)(\d{1,4})\.(\d{1,6})$/.exec(value);
  if (!decimal) return null;
  return q(
    (decimal[1] === '-' ? -1 : 1) *
      (Number(decimal[2]) * 10 ** decimal[3].length + Number(decimal[3])),
    10 ** decimal[3].length,
  );
}
export function exactMatrixNumber(raw: unknown, target: Fraction) {
  const value = parseMatrixNumber(raw);
  return !!value && equalQ(value, target);
}
export const matrixSolver: Solver<MatrixProblem, MatrixSolution> = {
  id: 'finite-matrices',
  domain: 'math',
  parse: (raw) => {
    const p = parseMatrixInput(raw);
    return p.ok ? p.problem : null;
  },
  methods: () => [
    { id: 'cells', name: 'Row by column' },
    { id: 'columns', name: 'Column images' },
  ],
  solve: (p, method) => solveMatrix(p, method === 'columns' ? 'columns' : 'cells'),
};
