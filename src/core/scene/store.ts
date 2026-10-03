import { create } from 'zustand';
export interface LessonContext {
  step: number;
  dial: number;
  selection: string | null;
  problem: string;
  labId: string;
}
export const useLesson = create<LessonContext & { set: (patch: Partial<LessonContext>) => void }>(
  (set) => ({
    step: 0,
    dial: 0,
    selection: null,
    problem: '3/4',
    labId: 'demo',
    set: (patch) => set(patch),
  }),
);
