import { describe, expect, it } from 'vitest';
import { add, divide, fraction, multiply, subtract } from 'mathjs';
import type { Fraction as MathFraction } from 'mathjs';
import {
  equalFractions,
  fractionsSolver,
  isEquivalentAnswer,
  mixedText,
  normalizeFraction,
  parseFractionInput,
  solveFractions,
} from './fractions';
import type { FractionProblem } from './fractions';

const operations = { add, subtract, multiply, divide };
const binaryFixtures = [
  ['3/4 + 1/6', '3/4', '1/6', 'add', '11/12'],
  ['1/6 + 1/3', '1/6', '1/3', 'add', '1/2'],
  ['1/2 + 1/2', '1/2', '1/2', 'add', '1'],
  ['7/8 + 5/12', '7/8', '5/12', 'add', '31/24'],
  ['−2/3 + 1/6', '-2/3', '1/6', 'add', '-1/2'],
  ['1 1/2 + 2 2/3', '3/2', '8/3', 'add', '25/6'],
  ['5/8 − 1/4', '5/8', '1/4', 'subtract', '3/8'],
  ['1/3 - 2/3', '1/3', '2/3', 'subtract', '-1/3'],
  ['1/2 - 1/2', '1/2', '1/2', 'subtract', '0'],
  ['−1/4 − 1/2', '-1/4', '1/2', 'subtract', '-3/4'],
  ['2 1/3 − 1 5/6', '7/3', '11/6', 'subtract', '1/2'],
  ['2/3 × 3/5', '2/3', '3/5', 'multiply', '2/5'],
  ['−3/4 * 2/3', '-3/4', '2/3', 'multiply', '-1/2'],
  ['−2/5 × −15/8', '-2/5', '-15/8', 'multiply', '3/4'],
  ['7/3 × 0', '7/3', '0', 'multiply', '0'],
  ['1 1/2 × 2 2/3', '3/2', '8/3', 'multiply', '4'],
  ['3/4 ÷ 1/8', '3/4', '1/8', 'divide', '6'],
  ['1/2 ÷ 2', '1/2', '2', 'divide', '1/4'],
  ['2/3 ÷ 4/5', '2/3', '4/5', 'divide', '5/6'],
  ['−3/4 ÷ 1/2', '-3/4', '1/2', 'divide', '-3/2'],
  ['1/2 ÷ −3/4', '1/2', '-3/4', 'divide', '-2/3'],
  ['2 1/4 ÷ 1 1/2', '9/4', '3/2', 'divide', '3/2'],
  ['0 ÷ 7/8', '0', '7/8', 'divide', '0'],
  ['2 + 3/4', '2', '3/4', 'add', '11/4'],
] as const;

function parsed(input: string): FractionProblem {
  const value = parseFractionInput(input);
  expect(value.ok, input).toBe(true);
  if (!value.ok) throw new Error(value.reason);
  return value.problem;
}
function exactMath(value: MathFraction) {
  return { n: Number(value.s * value.n), d: Number(value.d) };
}

describe('exact fraction solver against independent mathjs rational arithmetic', () => {
  it.each(binaryFixtures)('%s', (input, left, right, op, expected) => {
    const p = parsed(input);
    expect(p.kind).toBe(op);
    const independent = operations[op](fraction(left), fraction(right)) as MathFraction;
    expect(independent.equals(fraction(expected))).toBe(true);
    for (const method of fractionsSolver.methods(p)) {
      const solution = solveFractions(p, method.id);
      expect(solution.result).toEqual(exactMath(independent));
      expect(normalizeFraction(solution.result)).toEqual(solution.result);
    }
  });
  it.each([
    ['mixed 7/4', '7/4', '1 3/4'],
    ['mixed 9/4', '9/4', '2 1/4'],
    ['mixed 8/4', '2', '2'],
    ['improper 1 3/4', '7/4', '7/4'],
    ['improper −1 1/2', '-3/2', '-3/2'],
    ['mixed −7/4', '-7/4', '-1 3/4'],
    ['simplify 12/18', '2/3', '2/3'],
    ['simplify 18/12', '3/2', '3/2'],
    ['simplify −6/8', '-3/4', '-3/4'],
    ['simplify 0/9', '0', '0'],
    ['simplify 11/12', '11/12', '11/12'],
    ['−2/−4', '1/2', '1/2'],
    ['2/−4', '-1/2', '-1/2'],
  ])('represents %s without changing its value', (input, expected, display) => {
    const solution = solveFractions(parsed(input));
    expect(solution.result).toEqual(exactMath(fraction(expected)));
    expect(solution.answer).toBe(display);
  });
  it('does not mistake binary division for a chain of literal slash operations', () => {
    expect(solveFractions(parsed('3/4 ÷ 1/8')).result).toEqual({ n: 6, d: 1 });
    expect(parseFractionInput('3/4/1/8').ok).toBe(false);
  });
  it.each([
    '',
    '1/0',
    '3/',
    '1/2 +',
    'x + 1/2',
    '1/2 ** 2',
    '(1/2',
    '1.5/2',
    '2/3 ÷ 0',
    '0 ÷ 0',
    '1/1000000',
    '1 3/2',
    '9'.repeat(161),
  ])('rejects malformed or undefined input %s', (input) => {
    const result = parseFractionInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.length).toBeGreaterThan(15);
    expect(fractionsSolver.parse(input)).toBeNull();
  });
  it('retains an exact large answer while taking the bounded visual path', () => {
    const solution = solveFractions(parsed('1/997 + 1/991'));
    expect(solution.result).toEqual({ n: 1988, d: 988027 });
    expect(solution.visualSupported).toBe(false);
    expect(solution.visualCuts).toBe(988027);
    expect(solution.steps.length).toBeLessThan(8);
  });
  it('permits six measuring units for the required division example', () => {
    expect(solveFractions(parsed('3/4 ÷ 1/8')).visualSupported).toBe(true);
  });
  it('accepts equivalent answers exactly and preserves mixed-number signs', () => {
    expect(isEquivalentAnswer('22/24', { n: 11, d: 12 })).toBe(true);
    expect(isEquivalentAnswer('0.91666', { n: 11, d: 12 })).toBe(false);
    expect(isEquivalentAnswer('1/0', { n: 0, d: 1 })).toBe(false);
    expect(mixedText({ n: -7, d: 4 })).toBe('-1 3/4');
    expect(equalFractions({ n: -2, d: -4 }, { n: 1, d: 2 })).toBe(true);
  });
  it('throws clearly if a caller requests an unsupported method or unsafe rational', () => {
    expect(() => solveFractions(parsed('1/2 + 1/3'), 'area')).toThrow('supported methods');
    expect(() => normalizeFraction({ n: 0, d: 0 })).toThrow('nonzero');
    expect(() => normalizeFraction({ n: 1.1, d: 2 })).toThrow('whole-number');
  });
});
