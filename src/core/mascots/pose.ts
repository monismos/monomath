import type { MascotEvent } from './events';
export type Expression =
  | 'idle'
  | 'follow'
  | 'cue'
  | 'celebrate'
  | 'encourage'
  | 'puzzled'
  | 'sleepy'
  | 'curious'
  | 'speaking';
export interface GuidePose {
  lookX: number;
  lookY: number;
  blink: number;
  breathe: number;
  expression: Expression;
}
export const neutralPose = (): GuidePose => ({
  lookX: 0,
  lookY: 0,
  blink: 1,
  breathe: 0,
  expression: 'idle',
});
export function targetLook(origin: { x: number; y: number }, target: { x: number; y: number }) {
  return {
    x: Math.max(-1, Math.min(1, (target.x - origin.x) / 320)),
    y: Math.max(-1, Math.min(1, (target.y - origin.y) / 280)),
  };
}
export function eventExpression(event: MascotEvent): Expression {
  if (event === 'correct' || event === 'level-up' || event === 'streak') return 'celebrate';
  if (event === 'wrong') return 'encourage';
  if (event === 'hint-1') return 'puzzled';
  if (event.startsWith('hint')) return 'curious';
  if (event === 'idle-nudge') return 'sleepy';
  if (event === 'step-enter') return 'cue';
  return 'speaking';
}
export function blinkAt(time: number): number {
  const phase = time % 5300;
  return phase < 140 ? Math.max(0.07, Math.abs(phase - 70) / 70) : 1;
}
