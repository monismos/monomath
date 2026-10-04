export interface Lesson {
  id: string;
  title: string;
  question: string;
  body: string;
  author: string;
  tags: string[];
  references: string[];
  createdAt: number;
  updatedAt: number;
}
export type LessonDraft = Lesson;
export interface Reflection {
  lessonId: string;
  text: string;
  updatedAt: number;
}
export interface PhilosophyData {
  version: 1;
  lessons: Lesson[];
  drafts: LessonDraft[];
  reflections: Reflection[];
  deletedSourceIds: string[];
  author: string;
}
export interface LessonExport {
  version: 1;
  kind: 'monomath-philosophy';
  lessons: Lesson[];
}
export const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.length <= max;
const time = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= 8640000000000000;
const strings = (value: unknown, count: number, max: number): value is string[] =>
  Array.isArray(value) &&
  value.length <= count &&
  value.every((item) => text(item, max) && !!item.trim());
export function validDraft(value: unknown): value is LessonDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as LessonDraft;
  return (
    validId(d.id) &&
    text(d.title, 200) &&
    text(d.question, 1000) &&
    text(d.body, 100000) &&
    text(d.author, 120) &&
    strings(d.tags, 20, 40) &&
    new Set(d.tags).size === d.tags.length &&
    strings(d.references, 30, 2000) &&
    time(d.createdAt) &&
    time(d.updatedAt) &&
    d.updatedAt >= d.createdAt
  );
}
export function validLesson(value: unknown): value is Lesson {
  return validDraft(value) && !!value.title.trim() && !!value.body.trim() && !!value.author.trim();
}
export function validReflection(value: unknown): value is Reflection {
  if (!value || typeof value !== 'object') return false;
  const r = value as Reflection;
  return validId(r.lessonId) && text(r.text, 20000) && time(r.updatedAt);
}
const distinctIds = (values: { id: string }[]) =>
  new Set(values.map((item) => item.id)).size === values.length;
export function validData(value: unknown): value is PhilosophyData {
  if (!value || typeof value !== 'object') return false;
  const d = value as PhilosophyData;
  return (
    d.version === 1 &&
    Array.isArray(d.lessons) &&
    d.lessons.length <= 2000 &&
    d.lessons.every(validLesson) &&
    distinctIds(d.lessons) &&
    Array.isArray(d.drafts) &&
    d.drafts.length <= 2000 &&
    d.drafts.every(validDraft) &&
    distinctIds(d.drafts) &&
    Array.isArray(d.reflections) &&
    d.reflections.length <= 4000 &&
    d.reflections.every(validReflection) &&
    new Set(d.reflections.map((r) => r.lessonId)).size === d.reflections.length &&
    Array.isArray(d.deletedSourceIds) &&
    d.deletedSourceIds.every(validId) &&
    d.deletedSourceIds.length <= 2000 &&
    text(d.author, 120) &&
    !!d.author.trim()
  );
}
export function parseLessonImport(value: unknown): LessonExport {
  if (!value || typeof value !== 'object')
    throw new Error('This file does not contain a Philosophy lesson export.');
  const d = value as LessonExport;
  if (d.version !== 1 || d.kind !== 'monomath-philosophy')
    throw new Error('This lesson export has an unsupported format or version.');
  if (
    !Array.isArray(d.lessons) ||
    d.lessons.length > 2000 ||
    !d.lessons.every(validLesson) ||
    !distinctIds(d.lessons)
  )
    throw new Error(
      'The file contains an invalid lesson or a repeated lesson id. Nothing was imported.',
    );
  return { version: 1, kind: 'monomath-philosophy', lessons: d.lessons.map(cloneLesson) };
}
export function cloneLesson(lesson: Lesson): Lesson {
  return {
    id: lesson.id,
    title: lesson.title,
    question: lesson.question,
    body: lesson.body,
    author: lesson.author,
    tags: [...lesson.tags],
    references: [...lesson.references],
    createdAt: lesson.createdAt,
    updatedAt: lesson.updatedAt,
  };
}
export function newDraft(author = 'Airator', now = Date.now()): LessonDraft {
  return {
    id: crypto.randomUUID(),
    title: '',
    question: '',
    body: '',
    author,
    tags: [],
    references: [],
    createdAt: now,
    updatedAt: now,
  };
}
export function exportLessons(lessons: Lesson[]): LessonExport {
  return { version: 1, kind: 'monomath-philosophy', lessons: lessons.map(cloneLesson) };
}
export function lessonMarkdown(lesson: Lesson): string {
  return (
    [
      `# ${lesson.title}`,
      `By ${lesson.author}`,
      lesson.question ? `> ${lesson.question}` : '',
      lesson.body,
      lesson.references.length
        ? `## References\n${lesson.references.map((ref) => `- ${ref}`).join('\n')}`
        : '',
      lesson.tags.length ? `Tags: ${lesson.tags.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n\n') + '\n'
  );
}
