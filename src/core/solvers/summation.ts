import type { Solver } from '../labs/types';
import type { Step } from '../scene/spec';
import { fractionLatex, fractionText, normalizeFraction, type Fraction } from './fractions';

export type Polynomial = [number, number, number, number, number, number];
const powers = [
  [0, 0],
  [1, 0],
  [0, 1],
  [2, 0],
  [1, 1],
  [0, 2],
] as const;
export type SummationMethod = 'accumulate' | 'structure';
export type SummationProblem =
  | { kind: 'single'; a: number; b: number; polynomial: Polynomial; expression: string }
  | {
      kind: 'double';
      a: number;
      b: number;
      c: number;
      d: number;
      polynomial: Polynomial;
      expression: string;
    }
  | { kind: 'data'; values: number[]; expression: string };
export interface SumTerm {
  id: string;
  i: number;
  j?: number;
  value: number;
  running: number;
}
export interface DataMetrics {
  mean: Fraction;
  variance: Fraction;
  deviationSquares: Fraction[];
  sd: number;
}
export interface SummationSolution {
  answer: string;
  total: number;
  terms: SumTerm[];
  result: Fraction;
  metrics?: DataMetrics;
  method: SummationMethod;
  steps: Step[];
  code: { python: string; r: string; sql: string };
}
const zero = (): Polynomial => [0, 0, 0, 0, 0, 0];
function add(a: Polynomial, b: Polynomial, sign = 1): Polynomial {
  return a.map((value, index) => value + sign * b[index]) as Polynomial;
}
function multiply(a: Polynomial, b: Polynomial): Polynomial {
  const result = zero();
  a.forEach((left, k) =>
    b.forEach((right, l) => {
      if (!left || !right) return;
      const x = powers[k][0] + powers[l][0],
        y = powers[k][1] + powers[l][1];
      const index = powers.findIndex(([i, j]) => i === x && j === y);
      if (index < 0) throw new Error('Use a polynomial of total degree at most two.');
      result[index] += left * right;
    }),
  );
  return result;
}
export function parseSumPolynomial(raw: string): Polynomial {
  const text = raw.replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/\s/g, '');
  const tokens = text.match(/\d+|[ij()+*^-]/g) ?? [];
  if (!tokens.length || tokens.join('') !== text || tokens.length > 48)
    throw new Error('Use integer terms, i/j, +, −, ×, parentheses and powers up to 2.');
  let cursor = 0,
    depth = 0;
  const peek = () => tokens[cursor];
  const atom = (): Polynomial => {
    if (++depth > 12) throw new Error('Use at most twelve nested term groups.');
    let value: Polynomial;
    if (peek() === '(') {
      cursor++;
      value = expression();
      if (tokens[cursor++] !== ')') throw new Error('Close each term group with ).');
    } else if (peek() === 'i' || peek() === 'j') {
      value = zero();
      value[peek() === 'i' ? 1 : 2] = 1;
      cursor++;
    } else if (/^\d+$/.test(peek() ?? '')) {
      const number = Number(tokens[cursor++]);
      if (!Number.isSafeInteger(number) || number > 100)
        throw new Error('Keep integer literals between 0 and 100.');
      value = zero();
      value[0] = number;
    } else throw new Error('Each term needs a number, index or parenthesized expression.');
    if (peek() === '^') {
      cursor++;
      const exponent = tokens[cursor++];
      if (!['0', '1', '2'].includes(exponent))
        throw new Error('Only powers 0, 1 and 2 fit this finite Hopper.');
      if (exponent === '0') value = [1, 0, 0, 0, 0, 0];
      if (exponent === '2') value = multiply(value, value);
    }
    depth--;
    return value;
  };
  const signed = (): Polynomial => {
    if (peek() === '+' || peek() === '-') {
      const sign = tokens[cursor++] === '-' ? -1 : 1;
      return signed().map((value) => sign * value) as Polynomial;
    }
    return atom();
  };
  const product = (): Polynomial => {
    let value = signed();
    while (peek() === '*' || peek() === '(' || peek() === 'i' || peek() === 'j') {
      if (peek() === '*') cursor++;
      value = multiply(value, signed());
    }
    return value;
  };
  const expression = (): Polynomial => {
    let value = product();
    while (peek() === '+' || peek() === '-') {
      const sign = tokens[cursor++] === '-' ? -1 : 1;
      value = add(value, product(), sign);
    }
    return value;
  };
  const polynomial = expression();
  if (cursor !== tokens.length || polynomial.some((value) => Math.abs(value) > 100))
    throw new Error('Use a complete quadratic term with coefficients up to 100.');
  return polynomial;
}
export function sumTermValue(polynomial: Polynomial, i: number, j = 0) {
  return polynomial.reduce(
    (sum, coefficient, k) => sum + coefficient * i ** powers[k][0] * j ** powers[k][1],
    0,
  );
}
export function polynomialText(
  polynomial: Polynomial,
  dialect: 'plain' | 'tex' | 'python' | 'r' | 'sql' = 'plain',
) {
  const factor = (name: string, power: number) =>
    power === 0
      ? ''
      : power === 1
        ? name
        : dialect === 'tex'
          ? name + '^2'
          : dialect === 'sql'
            ? `POWER(${name}, 2)`
            : dialect === 'python'
              ? name + '**2'
              : name + '^2';
  const parts: string[] = [];
  [3, 4, 5, 1, 2, 0].forEach((index) => {
    const coefficient = polynomial[index];
    if (!coefficient) return;
    const [i, j] = powers[index],
      variables = [factor('i', i), factor('j', j)].filter(Boolean);
    const join = dialect === 'tex' || dialect === 'plain' ? '' : ' * ';
    const magnitude = Math.abs(coefficient);
    const term = [
      ...(magnitude !== 1 || !variables.length ? [String(magnitude)] : []),
      ...variables,
    ].join(join);
    parts.push(
      `${parts.length ? (coefficient < 0 ? ' - ' : ' + ') : coefficient < 0 ? '-' : ''}${term}`,
    );
  });
  return parts.join('') || '0';
}
function enumerate(problem: SummationProblem): SumTerm[] {
  let total = 0;
  const terms: SumTerm[] = [];
  if (problem.kind === 'data')
    return problem.values.map((value, index) => ({
      id: `term-${index}`,
      i: index + 1,
      value,
      running: (total += value),
    }));
  for (let i = problem.a; i <= problem.b; i++) {
    const c = problem.kind === 'double' ? problem.c : 0,
      d = problem.kind === 'double' ? problem.d : 0;
    for (let j = c; j <= d; j++) {
      const value = sumTermValue(problem.polynomial, i, j);
      terms.push({
        id: `term-${terms.length}`,
        i,
        ...(problem.kind === 'double' ? { j } : {}),
        value,
        running: (total += value),
      });
    }
  }
  return terms;
}
export type SummationParseResult =
  { ok: true; problem: SummationProblem } | { ok: false; reason: string };
