import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Notelet } from '../notelets/types';
import type { AwardKind, ActionKind } from './gameConfig';
import type { GameData, ChallengeEcho, CosmeticId } from './types';
import { localDay } from './calendar';
import { initialGame, awardEvent, recordEvent } from './logic';
import { initialSchedule, scheduleReview, type EchoRating } from './srs';
import { cosmeticUnlocked } from './achievements';
export interface ChallengeEchoRequest {
  skillId: string;
  key: string;
  labId: string;
  seed: number;
  prompt: string;
}
interface GameStore extends GameData {
  unavailable: boolean;
  award: (kind: AwardKind, key: string, labId?: string, hinted?: boolean) => number;
  record: (kind: ActionKind, key: string, labId?: string) => void;
  syncNoteEcho: (note: Notelet) => void;
  removeNoteEcho: (id: string) => void;
  queueChallengeEcho: (request: ChallengeEchoRequest) => void;
  rateEcho: (id: string, rating: EchoRating) => boolean;
  selectCosmetic: (id: CosmeticId) => boolean;
  importProgress: (value: unknown) => boolean;
  reset: () => void;
}
const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const timestamp = (n: unknown) => finite(n) && (n as number) <= 253402300799999;
const day = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number(value.slice(0, 4)) >= 1970 &&
  new Date(`${value}T12:00:00`).getDate() === Number(value.slice(8));
