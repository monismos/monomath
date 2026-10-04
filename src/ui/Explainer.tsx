import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useRef } from 'react';
import type { SceneSpec } from '../core/scene/spec';
import { ScenePlayer } from '../core/scene/player';
import { useLesson } from '../core/scene/store';
import { useSettings } from '../core/storage/settings';
import { detectQuality, probeFPS } from '../core/perf/quality';
import SvgStage from '../core/renderers/svg/SvgStage';
import { Tethers } from './Tethers';
import { Icon } from './Icon';
import { PredictCard } from './PredictCard';
import { useGame } from '../core/gamification/store';
import { Mascot } from './Mascot';
import { emitMascot } from '../core/mascots/events';
import type { MascotScript } from '../core/mascots/dialogue/lines';
import { sound } from '../core/audio/sounds';
import appStyles from '../App.module.css';
import playerStyles from './Player.module.css';
const styles = { ...appStyles, ...playerStyles };
const ThreeStage = lazy(() => import('../core/renderers/three/ThreeStage'));
const MathText = lazy(() => import('./MathText'));
const CodeSnippet = lazy(() => import('./CodeSnippet'));
export function Explainer({
  spec,
  children,
  onActivate,
  echoSkillId = 'demo-fraction',
  caption = 'One whole. Equal parts.',
  onMethod,
  domain = 'math',
  mascotScript,
}: {
  spec: SceneSpec;
  children?: React.ReactNode;
  onActivate?: (id: string) => void;
  echoSkillId?: string;
  caption?: string;
  onMethod?: () => void;
  domain?: 'math' | 'logic' | 'stats' | 'physics' | 'code';
  mascotScript?: MascotScript;
}) {
  const { step, dial, selection, set } = useLesson();
  const settings = useSettings();
  const [replay, setReplay] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [why, setWhy] = useState(false);
  const [sheet, setSheet] = useState(0);
  const [reset, setReset] = useState(0);
  const [fps, setFPS] = useState<number>();
  const [flatten, setFlatten] = useState(false);
  const [lost, setLost] = useState(false);
  const [committed, setCommitted] = useState<Record<string, boolean>>({});
  const currentIndex = Math.min(step, spec.steps.length - 1);
  const current = spec.steps[currentIndex];
  const checkpointKey = `${spec.id}:${current.id}`;
  const revealed = useGame((game) => game.events[`checkpoint:${checkpointKey}`]);
  const blocked = !!current.predict && !committed[checkpointKey] && !revealed;
  const viewedSteps = useRef(new Map<string, Set<number>>());
  const recordLayer = (value: number) => {
    set({ dial: value });
    const labId = useLesson.getState().labId;
    const game = useGame.getState();
    game.record(
      'dial',
      `${labId}:${['thing', 'shape', 'symbol', 'code'][Math.round(value)]}`,
      labId,
    );
    const used = new Set(
      Object.values(useGame.getState().events)
        .filter((e) => e.kind === 'dial' && e.labId === labId)
        .map((e) => e.key),
    );
    if (used.size >= 4) useGame.getState().award('play', `${labId}:all-layers`, labId);
  };
  const player = useMemo(
    () =>
      new ScenePlayer(
        spec,
        blocked ? Math.max(0, currentIndex - 1) : currentIndex,
        dial,
        settings.reducedMotion ? 0 : 450 / settings.speed,
      ),
    [spec, currentIndex, dial, settings.reducedMotion, settings.speed, blocked],
  );
  const state = player.state;
  useEffect(() => {
    emitMascot('step-enter');
  }, [checkpointKey]);
  useEffect(() => {
    if (blocked) return;
    const timer = setTimeout(() => {
      const viewed = viewedSteps.current.get(spec.id) ?? new Set<number>();
      viewed.add(currentIndex);
      viewedSteps.current.set(spec.id, viewed);
      if (viewed.size === spec.steps.length)
        useGame.getState().award('watch', `${spec.id}:watch`, useLesson.getState().labId);
    }, 1800);
    return () => clearTimeout(timer);
  }, [blocked, currentIndex, spec]);
  useEffect(() => {
    const action = (event: Event) => {
      const action = (event as CustomEvent<{ action: string }>).detail.action;
      if (action === 'why' || action === 'hint') setWhy(true);
      if (action === 'formula') useLesson.getState().set({ dial: 2 });
    };
    window.addEventListener('monomath:guide-action', action);
    return () => window.removeEventListener('monomath:guide-action', action);
  }, []);
  useEffect(() => {
    player.start();
    return () => player.stop();
  }, [player, replay]);
  const changeStep = useCallback(
    (value: number) => {
      set({ step: Math.max(0, Math.min(spec.steps.length - 1, value)) });
      setWhy(false);
    },
    [set, spec.steps.length],
  );
  const select = useCallback((id: string | null) => set({ selection: id }), [set]);
  const tetherTap = () => {
    if (useLesson.getState().selection)
      useGame.getState().record('tether', crypto.randomUUID(), useLesson.getState().labId);
  };
  const onLost = useCallback(() => {
    useSettings.getState().set({ dimension: '2d' });
    setLost(true);
  }, []);
  useEffect(() => {
    if (detectQuality() === '2d-only') useSettings.getState().set({ dimension: '2d' });
    let alive = true;
    probeFPS().then((value) => {
      if (alive) setFPS(value);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!playing || blocked) return;
    const timer = window.setInterval(() => {
      const next = useLesson.getState().step + 1;
      if (next >= spec.steps.length) {
        setPlaying(false);
        return;
      }
      changeStep(next);
    }, 4000 / settings.speed);
    return () => clearInterval(timer);
  }, [playing, blocked, spec.steps.length, settings.speed, changeStep]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return;
      if (
        (event.target as HTMLElement).closest(
          'input,textarea,select,button,a,[role=button],[contenteditable]',
        )
      )
        return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        changeStep(step + 1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        changeStep(step - 1);
      }
      if (event.code === 'Space') {
        event.preventDefault();
        setPlaying((value) => !value);
      }
      if (event.key.toLowerCase() === 'd')
        settings.set({ dimension: settings.dimension === '2d' ? '3d' : '2d' });
      if (event.key.toLowerCase() === 'u') document.getElementById('unfold-dial')?.focus();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [step, changeStep, settings]);
  const toggleDimension = (dimension: '2d' | '3d') => {
    if (dimension === settings.dimension) return;
    setFlatten(true);
    setTimeout(
      () => {
        settings.set({ dimension });
        useGame.getState().record('dimension', crypto.randomUUID(), useLesson.getState().labId);
        setFlatten(false);
      },
      settings.reducedMotion ? 0 : 300,
    );
  };

  return (
    <>
      <div className={styles.playerHeading}>
        <div className={styles.lessonTabs}>
          <span className={styles.selectedTab}>
            <Icon name="Layers" size={15} /> Explore the idea
          </span>
          <span className={styles.lessonType}>A hands-on lesson</span>
        </div>
        <div className={styles.dimension} aria-label="Scene dimension">
          <button onClick={() => toggleDimension('2d')} aria-pressed={settings.dimension === '2d'}>
            2D
          </button>
          <button
            aria-label="3D"
            onClick={() => toggleDimension('3d')}
            aria-pressed={settings.dimension === '3d'}
          >
            3D <span>✧</span>
          </button>
        </div>
      </div>
      <div className={styles.player} data-anchor-id="player">
        <div className={styles.sceneColumn}>
          <div
            className={`${styles.stage} ${flatten ? styles.flattening : ''}`}
            data-anchor-id="stage"
            data-step={step}
            data-dial={dial}
            onClick={tetherTap}
          >
            <div className={styles.stageTop}>
              <span>
                <i /> Your workbench
              </span>
              <div className={styles.stageTools}>
                <button aria-label="Reset view" onClick={() => setReset((v) => v + 1)}>
                  <Icon name="RotateCcw" size={16} />
                </button>
                <button aria-label="Flatten scene" onClick={() => toggleDimension('2d')}>
                  <Icon name="Expand" size={16} />
                </button>
              </div>
            </div>
            <div className={styles.stageSurface}>
              {settings.dimension === '3d' ? (
                <Suspense
                  fallback={
                    <SvgStage
                      player={player}
                      state={state}
                      selection={selection}
                      onSelect={select}
                      onActivate={onActivate}
                    />
                  }
                >
                  <ThreeStage
                    player={player}
                    state={state}
                    selection={selection}
                    onSelect={select}
                    onActivate={onActivate}
                    flat={flatten}
                    reset={reset}
                    onLost={onLost}
                  />
                </Suspense>
              ) : (
                <SvgStage
                  player={player}
                  state={state}
                  selection={selection}
                  onSelect={select}
                  onActivate={onActivate}
                />
              )}
            </div>
            {dial < 2.5 && (
              <div className={styles.sceneCaption}>
                <span className={styles.sceneSmallLabel}>{caption}</span>
                <Suspense fallback={<span>{current.latexAfter}</span>}>
                  <MathText
                    tex={spec.steps[state.stepIndex].latexAfter}
                    selection={selection}
                    onSelect={select}
                  />
                </Suspense>
                <span className={styles.captionHelp}>
                  {selection ? 'Same colour. Same idea.' : 'Tap a piece. Follow its symbol.'}
                </span>
              </div>
            )}
            {dial > 2.3 && !blocked && (
              <pre className={styles.codeOverlay}>
                <span>{spec.codeLanguage ?? 'Python'}</span>
                <Suspense fallback={<code>{spec.code}</code>}>
                  <CodeSnippet
                    code={spec.code}
                    selection={selection}
                    onSelect={select}
                    bindings={spec.codeBindings}
                  />
                </Suspense>
              </pre>
            )}
            <Tethers selection={selection} player={player} />
            <Mascot gaze={spec.steps[state.stepIndex].gaze} domain={domain} script={mascotScript} />
            {children}
            <div className={styles.stageHint}>
              <Icon name="Lightbulb" size={13} />
              {settings.dimension === '3d'
                ? 'Drag to look around · scroll to zoom'
                : 'Tap a piece to connect it to the notation'}
            </div>
            <div className="sr-only">
              {Object.values(state.entities).map((entity) => (
                <button
                  key={entity.id}
                  onClick={() =>
                    onActivate ? onActivate(entity.id) : select(entity.tether ?? entity.id)
                  }
                >
                  {entity.text?.plain ?? `${entity.color} ${entity.kind}`}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.unfoldPanel} data-anchor-id="unfold">
            <div className={styles.unfoldLabel}>
              <Icon name="Layers" size={16} />
              <strong>Unfold the idea</strong>
              <span>From something real to something written</span>
            </div>
            <div className={styles.dialLabels}>
              {['Thing', 'Shape', 'Symbol', 'Code'].map((label, i) => (
                <button
                  aria-label={label}
                  key={label}
                  className={Math.round(dial) === i ? styles.activeLayer : ''}
                  onClick={() => {
                    recordLayer(i);
                    sound('tick');
                  }}
                >
                  {i === 0 ? (
                    <Icon name="Grid2X2" size={15} />
                  ) : i === 1 ? (
                    <Icon name="Layers" size={15} />
                  ) : i === 2 ? (
                    <span>𝑥</span>
                  ) : (
                    <Icon name="Code2" size={15} />
                  )}{' '}
                  {label}
                </button>
              ))}
            </div>
            <input
              id="unfold-dial"
              aria-label="Unfold Dial"
              type="range"
              min="0"
              max="3"
              step="0.01"
              value={dial}
              onChange={(e) => recordLayer(Number(e.target.value))}
            />
          </div>
          <div className={styles.transport} data-anchor-id="transport">
            <button
              className={styles.iconButton}
              aria-label="Previous step"
              disabled={step === 0}
              onClick={() => changeStep(step - 1)}
            >
              <Icon name="ChevronLeft" />
            </button>
            <button
              className={styles.playButton}
              aria-label={playing ? 'Pause lesson' : 'Play lesson'}
              onClick={() => setPlaying(!playing)}
            >
              <Icon name={playing ? 'Pause' : 'Play'} size={16} />
            </button>
            <button
              className={styles.iconButton}
              aria-label="Next step"
              disabled={step >= spec.steps.length - 1 || blocked}
              onClick={() => changeStep(step + 1)}
            >
              <Icon name="ChevronRight" />
            </button>
            <input
              aria-label="Seek step"
              type="range"
              min="0"
              max={spec.steps.length - 1}
              step="1"
              value={step}
              onChange={(e) => changeStep(Number(e.target.value))}
            />
            <span>
              {step + 1} / {spec.steps.length}
            </span>
            <button
              className={styles.speedButton}
              aria-label="Change playback speed"
              onClick={() =>
                settings.set({ speed: settings.speed === 1 ? 2 : settings.speed === 2 ? 0.5 : 1 })
              }
            >
              {settings.speed}×
            </button>
          </div>
        </div>
        <aside
          className={`${styles.stepPanel} ${styles[`sheet${sheet}`]}`}
          data-anchor-id="steps"
          aria-label="Worked solution"
        >
          <button
            className={styles.sheetHandle}
            aria-label="Change step sheet height"
            onClick={() => setSheet((sheet + 1) % 3)}
          >
            <span />
            <Icon name="ChevronDown" size={16} />
          </button>
          <div className={styles.stepPanelHeader}>
            <div>
              <Icon name="BookOpen" size={17} />
              <h2>A little at a time</h2>
            </div>
            <span>{spec.steps.length} steps to understanding</span>
          </div>
          <div className={styles.depthTabs}>
            {(['quick', 'standard', 'deep'] as const).map((value) => (
              <button key={value} aria-pressed={depth === value} onClick={() => setDepth(value)}>
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
          <div className={styles.steps}>
            {spec.steps.map((item, i) => (
              <article
                key={item.id}
                className={`${styles.stepCard} ${i === step ? styles.currentStep : ''}`}
                data-anchor-id={`step-${item.id}`}
              >
                <button
                  className={styles.stepSelect}
                  onClick={() => changeStep(i)}
                  aria-expanded={i === step}
                >
                  <span className={styles.stepNumber}>
                    {i < step ? <Icon name="Check" size={13} /> : i + 1}
                  </span>
                  <span>{item.title}</span>
                  <Icon name="ChevronDown" size={14} />
                </button>
                {i === step && (
                  <div className={styles.stepContent}>
                    {blocked && current.predict && (
                      <PredictCard
                        key={checkpointKey}
                        predict={current.predict}
                        onCommit={(correct, hinted) => {
                          setCommitted((old) => ({ ...old, [checkpointKey]: true }));
                          useGame
                            .getState()
                            .record('checkpoint', checkpointKey, useLesson.getState().labId);
                          if (correct) {
                            useGame
                              .getState()
                              .award('predict', checkpointKey, useLesson.getState().labId, hinted);
                            emitMascot('correct');
                            sound('success');
                          } else emitMascot('wrong');
                        }}
                        onMiss={() => {
                          emitMascot('wrong');
                          useGame.getState().queueChallengeEcho({
                            skillId: echoSkillId,
                            key: checkpointKey,
                            labId: useLesson.getState().labId,
                            seed: Date.now() % 100000,
                            prompt: 'Return to this idea with a fresh problem.',
                          });
                        }}
                      />
                    )}
                    {!blocked && (
                      <>
                        <div className={styles.stepMath} onClick={tetherTap}>
                          <Suspense fallback={item.latexAfter}>
                            <MathText
                              tex={item.latexAfter}
                              selection={selection}
                              onSelect={select}
                            />
                          </Suspense>
                        </div>
                        <p>{item.say[depth]}</p>
                        <div className={styles.stepChipRow}>
                          <button onClick={() => setWhy(!why)}>
                            <Icon name="Lightbulb" size={13} /> Why?
                          </button>
                          {onMethod && <button onClick={onMethod}>Show another method</button>}
                          <button
                            onClick={() => {
                              changeStep(i);
                              setReplay((v) => v + 1);
                            }}
                          >
                            <Icon name="RotateCcw" size={12} /> Replay
                          </button>
                        </div>
                        {why && <p className={styles.whyCard}>{item.say.deep}</p>}
                      </>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
          <div className={styles.notebookFoot}>
            <Icon name="Sparkles" size={15} />
            <p>
              Understanding takes a few turns.
              <br />
              There’s no rush.
            </p>
          </div>
        </aside>
      </div>
      <div className={styles.benchFoot}>
        <span>
          <Icon name="StickyNote" size={14} /> Your next thought has a place here.
        </span>
        <span>
          {fps ? `${fps} fps · ` : ''}
          {settings.dimension.toUpperCase()} workbench
        </span>
      </div>
      {lost && (
        <div className={styles.errorBanner}>
          Your 3D view paused. Your lesson is safe in 2D.{' '}
          <button
            onClick={() => {
              settings.set({ dimension: '3d' });
              setLost(false);
            }}
          >
            Try 3D again
          </button>
        </div>
      )}
      <div className="sr-only" aria-live="polite">
        {current.aria}
      </div>
    </>
  );
}
