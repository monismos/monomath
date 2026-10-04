import { describe, expect, it } from 'vitest';
import {
  setUnion as mathUnion,
  setIntersect as mathIntersection,
  setDifference as mathDifference,
  setPowerset as mathPower,
} from 'mathjs';
import {
  createSetsBoss,
  createSetsChallenge,
  setsChallengeKinds,
  validSetsBuildState,
} from './challenge';
import type { SetsBuildState, SetsChallenge } from './challenge';
const mathDifferenceSafe = (left: number[], right: number[]) =>
  right.length ? mathDifference(left, right) : [...left];
const mathPowerSafe = (values: number[]) => (values.length ? mathPower(values) : [[]]);
import { formatSet, isSubset, sameSet } from '../../../core/solvers/sets';
import { getEchoProvider } from '../../../core/gamification/echoProviders';
import { installSetsEchoes } from './echo';
const seeds = [
  0,
  1,
  42,
  4294967295,
  ...Array.from({ length: 32 }, (_, i) => Math.imul(i + 1, 2654435761) >>> 0),
];
function solved(challenge: SetsChallenge): SetsBuildState {
  return {
    ...challenge.setup,
    selected: [...challenge.target],
    ...(challenge.targetSubsets
      ? { subsets: challenge.targetSubsets.map((values) => [...values]) }
      : {}),
    ...(challenge.targetPairs
      ? { pairs: challenge.targetPairs.map(([a, b]) => [a, b] as [number, number]) }
      : {}),
  };
}

