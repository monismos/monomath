export type MascotEvent =
  | 'intro'
  | 'step-enter'
  | 'hint-1'
  | 'hint-2'
  | 'hint-3'
  | 'correct'
  | 'wrong'
  | 'streak'
  | 'idle-nudge'
  | 'first-hold'
  | 'hold-reminder'
  | 'level-up';
const listeners = new Set<(event: MascotEvent) => void>();
export function emitMascot(event: MascotEvent) {
  listeners.forEach((listener) => listener(event));
}
export function subscribeMascot(listener: (event: MascotEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
