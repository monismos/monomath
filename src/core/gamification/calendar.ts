/** Calendar keys use the learner's local timezone, never a UTC date slice. */
export function localDay(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function dayNumber(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, date) / 86400000);
}
export function weekKey(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, date));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${Math.ceil(((d.getTime() - start.getTime()) / 86400000 + 1) / 7)}`;
}
/** Due dates retain the local wall-clock hour across daylight-saving changes. */
export function addLocalDays(now: number, days: number): number {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return d.getTime();
}
export interface Rhythm {
  streak: number;
  best: number;
  lastDay: string | null;
  freezeWeek: string | null;
  frozenDays: string[];
}
export const emptyRhythm = (): Rhythm => ({
  streak: 0,
  best: 0,
  lastDay: null,
  freezeWeek: null,
  frozenDays: [],
});
export function visitDay(rhythm: Rhythm, now: number): Rhythm {
  const today = localDay(now);
  if (rhythm.lastDay === today) return rhythm;
  const gap = rhythm.lastDay ? dayNumber(today) - dayNumber(rhythm.lastDay) : Infinity;
  if (gap <= 0) return rhythm; // A clock correction cannot manufacture a streak.
  const week = weekKey(today);
  const freeze = gap === 2 && rhythm.freezeWeek !== week;
  const missing = localDay(addLocalDays(now, -1));
  const streak = gap === 1 || freeze ? rhythm.streak + 1 : 1;
  return {
    streak,
    best: Math.max(rhythm.best, streak),
    lastDay: today,
    freezeWeek: freeze ? week : rhythm.freezeWeek,
    frozenDays: freeze ? [...rhythm.frozenDays, missing] : rhythm.frozenDays,
  };
}