describe('seeded Sets actual-state challenges', () => {
  for (const kind of setsChallengeKinds)
    it(`verifies ${kind} constructions across a bounded deterministic seed spread`, () => {
      for (const seed of seeds) {
        const challenge = createSetsChallenge(kind, seed),
          again = createSetsChallenge(kind, seed),
          state = solved(challenge);
        expect(again.givens).toEqual(challenge.givens);
        expect(again.setup).toEqual(challenge.setup);
        expect(again.prompt).toBe(challenge.prompt);
        expect(challenge.goal(state), `${kind}/${seed}`).toBe(true);
        expect(challenge.goal({ ...state, a: state.a.slice(1) })).toBe(false);
        expect(challenge.goal({ ...state, universe: [...state.universe, 20] })).toBe(false);
        expect(challenge.goal({ ...state, a: [...state.a, state.a[0]] })).toBe(false);
        if (['power', 'product', 'function'].includes(kind)) {
          expect(challenge.goal({ ...state, selected: [state.universe[0]] })).toBe(false);
          if (state.subsets) {
            expect(challenge.goal({ ...state, subsets: state.subsets.slice(1) })).toBe(false);
            expect(
              challenge.goal({ ...state, subsets: [...state.subsets, state.subsets[0]] }),
            ).toBe(false);
          }
          if (state.pairs) {
            expect(challenge.goal({ ...state, pairs: state.pairs.slice(1) })).toBe(false);
            expect(challenge.goal({ ...state, pairs: [...state.pairs, state.pairs[0]] })).toBe(
              false,
            );
          }
        } else {
          const changed = state.selected.length ? state.selected.slice(1) : [state.universe[0]];
          expect(challenge.goal({ ...state, selected: changed })).toBe(false);
        }
        const { A, B, U } = challenge.givens;
        const oracle =
          kind === 'union'
            ? mathUnion(A, B)
            : kind === 'intersection'
              ? mathIntersection(A, B)
              : kind === 'difference'
                ? mathDifferenceSafe(A, B)
                : kind === 'complement'
                  ? mathDifferenceSafe(U, A)
                  : kind === 'symmetric'
                    ? mathUnion(mathDifferenceSafe(A, B), mathDifferenceSafe(B, A))
                    : null;
        if (oracle) expect(sameSet(oracle, challenge.target)).toBe(true);
        if (kind === 'builder') {
          const match = /x (even|odd), x < (\d+)/.exec(challenge.problem.expression)!;
          expect(challenge.target).toEqual(
            U.filter(
              (v) => (match[1] === 'even' ? v % 2 === 0 : v % 2 !== 0) && v < Number(match[2]),
            ),
          );
        }
        if (kind === 'subset') expect(isSubset(challenge.target, A)).toBe(true);
        if (kind === 'power')
          expect(challenge.targetSubsets!.map(formatSet).sort()).toEqual(
            (mathPowerSafe(A) as unknown as number[][]).map(formatSet).sort(),
          );
        if (kind === 'product')
          expect(challenge.targetPairs).toEqual(A.flatMap((a) => B.map((b) => [a, b])));
      }
    });
  it('checks actual source memberships, not just a remembered selected set', () => {
    const challenge = createSetsChallenge('union', 42),
      state = solved(challenge);
    expect(
      challenge.goal({
        ...state,
        a: [...state.a, state.universe.find((v) => !state.a.includes(v))!],
      }),
    ).toBe(false);
    expect(challenge.goal({ ...state, b: [] })).toBe(false);
  });
  it('permits shared outputs but rejects missing and duplicate function outputs', () => {
    const challenge = createSetsChallenge('function', 42),
      state = solved(challenge),
      output = challenge.givens.B[0];
    const pairs = challenge.givens.A.map((a) => [a, output] as [number, number]);
    expect(challenge.goal({ ...state, pairs })).toBe(true);
    expect(
      challenge.goal({
        ...state,
        pairs: [...pairs, [challenge.givens.A[0], challenge.givens.B[1]]],
      }),
    ).toBe(false);
  });
  it('requires all three Boss connections and accepts unordered symbolic members', () => {
    for (const seed of seeds) {
      const boss = createSetsBoss(seed),
        practice = createSetsChallenge(
          ['union', 'intersection', 'difference'][seed % 3] as 'union',
          seed,
        ),
        state = {
          ...solved(practice),
          symbolAnswer: formatSet([...boss.target].reverse()),
          code: boss.codeOptions[0],
        };
      expect(boss.goal(state)).toBe(true);
      expect(boss.phases.map((phase) => phase.id)).toEqual(['read', 'build', 'code']);
      expect(boss.phases.every((phase) => phase.goal(state))).toBe(true);
      expect(boss.goal({ ...state, symbolAnswer: '{20}' })).toBe(false);
      expect(boss.goal({ ...state, b: [] })).toBe(false);
      expect(boss.goal({ ...state, code: boss.codeOptions[1] })).toBe(false);
      expect(() => boss.goal({ ...state, symbolAnswer: 'constructor()' })).not.toThrow();
    }
  });
  it('rejects malformed and oversized imported construction fields', () => {
    const state = createSetsChallenge('power', 42).setup;
    expect(validSetsBuildState(null)).toBe(false);
    expect(validSetsBuildState({ ...state, selected: [99] })).toBe(false);
    expect(validSetsBuildState({ ...state, a: [...state.a, NaN] })).toBe(false);
    expect(validSetsBuildState({ ...state, subsets: Array.from({ length: 9 }, () => []) })).toBe(
      false,
    );
    expect(validSetsBuildState({ ...state, subsets: [[state.a[0], state.a[0]]] })).toBe(false);
    expect(validSetsBuildState({ ...state, pairs: [[state.universe[0], 99]] })).toBe(false);
    expect(validSetsBuildState({ ...state, code: 'x'.repeat(513) })).toBe(false);
  });
  it('creates fresh deterministic Echo questions instead of replaying remembered answers', () => {
    const remove = installSetsEchoes(),
      provider = getEchoProvider('sets')!;
    const first = provider(42),
      again = provider(42),
      next = provider(43);
    expect(again.prompt).toBe(first.prompt);
    expect(next.prompt).not.toBe(first.prompt);
    const challenge = createSetsChallenge('union', 42);
    expect(first.check(formatSet(challenge.target))).toBe(true);
    expect(first.check('{99}')).toBe(false);
    expect(first.hints).toHaveLength(3);
    remove();
  });
});
