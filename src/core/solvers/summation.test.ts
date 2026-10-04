import { describe, expect, it } from 'vitest';
import { evaluate, mean, variance } from 'mathjs';
import {
  dataMetrics,
  numericMatches,
  parseSumNumber,
  parseSumPolynomial,
  parseSummationInput,
  polynomialText,
  solveSummation,
} from './summation';
function parse(raw: string) {
  const value = parseSummationInput(raw);
  if (!value.ok) throw new Error(value.reason);
  return value.problem;
}
describe('bounded exact finite sums', () => {
  it.each([
    ['sum(i=1..5, 2i+1)', 35],
    ['sum(i=1..5, i^2)', 55],
    ['sum(i=1..10, i)', 55],
    ['sum(i=1..3, j=1..3, i+j)', 36],
    ['sum(i=0..0, 0)', 0],
    ['sum(i=2..4, (i+1)^2)', 50],
    ['sum(i=0..2, j=0..2, (i+j)^2)', 48],
    ['Σ_{i=1}^{5} (2i+1)', 35],
  ])('%s has independent expected total %d', (raw, expected) => {
    const problem = parse(raw),
      result = solveSummation(problem);
    expect(result.total).toBe(expected);
    expect(result.terms.at(-1)?.running).toBe(expected);
    expect(solveSummation(problem, 'structure').total).toBe(expected);
    if (problem.kind !== 'data')
      for (const term of result.terms)
        expect(term.value).toBe(
          Number(evaluate(polynomialText(problem.polynomial, 'r'), { i: term.i, j: term.j ?? 0 })),
        );
  });
  it.each(['i', 'i^2', '2i+1', '(i+1)^2', '3i-2', 'ij+2', '(i+j)^2'])(
    'agrees with independent mathjs evaluation for %s',
    (raw) => {
      const polynomial = parseSumPolynomial(raw);
      for (let i = 1; i <= 3; i++)
        for (let j = 1; j <= 3; j++) {
          const normalized = polynomialText(polynomial, 'r');
          expect(evaluate(normalized, { i, j })).toBe(
            evaluate(raw.replace(/ij/g, 'i*j'), { i, j }),
          );
        }
    },
  );
  it.each([
    '',
    'eval(i)',
    'sum(i=5..1,i)',
    'sum(i=0..12,i)',
    'sum(i=1..5,j)',
    'sum(i=1..3,i^3)',
    'sum(i=1..5,-i)',
    'sum(i=1..12,100)',
    'sum(i=1..5,1/0)',
    'sum(i=1..5,i); alert(1)',
    'sum(i=1..5, i.constructor)',
    'sum(i=1..5, i^2^2)',
    'sum(i=1..5, (i))x',
    'sum(i=1..5,102i)',
    'sum(i=1..5,j=1..5,i+j)',
    'data(1)',
    'data(1,,2)',
    'data(1.5,2)',
    'data(21,0)',
    'data(NaN,2)',
  ])('rejects unsafe or unsupported input %s', (raw) =>
    expect(parseSummationInput(raw).ok).toBe(false),
  );
  it('keeps exact mean and population variance, and independently agrees with mathjs', () => {
    const values = [4, 8, 6, 5, 3],
      problem = parse('data(4,8,6,5,3)'),
      result = solveSummation(problem),
      metrics = result.metrics!;
    expect(metrics.mean).toEqual({ n: 26, d: 5 });
    expect(metrics.variance).toEqual({ n: 74, d: 25 });
    expect(metrics.deviationSquares).toEqual([
      { n: 36, d: 25 },
      { n: 196, d: 25 },
      { n: 16, d: 25 },
      { n: 1, d: 25 },
      { n: 121, d: 25 },
    ]);
    expect(metrics.mean.n / metrics.mean.d).toBeCloseTo(Number(mean(values)), 12);
    expect(metrics.variance.n / metrics.variance.d).toBeCloseTo(
      Number(variance(values, 'uncorrected')),
      12,
    );
    expect(metrics.sd).toBeCloseTo(Math.sqrt(2.96), 12);
    expect(solveSummation(problem, 'structure').steps[3].say.deep).toContain('E[X²]−μ²');
  });
  it.each([
    [0, 0],
    [-20, 20],
    [2, 2, 2, 2],
    [3, -1, 4, 8, 0],
  ])('handles repeated, signed and zero-spread data %s', (...values) => {
    const metrics = dataMetrics(values);
    expect(metrics.mean.n / metrics.mean.d).toBeCloseTo(Number(mean(values)), 12);
    expect(metrics.variance.n / metrics.variance.d).toBeCloseTo(
      Number(variance(values, 'uncorrected')),
      12,
    );
  });
  it('accepts exact rational/decimal answers without numerical tolerance', () => {
    for (const value of ['26/5', '5.2', '52/10'])
      expect(numericMatches(value, { n: 26, d: 5 })).toBe(true);
    for (const value of ['5.200001', '1/0', 'Infinity', '5.2 + 0', 'NaN'])
      expect(numericMatches(value, { n: 26, d: 5 })).toBe(false);
    expect(parseSumNumber('-0.125')).toEqual({ n: -1, d: 8 });
  });
  it('generates inclusive curated loops and population statistics, never sample variance', () => {
    const single = solveSummation(parse('sum(i=1..5, i^2)'));
    expect(single.code.python).toContain('range(1, 6)');
    expect(single.code.sql).toContain('POWER(i, 2)');
    const data = solveSummation(parse('data(4,8,6,5,3)'));
    expect(data.code.python).toContain('sum(squares) / len(values)');
    expect(data.code.r).toContain('mean((values - mean)^2)');
    expect(data.code.sql).toContain('AVG((x-mean)*(x-mean))');
  });
  it('rejects a forged solved problem rather than trusting its expression', () => {
    const problem = parse('sum(i=1..5,i)');
    if (problem.kind !== 'single') throw new Error('fixture');
    expect(() => solveSummation({ ...problem, b: 1000 })).toThrow();
  });
});
