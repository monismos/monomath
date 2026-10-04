import { Component, Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { useSettings } from '../core/storage/settings';
import { useLesson } from '../core/scene/store';
import { useGame } from '../core/gamification/store';
import type { CosmeticId } from '../core/gamification/types';
import { projectedEntities } from '../core/renderers/anchors';
import { resolveGuide } from '../core/mascots/config';
import type { Domain, MascotConfig } from '../core/mascots/config';
import { subscribeMascot } from '../core/mascots/events';
import type { MascotEvent } from '../core/mascots/events';
import { DialogueQueue, facts, tips } from '../core/mascots/dialogue/lines';
import type { MascotScript } from '../core/mascots/dialogue/lines';
import { blinkAt, eventExpression, neutralPose, targetLook } from '../core/mascots/pose';
import type { GuidePose } from '../core/mascots/pose';
import { addBondMinute, getBond } from '../core/mascots/bond';
import { Icon } from './Icon';
import styles from './Mascot.module.css';
const MascotThree = lazy(() => import('./MascotThree'));
type Action = 'hint' | 'why' | 'another' | 'formula' | 'mute';
class RigBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Mascot({
  gaze = [],
  domain = 'math',
  script,
}: {
  gaze?: string[];
  domain?: Domain;
  script?: MascotScript;
}) {
  const mode = useSettings((state) => state.mascot);
  const config = resolveGuide(mode, domain);
  return config ? (
    <ActiveMascot
      key={config.id}
      config={config}
      gaze={gaze}
      domain={domain}
      quiet={mode === 'quiet'}
      script={script}
    />
  ) : null;
}

function ActiveMascot({
  config,
  gaze,
  domain,
  quiet,
  script,
}: {
  config: MascotConfig;
  gaze: string[];
  domain: Domain;
  quiet: boolean;
  script?: MascotScript;
}) {
  const settings = useSettings();
  const cosmetic = useGame((state) => state.cosmetics.selected);
  const skin = cosmetic === 'mint' ? { ...config, color: '#B5DED0', accent: '#2E6559' } : config;
  const step = useLesson((state) => state.step);
  const dial = useLesson((state) => state.dial);
  const pose = useRef<GuidePose>(neutralPose());
  const rig = useRef<HTMLDivElement>(null);
  const spotlight = useRef<SVGCircleElement>(null);
  const eye = useRef<SVGGElement>(null);
  const pupil = useRef<SVGGElement>(null);
  const invalidate = useRef<(() => void) | null>(null);
  const pointer = useRef({ x: 0, y: 0, time: -Infinity });
  const cueUntil = useRef(0);
  const reaction = useRef<{ until: number; expression: GuidePose['expression'] }>({
    until: 0,
    expression: 'idle',
  });
  const gazeRef = useRef(gaze);
  gazeRef.current = gaze;
  const scriptRef = useRef(script);
  scriptRef.current = script;
  const gazeKey = gaze.join('|');
  const queue = useRef(new DialogueQueue());
  const [bubble, setBubble] = useState('');
  const [expression, setExpression] = useState<GuidePose['expression']>('idle');
  const [menu, setMenu] = useState(false);
  const [top, setTop] = useState<number | null>(null);
  const [bond, setBond] = useState(() => getBond(config.id));
  const [visible, setVisible] = useState(!document.hidden);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const tipIndex = useRef(0);
  const factIndex = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>();
  const drag = useRef<{ x: number; y: number; top: number; moved: boolean } | null>(null);
  const suppressTap = useRef(false);

  const speak = useCallback((event: MascotEvent) => {
    if (!visibleRef.current) return;
    const line = queue.current.next(event, Date.now(), scriptRef.current?.[event]);
    if (!line) return;
    setBubble(line);
    const next = eventExpression(event);
    setExpression(next);
    pose.current.expression = next;
    reaction.current = { until: performance.now() + 2500, expression: next };
  }, []);
  useEffect(() => subscribeMascot(speak), [speak]);
  useEffect(() => {
    speak('intro');
  }, [speak]);
  useEffect(() => {
    cueUntil.current = performance.now() + 4500;
    pose.current.expression = 'cue';
    setExpression('cue');
    speak('step-enter');
  }, [step, dial, gazeKey, settings.dimension, speak]);
  useEffect(() => {
    if (!bubble) return;
    const timer = setTimeout(() => {
      setBubble('');
      setExpression('idle');
      pose.current.expression = 'idle';
    }, 6500);
    return () => clearTimeout(timer);
  }, [bubble]);
  useEffect(() => {
    const moved = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY, time: performance.now() };
    };
    const hidden = () => setVisible(!document.hidden);
    window.addEventListener('pointermove', moved, { passive: true });
    document.addEventListener('visibilitychange', hidden);
    const element = rig.current;
    const observer =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([entry]) =>
            setVisible(entry.isIntersecting && !document.hidden),
          )
        : null;
    if (element) observer?.observe(element);
    return () => {
      window.removeEventListener('pointermove', moved);
      document.removeEventListener('visibilitychange', hidden);
      observer?.disconnect();
    };
  }, []);
  useEffect(() => {
    if (!visible) return;
    const timer = setInterval(() => {
      if (document.hidden || !visibleRef.current) return;
      const minutes = addBondMinute(config.id);
      setBond(minutes);
      window.dispatchEvent(
        new CustomEvent('monomath:bond', {
          detail: { guide: config.id, minutes: 1, totalMinutes: minutes },
        }),
      );
    }, 60000);
    return () => clearInterval(timer);
  }, [config.id, visible]);
  useEffect(() => {
    if (!visible || quiet) return;
    const timer = setTimeout(() => {
      if (performance.now() - pointer.current.time > 30000) speak('idle-nudge');
    }, 90000);
    return () => clearTimeout(timer);
  }, [visible, quiet, step, dial, speak]);
  useEffect(() => () => clearTimeout(clickTimer.current), []);

  useEffect(() => {
    if (!visible) return;
    let frame = 0;
    let last = 0;
    const update = (now: number) => {
      // A modest 20 Hz cue loop keeps the tiny demand-driven rig inexpensive.
      if (now - last >= 50) {
        last = now;
        const bounds = rig.current?.getBoundingClientRect();
        const target = gazeRef.current.map((id) => projectedEntities.get(id)).find(Boolean);
        const useCue =
          !!target && (quiet || now < cueUntil.current || now - pointer.current.time > 1800);
        const lookAt = useCue ? target : pointer.current.time > 0 ? pointer.current : undefined;
        if (bounds && lookAt) {
          const look = targetLook(
            { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 },
            lookAt,
          );
          pose.current.lookX = look.x;
          pose.current.lookY = look.y;
        } else if (!settings.reducedMotion && !quiet) {
          pose.current.lookX = Math.sin(now / 7000) * 0.2;
          pose.current.lookY = Math.cos(now / 8500) * 0.12;
        }
        pose.current.expression =
          now < reaction.current.until
            ? reaction.current.expression
            : useCue
              ? 'cue'
              : now - pointer.current.time < 1800
                ? 'follow'
                : 'idle';
        if (rig.current) rig.current.dataset.expression = pose.current.expression;
        pose.current.blink = settings.reducedMotion
          ? 1
          : blinkAt(now) * (pose.current.expression === 'sleepy' ? 0.65 : 1);
        pose.current.breathe = settings.reducedMotion ? 0 : Math.sin(now / 1800) * 0.025;
        if (!quiet) {
          eye.current?.setAttribute(
            'transform',
            `translate(60 56) scale(1 ${pose.current.blink}) translate(-60 -56)`,
          );
          pupil.current?.setAttribute(
            'transform',
            `translate(${pose.current.lookX * 7} ${pose.current.lookY * 6})`,
          );
          if (rig.current) rig.current.style.setProperty('--breathe', String(pose.current.breathe));
          invalidate.current?.();
        }
        if (spotlight.current) {
          spotlight.current.setAttribute('opacity', useCue ? '0.75' : '0');
          if (target) {
            spotlight.current.setAttribute('cx', String(target.x));
            spotlight.current.setAttribute('cy', String(target.y));
          }
        }
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [visible, quiet, settings.reducedMotion]);

  const action = (value: Action) => {
    setMenu(false);
    if (value === 'mute') settings.set({ mascot: 'quiet' });
    if (value === 'another')
      useLesson.getState().set({ dial: (Math.floor(useLesson.getState().dial) + 1) % 4 });
    window.dispatchEvent(new CustomEvent('monomath:guide-action', { detail: { action: value } }));
  };
  const tap = () => {
    if (suppressTap.current) {
      suppressTap.current = false;
      return;
    }
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = undefined;
      if (queue.current.claim(Date.now())) {
        setBubble(facts[domain][factIndex.current++ % 3]);
        setExpression('curious');
        pose.current.expression = 'curious';
        reaction.current = { until: performance.now() + 2500, expression: 'curious' };
      }
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = undefined;
      const index = tipIndex.current++;
      if (index % 4 === 3) action('another');
      else if (queue.current.claim(Date.now())) {
        setBubble(tips[index % 3]);
        setExpression('speaking');
        pose.current.expression = 'speaking';
        reaction.current = { until: performance.now() + 2500, expression: 'speaking' };
      }
    }, 270);
  };
  const svg = (
    <GuideSvg config={skin} eye={eye} pupil={pupil} hat={cosmetic} expression={expression} />
  );
  const guideLabel = quiet
    ? `${config.name}, quiet guide`
    : `${config.name}, one-eyed ${domain} guide`;
  return (
    <>
      <svg className={styles.spotlight} aria-hidden="true">
        <circle
          ref={spotlight}
          r="36"
          fill="#FFE066"
          fillOpacity="0.08"
          stroke="#FFE066"
          strokeWidth="2"
          strokeDasharray="3 5"
          opacity="0"
        />
      </svg>
      <aside
        ref={rig}
        className={`${styles.dock} ${styles[settings.dock]} ${quiet ? styles.quiet : ''}`}
        style={top === null ? undefined : ({ top, bottom: 'auto' } as CSSProperties)}
        aria-label={`${config.name} guide`}
        data-anchor-id="one-eyed-guide"
        data-expression={expression}
        data-guide-cosmetic={cosmetic}
      >
        {!quiet && bubble && (
          <div className={styles.bubble} role="status" aria-live="polite">
            {bubble}
          </div>
        )}
        <button
          className={styles.rig}
          aria-label={`${guideLabel}. Tap for a tip; double tap for a fact. Alt arrows move the dock.`}
          onClick={tap}
          onPointerDown={(event) => {
            if (!event.isPrimary || event.button !== 0) return;
            const bounds = rig.current!.getBoundingClientRect();
            drag.current = { x: event.clientX, y: event.clientY, top: bounds.top, moved: false };
            event.currentTarget.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start) return;
            if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12)
              start.moved = true;
            if (start.moved) {
              setTop(
                Math.max(
                  90,
                  Math.min(window.innerHeight - 170, start.top + event.clientY - start.y),
                ),
              );
              suppressTap.current = true;
            }
          }}
          onPointerUp={(event) => {
            if (drag.current?.moved)
              settings.set({ dock: event.clientX < window.innerWidth / 2 ? 'left' : 'right' });
            drag.current = null;
          }}
          onPointerCancel={() => {
            drag.current = null;
          }}
          onKeyDown={(event) => {
            if (!event.altKey || !event.key.startsWith('Arrow')) return;
            event.preventDefault();
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
              settings.set({ dock: event.key === 'ArrowLeft' ? 'left' : 'right' });
            else
              setTop(
                Math.max(
                  90,
                  Math.min(
                    window.innerHeight - 170,
                    (top ?? rig.current!.getBoundingClientRect().top) +
                      (event.key === 'ArrowUp' ? -24 : 24),
                  ),
                ),
              );
          }}
        >
          {quiet ? (
            <Icon name="Eye" size={24} />
          ) : settings.dimension === '2d' ? (
            svg
          ) : (
            <RigBoundary fallback={svg}>
              <Suspense fallback={svg}>
                <MascotThree
                  config={skin}
                  pose={pose}
                  invalidate={invalidate}
                  hat={cosmetic}
                  visible={visible}
                />
              </Suspense>
            </RigBoundary>
          )}
        </button>
        <div className={styles.name}>
          <span>{config.name}</span>
          <button
            aria-label={`${config.name} quick menu`}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <Icon name="Menu" size={16} />
          </button>
        </div>
        {menu && (
          <div className={styles.menu} aria-label="Guide quick actions">
            <button onClick={() => action('hint')}>
              <Icon name="Lightbulb" size={16} /> Hint
            </button>
            <button onClick={() => action('why')}>
              <Icon name="CircleHelp" size={16} /> Why?
            </button>
            <button onClick={() => action('another')}>
              <Icon name="Layers" size={16} /> Another way
            </button>
            <button onClick={() => action('formula')}>
              <Icon name="Code2" size={16} /> Formula
            </button>
            <button onClick={() => action('mute')}>
              <Icon name="Eye" size={16} /> Quiet
            </button>
            <button
              onClick={() => {
                settings.set({ dock: settings.dock === 'left' ? 'right' : 'left' });
                setMenu(false);
              }}
            >
              Move to {settings.dock === 'left' ? 'right' : 'left'}
            </button>
            {settings.speech && bubble && 'speechSynthesis' in window && (
              <button
                onClick={() => {
                  speechSynthesis.cancel();
                  speechSynthesis.speak(new SpeechSynthesisUtterance(bubble));
                }}
              >
                Read this tip aloud
              </button>
            )}
            <small>{bond} together minutes · cosmetics on the Trophy Shelf</small>
          </div>
        )}
      </aside>
    </>
  );
}

