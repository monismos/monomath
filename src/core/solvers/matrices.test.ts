import { describe, it, expect } from 'vitest';
import { det, multiply, add, transpose, inv, lusolve } from 'mathjs';
import {
  parseMatrixInput,
  solveMatrix,
  numQ,
  matrixText,
  q,
  matrixMultiply,
  exactMatrixNumber,
} from './matrices';
const problem = (raw: string) => {
  const p = parseMatrixInput(raw);
  if (!p.ok) throw new Error(p.reason);
  return p.problem;
};
describe('finite exact matrices', () => {
  const inputs = [
    'transform([1,1;0,1])',
    'add([1,2;3,4],[-1,3;2,1])',
    'transpose([1,2,3;4,5,6;0,-1,2])',
    'multiply([1,2;3,4],[2,0;1,2])',
    'determinant([0,1;1,0])',
    'determinant([1,1,0;0,2,0;0,0,-1])',
    'inverse([2,1;1,1])',
    'inverse([2,0;0,3])',
    'solve([2,1;1,-1],[5;1])',
    'solve([1,1,0;0,2,0;0,0,-1],[3;4;2])',
  ];
  it.each(inputs)('matches independent mathjs: %s', (raw) => {
    const p = problem(raw),
      s = solveMatrix(p),
      a = p.a.map((r) => r.map(numQ)),
      b = p.b?.map((r) => r.map(numQ));
    const expected =
      p.kind === 'add'
        ? add(a, b!)
        : p.kind === 'transpose'
          ? transpose(a)
          : p.kind === 'multiply'
            ? multiply(a, b!)
            : p.kind === 'inverse'
              ? inv(a)
              : p.kind === 'solve'
                ? lusolve(a, b!)
                : p.kind === 'determinant'
                  ? [[det(a)]]
                  : a;
    const actual = s.result.map((r) => r.map(numQ));
    actual.forEach((r, i) =>
      r.forEach((v, j) => expect(v).toBeCloseTo((expected as number[][])[i][j], 10)),
    );
    expect(numQ(s.determinant)).toBeCloseTo(det(a));
    expect(parseMatrixInput(p.expression)).toEqual({ ok: true, problem: p });
  });
  it.each([
    '',
    '[1,2;3,4]',
    'eval([1,2;3,4])',
    'transform([7,0;0,1])',
    'transform([1,2;3])',
    'transform([1,2,3;4,5,6])',
    'transform([1,0;0,1], [1;2])',
    'inverse([1,2;2,4])',
    'inverse([1,0,0;0,1,0;0,0,1])',
    'solve([1,0;0,1],[1,2])',
    'add([1,0;0,1],[1,0,0;0,1,0;0,0,1])',
    'transform([1/2,0;0,1])',
    'transform([1,0;0,1]);alert(1)',
  ])('rejects unsafe or unbounded grammar: %s', (raw) =>
    expect(parseMatrixInput(raw).ok).toBe(false),
  );
  it('classifies singular systems and produces an exact particular solution', () => {
    const infinite = solveMatrix(problem('solve([1,2;2,4],[3;6])'));
    expect(infinite.classification).toBe('infinite');
    expect(matrixText(infinite.result)).toBe('[3;0]');
    expect(matrixText(matrixMultiply(problem('transform([1,2;2,4])').a, infinite.result))).toBe(
      '[3;6]',
    );
    expect(solveMatrix(problem('solve([1,2;2,4],[3;5])')).classification).toBe('none');
    expect(solveMatrix(problem('solve([0,0;0,0],[0;0])')).classification).toBe('infinite');
    expect(solveMatrix(problem('solve([0,0;0,0],[0;1])')).classification).toBe('none');
  });
  it('accepts exact equivalent answers without rounding away an error', () => {
    expect(exactMatrixNumber(0.5, q(1,2))).toBe(true);
    expect(exactMatrixNumber(Number.NaN, q(0))).toBe(false);
    expect(exactMatrixNumber('2/4', q(1, 2))).toBe(true);
    expect(exactMatrixNumber('0.5', q(1, 2))).toBe(true);
    expect(exactMatrixNumber('0.333333', q(1, 3))).toBe(false);
    expect(exactMatrixNumber('1/0', q(0))).toBe(false);
  });
  it('changes traversal without changing stable cell ids or answer', () => {
    const p = problem(inputs[3]),
      a = solveMatrix(p),
      b = solveMatrix(p, 'columns');
    expect(a.answer).toBe(b.answer);
    expect(a.steps.map((s) => s.id).sort()).toEqual(b.steps.map((s) => s.id).sort());
    expect(a.steps[3].id).not.toBe(b.steps[3].id);
    expect(a.products['out-0-0'].map(numQ)).toEqual([2, 2]);
  });
  it('does not trust forged typed input', () => {
    const p = problem(inputs[0]);
    expect(() =>
      solveMatrix({
        ...p,
        a: [
          [q(99), q(0)],
          [q(0), q(1)],
        ],
      }),
    ).toThrow();
  });
  it('curates all code operations and explains floating point', () =>
    inputs.forEach((raw) => {
      const s = solveMatrix(problem(raw));
      expect(s.code.python.length).toBeGreaterThan(20);
      expect(s.code.numpy).toContain('floating-point');
    }));
});
