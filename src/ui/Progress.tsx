import { useRef, useState } from 'react';
import { useGame, exportProgress } from '../core/gamification/store';
import { dailyTasks, levelForXP } from '../core/gamification/logic';
import { gameConfig } from '../core/gamification/gameConfig';
import { dueItems } from '../core/gamification/srs';
import { useLocalNow } from '../core/gamification/useLocalNow';
import { isMastered } from '../core/gamification/types';
import { Icon } from './Icon';
import styles from './Progress.module.css';
export default function Progress({
  onEchoes,
  onTrophies,
  onTask,
}: {
  onEchoes?: () => void;
  onTrophies?: () => void;
  onTask?: (target: 'tether' | 'dial' | 'notelet') => void;
}) {
  const game = useGame();
  const now = useLocalNow();
  const level = levelForXP(game.xp);
  const from = gameConfig.levelThreshold(level);
  const next = gameConfig.levelThreshold(level + 1);
  const tasks = dailyTasks(game, now);
  const count = dueItems(game.echoes, now).length;
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const exportData = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(exportProgress(), null, 2)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'monomath-progress.json';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Your progress file is ready. Keep it somewhere you trust.');
  };
  return (
    <section
      className={styles.progress}
      aria-labelledby="progress-title"
      data-anchor-id="learning-progress"
    >
      <div className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>A little, often</span>
          <h2 id="progress-title">Your workshop rhythm</h2>
        </div>
        <span className={styles.level}>Level {level}</span>
      </div>
      <div className={styles.xp}>
        <span>{game.xp} XP</span>
        <span>
          {next - game.xp} to level {level + 1}
        </span>
      </div>
      <progress aria-label={`Level ${level} progress`} value={game.xp - from} max={next - from} />
      <div className={styles.rhythm}>
        <Icon name="Sun" />
        <span>
          {game.rhythm.streak} day{game.rhythm.streak === 1 ? '' : 's'} in your rhythm
        </span>
        <small>One weekly freeze helps with a missed day.</small>
      </div>
      <p className={styles.kind}>You can always start fresh. There are no lives to lose.</p>
      <ul className={styles.tasks}>
        {tasks.map((task) => (
          <li key={task.id}>
            <span
              className={`${styles.taskCheck} ${task.done ? styles.done : ''}`}
              aria-label={task.done ? 'Complete' : 'Ready'}
            >
              <Icon name={task.done ? 'Check' : 'Target'} />
            </span>
            {onTask && !task.done ? (
              <button onClick={() => onTask(task.target as 'tether' | 'dial' | 'notelet')}>
                {task.title}
                <Icon name="ArrowUpRight" />
              </button>
            ) : (
              <span>{task.title}</span>
            )}
          </li>
        ))}
      </ul>
      {!!Object.keys(game.gems).length && (
        <div className={styles.gems} aria-label="Topic facets">
          {Object.entries(game.gems).map(([id, gem]) => (
            <div key={id}>
              <svg
                viewBox="0 0 40 42"
                role="img"
                aria-label={`${id}: Observe ${gem.observe ? 'complete' : 'ready'}, Play ${gem.play ? 'complete' : 'ready'}, Prove ${gem.prove ? 'complete' : 'ready'}${isMastered(gem) ? ', mastered' : ''}`}
              >
                <path
                  d="M20 2 37 12 20 22 3 12Z"
                  fill={gem.observe ? 'var(--accent)' : 'var(--rule)'}
                />
                <path d="M3 12 20 22 20 40 3 30Z" fill={gem.play ? 'var(--mat)' : 'var(--rule)'} />
                <path
                  d="M20 22 37 12 37 30 20 40Z"
                  fill={gem.prove ? 'var(--ink)' : 'var(--rule)'}
                />
              </svg>
              <div>
                <strong>{id === 'demo' ? 'Parts of a whole' : id}</strong>
                <small>
                  {isMastered(gem)
                    ? 'Mastered · recalled on two days'
                    : `${[gem.observe && 'Observe', gem.play && 'Play', gem.prove && 'Prove'].filter(Boolean).join(' · ') || 'Ready to explore'}`}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.actions}>
        {onEchoes && (
          <button onClick={onEchoes}>
            <Icon name="RotateCcw" />
            Echoes {count > 0 && <span className={styles.count}>{count} due</span>}
          </button>
        )}
        {onTrophies && (
          <button onClick={onTrophies}>
            <Icon name="Trophy" />
            Trophy Shelf
          </button>
        )}
      </div>
      <details className={styles.backup}>
        <summary>Keep a copy of your progress</summary>
        <p>
          XP, Echo schedules and earned items stay on this device. Export a file to move them with
          you.
        </p>
        <div className={styles.actions}>
          <button onClick={exportData}>
            <Icon name="Download" />
            Export
          </button>
          <button onClick={() => input.current?.click()}>
            <Icon name="Upload" />
            Import
          </button>
        </div>
        <input
          ref={input}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            try {
              const value: unknown = JSON.parse(await file.text());
              setNotice(
                game.importProgress(value)
                  ? 'Your progress is restored.'
                  : 'That file does not contain valid Monomath progress.',
              );
            } catch {
              setNotice('That file could not be read as a progress backup.');
            }
            event.target.value = '';
          }}
        />
      </details>
      {game.unavailable && (
        <p role="status" className={styles.kind}>
          Storage is unavailable. Progress works for this visit; export to keep it.
        </p>
      )}
      <p role="status" className={styles.notice}>
        {notice}
      </p>
    </section>
  );
}