function GuideSvg({
  config,
  eye,
  pupil,
  hat,
  expression,
}: {
  config: MascotConfig;
  eye: RefObject<SVGGElement>;
  pupil: RefObject<SVGGElement>;
  hat: CosmeticId;
  expression: GuidePose['expression'];
}) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" className={styles.svg}>
      <ellipse cx="60" cy="105" rx="33" ry="5" fill="#10201C" opacity="0.12" />
      {config.body === 'lantern' && (
        <>
          <path d="M42 25 V19 Q60 0 78 19 V25" fill="none" stroke={config.accent} strokeWidth="7" />
          <rect x="32" y="25" width="56" height="9" rx="3" fill={config.accent} />
        </>
      )}
      {config.body === 'stack' ? (
        <>
          {[33, 56, 79].map((y) => (
            <rect
              key={y}
              x={y === 56 ? 25 : 30}
              y={y}
              width={y === 56 ? 70 : 60}
              height="25"
              rx="6"
              fill={config.color}
              stroke="#10201C"
              strokeOpacity="0.2"
            />
          ))}
        </>
      ) : config.body === 'arrow' ? (
        <path
          d="M60 19 L103 67 H82 V97 H38 V67 H17 Z"
          fill={config.color}
          stroke="#10201C"
          strokeOpacity="0.2"
        />
      ) : (
        <rect
          x={config.body === 'cursor' ? 24 : 28}
          y="29"
          width={config.body === 'cursor' ? 72 : 64}
          height="69"
          rx={config.body === 'cursor' ? 8 : config.body === 'lantern' ? 12 : 23}
          fill={config.color}
          stroke="#10201C"
          strokeOpacity="0.2"
        />
      )}
      {config.body === 'cursor' && (
        <>
          <path
            d="M34 39 H29 V85 H34 M86 39 H91 V85 H86"
            fill="none"
            stroke={config.accent}
            strokeWidth="3"
          />
          <rect x="54" y="83" width="12" height="3" fill={config.accent} />
        </>
      )}
      <g ref={eye} data-guide-eye="one">
        <circle cx="60" cy="56" r="21" fill="#F5F7F6" stroke="#10201C" strokeWidth="2" />
        <g ref={pupil}>
          <circle cx="60" cy="56" r="10" fill="#10201C" />
          <circle cx="63" cy="52" r="3" fill="white" />
        </g>
      </g>
      <path
        d={
          expression === 'celebrate'
            ? 'M48 84 Q60 99 72 84'
            : expression === 'puzzled' || expression === 'encourage'
              ? 'M51 89 Q60 84 69 89'
              : 'M52 87 Q60 92 68 87'
        }
        fill="none"
        stroke="#10201C"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="33" y="96" width="20" height="8" rx="4" fill={config.accent} />
      <rect x="67" y="96" width="20" height="8" rx="4" fill={config.accent} />
      {hat === 'sunhat' && (
        <>
          <path d="M39 29 L47 13 H73 L81 29 Z" fill="#FFE066" stroke="#805600" strokeWidth="1.5" />
          <path d="M34 29 H86" stroke="#805600" strokeWidth="5" strokeLinecap="round" />
        </>
      )}
      {hat === 'starcap' && (
        <g>
          <path d="M38 29 L60 7 L82 29 Z" fill="#507DF2" stroke="#10201C" strokeWidth="1.5" />
          <path
            d="M60 14 L62 20 L68 20 L63 24 L65 30 L60 26 L55 30 L57 24 L52 20 L58 20 Z"
            fill="#FFE066"
          />
        </g>
      )}
    </svg>
  );
}
