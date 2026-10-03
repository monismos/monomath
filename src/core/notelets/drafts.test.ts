import { it, expect } from 'vitest';
import { saveDraft, loadDrafts, deleteDraft } from './drafts';
import type { Notelet } from './types';
it('preserves independent drafts and deletes only the saved draft', async () => {
  const a: Notelet = {
    id: 'draft-a',
    text: 'One thought',
    color: 'sun',
    createdAt: 1,
    updatedAt: 1,
    context: {
      step: 0,
      dial: 0,
      selection: null,
      problem: '3/4',
      labId: 'demo',
      route: 'workshop',
      screen: 'page',
      dimension: '2d',
      theme: 'bench',
    },
    anchor: { type: 'screen', nx: 0.5, ny: 0.5 },
  };
  await Promise.all([saveDraft(a), saveDraft({ ...a, id: 'draft-b', text: 'Another thought' })]);
  expect((await loadDrafts()).map((n) => n.id)).toEqual(
    expect.arrayContaining(['draft-a', 'draft-b']),
  );
  await deleteDraft('draft-a');
  expect((await loadDrafts()).some((n) => n.id === 'draft-a')).toBe(false);
  expect((await loadDrafts()).some((n) => n.id === 'draft-b')).toBe(true);
});
