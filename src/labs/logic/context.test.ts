import { describe, expect, it } from 'vitest';
import { createLogicChallenge } from './challenge';
import { initialLogicVariant, readLogicVariant } from './context';
describe('bounded Logic context restoration', () => {
  it('restores world, method, mode, prediction and actual state while stripping extras', () => {
    const challenge = createLogicChallenge('counterworld', 42);
    const state = {
      ...initialLogicVariant(),
      mode: 'prove',
      kind: 'counterworld',
      seed: 42,
      expression: challenge.problem.expression,
      method: 'gate-circuit',
      world: 'world-2',
      build: { selectedWorlds: [...challenge.target], extra: true },
      tryFirst: false,
      extra: true,
    };
    const restored = readLogicVariant(JSON.stringify(state));
    expect(restored.mode).toBe('prove');
    expect(restored.world).toBe('world-2');
    expect(restored.method).toBe('gate-circuit');
    expect(restored.build.selectedWorlds).toEqual(challenge.target);
    expect('extra' in restored).toBe(false);
    expect('extra' in restored.build).toBe(false);
  });
  it.each([
    { seed: -1 },
    { world: 'world-99' },
    { method: 'decorative' },
    { expression: 'window()' },
    { hint: 4 },
    { tryFirst: 'yes' },
    { build: { selectedWorlds: ['world-0', 'world-0'] } },
  ])('rejects malformed state %o', (patch) => {
    const initial = initialLogicVariant();
    expect(readLogicVariant(JSON.stringify({ ...initial, ...patch }))).toEqual(initial);
  });
  it('rejects malformed JSON and oversized state', () => {
    expect(readLogicVariant('constructor()')).toEqual(initialLogicVariant());
    expect(readLogicVariant('x'.repeat(10001))).toEqual(initialLogicVariant());
  });
});
