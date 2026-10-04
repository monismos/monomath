import { describe, expect, it } from 'vitest';
import {
  setUnion as mathUnion,
  setIntersect as mathIntersection,
  setDifference as mathDifference,
  setPowerset as mathPower,
  setIsSubset as mathSubset,
} from 'mathjs';
import {
  cartesianProduct,
  defaultSets,
  formatSet,
  isFunctionRelation,
  isSubset,
  parseSetAnswer,
  parseSetsInput,
  powerSet,
  sameSet,
  setExpressionTex,
  setsSolver,
  solveSets,
  validSetsConfig,
} from './sets';
import type { SetsConfig, SetsProblem } from './sets';
const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
const mathDifferenceSafe = (left: number[], right: number[]) =>
  right.length ? mathDifference(left, right) : [...left];
const mathPowerSafe = (values: number[]) => (values.length ? mathPower(values) : [[]]);
function problem(input: string, sets: SetsConfig = defaultSets): SetsProblem {
  const result = parseSetsInput(input, sets);
  expect(result.ok, input).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.problem;
}

describe('closed finite-set solver against independent mathjs operations', () => {
  const { A, B, C, U } = defaultSets;
  it.each([
    ['A ∪ B', mathUnion(A, B), [0, 1, 2, 3, 4, 5, 6, 8]],
    ['A ∩ (B ∪ C)', mathIntersection(A, mathUnion(B, C)), [2, 4, 6]],
    ['A ∖ B', mathDifference(A, B), [0, 6, 8]],
    ['(A \\ B)ᶜ', mathDifferenceSafe(U, mathDifferenceSafe(A, B)), [1, 2, 3, 4, 5, 7, 9]],
    ['A Δ B', mathUnion(mathDifferenceSafe(A, B), mathDifferenceSafe(B, A)), [0, 1, 3, 5, 6, 8]],
    ['A ∩ Aᶜ', [], []],
    ['A ∪ Aᶜ', U, U],
    ['A | B & C', mathUnion(A, mathIntersection(B, C)), [0, 2, 3, 4, 6, 8]],
    ['(A | B) & C', mathIntersection(mathUnion(A, B), C), [3, 6]],
    ['A \\ B ∩ C', mathIntersection(mathDifference(A, B), C), [6]],
    ['~(A | B)', mathDifferenceSafe(U, mathUnion(A, B)), [7, 9]],
    ['~Aᶜ', A, A],
  ] as [string, number[], number[]][])(
    'solves %s exactly with both methods',
    (input, oracle, expected) => {
      expect(sorted(oracle)).toEqual(expected);
      const p = problem(input);
      for (const method of setsSolver.methods(p)) {
        const solution = setsSolver.solve(p, method.id);
        expect(solution.result).toEqual(expected);
        expect(solution.answer).toBe(formatSet(expected));
        expect(solution.code.python).toContain('result =');
        expect(solution.code.sql).toContain('ORDER BY value');
      }
    },
  );
  it('agrees with mathjs across a fixed spread of independently generated memberships', () => {
    for (let seed = 0; seed < 32; seed++) {
      const U = Array.from({ length: 12 }, (_, i) => i),
        A = U.filter((value) => (Math.imul(seed + 7, value + 3) & 4) !== 0),
        B = U.filter((value) => (Math.imul(seed + 11, value + 5) & 2) !== 0),
        C = U.filter((value) => value % 3 === 0),
        sets = { A, B, C, U };
      for (const [expression, oracle] of [
        ['A | B', mathUnion(A, B)],
        ['A & B', mathIntersection(A, B)],
        ['A \\ B', mathDifferenceSafe(A, B)],
        ['Aᶜ', mathDifferenceSafe(U, A)],
        ['A Δ B', mathUnion(mathDifferenceSafe(A, B), mathDifferenceSafe(B, A))],
      ] as [string, number[]][])
        expect(solveSets(problem(expression, sets)).result).toEqual(sorted(oracle));
    }
  });
  it.each(['{x | x even, x < 10}', '{x ∈ U : x even, x < 10}', '{x | even(x) and x ≤ 8}'])(
    'filters the displayed universe for %s',
    (expression) => expect(solveSets(problem(expression)).result).toEqual([0, 2, 4, 6, 8]),
  );
  it('handles signed integers and odd predicates without pretending to search outside U', () => {
    const sets = { U: [-2, -1, 0, 1, 2], A: [-2, 0, 2], B: [-1, 1], C: [] };
    expect(solveSets(problem('{x | x odd}', sets)).result).toEqual([-1, 1]);
    expect(solveSets(problem('{x | x even, x <= 0}', sets)).result).toEqual([-2, 0]);
    expect(parseSetsInput('{-3}', sets).ok).toBe(false);
  });
  it('shows concrete bottom-up operands for another method after its Predict', () => {
    const nested = solveSets(problem('A ∩ (B ∪ C)'), 'algebra');
    expect(nested.steps[1].predict).toBeDefined();
    expect(nested.steps[0].latexAfter).toContain('{?}');
    expect(nested.steps[2].say.standard).toContain('{1, 2, 3, 4, 5, 6, 9}');
    expect(nested.steps[2].latexAfter).toContain('1,2,3,4,5,6,9');
    const complement = solveSets(problem('(A ∖ B)ᶜ'), 'algebra');
    expect(complement.steps[2].say.standard).toContain('{0, 6, 8}');
    expect(complement.steps[2].latexAfter).toContain('tk-u');
    expect(complement.steps[2].latexAfter).toContain('setminus');
  });
  it('deduplicates literal and answer notation but requires an explicit empty-set answer', () => {
    expect(solveSets(problem('{1,1,2} | {}')).result).toEqual([1, 2]);
    expect(parseSetAnswer('{2,1,2}')).toEqual([1, 2]);
    expect(parseSetAnswer('{}')).toEqual([]);
    expect(parseSetAnswer('∅')).toEqual([]);
    expect(parseSetAnswer('')).toBeNull();
    expect(parseSetAnswer('{1, x}')).toBeNull();
    expect(parseSetAnswer('{999}')).toBeNull();
  });
  it.each([
    '',
    'A + B',
    'A ∪',
    '(A | B',
    'A B',
    'window.alert(1)',
    '{x | process.exit()}',
    '{x | x % 2 == 0}',
    '{x | x even, x<5, x>0, x!=2, x!=4}',
    '{1/2}',
    '{99}',
    '~'.repeat(17) + 'A',
    'A | '.repeat(200) + 'B',
    'A'.repeat(513),
  ])('rejects unsafe, malformed or excessive expression %s', (input) => {
    const parsed = parseSetsInput(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.reason.length).toBeGreaterThan(10);
    expect(setsSolver.parse(input)).toBeNull();
    expect(setExpressionTex(input)).toBeNull();
  });
  it('uses a closed DTO and preserves caller data', () => {
    const original = { U: [2, 1, 0], A: [2, 0], B: [1], C: [] };
    const p = problem('A|B', original);
    expect(p.sets.U).toEqual([0, 1, 2]);
    expect(original.U).toEqual([2, 1, 0]);
    expect(validSetsConfig({ ...original, A: [2, 2] })).toBe(false);
    expect(validSetsConfig({ ...original, A: [9] })).toBe(false);
    expect(validSetsConfig({ ...original, U: Array.from({ length: 13 }, (_, i) => i) })).toBe(
      false,
    );
    expect(validSetsConfig({ ...original, U: [NaN] })).toBe(false);
    expect(setExpressionTex('\\htmlClass{evil}{A}')).toBeNull();
    expect(setExpressionTex('A ∪ B')).toContain('tk-a');
  });
  it('verifies bounded power sets, products, subsets and functional relations', () => {
    for (const values of [[], [1], [1, 2], [0, 2, 4]]) {
      const actual = powerSet(values),
        oracle = mathPowerSafe(values) as unknown as number[][];
      expect(actual.map(formatSet).sort()).toEqual(oracle.map(formatSet).sort());
      expect(actual.every((subset) => isSubset(subset, values))).toBe(true);
      expect(actual.every((subset) => mathSubset(subset, values))).toBe(true);
    }
    expect(() => powerSet([0, 1, 2, 3])).toThrow('three');
    expect(cartesianProduct([1, 2], [3, 4])).toEqual([
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
    ]);
    expect(() =>
      cartesianProduct(
        Array.from({ length: 9 }, (_, i) => i),
        Array.from({ length: 9 }, (_, i) => i),
      ),
    ).toThrow('64');
    expect(
      isFunctionRelation(
        [
          [1, 3],
          [2, 3],
        ],
        [1, 2],
        [3, 4],
      ),
    ).toBe(true);
    expect(
      isFunctionRelation(
        [
          [1, 3],
          [1, 4],
          [2, 3],
        ],
        [1, 2],
        [3, 4],
      ),
    ).toBe(false);
    expect(isFunctionRelation([[1, 3]], [1, 2], [3, 4])).toBe(false);
    expect(
      isFunctionRelation(
        [
          [1, 9],
          [2, 3],
        ],
        [1, 2],
        [3, 4],
      ),
    ).toBe(false);
    expect(isFunctionRelation([], [], [3, 4])).toBe(true);
    expect(sameSet([2, 1], [1, 2])).toBe(true);
  });
});
