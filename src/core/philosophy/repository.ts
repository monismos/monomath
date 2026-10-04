import { loadData, saveData } from '../storage/db';
import { sourceLessons } from '../../content/philosophy/lessons';
import {
  cloneLesson,
  parseLessonImport,
  validData,
  validDraft,
  validLesson,
  validReflection,
} from './types';
import type { Lesson, LessonDraft, PhilosophyData, Reflection } from './types';
import { clearJournalDraft, clearJournalReflection, readJournal } from './journal';
export const philosophyKey = 'philosophy-workspace';
export interface StorageAdapter {
  load: (key: string) => Promise<unknown>;
  save: (key: string, value: unknown) => Promise<boolean>;
}
export interface PhilosophySnapshot {
  data: PhilosophyData;
  ready: boolean;
  unavailable: boolean;
  error: string;
}
const initialData = (): PhilosophyData => ({
  version: 1,
  lessons: [],
  drafts: [],
  reflections: [],
  deletedSourceIds: [],
  author: 'Airator',
});
export class PhilosophyRepository {
  private snapshot: PhilosophySnapshot = {
    data: initialData(),
    ready: false,
    unavailable: false,
    error: '',
  };
  private listeners = new Set<() => void>();
  private loading?: Promise<void>;
  private queue = Promise.resolve();
  private writable = true;
  constructor(
    private storage: StorageAdapter,
    private source: Lesson[] = [],
    private recoverJournal = true,
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<PhilosophySnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  initialize = async () => {
    if (!this.loading)
      this.loading = (async () => {
        let data = initialData();
        let error = '';
        try {
          const stored = await this.storage.load(philosophyKey);
          if (stored !== undefined && !validData(stored)) {
            this.writable = false;
            error =
              'Your saved workspace could not be read. This session stays separate; export your work before leaving.';
          } else if (validData(stored)) data = structuredClone(stored);
        } catch {
          error = 'Browser storage is unavailable. Export your work before leaving.';
        }
        if (!this.source.every(validLesson))
          throw new Error('The bundled Philosophy lessons do not match the lesson schema.');
        for (const lesson of this.source) {
          if (data.deletedSourceIds.includes(lesson.id)) continue;
          const existing = data.lessons.find((item) => item.id === lesson.id);
          if (!existing) data.lessons.push(cloneLesson(lesson));
        }
        if (this.recoverJournal) {
          const journal = readJournal();
          for (const draft of journal.drafts) {
            const saved = data.lessons.find((item) => item.id === draft.id);
            const existing = data.drafts.find((item) => item.id === draft.id);
            if (
              (saved?.updatedAt ?? -1) >= draft.updatedAt ||
              (existing?.updatedAt ?? -1) >= draft.updatedAt
            )
              continue;
            data.drafts = [
              ...data.drafts.filter((item) => item.id !== draft.id),
              cloneLesson(draft),
            ];
          }
          for (const reflection of journal.reflections) {
            const existing = data.reflections.find((item) => item.lessonId === reflection.lessonId);
            if ((existing?.updatedAt ?? -1) < reflection.updatedAt)
              data.reflections = [
                ...data.reflections.filter((item) => item.lessonId !== reflection.lessonId),
                { ...reflection },
              ];
          }
        }
        let durable = false;
        try {
          durable = this.writable && (await this.storage.save(philosophyKey, data));
        } catch {
          /* Session remains usable. */
        }
        this.publish({
          data,
          ready: true,
          unavailable: !durable,
          error:
            error ||
            (!durable
              ? 'Browser storage is unavailable. Changes last for this session; export a backup before leaving.'
              : ''),
        });
      })();
    await this.loading;
  };
  private mutate(change: (data: PhilosophyData) => PhilosophyData): Promise<boolean> {
    let durable = false;
    const operation = this.queue.then(async () => {
      await this.initialize();
      const data = change(structuredClone(this.snapshot.data));
      if (!validData(data))
        throw new Error('This change exceeds the workspace limits or contains an invalid lesson.');
      try {
        durable = this.writable && (await this.storage.save(philosophyKey, data));
      } catch {
        durable = false;
      }
      this.publish({
        data,
        unavailable: !durable,
        error: durable
          ? ''
          : this.snapshot.error ||
            'Browser storage is unavailable. Changes last for this session; export a backup before leaving.',
      });
    });
    this.queue = operation.catch(() => {});
    return operation.then(() => durable);
  }
  saveDraft = async (draft: LessonDraft) => {
    if (!validDraft(draft)) throw new Error('This draft exceeds a field limit.');
    const durable = await this.mutate((data) => {
      // A debounce queued before Save must not recreate a published draft afterwards.
      const saved = data.lessons.find((item) => item.id === draft.id);
      if (saved && saved.updatedAt >= draft.updatedAt) return data;
      const newer = data.drafts.find(
        (item) => item.id === draft.id && item.updatedAt > draft.updatedAt,
      );
      if (!newer)
        data.drafts = [...data.drafts.filter((item) => item.id !== draft.id), cloneLesson(draft)];
      return data;
    });
    if (durable) clearJournalDraft(draft.id, draft.updatedAt);
    return durable;
  };
  saveLesson = async (lesson: Lesson) => {
    if (!validLesson(lesson)) throw new Error('Add a title, author and lesson body before saving.');
    const durable = await this.mutate((data) => ({
      ...data,
      lessons: [...data.lessons.filter((item) => item.id !== lesson.id), cloneLesson(lesson)],
      drafts: data.drafts.filter((item) => item.id !== lesson.id),
      deletedSourceIds: data.deletedSourceIds.filter((id) => id !== lesson.id),
      author: lesson.author,
    }));
    if (durable) clearJournalDraft(lesson.id, lesson.updatedAt);
    return durable;
  };
  discardDraft = async (id: string) => {
    const draft = this.snapshot.data.drafts.find((item) => item.id === id);
    const result = await this.mutate((data) => ({
      ...data,
      drafts: data.drafts.filter((item) => item.id !== id),
    }));
    clearJournalDraft(id, draft?.updatedAt ?? Number.MAX_SAFE_INTEGER);
    return result;
  };
  saveReflection = async (reflection: Reflection) => {
    if (!validReflection(reflection))
      throw new Error('This reflection exceeds the 20,000 character limit.');
    const durable = await this.mutate((data) => {
      const newer = data.reflections.find(
        (item) => item.lessonId === reflection.lessonId && item.updatedAt > reflection.updatedAt,
      );
      if (!newer)
        data.reflections = [
          ...data.reflections.filter((item) => item.lessonId !== reflection.lessonId),
          { ...reflection },
        ];
      return data;
    });
    if (durable) clearJournalReflection(reflection.lessonId, reflection.updatedAt);
    return durable;
  };
  deleteLesson = async (id: string) => {
    const result = await this.mutate((data) => ({
      ...data,
      lessons: data.lessons.filter((item) => item.id !== id),
      drafts: data.drafts.filter((item) => item.id !== id),
      deletedSourceIds: this.source.some((lesson) => lesson.id === id)
        ? [...new Set([...data.deletedSourceIds, id])]
        : data.deletedSourceIds,
    }));
    clearJournalDraft(id, Number.MAX_SAFE_INTEGER);
    return result;
  };
  restoreLesson = (lesson: Lesson) => this.saveLesson(lesson);
  importLessons = async (value: unknown, replaceNewer: boolean) => {
    const incoming = parseLessonImport(value).lessons;
    let added = 0,
      replaced = 0,
      skipped = 0;
    const durable = await this.mutate((data) => {
      for (const lesson of incoming) {
        const existing = data.lessons.find((item) => item.id === lesson.id);
        if (!existing) {
          data.lessons.push(cloneLesson(lesson));
          added++;
        } else if (replaceNewer && lesson.updatedAt > existing.updatedAt) {
          data.lessons = data.lessons.map((item) =>
            item.id === lesson.id ? cloneLesson(lesson) : item,
          );
          replaced++;
        } else skipped++;
        data.deletedSourceIds = data.deletedSourceIds.filter((id) => id !== lesson.id);
      }
      return data;
    });
    return { added, replaced, skipped, durable };
  };
}
export const philosophy = new PhilosophyRepository(
  { load: loadData, save: saveData },
  sourceLessons,
);
