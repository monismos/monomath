import { beforeEach, describe, expect, it } from 'vitest';
import { PhilosophyRepository, philosophyKey } from './repository';
import { journalDraft, journalReflection, readJournal } from './journal';
import {
  cloneLesson,
  exportLessons,
  lessonMarkdown,
  parseLessonImport,
  validData,
  validDraft,
  validLesson,
} from './types';
import type { Lesson } from './types';
const lesson: Lesson = {
  id: 'thinking-clearly',
  title: 'What makes a reason good?',
  question: 'When should I change my mind?',
  body: '# Begin with a question\nA reason can be examined.',
  author: 'Airator',
  tags: ['reason', 'questions'],
  references: ['A personal notebook'],
  createdAt: 100,
  updatedAt: 100,
};
function memory() {
  const values = new Map<string, unknown>();
  const adapter = {
    load: async (key: string) => structuredClone(values.get(key)),
    save: async (key: string, value: unknown) => {
      values.set(key, structuredClone(value));
      return true;
    },
  };
  return { values, adapter };
}
describe('authored Philosophy workspace', () => {
  beforeEach(() => localStorage.clear());
  it('awaits CRUD writes, reloads lessons and drafts, and keeps private reflections out of exports', async () => {
    const { adapter } = memory();
    const repo = new PhilosophyRepository(adapter, [], false);
    const draft = { ...cloneLesson(lesson), title: '', body: '', updatedAt: 101 };
    expect(await repo.saveDraft(draft)).toBe(true);
    const published = { ...lesson, updatedAt: 102 };
    expect(await repo.saveLesson(published)).toBe(true);
    await repo.saveReflection({ lessonId: lesson.id, text: 'A private thought.', updatedAt: 103 });
    const restored = new PhilosophyRepository(adapter, [], false);
    await restored.initialize();
    expect(restored.getSnapshot().data.lessons).toEqual([published]);
    expect(restored.getSnapshot().data.drafts).toEqual([]);
    expect(restored.getSnapshot().data.reflections[0].text).toBe('A private thought.');
    expect(JSON.stringify(exportLessons(restored.getSnapshot().data.lessons))).not.toContain(
      'private',
    );
    expect(lessonMarkdown(published)).toContain('By Airator');
    await repo.deleteLesson(lesson.id);
    expect(repo.getSnapshot().data.lessons).toEqual([]);
    expect(repo.getSnapshot().data.reflections).toHaveLength(1);
    await repo.restoreLesson(published);
    expect(repo.getSnapshot().data.lessons).toEqual([published]);
  });
  it('ignores older autosaves that arrive after publishing and preserves the latest draft', async () => {
    const repo = new PhilosophyRepository(memory().adapter, [], false);
    await repo.saveLesson({ ...lesson, updatedAt: 200 });
    await repo.saveDraft({ ...lesson, body: 'Stale edit.', updatedAt: 199 });
    expect(repo.getSnapshot().data.drafts).toEqual([]);
    await repo.saveDraft({ ...lesson, body: 'Newest edit.', updatedAt: 202 });
    await repo.saveDraft({ ...lesson, body: 'Older edit.', updatedAt: 201 });
    expect(repo.getSnapshot().data.drafts[0].body).toBe('Newest edit.');
  });
  it('imports atomically and only replaces matching ids with newer versions when chosen', async () => {
    const repo = new PhilosophyRepository(memory().adapter, [], false);
    await repo.saveLesson(lesson);
    await expect(
      repo.importLessons(exportLessons([lesson, { ...lesson, id: 'bad id' }]), true),
    ).rejects.toThrow(/invalid lesson/);
    expect(repo.getSnapshot().data.lessons).toEqual([lesson]);
    const newer = { ...lesson, title: 'A revised question', updatedAt: 110 };
    expect(await repo.importLessons(exportLessons([newer]), false)).toMatchObject({
      skipped: 1,
      replaced: 0,
    });
    expect(await repo.importLessons(exportLessons([newer]), true)).toMatchObject({ replaced: 1 });
    expect(await repo.importLessons(exportLessons([lesson]), true)).toMatchObject({ skipped: 1 });
    expect(repo.getSnapshot().data.lessons[0]).toEqual(newer);
  });
  it('remembers removal of a bundled authored lesson while allowing Undo', async () => {
    const { adapter } = memory();
    const repo = new PhilosophyRepository(adapter, [lesson], false);
    await repo.initialize();
    await repo.deleteLesson(lesson.id);
    const reloaded = new PhilosophyRepository(adapter, [lesson], false);
    await reloaded.initialize();
    expect(reloaded.getSnapshot().data.lessons).toEqual([]);
    await reloaded.restoreLesson(lesson);
    expect(reloaded.getSnapshot().data.deletedSourceIds).toEqual([]);
  });
  it('recovers an immediate typing journal after reload and clears it after a durable save', async () => {
    journalDraft({ ...lesson, title: 'Typing in progress', updatedAt: 120 });
    journalReflection({ lessonId: lesson.id, text: 'Kept at every keystroke.', updatedAt: 120 });
    const repo = new PhilosophyRepository(memory().adapter, [lesson]);
    await repo.initialize();
    expect(repo.getSnapshot().data.drafts[0].title).toBe('Typing in progress');
    expect(repo.getSnapshot().data.reflections[0].text).toBe('Kept at every keystroke.');
    await repo.saveLesson({ ...lesson, updatedAt: 121 });
    await repo.saveReflection({
      lessonId: lesson.id,
      text: 'Kept at every keystroke.',
      updatedAt: 120,
    });
    expect(readJournal()).toEqual({ drafts: [], reflections: [] });
  });
  it('keeps the session usable and gives an explicit warning when persistence is unavailable', async () => {
    const repo = new PhilosophyRepository(
      { load: async () => undefined, save: async () => false },
      [],
      false,
    );
    expect(await repo.saveLesson(lesson)).toBe(false);
    expect(repo.getSnapshot().ready).toBe(true);
    expect(repo.getSnapshot().data.lessons).toEqual([lesson]);
    expect(repo.getSnapshot().error).toMatch(/export a backup/i);
  });
  it('does not overwrite unreadable saved data with a new empty workspace', async () => {
    const { values, adapter } = memory();
    values.set(philosophyKey, { version: 8, valuable: 'Unrecognised future data.' });
    const repo = new PhilosophyRepository(adapter, [], false);
    await repo.saveLesson(lesson);
    expect(values.get(philosophyKey)).toEqual({
      version: 8,
      valuable: 'Unrecognised future data.',
    });
    expect(repo.getSnapshot().error).toMatch(/could not be read/);
  });
  it('validates field limits and serializes only the public lesson DTO', () => {
    expect(validLesson(lesson)).toBe(true);
    expect(validDraft({ ...lesson, body: '', title: '' })).toBe(true);
    expect(validLesson({ ...lesson, body: '' })).toBe(false);
    expect(validLesson({ ...lesson, tags: ['a', 'a'] })).toBe(false);
    expect(validLesson({ ...lesson, id: '<script>' })).toBe(false);
    expect(validLesson({ ...lesson, updatedAt: Infinity })).toBe(false);
    expect(
      validData({
        version: 1,
        lessons: [lesson],
        drafts: [],
        reflections: [],
        deletedSourceIds: [],
        author: 'Airator',
      }),
    ).toBe(true);
    const parsed = parseLessonImport({
      version: 1,
      kind: 'monomath-philosophy',
      lessons: [{ ...lesson, privateReflection: 'Do not export me.' }],
    });
    expect(JSON.stringify(parsed)).not.toContain('privateReflection');
    expect(() => parseLessonImport(exportLessons([lesson, lesson]))).toThrow(/repeated lesson id/);
  });
});
