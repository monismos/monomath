import { useEffect } from 'react';
import { useSettings } from '../core/storage/settings';
import { useLesson } from '../core/scene/store';
import { useNotes } from '../core/notelets/store';
import { Icon } from './Icon';
import styles from './Onboarding.module.css';
const prompts = [
  ['Welcome to your bench.', 'Turn the dial. Watch symbols grow from pieces.'],
  [
    'Let the symbols grow.',
    'Move the Unfold Dial to Symbol. The pieces and their notation tell the same story.',
  ],
  ['Follow a connection.', 'Select a piece or an equation token. Its partner lights up.'],
  [
    'Keep a thought here.',
    'Hold anywhere for half a second, or press N. Write a notelet and save it.',
  ],
  [
    'Find your thought again.',
    'Open the notelet orb, or press S. Jump to context brings you back here.',
  ],
  [
    'Make it comfortable.',
    'Sound and haptics are optional. You can change them in Settings any time.',
  ],
];
export function Onboarding() {
  const settings = useSettings();
  const lesson = useLesson();
  const notes = useNotes();
  const step = Math.max(0, Math.min(5, settings.tutorialStep));
  useEffect(() => {
    if (settings.tutorialComplete) return;
    if (
      (step === 1 && lesson.dial >= 1.9) ||
      (step === 2 && lesson.selection) ||
      (step === 3 && notes.notes.length > 0) ||
      (step === 4 && notes.summary)
    )
      settings.set({ tutorialStep: step + 1 });
  }, [step, lesson.dial, lesson.selection, notes.notes.length, notes.summary, settings]);
  if (settings.tutorialComplete) return null;
  return (
    <section className={styles.tour} data-anchor-id="tutorial" aria-label="First workshop tour">
      <span className={styles.eye}>◉</span>
      <div>
        <strong>{prompts[step][0]}</strong>
        <p>{prompts[step][1]}</p>
        {step === 5 && (
          <div className={styles.options}>
            <label>
              <input
                type="checkbox"
                checked={settings.sound}
                onChange={(e) => settings.set({ sound: e.target.checked })}
              />{' '}
              Soft sounds
            </label>
            <label>
              <input
                type="checkbox"
                checked={settings.haptics}
                onChange={(e) => settings.set({ haptics: e.target.checked })}
              />{' '}
              Haptics
            </label>
          </div>
        )}
      </div>
      <div className={styles.actions}>
        <button
          onClick={() =>
            step === 5
              ? settings.set({ tutorialComplete: true })
              : settings.set({ tutorialStep: step + 1 })
          }
        >
          {step === 0 ? 'Take a look' : step === 5 ? 'Start exploring' : 'Next'}
          <Icon name="ArrowUpRight" size={14} />
        </button>
        <button onClick={() => settings.set({ tutorialComplete: true })}>Explore on my own</button>
      </div>
    </section>
  );
}
