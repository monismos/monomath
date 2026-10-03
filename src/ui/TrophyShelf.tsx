import { lazy, Suspense, useMemo, useState } from 'react';
import { achievements, cosmeticUnlocked } from '../core/gamification/achievements';
import { useGame } from '../core/gamification/store';
import type { CosmeticId } from '../core/gamification/types';
import { useSettings } from '../core/storage/settings';
import type { Entity, SceneSpec } from '../core/scene/spec';
import { ScenePlayer } from '../core/scene/player';
import { Icon } from './Icon';
import styles from './TrophyShelf.module.css';
const ThreeStage = lazy(() => import('../core/renderers/three/ThreeStage'));
const cosmetics: { id: CosmeticId; name: string; description: string }[] = [
  { id: 'plain', name: 'Original guide', description: 'Always yours' },
  { id: 'sunhat', name: 'Sun hat', description: 'Save your first notelet' },
  { id: 'starcap', name: 'Star cap', description: 'Five unhinted predictions' },
  { id: 'mint', name: 'Mint finish', description: 'Twenty guide moments' },
];
export default function TrophyShelf() {
  const game = useGame();
  const dimension = useSettings((s) => s.dimension);
  const setDimension = (dimension: '2d' | '3d') => useSettings.getState().set({ dimension });
  const [selected, setSelected] = useState(achievements[0].id);
  const [filter, setFilter] = useState<'all' | 'earned' | 'ready'>('all');
  const [reset, setReset] = useState(0);
  const [lost, setLost] = useState(false);
  const earned = achievements.filter((a) => a.earned(game));
  const active = achievements.find((a) => a.id === selected) ?? achievements[0];
  const index = achievements.indexOf(active);
  const spec = useMemo<SceneSpec>(() => {
    const entities: Entity[] = [];
    for (let i = 0; i < 3; i++) {
      const a = achievements[(index + i - 1 + achievements.length) % achievements.length];
      const x = (i - 1) * 2.1;
      const color = a.earned(game) ? 'part' : 'mint';
      entities.push(
        {
          id: `trophy-${a.id}-base`,
          kind: 'block',
          pos: [x, 0.12, 0],
          size: [1.2, 0.24, 1],
          color: 'ink',
          tether: a.id,
          text: { plain: a.title },
        },
        {
          id: `trophy-${a.id}-stem`,
          kind: 'block',
          pos: [x, 0.55, 0],
          size: [0.26, 0.8, 0.26],
          color,
          tether: a.id,
          text: { plain: a.title },
          opacity: a.earned(game) ? 1 : 0.32,
        },
        {
          id: `trophy-${a.id}-gem`,
          kind: i === 1 ? 'sphere' : 'block',
          pos: [x, 1.15, 0],
          size: i === 1 ? [0.48, 0.48, 0.48] : [0.65, 0.65, 0.65],
          rot: i === 1 ? [0, 0, 0] : [0, Math.PI / 4, Math.PI / 4],
          color,
          tether: a.id,
          text: { plain: a.title },
          opacity: a.earned(game) ? 1 : 0.32,
        },
        {
          id: `trophy-${a.id}-label`,
          kind: 'label',
          pos: [x, 0.02, 1.05],
          color: 'paper',
          text: { plain: a.earned(game) ? 'Earned' : 'Locked' },
        },
      );
    }
    return {
      id: 'trophy-shelf',
      entities,
      steps: [
        {
          id: 'shelf',
          title: 'Your earned trophies',
          latexAfter: '',
          say: {
            quick: 'Every trophy records something you did.',
            standard: 'Earned trophies keep a little memory of a real action.',
            deep: 'Locked trophies show their conditions. Learning is always available, whether or not a trophy is earned.',
          },
          ops: [],
          tethers: [],
          aria: 'Three procedural trophies on a shelf, with earned or locked labels.',
        },
      ],
      code: '',
    };
  }, [index, game]);
  const player = useMemo(() => new ScenePlayer(spec, 0, 0, 0), [spec]);
  const filtered = achievements.filter(
    (a) => filter === 'all' || (filter === 'earned' ? a.earned(game) : !a.earned(game)),
  );
  return (
    <section className={styles.shelf} aria-labelledby="shelf-title" data-anchor-id="trophy-shelf">
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Little records of real work</span>
          <h1 id="shelf-title">Trophy Shelf</h1>
          <p>
            {earned.length} of {achievements.length} earned. Every locked trophy tells you its
            condition.
          </p>
        </div>
        <div className={styles.toggle} role="group" aria-label="Trophy view">
          <button aria-pressed={dimension === '2d'} onClick={() => setDimension('2d')}>
            2D tiles
          </button>
          <button
            aria-pressed={dimension === '3d'}
            onClick={() => {
              setDimension('3d');
              setLost(false);
            }}
          >
            3D shelf
          </button>
        </div>
      </header>
      {dimension === '3d' && (
        <div className={styles.stage} data-anchor-id="stage">
          <Suspense fallback={<div className={styles.loading}>Setting out your trophies…</div>}>
            <ThreeStage
              state={player.state}
              player={player}
              selection={selected}
              onSelect={(id) => {
                if (id && achievements.some((a) => a.id === id)) setSelected(id);
              }}
              flat={false}
              reset={reset}
              onLost={() => {
                setLost(true);
                setDimension('2d');
              }}
            />
          </Suspense>
          <button className={styles.reset} onClick={() => setReset((value) => value + 1)}>
            <Icon name="RotateCcw" />
            Reset view
          </button>
          <div className={styles.caption}>
            <strong>{active.title}</strong>
            <span>
              {active.earned(game) ? 'Earned' : 'Locked'} · {active.description}
            </span>
          </div>
        </div>
      )}
      {lost && (
        <p role="status" className={styles.notice}>
          The 3D view took a break. Your trophies are here in 2D.
        </p>
      )}
      <nav className={styles.filters} aria-label="Filter trophies">
        {(['all', 'earned', 'ready'] as const).map((value) => (
          <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {value === 'all' ? 'All trophies' : value === 'earned' ? 'Earned' : 'Next to try'}
          </button>
        ))}
      </nav>
      <div className={styles.tiles}>
        {filtered.map((a) => (
          <button
            key={a.id}
            className={`${styles.tile} ${a.earned(game) ? styles.earned : ''}`}
            aria-pressed={selected === a.id}
            onClick={() => setSelected(a.id)}
          >
            <svg viewBox="0 0 70 76" aria-hidden="true">
              <path d="M19 61h32v8H19zM31 36h8v25h-8z" fill="currentColor" />
              <path d="m35 6 20 15-8 22H23l-8-22z" fill="currentColor" />
              <path
                d="m35 6 0 37M15 21h40"
                fill="none"
                stroke="var(--surface)"
                strokeWidth="2"
                opacity=".4"
              />
            </svg>
            <span className={styles.status}>
              <Icon name={a.earned(game) ? 'Check' : 'LockKeyhole'} size={13} />
              {a.earned(game) ? 'Earned' : 'Locked'}
            </span>
            <strong>{a.title}</strong>
            <span>{a.description}</span>
          </button>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className={styles.empty}>Your first trophy starts with one saved thought.</p>
      )}
      <section className={styles.cosmetics} aria-labelledby="guide-kit">
        <div>
          <span className={styles.eyebrow}>Earn it, then wear it</span>
          <h2 id="guide-kit">Your guide’s little kit</h2>
          <p>Choose an earned item. It appears on your workshop guide.</p>
        </div>
        <div>
          {cosmetics.map((c) => (
            <button
              key={c.id}
              disabled={!cosmeticUnlocked(game, c.id)}
              aria-pressed={game.cosmetics.selected === c.id}
              onClick={() => game.selectCosmetic(c.id)}
            >
              <Icon name={cosmeticUnlocked(game, c.id) ? 'Sparkles' : 'LockKeyhole'} />
              <strong>{c.name}</strong>
              <small>{game.cosmetics.selected === c.id ? 'Wearing this' : c.description}</small>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
