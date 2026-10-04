import { useState } from 'react';
import type { Predict } from '../core/scene/spec';
import { Icon } from './Icon';
import styles from './PredictCard.module.css';
export function PredictCard({
  predict,
  onCommit,
  onMiss,
}: {
  predict: Predict;
  onCommit: (correct: boolean, hinted: boolean) => void;
  onMiss: () => void;
}) {
  const [answer, setAnswer] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [hint, setHint] = useState(0);
  const check = () => {
    const numeric = /^[-+]?\d+(?:\.\d+)?$/.test(answer.trim());
    const correct = predict.check(predict.kind === 'number' && numeric ? Number(answer) : answer);
    setAttempted(true);
    if (correct) onCommit(true, hint > 0);
    else onMiss();
  };
  return (
    <section
      className={styles.predict}
      aria-label="Predict before the reveal"
      data-anchor-id="predict"
    >
      <div>
        <Icon name="Lightbulb" size={16} />
        <strong>Before we reveal it…</strong>
      </div>
      <p>{predict.prompt}</p>
      {predict.options ? (
        <div className={styles.options}>
          {predict.options.map((option) => (
            <button key={option} aria-pressed={answer === option} onClick={() => setAnswer(option)}>
              {option}
            </button>
          ))}
        </div>
      ) : (
        <label>
          Your guess
          <input
            aria-label="Prediction answer"
            value={answer}
            inputMode={predict.kind === 'number' ? 'decimal' : 'text'}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && answer) check();
            }}
          />
        </label>
      )}
      {attempted && <p role="status">A useful guess. Try a hint and look at the pieces.</p>}
      {hint > 0 && <p className={styles.hint}>{predict.hints[hint - 1]}</p>}
      <div className={styles.actions}>
        <button disabled={!answer.trim()} onClick={check}>
          Check my guess
          <Icon name="Check" size={14} />
        </button>
        <button onClick={() => hint === 3 ? onCommit(false,true) : setHint(hint + 1)}>
          {hint < 3 ? 'A little hint' : 'Reveal and learn'}
        </button>
      </div>
    </section>
  );
}
