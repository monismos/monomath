import { describe, expect, it } from 'vitest';
import { evaluate as mathEvaluate } from 'mathjs';
import {
  evaluateLogic,
  logicExpressionTex,
  logicNodes,
  logicSolver,
  parseLogicInput,
  solveLogic,
} from './logic';
const problem = (input: string) => {
  const parsed = parseLogicInput(input);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.problem;
};
describe('closed Logic solver against independent mathjs Boolean results', () => {
  it.each([
    ['p ∨ ¬p', 'p or not p', 'tautology'],
    ['p ∧ ¬p', 'p and not p', 'contradiction'],
    ['p → q', 'not p or q', 'contingent'],
    ['(p → q) ∧ ¬q', '(not p or q) and not q', 'contingent'],
    ['¬(p ∧ q) ≡ ¬p ∨ ¬q', '(not (p and q)) == ((not p) or (not q))', 'tautology'],
    ['p → q → r', 'not p or (not q or r)', 'contingent'],
    ['⊤', 'true', 'tautology'],
    ['⊥', 'false', 'contradiction'],
    ['(p ∧ q) ∨ (r ∧ s)', '(p and q) or (r and s)', 'contingent'],
  ])('solves %s in every complete world', (input, oracle, answer) => {
    const p = problem(input);
    for (const method of logicSolver.methods(p)) {
      const solution = logicSolver.solve(p, method.id);
      expect(solution.answer).toBe(answer);
      expect(solution.rows).toHaveLength(2 ** p.variables.length);
      solution.rows.forEach((row) =>
        expect(row.result).toBe(Boolean(mathEvaluate(oracle, { ...row.values }))),
      );
      expect(solution.steps[1].predict?.check(answer)).toBe(true);
      expect(solution.steps[0].latexAfter).toContain('{?}');
      expect(solution.code.sql).not.toMatch(/[→∧∨↔≡]/);
    }
  });
  it.each([
    ['p → q; p ⊢ q', 'valid', []],
    ['p → q; ¬q |- ¬p', 'valid', []],
    ['p → q; q ⊢ p', 'invalid', ['world-1']],
    ['p → q; ¬p ⊢ ¬q', 'invalid', ['world-1']],
  ] as const)('finds concrete counter-worlds for %s', (input, answer, counterworlds) => {
    const p = problem(input),
      result = solveLogic(p);
    expect(result.answer).toBe(answer);
    expect(result.falseWorlds).toEqual(counterworlds);
    result.rows
      .filter((row) => !row.result)
      .forEach((row) => {
        expect(row.premises).toBe(true);
        expect(row.conclusion).toBe(false);
      });
    expect(result.steps[1].predict?.options).toEqual(['Valid', 'Invalid']);
  });
  it('keeps input aliases, constants and lowercase t unambiguous', () => {
    expect(problem('!(p & q) <-> (T | r)').variables).toEqual(['p', 'q', 'r']);
    expect(problem('t | F').variables).toEqual(['t']);
    expect(solveLogic(problem('t | F')).classification).toBe('contingent');
    expect(logicExpressionTex('p → q')).toContain('tk-gate-root');
    expect(logicNodes(problem('p → q').ast).map((node) => node.id)).toEqual([
      'gate-root-l',
      'gate-root-r',
      'gate-root',
    ]);
  });
  it.each([
    '',
    'window.alert(1)',
    '(p ∨ q',
    'p + q',
    'p q',
    'p →',
    'p ∧ q ∧ r ∧ s ∧ t',
    '; p ⊢ q',
    'p ⊢ q ⊢ r',
    '¬'.repeat(17) + 'p',
    'p → '.repeat(17) + 'q',
    'p'.repeat(257),
    '\\htmlClass{bad}{p}',
  ])('rejects unsafe, malformed or excessive %s', (input) => {
    expect(parseLogicInput(input).ok).toBe(false);
    expect(logicSolver.parse(input)).toBeNull();
    expect(logicExpressionTex(input)).toBeNull();
  });
  it('produces a distinct worked method without changing the truth function', () => {
    const p = problem('(p → q) ∧ ¬q'),
      table = solveLogic(p),
      circuit = solveLogic(p, 'gate-circuit');
    expect(circuit.rows).toEqual(table.rows);
    expect(circuit.steps[2].say.standard).toContain('IMPLIES gives');
    expect(circuit.steps[2].say.standard).not.toBe(table.steps[2].say.standard);
    expect(evaluateLogic(p.ast, { p: true, q: false })).toBe(false);
  });
});
