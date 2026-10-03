import { useMemo, useState } from 'react';
import { useGame } from '../core/gamification/store';
import { useNotes } from '../core/notelets/store';
import { dueItems } from '../core/gamification/srs';
import { useEchoProviders } from '../core/gamification/echoProviders';
import { useLocalNow } from '../core/gamification/useLocalNow';
import type { EchoItem } from '../core/gamification/types';
import { Icon } from './Icon';
import styles from './Progress.module.css';
function Review({
  item,
  onDone,
  onJumpNote,
}: {
  item: EchoItem;
  onDone: () => void;
  onJumpNote?: (id: string) => void;
}) {
  const game = useGame();
  const note = useNotes((s) => s.notes.find((n) => item.kind === 'note' && n.id === item.noteId));
  const getProvider = useEchoProviders();
  const provider = item.kind === 'challenge' ? getProvider(item.skillId) : undefined;
  const challenge = useMemo(
    () => (item.kind === 'challenge' ? provider?.(item.seed) : undefined),
    [item, provider],
  );
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [hint, setHint] = useState(0);
  const rate = (rating: 'again' | 'good') => {
    if (game.rateEcho(item.id, rating)) onDone();
  };
  if (item.kind === 'note')
    return (
      <article className={styles.recall} aria-label="Notelet recall card">
        <span className={styles.eyebrow}>Recall card · box {item.schedule.box + 1}</span>
        <h2>What did this thought help you see?</h2>
        <p className={styles.context}>{item.context}</p>
        {item.thumb ? (
          <img
            className={styles.thumbnail}
            src={item.thumb}
            alt="The scene where you saved this thought"
          />
        ) : (
          <div className={styles.noThumbnail}>
            <Icon name="StickyNote" size={36} />
            <span>Your saved place in the workshop</span>
          </div>
        )}
        <p className={styles.prompt}>{item.preview.split(/\s+/).slice(0, 4).join(' ')}…</p>
        {!revealed ? (
          <>
            <p>Try remembering the idea first. Take all the time you need.</p>
            <button className={styles.primary} onClick={() => setRevealed(true)}>
              Reveal your note
            </button>
          </>
        ) : (
          <>
            <blockquote>
              {note?.text ??
                'This note is no longer on this device. You can remove its Echo below.'}
            </blockquote>
            {note ? (
              <>
                <p>How did your recall feel?</p>
                <div className={styles.actions}>
                  <button onClick={() => rate('again')}>Again · tomorrow</button>
                  <button className={styles.primary} onClick={() => rate('good')}>
                    Good · keep it growing
                  </button>
                </div>
                {onJumpNote && (
                  <button className={styles.textButton} onClick={() => onJumpNote(item.noteId)}>
                    Jump to its context
                    <Icon name="ArrowUpRight" />
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => {
                  game.removeNoteEcho(item.noteId);
                  onDone();
                }}
              >
                Remove this Echo
              </button>
            )}
          </>
        )}
      </article>
    );
  if (!challenge) return <p>This skill’s practice will appear when its lab is ready.</p>;
  return (
    <article className={styles.recall} aria-label="Skill Echo challenge">
      <span className={styles.eyebrow}>Fresh practice · box {item.schedule.box + 1}</span>
      <h2>{challenge.prompt}</h2>
      <p className={styles.context}>{item.labId} · new numbers from your saved skill</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setAttempted(true);
          setCorrect(challenge.check(answer));
        }}
      >
        <label htmlFor="echo-answer">Your prediction</label>
        {challenge.choices ? (
          <select
            id="echo-answer"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          >
            <option value="">Choose a prediction</option>
            {challenge.choices.map((choice) => (
              <option key={choice}>{choice}</option>
            ))}
          </select>
        ) : (
          <input
            id="echo-answer"
            autoComplete="off"
            inputMode="decimal"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
          />
        )}
        <button className={styles.primary} disabled={!answer.trim()} type="submit">
          Check prediction
        </button>
      </form>
      {attempted && (
        <p role="status" className={styles.feedback}>
          {correct
            ? challenge.explanation
            : 'A useful starting point. Try a hint, or come back tomorrow.'}
        </p>
      )}
      {!correct && (
        <>
          <button
            className={styles.textButton}
            disabled={hint === 3}
            onClick={() => setHint((value) => Math.min(3, value + 1))}
          >
            {hint ? 'Show the next hint' : 'A small hint'}
            <Icon name="Lightbulb" />
          </button>
          {hint > 0 && (
            <ol className={styles.hints}>
              {challenge.hints.slice(0, hint).map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ol>
          )}
        </>
      )}
      {attempted && (
        <div className={styles.actions}>
          <button onClick={() => rate('again')}>Again · tomorrow</button>
          {correct && (
            <button className={styles.primary} onClick={() => rate('good')}>
              Good · remembered it
            </button>
          )}
        </div>
      )}
    </article>
  );
}
export default function Echoes({
  onClose,
  onJumpNote,
}: {
  onClose?: () => void;
  onJumpNote?: (id: string) => void;
}) {
  const game = useGame();
  const getProvider = useEchoProviders();
  const now = useLocalNow();
  const allDue = dueItems(game.echoes, now);
  const ready = allDue.filter((item) => item.kind === 'note' || getProvider(item.skillId));
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const active = ready.find((item) => item.id === selected) ?? ready[0];
  const upcoming = game.echoes
    .filter((item) => item.schedule.dueAt > now)
    .sort((a, b) => a.schedule.dueAt - b.schedule.dueAt);
  return (
    <section className={styles.echoes} data-anchor-id="echoes" aria-labelledby="echoes-title">
      <header className={styles.pageHeading}>
        <div>
          <span className={styles.eyebrow}>Let an idea meet you again</span>
          <h1 id="echoes-title">Echoes</h1>
          <p>Small returns help understanding stay. No timer, no penalty.</p>
        </div>
        {onClose && (
          <button className={styles.textButton} onClick={onClose}>
            <Icon name="ArrowLeft" />
            Back to the workshop
          </button>
        )}
      </header>
      {ready.length > 1 && (
        <nav className={styles.queue} aria-label="Due Echoes">
          {ready.map((item, index) => (
            <button
              key={item.id}
              aria-pressed={active?.id === item.id}
              onClick={() => setSelected(item.id)}
            >
              {index + 1} · {item.kind === 'note' ? 'Notelet' : 'Skill'}
            </button>
          ))}
        </nav>
      )}
      {active ? (
        <Review
          key={active.id}
          item={active}
          onJumpNote={onJumpNote}
          onDone={() => {
            setSelected(null);
            setNotice('A small return, safely saved. Your next date is below.');
          }}
        />
      ) : (
        <div className={styles.empty}>
          <Icon name="RotateCcw" size={44} />
          <h2>Room to let things settle</h2>
          <p>
            {game.echoes.length
              ? 'Your next recall is scheduled. Explore at your own pace until then.'
              : 'Star a notelet or choose Make Echo. It will return tomorrow.'}
          </p>
        </div>
      )}
      {allDue.length > ready.length && (
        <p className={styles.kind}>
          {allDue.length - ready.length} saved skill{allDue.length - ready.length === 1 ? '' : 's'}{' '}
          waiting for their lab’s practice provider.
        </p>
      )}
      {!!upcoming.length && (
        <section className={styles.upcoming}>
          <h2>Coming back to you</h2>
          <ul>
            {upcoming.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>
                    {item.kind === 'note'
                      ? item.preview.split(/\s+/).slice(0, 6).join(' ')
                      : item.prompt}
                  </strong>
                  <small>
                    {item.labId} · box {item.schedule.box + 1}
                  </small>
                </span>
                <time dateTime={new Date(item.schedule.dueAt).toISOString()}>
                  {new Date(item.schedule.dueAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p role="status" className={styles.notice}>
        {notice}
      </p>
    </section>
  );
}
