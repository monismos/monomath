import type { GuideId } from './config';
const key = 'monomath-guide-bond';
export function getBond(id: GuideId): number {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}')[id];
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}
export function addBondMinute(id: GuideId): number {
  const minutes = getBond(id) + 1;
  try {
    const previous = JSON.parse(localStorage.getItem(key) ?? '{}');
    localStorage.setItem(key, JSON.stringify({ ...previous, [id]: minutes }));
  } catch {
    /* Local storage can be unavailable; learning continues. */
  }
  return minutes;
}
