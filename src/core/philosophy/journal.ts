import { validDraft, validReflection } from './types';
import type { LessonDraft, Reflection } from './types';
const key = 'monomath-philosophy-journal';
interface Journal {
  drafts: LessonDraft[];
  reflections: Reflection[];
}
export function readJournal(): Journal {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}');
    return {
      drafts: Array.isArray(value.drafts) ? value.drafts.filter(validDraft) : [],
      reflections: Array.isArray(value.reflections)
        ? value.reflections.filter(validReflection)
        : [],
    };
  } catch {
    return { drafts: [], reflections: [] };
  }
}
function write(value: Journal) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function journalDraft(draft: LessonDraft): boolean {
  if (!validDraft(draft)) return false;
  const previous = readJournal();
  return write({
    ...previous,
    drafts: [...previous.drafts.filter((d) => d.id !== draft.id), draft],
  });
}
export function journalReflection(reflection: Reflection): boolean {
  if (!validReflection(reflection)) return false;
  const previous = readJournal();
  return write({
    ...previous,
    reflections: [
      ...previous.reflections.filter((r) => r.lessonId !== reflection.lessonId),
      reflection,
    ],
  });
}
export function clearJournalDraft(id: string, through: number) {
  const previous = readJournal();
  write({
    ...previous,
    drafts: previous.drafts.filter((d) => d.id !== id || d.updatedAt > through),
  });
}
export function clearJournalReflection(id: string, through: number) {
  const previous = readJournal();
  write({
    ...previous,
    reflections: previous.reflections.filter((r) => r.lessonId !== id || r.updatedAt > through),
  });
}
