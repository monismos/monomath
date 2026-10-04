import { it, expect } from 'vitest';
import { validNote } from './types';
const note = {
  id: 'a',
  text: 'I understand quarters',
  color: 'sun',
  createdAt: 1,
  updatedAt: 1,
  context: {
    route: 'workshop',
    screen: 'page',
    labId: 'demo',
    selection: null,
    theme: 'bench',
    problem: '3/4',
    step: 1,
    dial: 2,
    dimension: '2d',
  },
  anchor: { type: 'screen', nx: 0.5, ny: 0.5 },
};
it('accepts notelet exports and rejects malformed or unbounded anchors', () => {
  expect(validNote(note)).toBe(true);
  expect(validNote({ ...note, anchor: { nx: Infinity, ny: 0 } })).toBe(false);
  expect(validNote({ ...note, text: 'x'.repeat(501) })).toBe(false);
  expect(validNote({ ...note, color: '__proto__' })).toBe(false);
  expect(validNote({ ...note, context: { ...note.context, labId: undefined } })).toBe(false);
  expect(validNote({ ...note, thumb: 'https://example.com/track.png' })).toBe(false);
  expect(
    validNote({ ...note, context: { ...note.context, route: 'https://untrusted.example' } }),
  ).toBe(false);
});
it('preserves the Sets route and its bounded manipulated lesson context', () => {
  expect(
    validNote({
      ...note,
      context: {
        ...note.context,
        route: 'sets',
        labId: 'sets',
        problem: 'A ∩ B',
        variant: '{"view":"venn"}',
      },
    }),
  ).toBe(true);
  expect(
    validNote({ ...note, context: { ...note.context, route: 'sets', variant: 'x'.repeat(10000) } }),
  ).toBe(false);
});
