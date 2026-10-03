import { useSettings } from '../storage/settings';
let context: AudioContext | undefined;
export function sound(kind: 'pop' | 'success' | 'tick' | 'snap') {
  if (!useSettings.getState().sound) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(
      { pop: 360, success: 660, tick: 920, snap: 240 }[kind],
      context.currentTime,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === 'success' ? 880 : 140,
      context.currentTime + 0.12,
    );
    gain.gain.setValueAtTime(0.035, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.17);
  } catch {
    /* Sound is optional; the visual action always succeeds. */
  }
}