export function parseSummationInput(raw: string): SummationParseResult {
  try {
    if (!raw.trim() || raw.length > 256)
      throw new Error('Enter a finite sum or a dataset, up to 256 characters.');
    let text = raw.trim().replace(/[−–]/g, '-');
    // A narrow notation adapter; no raw LaTeX is passed to the renderer.
    text = text.replace(/^Σ_\{i=(\d+)\}\^\{(\d+)\}\s*\((.+)\)$/, 'sum(i=$1..$2, $3)');
    const data = /^data\s*\(\s*([-+\d,\s]+)\s*\)$/i.exec(text);
    if (data) {
      const entries = data[1].split(',').map((entry) => entry.trim());
      const values = entries.map(Number);
      if (
        entries.some((entry) => !/^[+-]?\d+$/.test(entry)) ||
        values.length < 2 ||
        values.length > 10 ||
        values.some((value) => Math.abs(value) > 20 || !Number.isSafeInteger(value))
      )
        throw new Error('Use 2–10 integer observations between −20 and 20.');
      return {
        ok: true,
        problem: { kind: 'data', values, expression: `data(${values.join(', ')})` },
      };
    }
    const double =
      /^sum\s*\(\s*i\s*=\s*(\d+)\s*\.\.\s*(\d+)\s*,\s*j\s*=\s*(\d+)\s*\.\.\s*(\d+)\s*,\s*(.+)\)$/i.exec(
        text,
      );
    const single = /^sum\s*\(\s*i\s*=\s*(\d+)\s*\.\.\s*(\d+)\s*,\s*(.+)\)$/i.exec(text);
    const match = double ?? single;
    if (!match)
      throw new Error('Write sum(i=1..5, 2i+1), sum(i=1..3, j=1..3, i+j), or data(4,8,6,5,3).');
    const a = Number(match[1]),
      b = Number(match[2]),
      c = double ? Number(match[3]) : 0,
      d = double ? Number(match[4]) : 0;
    if (
      [a, b, c, d].some((value) => value > 12) ||
      a > b ||
      c > d ||
      b - a + 1 > 12 ||
      (double && (b - a + 1 > 4 || d - c + 1 > 4))
    )
      throw new Error(
        'Use inclusive bounds 0–12, up to twelve single terms or a 4×4 double-sum grid.',
      );
    const polynomial = parseSumPolynomial(match[double ? 5 : 3]);
    if (!double && (polynomial[2] || polynomial[4] || polynomial[5]))
      throw new Error('A single sum uses only i; add a j range for a double sum.');
    const expression = double
      ? `sum(i=${a}..${b}, j=${c}..${d}, ${polynomialText(polynomial)})`
      : `sum(i=${a}..${b}, ${polynomialText(polynomial)})`;
    const problem: SummationProblem = double
      ? { kind: 'double', a, b, c, d, polynomial, expression }
      : { kind: 'single', a, b, polynomial, expression };
    const terms = enumerate(problem);
    if (terms.some((term) => term.value < 0 || term.value > 100) || terms.at(-1)!.running > 600)
      throw new Error(
        'The teaching Hopper holds nonnegative terms up to 100 and a total up to 600. Use the equation workspace for broader expressions.',
      );
    return { ok: true, problem };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Check the finite sum syntax.',
    };
  }
}
export const sumToken = (id: string, tex: string) => `\\htmlClass{tk-${id}}{${tex}}`;
export function summationTex(problem: SummationProblem): string {
  if (problem.kind === 'data')
    return `x=[${problem.values.map((value, index) => sumToken('term-' + index, String(value))).join(',')} ]`;
  return `${sumToken('walker', `\\sum_{i=${problem.a}}^{${problem.b}}`)}${problem.kind === 'double' ? sumToken('grid', `\\sum_{j=${problem.c}}^{${problem.d}}`) : ''} ${sumToken('term-rule', `(${polynomialText(problem.polynomial, 'tex')})`)}`;
}
export function summationExpressionTex(raw: string) {
  const parsed = parseSummationInput(raw);
  return parsed.ok ? summationTex(parsed.problem) : null;
}
export function dataMetrics(values: number[]): DataMetrics {
  const n = values.length,
    total = values.reduce((a, b) => a + b, 0),
    mean = normalizeFraction({ n: total, d: n });
  const deviationSquares = values.map((value) =>
    normalizeFraction({ n: (value * n - total) ** 2, d: n * n }),
  );
  const variance = normalizeFraction({
    n: n * values.reduce((sum, value) => sum + value * value, 0) - total * total,
    d: n * n,
  });
  return { mean, variance, deviationSquares, sd: Math.sqrt(variance.n / variance.d) };
}
export function summationCode(problem: SummationProblem) {
  if (problem.kind === 'data') {
    const data = problem.values.join(', ');
    return {
      python: `values = [${data}]\nmean = sum(values) / len(values)\nsquares = [(x - mean)**2 for x in values]\nvariance = sum(squares) / len(values)\nsd = variance**0.5`,
      r: `values <- c(${data})\nmean <- mean(values)\nvariance <- mean((values - mean)^2)\nsd <- sqrt(variance)`,
      sql: 'WITH centered AS (SELECT x, AVG(x) OVER () AS mean FROM data)\nSELECT AVG(x) AS mean, AVG((x-mean)*(x-mean)) AS variance FROM centered;',
    };
  }
  const term = polynomialText(problem.polynomial, 'python');
  const python =
    problem.kind === 'double'
      ? `total = 0\nfor i in range(${problem.a}, ${problem.b + 1}):\n    for j in range(${problem.c}, ${problem.d + 1}):\n        term = ${term}\n        total += term\nprint(total)`
      : `total = 0\nfor i in range(${problem.a}, ${problem.b + 1}):\n    term = ${term}\n    total += term\nprint(total)`;
  return {
    python,
    r:
      problem.kind === 'double'
        ? `grid <- expand.grid(i=${problem.a}:${problem.b}, j=${problem.c}:${problem.d})\ntotal <- with(grid, sum(${polynomialText(problem.polynomial, 'r')}))`
        : `i <- ${problem.a}:${problem.b}\ntotal <- sum(${polynomialText(problem.polynomial, 'r')})`,
    sql: `SELECT SUM(${polynomialText(problem.polynomial, 'sql')}) AS total\nFROM ${problem.kind === 'double' ? 'i_indices CROSS JOIN j_indices' : 'indices'}\nWHERE i BETWEEN ${problem.a} AND ${problem.b}${problem.kind === 'double' ? ` AND j BETWEEN ${problem.c} AND ${problem.d}` : ''};`,
  };
}
function structureText(problem: SummationProblem, terms: SumTerm[]) {
  if (problem.kind === 'data')
    return 'Expand (x−μ)²: population variance equals E[X²]−μ². This gives the same exact answer as the deviation squares; it divides by n, not n−1.';
  if (problem.kind === 'double')
    return 'Fill rows or columns: every ordered pair occurs once. Distributivity separates constants, i, j, i², ij and j² into products of their one-dimensional sums.';
  const [constant, linear, , quadratic] = problem.polynomial;
  if (!quadratic)
    return `Gauss pairs the first and last terms: each pair totals ${terms[0].value + terms.at(-1)!.value}. Two copies make ${terms.length} pairs, so divide their total by two. This also handles an odd middle term.`;
  return `Use Σ₀ⁿi=n(n+1)/2 and Σ₀ⁿi²=n(n+1)(2n+1)/6. Subtract the part below ${problem.a}, then combine ${quadratic}Σi² + ${linear}Σi + ${constant}n. The zero term contributes zero to powers of i.`;
}
export function solveSummation(
  problem: SummationProblem,
  method: SummationMethod = 'accumulate',
): SummationSolution {
  const checked = parseSummationInput(problem.expression);
  if (!checked.ok || JSON.stringify(checked.problem) !== JSON.stringify(problem))
    throw new RangeError('Use a validated bounded finite-sum problem.');
  const terms = enumerate(problem),
    total = terms.at(-1)!.running;
  const metrics = problem.kind === 'data' ? dataMetrics(problem.values) : undefined;
  const result = metrics?.variance ?? { n: total, d: 1 },
    answer = fractionText(result);
  const tethers: Step['tethers'] = [
    { token: 'walker', entities: ['walker'], color: 'stats' },
    { token: 'term-rule', entities: terms.map((term) => term.id), color: 'part' },
    ...terms.map((term) => ({
      token: term.id,
      entities: [term.id, term.id + '-label'],
      color: 'stats',
    })),
    {
      token: 'result',
      entities: metrics
        ? ['result', ...Array.from({ length: 24 }, (_, index) => `sd-ring-${index}`)]
        : ['result'],
      color: 'result',
    },
    { token: 'mean', entities: metrics ? ['mean', 'mean-pin'] : ['mean'], color: 'highlight' },
    {
      token: 'variance',
      entities: metrics ? ['variance', ...terms.map((term) => term.id)] : ['variance'],
      color: 'stats',
    },
    { token: 'grid', entities: ['grid'], color: 'paper' },
  ];
  const step = (
    id: string,
    title: string,
    tex: string,
    quick: string,
    standard: string,
    deep: string,
  ): Step => ({
    id,
    title,
    latexAfter: tex,
    say: { quick, standard, deep },
    ops: [],
    tethers,
    gaze: ['walker'],
    aria: standard,
  });
  const read = step(
    'sum-read',
    'Read the machine',
    summationTex(problem),
    problem.kind === 'data'
      ? 'Each observation has equal weight.'
      : 'Start at the lower bound. Include the upper bound.',
    problem.kind === 'data'
      ? 'Keep repeated observations: they are separate data points. We will find the mean and population variance.'
      : 'The index walks through every included integer. Substitute that index into the term rule before adding the term.',
    'A sum is a finite collection of contributions. The order may change, but each required contribution must appear exactly once. Dataset variance here describes the displayed population, so its divisor is n.',
  );
  const target = metrics?.mean ?? result;
  const predict = step(
    'sum-predict',
    'Predict before the Hopper runs',
    summationTex(problem),
    'Make your estimate first.',
    'Predict the exact result before the machine reveals it.',
    'Write an integer, fraction or exact terminating decimal. Prediction is a place to explore; an incorrect answer can be revised.',
  );
  predict.predict = {
    kind: 'number',
    inputMode: metrics ? 'text' : 'decimal',
    prompt: metrics
      ? 'Where will the equal-weight mean balance? Write its exact value.'
      : 'What total will the Hopper collect?',
    check: (answer) => numericMatches(answer, target),
    hints: [
      metrics ? 'Add all observations and divide by their count.' : 'Include both bounds.',
      metrics
        ? `There are ${terms.length} observations.`
        : `There are ${terms.length} individual terms.`,
      `The exact value is ${fractionText(target)}.`,
    ],
  };
  const steps: Step[] = [read, predict];
  if (metrics) {
    steps.push(
      step(
        'sum-mean',
        'Balance the observations',
        `${sumToken('mean', '\\mu')}=\\frac{${total}}{${terms.length}}=${fractionLatex(metrics.mean)}`,
        'The mean is the balance point.',
        `The equal-weight mean is ${fractionText(metrics.mean)}. The signed distances from this point add to zero.`,
        method === 'structure'
          ? 'The first moment E[X] is the weighted balance coordinate. With equal weights, divide the total by n.'
          : 'Move the fulcrum until the clockwise and anticlockwise moments cancel. Each observation contributes one equal weight at its value.',
      ),
      step(
        'sum-deviations',
        'Build deviation squares',
        `${sumToken('variance', '\\sum (x_i-\\mu)^2')}=${fractionLatex(normalizeFraction({ n: metrics.variance.n * terms.length, d: metrics.variance.d }))}`,
        'Square every distance from the mean.',
        `The square areas are ${metrics.deviationSquares.map(fractionText).join(', ')}. Negative distances have positive square areas.`,
        method === 'structure'
          ? structureText(problem, terms)
          : 'Each square has side |x−μ| and area (x−μ)². A common geometric scale preserves the ratios of these exact areas; labels give their original units.',
      ),
      step(
        'sum-variance',
        'Average the square areas',
        `${sumToken('variance', '\\sigma^2')}=\\frac{\\sum (x_i-\\mu)^2}{${terms.length}}=${fractionLatex(metrics.variance)}`,
        'Population variance is the mean square distance.',
        `Divide the total square area by ${terms.length}. Population variance is exactly ${fractionText(metrics.variance)} squared units.`,
        structureText(problem, terms),
      ),
      step(
        'sum-sd',
        'Unfold the standard-deviation ring',
        `${sumToken('result', '\\sigma')}=\\sqrt{${fractionLatex(metrics.variance)}}\\approx ${metrics.sd.toFixed(3)}`,
        'Standard deviation has the original units.',
        `The ring radius is √variance ≈ ${metrics.sd.toFixed(3)}. It is a distance scale, not a guarantee that every point lies inside.`,
        'Taking the square root converts squared units back to the observations’ units. The ring marks one standard deviation from the mean; no normal-distribution assumption is made.',
      ),
    );
  } else {
    terms.forEach((term, index) =>
      steps.push(
        step(
          `sum-term-${index}`,
          `Build term ${index + 1}`,
          `${sumToken('walker', `i=${term.i}${term.j === undefined ? '' : `,j=${term.j}`}`)}\\quad ${sumToken(term.id, String(term.value))}\\quad ${sumToken('result', `S_${index + 1}=${term.running}`)}`,
          `Add ${term.value}; the total becomes ${term.running}.`,
          `At i=${term.i}${term.j === undefined ? '' : `, j=${term.j}`}, the rule builds ${term.value}. Adding it to ${index ? terms[index - 1].running : 0} gives ${term.running}.`,
          method === 'structure'
            ? structureText(problem, terms)
            : 'The accumulator remembers earlier terms. The current term changes the total exactly once; the index itself is not the term unless the rule is f(i)=i.',
        ),
      ),
    );
    steps.push(
      step(
        'sum-result',
        'Read the complete total',
        `${summationTex(problem)}=${sumToken('result', String(total))}`,
        `All ${terms.length} terms total ${total}.`,
        method === 'structure'
          ? structureText(problem, terms)
          : `Every required term has entered the Hopper once. The inclusive finite sum is ${total}.`,
        structureText(problem, terms),
      ),
    );
  }
  if (metrics) {
    steps[2].gaze = ['mean-pin'];
    steps[3].gaze = terms.map((term) => term.id);
    steps[4].gaze = ['variance'];
    steps[5].gaze = metrics.sd ? ['sd-ring-0', 'result'] : ['result'];
  }
  return { answer, total, terms, result, metrics, method, steps, code: summationCode(problem) };
}
export function parseSumNumber(value: unknown): Fraction | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value).trim().replace(/−/g, '-');
  if (text.length > 32) return null;
  const ratio = /^([+-]?\d+)\/([+-]?\d+)$/.exec(text),
    decimal = /^([+-]?\d+)(?:\.(\d{1,6}))?$/.exec(text);
  if (!ratio && !decimal) return null;
  const n = ratio ? Number(ratio[1]) : Number(text) * 10 ** (decimal![2]?.length ?? 0);
  const d = ratio ? Number(ratio[2]) : 10 ** (decimal![2]?.length ?? 0);
  if (
    !d ||
    !Number.isSafeInteger(Math.round(n)) ||
    Math.abs(n) > 10000000 ||
    Math.abs(d) > 10000000
  )
    return null;
  return normalizeFraction({ n: Math.round(n), d });
}
export function numericMatches(value: unknown, target: Fraction): boolean {
  const actual = parseSumNumber(value);
  return (
    !!actual && actual.n === normalizeFraction(target).n && actual.d === normalizeFraction(target).d
  );
}
export const summationSolver: Solver<SummationProblem, SummationSolution> = {
  id: 'finite-summation',
  domain: 'stats',
  parse: (raw) => {
    const parsed = parseSummationInput(raw);
    return parsed.ok ? parsed.problem : null;
  },
  methods: (problem) => [
    { id: 'accumulate', name: problem.kind === 'data' ? 'Deviation squares' : 'Walk each term' },
    {
      id: 'structure',
      name:
        problem.kind === 'data'
          ? 'Moments identity'
          : problem.kind === 'double'
            ? 'Change the grid order'
            : 'Pair or use power sums',
    },
  ],
  solve: (problem, method) =>
    solveSummation(problem, method === 'structure' ? 'structure' : 'accumulate'),
};
