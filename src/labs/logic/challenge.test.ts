import { describe, expect, it } from 'vitest';
import { getEchoProvider } from '../../core/gamification/echoProviders';
import {
  createLogicBoss,
  createLogicChallenge,
  logicChallengeKinds,
  validLogicBuildState,
} from './challenge';
import { installLogicEchoes } from './echo';
describe('Logic goals verify actual marked worlds', () => {
  for (const kind of logicChallengeKinds)
    it(`verifies seeded ${kind} constructions`, () => {
      for (const seed of [0, 1, 4, 8, 42, 12345, 4294967295]) {
        const challenge = createLogicChallenge(kind, seed),
          again = createLogicChallenge(kind, seed);
        expect(again.problem).toEqual(challenge.problem);
        const state = {
          ...challenge.setup,
          classification: challenge.solution.answer,
          selectedWorlds: [...challenge.target],
        };
        expect(challenge.goal(state)).toBe(true);
        const wrong = challenge.target.length
          ? challenge.target.slice(1)
          : [challenge.solution.rows[0].id];
        expect(challenge.goal({ ...state, selectedWorlds: wrong })).toBe(false);
        expect(challenge.goal({ ...state, selectedWorlds: ['world-99'] })).toBe(false);
        expect(challenge.goal({ ...state, classification: 'invalid' })).toBe(
          challenge.solution.answer === 'invalid',
        );
        expect(
          challenge.goal({
            ...state,
            selectedWorlds: [...state.selectedWorlds, ...state.selectedWorlds],
          }),
        ).toBe(state.selectedWorlds.length === 0);
      }
    });
  it('generates changed content with changed seeds', () => {
    expect(createLogicChallenge('counterworld', 1).problem.expression).not.toBe(
      createLogicChallenge('counterworld', 4).problem.expression,
    );
  });
  it('requires all Boss phases and exact counter-worlds, with valid SQL choices', () => {
    for (const seed of [1, 42, 12345]) {
      const boss = createLogicBoss(seed),
        state = {
          classification: boss.solution.answer,
          selectedWorlds: [...boss.target],
          code: boss.codeOptions[0],
        };
      expect(boss.goal(state)).toBe(true);
      expect(boss.phases.every((phase) => phase.goal(state))).toBe(true);
      expect(boss.goal({ ...state, selectedWorlds: boss.solution.rows.map((row) => row.id) })).toBe(
        false,
      );
      expect(boss.goal({ ...state, code: boss.codeOptions[1] })).toBe(false);
      expect(boss.codeOptions.every((code) => !/[→∧∨≡↔]/.test(code))).toBe(true);
      expect(boss.codeOptions[0]).toContain('NOT');
    }
  });
  it('rejects malformed, duplicate and oversized imported state', () => {
    for (const value of [
      null,
      { selectedWorlds: [undefined] },
      { selectedWorlds: ['world-16'] },
      { selectedWorlds: ['world-1', 'world-1'] },
      { selectedWorlds: [], code: 'x'.repeat(513) },
      { selectedWorlds: [], classification: 'always' },
    ])
      expect(validLogicBuildState(value)).toBe(false);
  });
  it('creates seeded Echoes with exact validation', () => {
    const dispose = installLogicEchoes(),
      provider = getEchoProvider('logic')!;
    const first = provider(0),
      next = provider(1);
    expect(first.prompt).not.toBe(next.prompt);
    expect(first.check('tautology')).toBe(true);
    expect(first.check('contingent')).toBe(false);
    expect(first.hints).toHaveLength(3);
    dispose();
  });
});
