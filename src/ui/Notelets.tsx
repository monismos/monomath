import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { HoldGesture } from '../core/notelets/holdGesture';
import { useNotes, hydrateNotes } from '../core/notelets/store';
import { noteColors, validNote } from '../core/notelets/types';
import type { Notelet } from '../core/notelets/types';
import { useSettings } from '../core/storage/settings';
import { useLesson } from '../core/scene/store';
import { saveDraft, deleteDraft, loadDrafts } from '../core/notelets/drafts';
import { stageHit, setStageHit, useStageHold } from '../core/notelets/stageHit';
import { projectedEntities, anchorProjectors } from '../core/renderers/anchors';
import { carouselRadius, visibleIndices, wrapIndex } from '../core/notelets/carousel';
import { Dialog } from './Dialog';
import { Icon } from './Icon';

import styles from './Notelets.module.css';
function captureNote(x: number, y: number, target: Element | null): Notelet {
  const settings = useSettings.getState();
  const lesson = useLesson.getState();
  const stage = target?.closest('[data-anchor-id="stage"]');
  const entityId =
    target?.closest('[data-entity-id]')?.getAttribute('data-entity-id') ?? stageHit?.entityId;
  let localPoint = stageHit?.p;
  const svgGroup = target?.closest('[data-entity-id]') as SVGGElement | null;
  if (svgGroup && 'getScreenCTM' in svgGroup) {
    const matrix = svgGroup.getScreenCTM();
    if (matrix) {
      const local = new DOMPoint(x, y).matrixTransform(matrix.inverse());
      localPoint = [local.x / 72, 0, -local.y / 72];
    }
  }
  let thumb: string | undefined;
  try {
    const source = stage?.querySelector('canvas');
    if (source) {
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 100;
      const context = canvas.getContext('2d');
      context?.drawImage(source, 0, 0, 160, 100);
      if (context?.getImageData(80, 50, 1, 1).data[3]) thumb = canvas.toDataURL('image/png');
    } else {
      const svg = stage?.querySelector('svg');
      if (svg) {
        const clone = svg.cloneNode(true) as SVGSVGElement;
        clone.setAttribute('width', '160');
        clone.setAttribute('height', '100');
        thumb = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
      }
    }
  } catch {
    /* Snapshots are best effort; the anchor is still saved. */
  }
  return {
    id: crypto.randomUUID(),
    text: '',
    color: 'sun',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    thumb,
    context: {
      step: lesson.step,
      dial: lesson.dial,
      selection: lesson.selection,
      problem: lesson.problem,
      labId: lesson.labId,
      route: location.hash.slice(1) || 'workshop',
      screen:
        target?.closest<HTMLElement>('dialog[data-screen]')?.dataset.screen ??
        (stage ? 'scene' : 'page'),
      dimension: settings.dimension,
      theme: settings.theme,
    },
    anchor: {
      type: stage ? 'world' : 'screen',
      anchorId: target?.closest('[data-anchor-id]')?.getAttribute('data-anchor-id') ?? undefined,
      entityId: stage ? entityId : undefined,
      p: localPoint,
      nx: x / innerWidth,
      ny: y / innerHeight,
    },
  };
}
export default function Notelets() {
  const notes = useNotes();
  const lesson = useLesson();
  const settings = useSettings();
  const [charge, setCharge] = useState<{ x: number; y: number } | null>(null);
  const [peek, setPeek] = useState(false);
  const [toast, setToast] = useState('');
  useEffect(() => {
    const saved = () => {
      setToast('Notelet saved');
      setTimeout(() => setToast(''), 2500);
    };
    window.addEventListener('monomath:note-saved', saved);
    return () => window.removeEventListener('monomath:note-saved', saved);
  }, []);
  const pins = useRef<HTMLDivElement>(null);
  const [pinHost, setPinHost] = useState<Element | null>(null);
  const [preview, setPreview] = useState<Notelet | null>(null);
  const drag = useRef<{ id: string; x: number; y: number; changed: boolean } | null>(null);
  useEffect(() => {
    const update = () => {
      const dialogs = document.querySelectorAll('dialog[open][data-screen]');
      setPinHost(dialogs[dialogs.length - 1] ?? null);
    };
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['open'],
    });
    update();
    return () => observer.disconnect();
  }, []);
  const pinEvents = (note: Notelet) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      drag.current = { id: note.id, x: e.clientX, y: e.clientY, changed: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (
        drag.current?.id !== note.id ||
        Math.hypot(e.clientX - drag.current.x, e.clientY - drag.current.y) < 12
      )
        return;
      drag.current.changed = true;
      e.currentTarget.style.left = `${e.clientX}px`;
      e.currentTarget.style.top = `${e.clientY}px`;
    },
    onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => {
      if (useNotes.getState().composer) return;
      if (drag.current?.changed) {
        notes.upsert({
          ...note,
          anchor: {
            type: 'screen',
            nx: Math.max(0, Math.min(1, e.clientX / innerWidth)),
            ny: Math.max(0, Math.min(1, e.clientY / innerHeight)),
          },
          updatedAt: Date.now(),
        });
      } else if (Number(e.currentTarget.dataset.clusterCount) > 5)
        useNotes.getState().set({ summary: true });
      else setPreview(note);
      drag.current = null;
    },
    onDoubleClick: () =>
      useNotes.getState().set({
        composer: { x: note.anchor.nx * innerWidth, y: note.anchor.ny * innerHeight, note },
      }),
    onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setPreview(note);
      }
      if (e.altKey && e.key.startsWith('Arrow')) {
        e.preventDefault();
        notes.upsert({
          ...note,
          anchor: {
            type: 'screen',
            nx: Math.max(
              0,
              Math.min(
                1,
                note.anchor.nx +
                  (e.key === 'ArrowRight' ? 0.02 : e.key === 'ArrowLeft' ? -0.02 : 0),
              ),
            ),
            ny: Math.max(
              0,
              Math.min(
                1,
                note.anchor.ny + (e.key === 'ArrowDown' ? 0.02 : e.key === 'ArrowUp' ? -0.02 : 0),
              ),
            ),
          },
        });
      }
    },
  });
  useEffect(() => {
    void hydrateNotes();
  }, []);
  useEffect(() => {
    let target: Element | null = null;
    const undip = () => target?.removeAttribute('data-hold-active');
    const gesture = new HoldGesture(settings.holdDuration, {
      charge: (p) => {
        setCharge(p);
        if (target instanceof HTMLElement) target.setAttribute('data-hold-active', 'true');
      },
      complete: (p) => {
        useStageHold.getState().setPaused(true);
        setCharge(null);
        undip();
        const note = captureNote(p.x, p.y, target);
        useNotes.getState().set({ composer: { x: p.x, y: p.y, note } });
        if (settings.haptics) navigator.vibrate?.(20);
      },
      cancel: () => {
        setCharge(null);
        undip();
      },
      release: () => useStageHold.getState().setPaused(false),
    });
    const down = (e: PointerEvent) => {
      if (!gesture.pointer) gesture.suppressUntil = 0;
      if ((e.target as Element)?.closest('input,textarea,[contenteditable]')) return;
      target = e.target as Element;
      setStageHit(null);
      if (useNotes.getState().place) {
        e.preventDefault();
        useNotes.getState().set({ place: false });
        queueMicrotask(() =>
          useNotes.getState().set({
            place: false,
            composer: {
              x: e.clientX,
              y: e.clientY,
              note: captureNote(e.clientX, e.clientY, target),
            },
          }),
        );
        gesture.suppressUntil = Date.now() + 700;
        return;
      }
      gesture.down({
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        type: e.pointerType,
        primary: e.isPrimary,
        button: e.button,
      });
    };
    const move = (e: PointerEvent) => gesture.move(e.pointerId, e.clientX, e.clientY);
    const up = () => gesture.up();
    const cancel = () => gesture.cancel();
    const click = (e: MouseEvent) => {
      if (e.detail === 0) return;
      if (gesture.consumeClick()) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    const context = (e: MouseEvent) => {
      if (!(e.target as Element).closest('input,textarea,[contenteditable]')) e.preventDefault();
    };
    const hidden = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('pointermove', move, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', cancel, true);
    window.addEventListener('click', click, true);
    window.addEventListener('contextmenu', context, true);
    window.addEventListener('scroll', cancel, true);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      gesture.cancel();
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointermove', move, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', cancel, true);
      window.removeEventListener('click', click, true);
      window.removeEventListener('contextmenu', context, true);
      window.removeEventListener('scroll', cancel, true);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [settings.holdDuration, settings.haptics]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as Element).closest('input,textarea,select,[contenteditable]')) return;
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        const rect = document.activeElement?.getBoundingClientRect();
        const x = rect?.width ? rect.x + rect.width / 2 : innerWidth / 2;
        const y = rect?.height ? rect.y + rect.height / 2 : innerHeight / 2;
        useNotes
          .getState()
          .set({ composer: { x, y, note: captureNote(x, y, document.activeElement) } });
      }
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        useNotes.getState().set({ summary: true });
      }
      if (e.key === 'Shift') setPeek(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setPeek(false);
    };
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('keyup', up);
    };
  }, []);
  useEffect(() => {
    let frame = 0;
    const position = () => {
      const pinNodes = Array.from(
        pins.current?.querySelectorAll<HTMLElement>('[data-note-id]') ?? [],
      );
      pinNodes.forEach((pin) => {
        pin.style.display = '';
        pin.dataset.clusterCount = '';
        const badge = pin.querySelector('small');
        if (badge) badge.textContent = '';
        if (drag.current?.changed && drag.current.id === pin.dataset.noteId) return;
        const note = notes.notes.find((n) => n.id === pin.dataset.noteId);
        if (!note) return;
        let x = note.anchor.nx * innerWidth,
          y = note.anchor.ny * innerHeight;
        const projection =
          note.anchor.entityId &&
          (note.anchor.p
            ? anchorProjectors.get(note.anchor.entityId)?.(note.anchor.p)
            : projectedEntities.get(note.anchor.entityId));
        if (projection) {
          x = projection.x;
          y = projection.y;
        } else if (note.anchor.anchorId) {
          const element = document.querySelector(
            `[data-anchor-id="${CSS.escape(note.anchor.anchorId)}"]`,
          );
          if (element) {
            const r = element.getBoundingClientRect();
            x = Math.max(r.x + 12, Math.min(r.right - 12, x));
            y = Math.max(r.y + 12, Math.min(r.bottom - 12, y));
          }
        }
        pin.style.left = `${x}px`;
        pin.style.top = `${y}px`;
      });
      const clusters: HTMLElement[][] = [];
      pinNodes.forEach((pin) => {
        const group = clusters.find(
          (items) =>
            Math.hypot(
              parseFloat(pin.style.left) - parseFloat(items[0].style.left),
              parseFloat(pin.style.top) - parseFloat(items[0].style.top),
            ) < 26,
        );
        if (group) group.push(pin);
        else clusters.push([pin]);
      });
      clusters
        .filter((group) => group.length > 5)
        .forEach((group) => {
          group[0].dataset.clusterCount = String(group.length);
          const badge = group[0].querySelector('small');
          if (badge) badge.textContent = String(group.length);
          group.slice(1).forEach((pin) => (pin.style.display = 'none'));
        });
      frame = requestAnimationFrame(position);
    };
    position();
    return () => cancelAnimationFrame(frame);
  }, [notes.notes]);
  return (
    <>
      {notes.unavailable && (
        <div className={styles.storageBanner} role="status">
          Storage is unavailable. Export your notes before closing this window.
        </div>
      )}
      {charge && (
        <div className={styles.charge} style={{ left: charge.x, top: charge.y }}>
          {settings.reducedMotion ? (
            <span>Adding notelet…</span>
          ) : (
            <svg
              viewBox="0 0 48 48"
              style={{ animationDuration: `${settings.holdDuration - 150}ms` }}
            >
              <circle cx="24" cy="24" r="20" fill="none" stroke="var(--glow)" strokeWidth="3" />
            </svg>
          )}
        </div>
      )}
      {toast && (
        <div className={styles.placeHint} role="status">
          {toast}
        </div>
      )}
      {notes.place && (
        <div className={styles.placeHint} role="status">
          Tap anywhere to place your notelet.{' '}
          <button onClick={() => useNotes.getState().set({ place: false })}>Cancel</button>
        </div>
      )}
      {createPortal(
        <div ref={pins} className={styles.pinLayer}>
          {(!notes.hidden || peek) &&
            notes.notes
              .filter(
                (note) =>
                  (pinHost
                    ? note.context.screen === (pinHost as HTMLElement).dataset.screen
                    : !['settings', 'summary', 'help'].includes(note.context.screen)) &&
                  note.context.route === (location.hash.slice(1) || 'workshop') &&
                  (note.anchor.type !== 'world' ||
                    (note.context.step === lesson.step &&
                      note.context.problem === lesson.problem &&
                      note.context.labId === lesson.labId)),
              )
              .map((note, i) => (
                <button
                  key={note.id}
                  className={styles.pin}
                  data-note-id={note.id}
                  aria-label={`Open notelet: ${note.text}`}
                  style={{
                    background: noteColors[note.color],
                    left: note.anchor.nx * innerWidth + (i % 3) * 7,
                    top: note.anchor.ny * innerHeight,
                  }}
                  {...pinEvents(note)}
                >
                  <Icon name="StickyNote" size={14} />
                  <small />
                </button>
              ))}
        </div>,
        pinHost ?? document.body,
      )}
      {preview && (
        <Dialog title="A thought you kept" onClose={() => setPreview(null)}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{preview.text}</p>
          <button
            onClick={() => {
              useNotes.getState().set({
                composer: {
                  x: preview.anchor.nx * innerWidth,
                  y: preview.anchor.ny * innerHeight,
                  note: preview,
                },
              });
              setPreview(null);
            }}
          >
            Edit notelet
          </button>
        </Dialog>
      )}
      <button
        className={styles.summaryOrb}
        aria-label={`Open notelet summary, ${notes.notes.length} notelets`}
        onClick={() => useNotes.getState().set({ summary: true })}
      >
        <Icon name="StickyNote" size={20} />
        {notes.notes.length > 0 && <span>{notes.notes.length}</span>}
      </button>
      {notes.composer && <Composer key={notes.composer.note.id} {...notes.composer} />}{' '}
      {notes.summary && <Summary />}
    </>
  );
}
function Composer({ x, y, note }: { x: number; y: number; note: Notelet }) {
  const [draft, setDraft] = useState(note);
  const latest = useRef(note);
  const saved = useRef(false);
  latest.current = draft;
  const ref = useRef<HTMLDialogElement>(null);
  const [height, setHeight] = useState(visualViewport?.height ?? innerHeight);
  const [offset, setOffset] = useState(visualViewport?.offsetTop ?? 0);
  const notes = useNotes();
  useEffect(() => {
    ref.current?.showModal();
    const resize = () => {
      setHeight(visualViewport?.height ?? innerHeight);
      setOffset(visualViewport?.offsetTop ?? 0);
    };
    visualViewport?.addEventListener('resize', resize);
    return () => {
      visualViewport?.removeEventListener('resize', resize);
    };
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!saved.current) void saveDraft(draft);
    }, 250);
    return () => clearTimeout(timer);
  }, [draft]);
  useEffect(
    () => () => {
      if (!saved.current) void saveDraft(latest.current);
    },
    [],
  );
  const close = () => {
    void saveDraft(draft);
    useNotes.getState().set({ composer: null });
  };
  const save = async () => {
    if (!draft.text.trim()) return;
    saved.current = true;
    const isNew = !notes.notes.some((note) => note.id === draft.id);
    const note = { ...draft, text: draft.text.trim(), updatedAt: Date.now() };
    await notes.upsert(note);
    await deleteDraft(draft.id);
    useNotes.getState().set({ composer: null });
    window.dispatchEvent(new CustomEvent('monomath:note-saved', { detail: { note, isNew } }));
  };
  return (
    <dialog
      ref={ref}
      className={styles.composer}
      style={{
        left: Math.min(Math.max(12, x - 80), innerWidth - 312),
        top: offset + Math.max(12, Math.min(y - offset - 70, height - 330)),
        maxHeight: Math.max(120, height - 24),
        background: noteColors[draft.color],
      }}
      aria-label="Your notelet"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          save();
        }
      }}
    >
      <header>
        <strong>A thought worth keeping</strong>
        <button aria-label="Close notelet composer" onClick={close}>
          <Icon name="X" size={16} />
        </button>
      </header>
      <textarea
        autoFocus
        maxLength={500}
        aria-label="Notelet text"
        placeholder="What just clicked? What are you wondering?"
        value={draft.text}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        onBlur={() => {
          if (!saved.current) void saveDraft(draft);
        }}
      />
      <div className={styles.composerMeta}>
        {!draft.topicHidden && (
          <span>
            {draft.context.labId === 'demo' ? 'Parts of a whole' : draft.context.labId} · Step{' '}
            {draft.context.step + 1}
            <button
              aria-label="Remove suggested topic"
              onClick={() => setDraft({ ...draft, topicHidden: true })}
            >
              ×
            </button>
          </span>
        )}
        <span>{draft.text.length}/500</span>
      </div>
      <div className={styles.swatches}>
        {Object.entries(noteColors).map(([key, color]) => (
          <button
            key={key}
            style={{ background: color }}
            aria-label={`${key} notelet`}
            aria-pressed={draft.color === key}
            onClick={() => setDraft({ ...draft, color: key as Notelet['color'] })}
          >
            {draft.color === key && <Icon name="Check" size={13} />}
          </button>
        ))}
        <input
          aria-label="Optional emoji"
          maxLength={4}
          placeholder="☺"
          value={draft.emoji ?? ''}
          onChange={(e) => setDraft({ ...draft, emoji: e.target.value })}
        />
      </div>
      <footer>
        <button onClick={close}>Keep draft</button>
        <button className={styles.saveButton} disabled={!draft.text.trim()} onClick={save}>
          Save notelet <Icon name="Check" size={14} />
        </button>
      </footer>
    </dialog>
  );
}
function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}
function Summary() {
  const [drafts, setDrafts] = useState<Notelet[]>([]);
  useEffect(() => {
    void loadDrafts().then(setDrafts);
  }, []);
  const notes = useNotes();
  const settings = useSettings();
  const [query, setQuery] = useState('');
  const [starred, setStarred] = useState(false);
  const [color, setColor] = useState('all');
  const [lab, setLab] = useState('all');
  const [domain, setDomain] = useState('all');
  const domainOf = (id: string) =>
    /logic|sets|truth|quantifier/.test(id)
      ? 'logic'
      : /stats|distribution|probability|galton/.test(id)
        ? 'stats'
        : /physics|kinematic|force|energy/.test(id)
          ? 'physics'
          : /code|memory|algorithm|recursion/.test(id)
            ? 'code'
            : 'math';
  const [active, setActive] = useState(0);
  const [view, setView] = useState<'ring' | 'grid' | 'list'>('ring');
  const [sort, setSort] = useState('recent');
  const [notice, setNotice] = useState('');
  const [deleted, setDeleted] = useState<Notelet | null>(null);
  const start = useRef({ x: 0, time: 0, lastX: 0, lastTime: 0, velocity: 0 });
  const wheelTime = useRef(0);
  const filtered = notes.notes
    .filter(
      (n) =>
        (!starred || n.starred) &&
        (color === 'all' || n.color === color) &&
        (lab === 'all' || n.context.labId === lab) &&
        (domain === 'all' || domainOf(n.context.labId) === domain) &&
        `${n.text} ${n.context.labId}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'lab'
        ? a.context.labId.localeCompare(b.context.labId)
        : sort === 'starred'
          ? Number(b.starred) - Number(a.starred)
          : b.updatedAt - a.updatedAt,
    );
  const index = wrapIndex(active, filtered.length);
  const radius = carouselRadius(filtered.length);
  const flat = settings.flatCarousel || settings.reducedMotion;
  useEffect(() => {
    if (view === 'ring' && flat)
      document.querySelector(`[data-carousel-index="${index}"]`)?.scrollIntoView({
        block: 'nearest',
        inline: 'center',
        behavior: settings.reducedMotion ? 'instant' : 'smooth',
      });
  }, [index, flat, view, settings.reducedMotion]);
  const move = (delta: number) => setActive(wrapIndex(index + delta, filtered.length));
  const jump = (note: Notelet) => {
    useLesson.getState().set({
      step: note.context.step,
      dial: note.context.dial,
      selection: note.context.selection,
      problem: note.context.problem,
      labId: note.context.labId,
    });
    settings.set({ dimension: note.context.dimension, theme: note.context.theme });
    location.hash = note.context.route;
    useNotes.getState().set({ summary: false });
    window.dispatchEvent(
      new CustomEvent('monomath:context', { detail: { screen: note.context.screen } }),
    );
    setTimeout(
      () =>
        document
          .querySelector(`[data-note-id="${CSS.escape(note.id)}"]`)
          ?.animate(
            [{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }],
            { duration: 1200 },
          ),
      300,
    );
  };
  return (
    <Dialog
      wide
      title="Your little collection of understanding"
      onClose={() => useNotes.getState().set({ summary: false })}
    >
      <div className={styles.summaryIntro}>
        <p>Thoughts, questions, and things that clicked. Right where you left them.</p>
        <span>{notes.notes.length} notelets</span>
      </div>
      {drafts.length > 0 && (
        <div className={styles.viewToggle}>
          {drafts.map((draft) => (
            <button
              key={draft.id}
              onClick={() =>
                useNotes.getState().set({
                  summary: false,
                  composer: { x: innerWidth / 2, y: innerHeight / 2, note: draft },
                })
              }
            >
              Resume draft: {draft.text.slice(0, 32)}
            </button>
          ))}
        </div>
      )}
      <div className={styles.summaryControls}>
        <select
          aria-label="Filter notelet domain"
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value);
            setActive(0);
          }}
        >
          <option value="all">All subjects</option>
          <option value="math">Math</option>
          <option value="logic">Logic</option>
          <option value="stats">Statistics</option>
          <option value="physics">Physics</option>
          <option value="code">Programming</option>
        </select>
        <label className={styles.search}>
          <Icon name="Search" size={16} />
          <input
            aria-label="Search notelets"
            placeholder="Find a thought…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
          />
        </label>
        <button
          aria-pressed={starred}
          onClick={() => {
            setStarred(!starred);
            setActive(0);
          }}
        >
          <Icon name="Star" size={15} /> Starred
        </button>
        <select
          aria-label="Filter notelet colour"
          value={color}
          onChange={(e) => {
            setColor(e.target.value);
            setActive(0);
          }}
        >
          <option value="all">All colours</option>
          {Object.keys(noteColors).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter notelet topic"
          value={lab}
          onChange={(e) => {
            setLab(e.target.value);
            setActive(0);
          }}
        >
          <option value="all">All topics</option>
          {Array.from(new Set(notes.notes.map((n) => n.context.labId))).map((id) => (
            <option key={id} value={id}>
              {id === 'demo' ? 'Parts of a whole' : id}
            </option>
          ))}
        </select>
        <select aria-label="Sort notelets" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="recent">Most recent</option>
          <option value="lab">By lab</option>
          <option value="starred">Starred first</option>
        </select>
      </div>
      <div className={styles.viewToggle}>
        {(['ring', 'grid', 'list'] as const).map((v) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
            {v === 'ring' ? 'Carousel' : v === 'grid' ? 'Grid' : 'List'}
          </button>
        ))}
        <button onClick={() => useNotes.getState().set({ hidden: !notes.hidden })}>
          {notes.hidden ? 'Show pins' : 'Hide pins'}
        </button>
      </div>
      {filtered.length ? (
        <div
          className={`${styles.collection} ${view === 'ring' && !flat ? styles.ringView : view === 'grid' ? styles.gridView : view === 'list' ? styles.listView : styles.flatView}`}
          role="region"
          aria-roledescription="carousel"
          aria-label="Notelet carousel"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.target as Element).closest('input,select,textarea')) return;
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              move(1);
            }
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              move(-1);
            }
            if (e.key === 'Home') {
              e.preventDefault();
              setActive(0);
            }
            if (e.key === 'End') {
              e.preventDefault();
              setActive(filtered.length - 1);
            }
          }}
          onPointerDown={(e) => {
            start.current = {
              x: e.clientX,
              time: e.timeStamp,
              lastX: e.clientX,
              lastTime: e.timeStamp,
              velocity: 0,
            };
          }}
          onPointerMove={(e) => {
            if (!e.buttons) return;
            const dt = e.timeStamp - start.current.lastTime;
            if (dt > 0) start.current.velocity = (e.clientX - start.current.lastX) / dt;
            start.current.lastX = e.clientX;
            start.current.lastTime = e.timeStamp;
          }}
          onPointerUp={(e) => {
            const delta = e.clientX - start.current.x;
            if (Math.abs(delta) > 35 && !useNotes.getState().composer) {
              const velocity =
                e.timeStamp - start.current.lastTime < 100 ? start.current.velocity : 0;
              const projected = delta + velocity * 180;
              move(
                -Math.sign(projected) *
                  Math.max(1, Math.min(3, Math.round(Math.abs(projected) / 150))),
              );
            }
          }}
          onWheel={(e) => {
            const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (Math.abs(delta) > 10 && e.timeStamp - wheelTime.current > 180) {
              move(delta > 0 ? 1 : -1);
              wheelTime.current = e.timeStamp;
            }
          }}
        >
          <div
            className={styles.ring}
            style={
              view === 'ring' && !flat
                ? {
                    transform: `translateZ(-${radius}px) rotateY(${(-index * 360) / filtered.length}deg)`,
                  }
                : {}
            }
          >
            {(view === 'ring' && !flat
              ? visibleIndices(filtered.length, index)
              : Array.from({ length: filtered.length }, (_, i) => i)
            ).map((i) => {
              const note = filtered[i];
              const focused = i === index;
              return (
                <article
                  key={note.id}
                  data-carousel-index={i}
                  className={`${styles.noteCard} ${focused ? styles.activeCard : ''}`}
                  style={{
                    background: noteColors[note.color],
                    ...(view === 'ring' && !flat
                      ? {
                          transform: `rotateY(${(i * 360) / filtered.length}deg) translateZ(${radius + (focused ? 80 : 0)}px) translateY(${filtered.length > 30 ? (i - index) * 18 : 0}px)`,
                          opacity: focused ? 1 : 0.65,
                        }
                      : {}),
                  }}
                  tabIndex={focused ? 0 : -1}
                  onClick={() => setActive(i)}
                  aria-label={`Notelet ${i + 1} of ${filtered.length}`}
                >
                  <div className={styles.cardTop}>
                    <span>{note.emoji || '✳'}</span>
                    <button
                      tabIndex={view === 'ring' && !flat && !focused ? -1 : 0}
                      aria-label={note.starred ? 'Unstar notelet' : 'Star notelet'}
                      onClick={(e) => {
                        e.stopPropagation();
                        notes.upsert({ ...note, starred: !note.starred });
                      }}
                    >
                      <Icon name="Star" size={16} />
                    </button>
                  </div>
                  <p>{note.text}</p>
                  <div className={styles.cardContext}>
                    {note.context.labId === 'demo' ? 'Parts of a whole' : note.context.labId} · Step{' '}
                    {note.context.step + 1} · {note.context.dimension.toUpperCase()}
                  </div>
                  {note.thumb && (focused || view !== 'ring') && (
                    <img
                      className={styles.thumb}
                      src={note.thumb}
                      width={80}
                      height={50}
                      alt="Saved scene"
                      draggable={false}
                    />
                  )}
                  {(focused || view !== 'ring' || flat) && (
                    <div className={styles.cardActions}>
                      <button onClick={() => jump(note)}>
                        Jump to context <Icon name="ArrowUpRight" size={13} />
                      </button>
                      <div>
                        <button
                          aria-label="Edit notelet"
                          onClick={() =>
                            useNotes.getState().set({
                              summary: false,
                              composer: { x: innerWidth / 2, y: innerHeight / 2, note },
                            })
                          }
                        >
                          <Icon name="Pencil" size={15} />
                        </button>
                        <button
                          aria-label={note.echo ? 'Remove Echo' : 'Make Echo'}
                          onClick={() => notes.upsert({ ...note, echo: !note.echo })}
                        >
                          <Icon name="RotateCcw" size={15} />
                        </button>
                        <button
                          aria-label="Delete notelet"
                          onClick={() => {
                            setDeleted(note);
                            notes.remove(note.id);
                            setNotice('Notelet deleted');
                          }}
                        >
                          <Icon name="Trash2" size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.empty}>
          <div className={styles.emptyEye}>◉</div>
          <h3>
            {notes.notes.length
              ? 'No thoughts match that search.'
              : 'A little thought can go a long way.'}
          </h3>
          <p>Hold anywhere for half a second, or press N, to leave a notelet.</p>
          <button onClick={() => useNotes.getState().set({ summary: false, place: true })}>
            Place your first notelet <Icon name="Plus" size={16} />
          </button>
        </div>
      )}
      {filtered.length > 0 && view === 'ring' && (
        <div className={styles.carouselNav}>
          <button aria-label="Previous notelet" onClick={() => move(-1)}>
            <Icon name="ChevronLeft" />
          </button>
          <span aria-live="polite">
            {index + 1} of {filtered.length}
          </span>
          <button aria-label="Next notelet" onClick={() => move(1)}>
            <Icon name="ChevronRight" />
          </button>
        </div>
      )}
      <div className={styles.exportRow}>
        <button
          onClick={() =>
            download(
              'monomath-notelets.json',
              JSON.stringify({ version: 1, notes: notes.notes }, null, 2),
              'application/json',
            )
          }
        >
          <Icon name="Download" size={14} /> Export JSON
        </button>
        <button
          onClick={() =>
            download(
              'monomath-notelets.md',
              notes.notes
                .map((n) => `## ${n.context.labId} — Step ${n.context.step + 1}\n\n${n.text}\n`)
                .join('\n'),
              'text/markdown',
            )
          }
        >
          <Icon name="Download" size={14} /> Export Markdown
        </button>
        <label>
          <Icon name="Upload" size={14} /> Import
          <input
            type="file"
            accept=".json,application/json"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const data = JSON.parse(await file.text());
                if (
                  data.version !== 1 ||
                  !Array.isArray(data.notes) ||
                  !data.notes.every(validNote) ||
                  data.notes.length > 2000
                )
                  throw new Error('Invalid');
                notes.import(data.notes);
                setNotice('Notelets imported');
              } catch {
                setNotice('Choose a Monomath notelet export with valid notes.');
              }
              e.target.value = '';
            }}
          />
        </label>
        <button
          onClick={() => {
            if (
              confirm(
                'Delete every notelet on this device? Export first if you want to keep a copy.',
              )
            ) {
              notes.notes.forEach((n) => notes.remove(n.id));
              setNotice('All notelets deleted');
            }
          }}
        >
          Delete all
        </button>
      </div>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
          {deleted && (
            <button
              onClick={() => {
                notes.upsert(deleted);
                setDeleted(null);
                setNotice('Notelet restored');
              }}
            >
              Undo
            </button>
          )}
        </p>
      )}
    </Dialog>
  );
}
