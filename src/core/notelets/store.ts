import { create } from 'zustand';
import { database, loadData, saveData } from '../storage/db';
import type { Notelet } from './types';
import { validNote } from './types';
import { loadDrafts } from './drafts';
let queue = Promise.resolve();
let hydrated = false;
function persist(notes: Notelet[]) {
  queue = queue.then(async () => {
    const available = await saveData('notelets', notes);
    if (!available) useNotes.setState({ unavailable: true });
  });
  return queue;
}
export const useNotes = create<{
  notes: Notelet[];
  unavailable: boolean;
  summary: boolean;
  composer: { x: number; y: number; note: Notelet } | null;
  place: boolean;
  hidden: boolean;
  set: (
    patch: Partial<{
      summary: boolean;
      composer: { x: number; y: number; note: Notelet } | null;
      place: boolean;
      hidden: boolean;
    }>,
  ) => void;
  upsert: (note: Notelet) => Promise<void>;
  remove: (id: string) => void;
  import: (notes: Notelet[]) => void;
}>((set) => ({
  notes: [],
  unavailable: false,
  summary: false,
  composer: null,
  place: false,
  hidden: false,
  set: (patch) => set(patch),
  upsert: (note) => {
    set((state) => {
      const notes = [...state.notes.filter((n) => n.id !== note.id), note];
      persist(notes);
      return { notes };
    });
    return queue;
  },
  remove: (id) =>
    set((state) => {
      const notes = state.notes.filter((n) => n.id !== id);
      persist(notes);
      return { notes };
    }),
  import: (incoming) =>
    set((state) => {
      const byId = new Map(state.notes.map((n) => [n.id, n]));
      incoming.filter(validNote).forEach((n) => byId.set(n.id, n));
      const notes = Array.from(byId.values());
      persist(notes);
      return { notes };
    }),
}));
export async function hydrateNotes() {
  if (hydrated) return;
  hydrated = true;
  try {
    await database();
  } catch {
    useNotes.setState({ unavailable: true });
  }
  const saved = await loadData<unknown[]>('notelets');
  if (saved) useNotes.getState().import(saved.filter(validNote));
  const draft = (await loadDrafts())[0];
  if (draft && validNote(draft) && draft.text)
    useNotes.getState().set({ composer: { x: innerWidth / 2, y: innerHeight / 2, note: draft } });
}
