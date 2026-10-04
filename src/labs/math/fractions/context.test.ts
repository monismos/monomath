import { describe, expect, it } from 'vitest';
import { createFractionChallenge, fractionChallengeKinds } from './challenge';
import { initialFractionVariant, readFractionVariant, recutBuild } from './context';

describe('bounded Fractions context restoration', () => {
  it('restores every challenge setup without importing unrelated properties', () => {
    for (const kind of fractionChallengeKinds) {
      const v = {
        ...initialFractionVariant(),
        mode: 'prove',
        kind,
        build: createFractionChallenge(kind, 12345).setup,
      };
      const raw = JSON.stringify({
        ...v,
        replaceStore: true,
        build: {
          ...v.build,
          __proto__: null,
          callback: 'execute',
          fits: kind === 'divide' ? 0 : undefined,
        },
      });
      const restored = readFractionVariant(raw);
      expect(restored.kind).toBe(kind);
      expect(restored.mode).toBe('prove');
      expect(restored.build).toEqual(v.build);
      expect('replaceStore' in restored).toBe(false);
      expect('callback' in restored.build).toBe(false);
    }
  });
  it('rejects oversized cuts, grids, indices and auxiliary fields before rendering', () => {
    const add = {
      ...initialFractionVariant(),
      mode: 'prove',
      kind: 'add',
      build: createFractionChallenge('add', 12345).setup,
    };
    for (const patch of [
      { leftCuts: 100000 },
      { leftCuts: 1.5 },
      { rightCuts: 0 },
      { selected: [0, 0] },
      { selected: [-1] },
      { units: 4 },
    ])
      expect(
        readFractionVariant(JSON.stringify({ ...add, build: { ...add.build, ...patch } })),
      ).toEqual(initialFractionVariant());
    const multiply = {
      ...add,
      kind: 'multiply',
      build: createFractionChallenge('multiply', 12345).setup,
    };
    for (const patch of [
      { rows: 100000 },
      { columns: 0 },
      { horizontalSelected: [99] },
      { verticalSelected: [0, 0] },
      { denominator: 24 },
    ])
      expect(
        readFractionVariant(
          JSON.stringify({ ...multiply, build: { ...multiply.build, ...patch } }),
        ),
      ).toEqual(initialFractionVariant());
    const simplify = {
      ...add,
      kind: 'simplify',
      build: createFractionChallenge('simplify', 12345).setup,
    };
    expect(
      readFractionVariant(
        JSON.stringify({ ...simplify, build: { ...simplify.build, groups: 10000 } }),
      ),
    ).toEqual(initialFractionVariant());
  });
  it('ignores auxiliary fields belonging to a different model and prototype keys', () => {
    const raw = JSON.stringify({
      ...initialFractionVariant(),
      build: { ...initialFractionVariant().build, rows: 99999, fits: 99999 },
    }).replace('"shape"', '"__proto__":{"polluted":true},"shape"');
    const restored = readFractionVariant(raw);
    expect(restored.build.rows).toBeUndefined();
    expect(restored.build.fits).toBeUndefined();
    expect(Object.getPrototypeOf(restored)).toBe(Object.prototype);
    expect('polluted' in restored).toBe(false);
  });
  it('preserves mismatched shading as an honest unfinished multiplication attempt', () => {
    const challenge = createFractionChallenge('multiply', 12345),
      v = {
        ...initialFractionVariant(),
        mode: 'prove',
        kind: 'multiply',
        build: { ...challenge.setup, selected: [0] },
      };
    const restored = readFractionVariant(JSON.stringify(v));
    expect(restored.build.selected).toEqual([0]);
    expect(challenge.goal(restored.build)).toBe(false);
  });
  it('maps cuts only when the selected area can be preserved exactly', () => {
    const state = { denominator: 4, selected: [0, 2], units: 1, sign: 1 as const };
    expect(recutBuild(state, 8)?.selected).toEqual([0, 1, 2, 3]);
    expect(recutBuild(state, 3)).toBeNull();
    expect(recutBuild(state, 100000)).toBeNull();
    expect(state.selected).toEqual([0, 2]);
  });
});
