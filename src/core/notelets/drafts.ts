import { loadData, saveData } from '../storage/db';
import { validNote } from './types';
import type { Notelet } from './types';
let cache: Record<string, Notelet> = {};
let ready: Promise<void> | undefined;
let queue = Promise.resolve();
async function initialize() {
  if (!ready)
    ready = (async () => {
      const stored = await loadData<Record<string, unknown>>('drafts');
      cache = Object.fromEntries(
        Object.entries(stored ?? {}).filter(([, note]) => validNote(note)),
      ) as Record<string, Notelet>;
      const legacy = await loadData<Notelet>('draft');
      if (legacy && validNote(legacy) && legacy.text) cache[legacy.id] = legacy;
    })();
  await ready;
}
export async function loadDrafts() {
  await initialize();
  return Object.values(cache).sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function saveDraft(note: Notelet) {
  await initialize();
  if (!note.text.trim()) return;
  cache[note.id] = { ...note, updatedAt: Date.now() };
  const snapshot = { ...cache };
  queue = queue.then(async () => {
    await saveData('drafts', snapshot);
  });
  await queue;
}
export async function deleteDraft(id: string) {
  await initialize();
  delete cache[id];
  const snapshot = { ...cache };
  queue = queue.then(async () => {
    await saveData('drafts', snapshot);
    await saveData('draft', null);
  });
  await queue;
}
