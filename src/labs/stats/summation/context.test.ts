import { expect, it } from 'vitest';
import { initialSummationVariant, readSummationVariant } from './context';
import { createSummationChallenge } from './challenge';
it('restores every persisted Hopper field and strips unrelated properties', () => {
  const challenge = createSummationChallenge('variance', 81);
  const value = {
    ...initialSummationVariant(),
    mode: 'prove',
    kind: 'variance',
    seed: 81,
    view: 'structure',
    method: 'structure',
    language: 'r',
    cursor: 2,
    phase: 1,
    hint: 2,
    tryFirst: true,
    guess: '2.96',
    build: {
      ...challenge.setup,
      included: ['term-2'],
      values: { 'term-2': '16/25' },
      balance: '26/5',
      claim: '74/25',
    },
    extra: 'ignored',
  };
  const restored = readSummationVariant(JSON.stringify(value));
  expect(restored).toEqual(
    Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'extra')),
  );
});
it.each([
  { seed: -1 },
  { cursor: 16 },
  { phase: 4 },
  { view: 'evil' },
  { language: 'eval' },
  { expression: 'sum(i=1..999,i)' },
  { build: { included: ['term-0', 'term-0'], values: {}, claim: '', balance: '' } },
])('rejects an invalid imported context %j', (patch) => {
  expect(readSummationVariant(JSON.stringify({ ...initialSummationVariant(), ...patch }))).toEqual(
    initialSummationVariant(),
  );
});
it('rejects oversized, malformed and wrong-family term ids', () => {
  expect(readSummationVariant('x'.repeat(12001))).toEqual(initialSummationVariant());
  expect(readSummationVariant('{')).toEqual(initialSummationVariant());
  expect(
    readSummationVariant(
      JSON.stringify({
        ...initialSummationVariant(),
        mode: 'prove',
        build: { included: ['term-15'], values: {}, claim: '', balance: '' },
      }),
    ),
  ).toEqual(initialSummationVariant());
});
