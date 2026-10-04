import { describe, expect, it } from 'vitest';
import { fraction } from 'mathjs';
import {
  buildValue,
  createFractionBoss,
  createFractionChallenge,
  fractionChallengeKinds,
  validBuildState,
} from './challenge';
import type { FractionBuildState, FractionChallenge } from './challenge';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const seeds = [0, 1, 42, 4294967295, ...range(48).map((i) => Math.imul(i + 1, 2654435761) >>> 0)];
function solutionState(challenge: FractionChallenge): FractionBuildState {
  const { target, requiredDenominator: denominator, givens, kind } = challenge;
  const count = kind === 'divide' ? target.n : target.n * (denominator / target.d);
  const state: FractionBuildState = { ...challenge.setup, denominator, selected: range(count) };
  if (kind === 'add') {
    state.leftCuts = denominator;
    state.rightCuts = denominator;
  }
  if (kind === 'subtract') state.removed = range(givens.a.n).slice(count);
  if (kind === 'multiply') {
    state.horizontalSelected = range(givens.a.n);
    state.verticalSelected = range(givens.b!.n);
    state.selected = range(denominator).filter(
      (i) =>
        state.horizontalSelected!.includes(i % state.columns!) &&
        state.verticalSelected!.includes(Math.floor(i / state.columns!)),
    );
  }
  if (kind === 'divide') state.fits = count;
  if (kind === 'simplify') state.groups = givens.a.d / target.d;
  return state;
}

describe('seeded fraction construction validators', () => {
  for (const kind of fractionChallengeKinds) {
    it(`makes reproducible, solvable ${kind} challenges and rejects nearly solved models`, () => {
      for (const seed of seeds) {
        const challenge = createFractionChallenge(kind, seed);
        const repeated = createFractionChallenge(kind, seed);
        expect(repeated.setup).toEqual(challenge.setup);
        expect(repeated.givens).toEqual(challenge.givens);
        expect(repeated.id).toBe(challenge.id);
        expect(challenge.goal(challenge.setup)).toBe(false);
        const solved = solutionState(challenge);
        expect(challenge.goal(solved), `${kind} seed ${seed}`).toBe(true);
        expect(challenge.goal({ ...solved, denominator: solved.denominator + 1 })).toBe(false);
        expect(
          challenge.goal({ ...solved, selected: [...solved.selected, solved.selected[0]] }),
        ).toBe(false);
        expect(challenge.goal({ ...solved, units: 5 })).toBe(false);
        expect(challenge.goal({ ...solved, sign: -1 })).toBe(false);
        expect(challenge.goal({ ...solved, selected: solved.selected.slice(1) })).toBe(false);
        expect(challenge.requiredDenominator).toBeLessThanOrEqual(24);
        const left = fraction(challenge.givens.a.n, challenge.givens.a.d);
        const right = challenge.givens.b
          ? fraction(challenge.givens.b.n, challenge.givens.b.d)
          : null;
        const independently =
          kind === 'add'
            ? left.add(right!)
            : kind === 'subtract'
              ? left.sub(right!)
              : kind === 'multiply'
                ? left.mul(right!)
                : kind === 'divide'
                  ? left.div(right!)
                  : left;
        expect(independently.equals(fraction(challenge.target.n, challenge.target.d))).toBe(true);
      }
    });
  }
  it('checks actual recuts, removed-piece provenance, and multiplication axes', () => {
    const add = createFractionChallenge('add', 42),
      addState = solutionState(add);
    expect(add.goal({ ...addState, leftCuts: add.givens.a.d })).toBe(false);
    const subtract = createFractionChallenge('subtract', 42),
      subtractState = solutionState(subtract);
    expect(subtract.goal({ ...subtractState, removed: [] })).toBe(false);
    expect(subtract.goal({ ...subtractState, removed: subtractState.selected })).toBe(false);
    const multiply = createFractionChallenge('multiply', 42),
      multiplyState = solutionState(multiply);
    expect(multiply.goal({ ...multiplyState, horizontalSelected: [] })).toBe(false);
    expect(multiply.goal({ ...multiplyState, verticalSelected: [] })).toBe(false);
    expect(
      multiply.goal({
        ...multiplyState,
        selected: [multiply.requiredDenominator - 1, ...multiplyState.selected.slice(1)],
      }),
    ).toBe(false);
  });
  it('requires measuring bars to fill the dividend contiguously', () => {
    const challenge = createFractionChallenge('divide', 42),
      solved = solutionState(challenge);
    expect(challenge.goal({ ...solved, selected: solved.selected.map((i) => i + 1) })).toBe(false);
    expect(challenge.goal({ ...solved, fits: 0 })).toBe(false);
  });
  it('requires complete whole units and reduced grouped pieces', () => {
    const mixed = createFractionChallenge('mixed', 42),
      mixedState = solutionState(mixed);
    expect(mixed.goal({ ...mixedState, selected: mixedState.selected.map((i) => i + 1) })).toBe(
      false,
    );
    const simplify = createFractionChallenge('simplify', 42),
      simplifyState = solutionState(simplify);
    expect(simplify.goal({ ...simplifyState, groups: 1 })).toBe(false);
    expect(
      simplify.goal({
        ...simplifyState,
        denominator: simplify.givens.a.d,
        selected: range(simplify.givens.a.n),
      }),
    ).toBe(false);
  });
  it('checks all three Boss checkpoints and their matching exact code', () => {
    for (const seed of seeds) {
      const boss = createFractionBoss(seed),
        practice = createFractionChallenge('add', seed);
      const solved = {
        ...solutionState(practice),
        symbolAnswer: `${boss.target.n}/${boss.target.d}`,
        code: boss.codeOptions[0],
      };
      expect(boss.goal(solved)).toBe(true);
      expect(boss.goal({ ...solved, symbolAnswer: '0' })).toBe(false);
      expect(boss.goal({ ...solved, selected: [] })).toBe(false);
      expect(boss.goal({ ...solved, code: boss.codeOptions[1] })).toBe(false);
      expect(
        boss.goal({ ...solved, symbolAnswer: `${boss.target.n * 2}/${boss.target.d * 2}` }),
      ).toBe(true);
      for (const symbolAnswer of ['1/0', '0/0', 'Infinity', '9'.repeat(161)])
        expect(() => boss.goal({ ...solved, symbolAnswer })).not.toThrow();
      expect(boss.phases.map((phase) => phase.id)).toEqual(['read', 'build', 'code']);
      expect(boss.phases.every((phase) => phase.goal(solved))).toBe(true);
    }
  });
  it('rejects malformed data without accepting a visual approximation', () => {
    expect(validBuildState(null as unknown as FractionBuildState)).toBe(false);
    expect(validBuildState({ denominator: 4, selected: [-1] })).toBe(false);
    expect(validBuildState({ denominator: 4, selected: [4] })).toBe(false);
    expect(validBuildState({ denominator: 4, selected: [1, 1] })).toBe(false);
    expect(validBuildState({ denominator: 4.5, selected: [] })).toBe(false);
    expect(buildValue({ denominator: 0, selected: [] })).toBeNull();
    expect(buildValue({ denominator: 4, selected: [0, 1, 2], sign: -1 })).toEqual({ n: -3, d: 4 });
  });
});
