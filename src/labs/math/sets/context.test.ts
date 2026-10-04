import { describe, expect, it } from 'vitest';
import { createSetsChallenge } from './challenge';
import { initialSetVariant, readSetVariant, setMembership } from './context';

describe('bounded Sets context restoration', () => {
  it('restores actual finite construction fields and strips unrelated properties', () => {
    const challenge = createSetsChallenge('power', 42);
    const initial = { ...initialSetVariant(), seed: 42, sets: challenge.givens };
    const raw = JSON.stringify({
      ...initial,
      mode: 'prove',
      kind: 'power',
      build: { ...challenge.setup, subsets: [[], [challenge.givens.A[0]]], callback: 'ignore' },
      replaceStore: true,
    });
    const restored = readSetVariant(raw);
    expect(restored.mode).toBe('prove');
    expect(restored.kind).toBe('power');
    expect(restored.build.subsets).toEqual([[], [challenge.givens.A[0]]]);
    expect('callback' in restored.build).toBe(false);
    expect('replaceStore' in restored).toBe(false);
  });

  it('rejects malformed, oversized and unsafe variants before rendering', () => {
    const initial = initialSetVariant();
    expect(readSetVariant(JSON.stringify({ ...initial, seed: -1 }))).toEqual(initial);
    expect(
      readSetVariant(JSON.stringify({ ...initial, sets: { ...initial.sets, A: [99] } })),
    ).toEqual(initial);
    expect(readSetVariant('constructor()')).toEqual(initial);
    expect(readSetVariant('x'.repeat(12001))).toEqual(initial);
  });

  it('moves one actual element into each explicit membership region', () => {
    const initial = initialSetVariant();
    const first = initial.build.universe[0];
    const both = setMembership(initial.build, first, 'both');
    expect(both.a).toContain(first);
    expect(both.b).toContain(first);
    const neither = setMembership(both, first, 'neither');
    expect(neither.a).not.toContain(first);
    expect(neither.b).not.toContain(first);
    expect(initial.build.a).not.toEqual(neither.a);
  });
});
