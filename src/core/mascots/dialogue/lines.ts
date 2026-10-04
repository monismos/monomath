import type { Domain } from '../config';
import type { MascotEvent } from '../events';
export type MascotScript = Partial<Record<MascotEvent, [string, string, string]>>;
export const dialogue: Record<MascotEvent, [string, string, string]> = {
  intro: [
    'Let’s find the idea inside the picture.',
    'Small steps make room for big ideas.',
    'Look closely. You can move between ways of seeing.',
  ],
  'step-enter': [
    'Follow my eye to the piece that matters.',
    'This step changes one thing. What moved?',
    'Connect this picture to the words beside it.',
  ],
  'hint-1': [
    'Start with what you already know.',
    'Which part stays the same?',
    'Look for the whole before counting its parts.',
  ],
  'hint-2': [
    'Try a different layer for a fresh clue.',
    'Make the pieces comparable before combining them.',
    'One small change can make the pattern visible.',
  ],
  'hint-3': [
    'Walk through the example, then try again.',
    'Trace one piece all the way to the answer.',
    'Use the picture to explain each operation.',
  ],
  correct: [
    'You found it. Your reasoning matters.',
    'That fits the picture and the symbols.',
    'Nice connection. Keep the idea, not just the answer.',
  ],
  wrong: [
    'Useful experiment. What would you change?',
    'Keep your progress. Try another way to see it.',
    'The picture offers a clue. Take your time.',
  ],
  streak: [
    'Your little visits are adding up.',
    'Another day, another connection.',
    'Steady practice gives ideas time to settle.',
  ],
  'idle-nudge': [
    'Try moving the dial when you’re ready.',
    'A different view might reveal the next connection.',
    'You can hold anywhere to save a thought.',
  ],
  'first-hold': [
    'A notelet keeps this thought beside its picture.',
    'Your question has a home here.',
    'Save the connection in your own words.',
  ],
  'hold-reminder': [
    'Hold anywhere to leave a thought beside this picture.',
    'A question can stay here. Hold to make a notelet.',
    'Press N to keep a thought at your focused control.',
  ],
  'level-up': [
    'Your workshop is growing with your understanding.',
    'Another milestone, built one connection at a time.',
    'You earned a new view of your progress.',
  ],
};
export const tips = [
  'Move the dial to see the same idea differently.',
  'Tap a symbol, then find its piece in the picture.',
  'Hold anywhere to keep a question beside its context.',
];
export const facts: Record<Domain, [string, string, string]> = {
  math: [
    'Different cuts can describe the same amount.',
    'A fraction can be a number and an operation.',
    'Zero has no size, but changes our number system.',
  ],
  logic: [
    'One counterexample can disprove a universal claim.',
    'A true conclusion does not guarantee a valid argument.',
    'De Morgan’s laws connect logic with set pictures.',
  ],
  stats: [
    'The mean is a balance point.',
    'Variance uses squares so opposite deviations cannot cancel.',
    'A larger sample reduces noise, not every bias.',
  ],
  physics: [
    'Velocity tells you speed and direction.',
    'Energy can change forms while its total stays constant.',
    'Acceleration measures a change in velocity.',
  ],
  code: [
    'An algorithm is a repeatable recipe.',
    'A loop makes repetition explicit.',
    'Testing a boundary often reveals an unexpected assumption.',
  ],
};
export const dialogueCooldown = 8000;
export class DialogueQueue {
  private last = -Infinity;
  private counts: Partial<Record<MascotEvent, number>> = {};
  claim(now: number): boolean {
    if (now - this.last < dialogueCooldown) return false;
    this.last = now;
    return true;
  }
  next(event: MascotEvent, now: number, lines?: [string, string, string]): string | null {
    if (!this.claim(now)) return null;
    const index = this.counts[event] ?? 0;
    this.counts[event] = index + 1;
    return (lines ?? dialogue[event])[index % 3];
  }
}
