import { describe, expect, it } from 'vitest';
import { evaluate, mean, variance } from 'mathjs';
import { fractionText } from '../../../core/solvers/fractions';
import { polynomialText } from '../../../core/solvers/summation';
import {
  createSummationBoss,
  createSummationChallenge,
  summationChallengeKinds,
  validSummationBuildState,
} from './challenge';
import { installSummationEchoes } from './echo';
import { getEchoProvider } from '../../../core/gamification/echoProviders';
describe('actual Hopper construction validators', () => {
  it.each(summationChallengeKinds)(
    '%s requires the actual exact contributions across seeds',
    (kind) => {
      for (const seed of [0, 1, 7, 81, 12345, 4294967295]) {
        const challenge = createSummationChallenge(kind, seed),
          { problem, solution } = challenge;
        const oracle =
          problem.kind === 'data'
            ? kind === 'mean'
              ? Number(mean(problem.values))
              : Number(variance(problem.values, 'uncorrected'))
            : solution.terms.reduce(
                (total, term) =>
                  total +
                  Number(
                    evaluate(polynomialText(problem.polynomial, 'r'), {
                      i: term.i,
                      j: term.j ?? 0,
                    }),
                  ),
                0,
              );
        expect(challenge.target.n / challenge.target.d).toBeCloseTo(oracle, 12);
        const state = {
          included: solution.terms.map((term) => term.id),
          values: Object.fromEntries(
            Object.entries(challenge.expectedValues).map(([id, value]) => [
              id,
              fractionText(value),
            ]),
          ),
          claim: fractionText(challenge.target),
          balance: solution.metrics ? fractionText(solution.metrics.mean) : '',
        };
        expect(challenge.goal({ ...state, included: [] })).toBe(false);
        expect(challenge.goal(state)).toBe(true);
        expect(
          challenge.goal({ ...state, values: { ...state.values, [solution.terms[0].id]: '999' } }),
        ).toBe(false);
        expect(challenge.goal({ ...state, included: [...state.included, state.included[0]] })).toBe(
          false,
        );
        expect(challenge.goal({ ...state, claim: '999' })).toBe(false);
        if (solution.metrics) expect(challenge.goal({ ...state, balance: '999' })).toBe(false);
      }
    },
  );
  it('requires every Boss connection and rejects exclusive endpoints and overwritten totals', () => {
    const boss = createSummationBoss(12345);
    const state = {
      included: boss.solution.terms.map((term) => term.id),
      values: Object.fromEntries(
        Object.entries(boss.expectedValues).map(([id, value]) => [id, fractionText(value)]),
      ),
      claim: fractionText(boss.target),
      balance: '',
      code: boss.codeOptions[0],
    };
    expect(boss.goal(state)).toBe(true);
    expect(boss.phases[0].goal({ ...state, included: [] })).toBe(true);
    expect(boss.phases[1].goal({ ...state, claim: '' })).toBe(true);
    for (const code of boss.codeOptions.slice(1)) expect(boss.goal({ ...state, code })).toBe(false);
    expect(boss.goal({ ...state, included: state.included.slice(1) })).toBe(false);
  });
  it('rejects unbounded and imported malformed state', () => {
    const state = createSummationChallenge('linear', 1).setup;
    for (const patch of [
      { included: ['term-99'] },
      { included: ['term-0', 'term-0'] },
      { values: { '__proto__.x': '1' } },
      { values: [] },
      { claim: 'x'.repeat(33) },
      { code: 'x'.repeat(1501) },
    ])
      expect(validSummationBuildState({ ...state, ...patch })).toBe(false);
    expect(validSummationBuildState(null)).toBe(false);
  });
  it('installs fresh bounded numeric recall and disposes it', () => {
    const dispose = installSummationEchoes(),
      provider = getEchoProvider('summation')!;
    const task = provider(12345),
      challenge = createSummationChallenge(summationChallengeKinds[12345 % 6], 12345);
    expect(task.check(fractionText(challenge.target))).toBe(true);
    expect(task.check('999')).toBe(false);
    expect(provider(12346).prompt).not.toBe(task.prompt);
    dispose();
    expect(getEchoProvider('summation')).toBeUndefined();
  });
});
