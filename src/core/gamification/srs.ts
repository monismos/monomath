import { addLocalDays, localDay } from './calendar';
import { gameConfig } from './gameConfig';
export type EchoRating = 'again' | 'good';
export interface Schedule {
  box: 0 | 1 | 2 | 3;
  dueAt: number;
  reviewedAt: number | null;
  successes: string[];
  reviews: number;
}
export function initialSchedule(now: number): Schedule {
  return {
    box: 0,
    dueAt: addLocalDays(now, gameConfig.echoDays[0]),
    reviewedAt: null,
    successes: [],
    reviews: 0,
  };
}
/** Again returns to one day. Good advances one box, then stays at fourteen days. */
export function scheduleReview(schedule: Schedule, rating: EchoRating, now: number): Schedule {
  const box = rating === 'again' ? 0 : (Math.min(3, schedule.box + 1) as Schedule['box']);
  return {
    box,
    dueAt: addLocalDays(now, gameConfig.echoDays[box]),
    reviewedAt: now,
    successes:
      rating === 'good' ? [...new Set([...schedule.successes, localDay(now)])] : schedule.successes,
    reviews: schedule.reviews + 1,
  };
}
export function dueItems<T extends { id: string; schedule: Schedule }>(
  items: T[],
  now: number,
): T[] {
  return items
    .filter((item) => item.schedule.dueAt <= now)
    .sort((a, b) => a.schedule.dueAt - b.schedule.dueAt || a.id.localeCompare(b.id));
}