const stringOrNull = (value: unknown) => value === null || typeof value === 'string';
function copyData(d: GameData): GameData {
  return {
    version: 1,
    xp: d.xp,
    ledger: d.ledger,
    events: d.events,
    gems: d.gems,
    rhythm: d.rhythm,
    echoes: d.echoes,
    cosmetics: d.cosmetics,
  };
}
export function validGame(value: unknown): value is GameData {
  if (!value || typeof value !== 'object') return false;
  const d = value as GameData;
  if (
    d.version !== 1 ||
    !finite(d.xp) ||
    d.xp > 1000000000 ||
    !d.ledger ||
    typeof d.ledger !== 'object' ||
    Array.isArray(d.ledger) ||
    !d.events ||
    typeof d.events !== 'object' ||
    Array.isArray(d.events) ||
    !d.gems ||
    typeof d.gems !== 'object' ||
    Array.isArray(d.gems) ||
    !d.rhythm ||
    !Array.isArray(d.echoes) ||
    !d.cosmetics
  )
    return false;
  if (!['plain', 'sunhat', 'starcap', 'mint'].includes(d.cosmetics.selected)) return false;
  if (
    !finite(d.rhythm.streak) ||
    !finite(d.rhythm.best) ||
    !Number.isInteger(d.rhythm.streak) ||
    !Number.isInteger(d.rhythm.best) ||
    d.rhythm.best < d.rhythm.streak ||
    !Array.isArray(d.rhythm.frozenDays) ||
    !d.rhythm.frozenDays.every(day) ||
    !(d.rhythm.lastDay === null || day(d.rhythm.lastDay)) ||
    !(
      d.rhythm.freezeWeek === null ||
      (typeof d.rhythm.freezeWeek === 'string' &&
        /^\d{4}-W([1-9]|[1-4]\d|5[0-3])$/.test(d.rhythm.freezeWeek))
    )
  )
    return false;
  if (
    !Object.values(d.ledger).every(
      (e) =>
        e &&
        ['watch', 'predict', 'play', 'prove', 'boss', 'echo', 'notelet'].includes(e.kind) &&
        typeof e.key === 'string' &&
        timestamp(e.at) &&
        finite(e.xp) &&
        day(e.day) &&
        (e.labId === undefined || typeof e.labId === 'string'),
    )
  )
    return false;
  if (
    !Object.values(d.events).every(
      (e) =>
        e &&
        [
          'tether',
          'dimension',
          'bridge',
          'theme',
          'quiet',
          'bond',
          'dial',
          'hold',
          'bug',
          'checkpoint',
        ].includes(e.kind) &&
        typeof e.key === 'string' &&
        timestamp(e.at) &&
        day(e.day) &&
        (e.labId === undefined || typeof e.labId === 'string'),
    )
  )
    return false;
  if (
    !Object.values(d.gems).every(
      (g) =>
        g &&
        typeof g.observe === 'boolean' &&
        typeof g.play === 'boolean' &&
        typeof g.prove === 'boolean' &&
        Array.isArray(g.echoDays) &&
        g.echoDays.every(day),
    )
  )
    return false;
  return (
    new Set(d.echoes.map((e) => e?.id)).size === d.echoes.length &&
    d.echoes.every(
      (e) =>
        e &&
        typeof e.id === 'string' &&
        typeof e.labId === 'string' &&
        ['note', 'challenge'].includes(e.kind) &&
        e.schedule &&
        [0, 1, 2, 3].includes(e.schedule.box) &&
        timestamp(e.schedule.dueAt) &&
        finite(e.schedule.reviews) &&
        Number.isInteger(e.schedule.reviews) &&
        (e.schedule.reviewedAt === null || timestamp(e.schedule.reviewedAt)) &&
        Array.isArray(e.schedule.successes) &&
        e.schedule.successes.every(day) &&
        (e.kind === 'note'
          ? typeof e.noteId === 'string' &&
            typeof e.preview === 'string' &&
            typeof e.context === 'string' &&
            (e.thumb === undefined ||
              (typeof e.thumb === 'string' &&
                /^data:image\/(png|svg\+xml)[;,]/.test(e.thumb) &&
                e.thumb.length < 500000))
          : typeof e.skillId === 'string' &&
            typeof e.key === 'string' &&
            finite(e.seed) &&
            Number.isInteger(e.seed) &&
            e.seed <= 0xffffffff &&
            typeof e.prompt === 'string'),
    ) &&
    stringOrNull(d.rhythm.lastDay)
  );
}
let storageFailed = false;
function reportStorageFailure() {
  if (storageFailed) return;
  storageFailed = true;
  queueMicrotask(() => useGame.setState({ unavailable: true }));
}
const storage = createJSONStorage<GameData>(() => ({
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      reportStorageFailure();
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      reportStorageFailure();
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* memory state remains usable */
    }
  },
}));
export const useGame = create<GameStore>()(
  persist<GameStore, [], [], GameData>(
    (set, get) => ({
      ...initialGame(),
      unavailable: false,
      award: (kind, key, labId, hinted = false) => {
        const result = awardEvent(get(), kind, key, Date.now(), labId, hinted);
        if (result.data !== get()) set(result.data);
        return result.xp;
      },
      record: (kind, key, labId) => {
        const next = recordEvent(get(), kind, key, Date.now(), labId);
        if (next !== get()) set(next);
      },
      syncNoteEcho: (note) => {
        const state = get();
        const id = `note:${note.id}`;
        const previous = state.echoes.find((e) => e.id === id);
        if (!note.starred && !note.echo) {
          if (previous) set({ echoes: state.echoes.filter((e) => e.id !== id) });
          return;
        }
        const context = `${note.context.labId === 'demo' ? 'Parts of a whole' : note.context.labId} · ${note.context.problem} · step ${note.context.step + 1}`;
        const preview = note.text.slice(0, 64);
        if (
          previous?.kind === 'note' &&
          previous.preview === preview &&
          previous.context === context &&
          previous.thumb === note.thumb
        )
          return;
        set({
          echoes: [
            ...state.echoes.filter((e) => e.id !== id),
            {
              id,
              kind: 'note',
              noteId: note.id,
              labId: note.context.labId,
              preview,
              context,
              thumb: note.thumb,
              schedule: previous?.schedule ?? initialSchedule(Date.now()),
            },
          ],
        });
      },
      removeNoteEcho: (noteId) => {
        set({ echoes: get().echoes.filter((e) => e.id !== `note:${noteId}`) });
      },
      queueChallengeEcho: (request) => {
        const id = `challenge:${request.labId}:${request.key}`;
        if (get().echoes.some((e) => e.id === id)) return;
        const item: ChallengeEcho = {
          ...request,
          id,
          kind: 'challenge',
          seed: request.seed >>> 0,
          schedule: initialSchedule(Date.now()),
        };
        set({ echoes: [...get().echoes, item] });
      },
      rateEcho: (id, rating) => {
        const state = get();
        const now = Date.now();
        const item = state.echoes.find((e) => e.id === id);
        if (!item || item.schedule.dueAt > now) return false;
        const schedule = scheduleReview(item.schedule, rating, now);
        const nextItem =
          item.kind === 'challenge'
            ? { ...item, seed: (item.seed + 0x9e3779b9) >>> 0, schedule }
            : { ...item, schedule };
        const next = { ...state, echoes: state.echoes.map((e) => (e.id === id ? nextItem : e)) };
        if (rating === 'good')
          set(
            awardEvent(
              next,
              'echo',
              `${id}:${item.schedule.reviews}:${localDay(now)}`,
              now,
              item.labId,
            ).data,
          );
        else set(next);
        return true;
      },
      selectCosmetic: (id) => {
        if (!cosmeticUnlocked(get(), id)) return false;
        set({ cosmetics: { selected: id } });
        return true;
      },
      importProgress: (value) => {
        if (!validGame(value)) return false;
        const clean = copyData(value);
        if (!cosmeticUnlocked(clean, clean.cosmetics.selected))
          clean.cosmetics = { selected: 'plain' };
        set(clean);
        return true;
      },
      reset: () => set(initialGame()),
    }),
    {
      name: 'monomath-progress',
      version: 1,
      storage,
      partialize: copyData,
      merge: (saved, current) => (validGame(saved) ? { ...current, ...copyData(saved) } : current),
    },
  ),
);
export const syncNoteEcho = (note: Notelet) => useGame.getState().syncNoteEcho(note);
export const removeNoteEcho = (id: string) => useGame.getState().removeNoteEcho(id);
export function exportProgress(): GameData {
  const { version, xp, ledger, events, gems, rhythm, echoes, cosmetics } = useGame.getState();
  return { version, xp, ledger, events, gems, rhythm, echoes, cosmetics };
}
