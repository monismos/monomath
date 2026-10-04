import { create } from 'zustand';
import type { Interpretation, Viewport } from './types';
import { defaultViewport } from './types';
export interface GraphContext {
  version: 1;
  source: string;
  interpretation: Interpretation;
  parameters: Record<string, number>;
  viewport: Viewport;
  traceX: number;
  sliceY: number;
}
interface WorkspaceStore {
  current: GraphContext;
  rendered: GraphContext | null;
  saved: Record<string, GraphContext>;
  unavailable: boolean;
  set: (patch: Partial<GraphContext>) => void;
  open: (source: string) => void;
  restore: (context: GraphContext) => void;
  setRendered: (context: GraphContext | null) => void;
}
export const defaultGraphContext = (source = 'y=sin(x)'): GraphContext => ({
  version: 1,
  source,
  interpretation: 'auto',
  parameters: {},
  viewport: { ...defaultViewport },
  traceX: 0,
  sliceY: 0,
});
export function validGraphContext(value: unknown): value is GraphContext {
  if (!value || typeof value !== 'object') return false;
  const v = value as GraphContext;
  return (
    v.version === 1 &&
    typeof v.source === 'string' &&
    v.source.length <= 1024 &&
    ['auto', 'curve', 'relation', 'surface'].includes(v.interpretation) &&
    !!v.parameters &&
    typeof v.parameters === 'object' &&
    !Array.isArray(v.parameters) &&
    Object.keys(v.parameters).length <= 4 &&
    Object.entries(v.parameters).every(
      ([k, n]) =>
        /^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(k) &&
        !['constructor', 'prototype', '__proto__'].includes(k) &&
        Number.isFinite(n) &&
        Math.abs(n) <= 1e6,
    ) &&
    !!v.viewport &&
    ['x', 'y', 'z'].every((axis) => {
      const min = v.viewport[`${axis}min` as keyof Viewport],
        max = v.viewport[`${axis}max` as keyof Viewport];
      return (
        Number.isFinite(min) &&
        Number.isFinite(max) &&
        min < max &&
        max - min > 1e-9 &&
        Math.abs(min) < 1e8 &&
        Math.abs(max) < 1e8
      );
    }) &&
    Number.isFinite(v.traceX) &&
    Math.abs(v.traceX) < 1e8 &&
    Number.isFinite(v.sliceY) &&
    Math.abs(v.sliceY) < 1e8
  );
}
function clean(v: GraphContext): GraphContext {
  return {
    version: 1,
    source: v.source,
    interpretation: v.interpretation,
    parameters: { ...v.parameters },
    viewport: {
      xmin: v.viewport.xmin,
      xmax: v.viewport.xmax,
      ymin: v.viewport.ymin,
      ymax: v.viewport.ymax,
      zmin: v.viewport.zmin,
      zmax: v.viewport.zmax,
    },
    traceX: v.traceX,
    sliceY: v.sliceY,
  };
}
let initial = defaultGraphContext(),
  saved: Record<string, GraphContext> = {},
  unavailable = false;
try {
  const raw = JSON.parse(localStorage.getItem('monomath-graphs') ?? 'null') as {
    current?: unknown;
    saved?: Record<string, unknown>;
  } | null;
  if (raw && validGraphContext(raw.current)) initial = clean(raw.current);
  if (raw?.saved && typeof raw.saved === 'object')
    saved = Object.fromEntries(
      Object.entries(raw.saved)
        .filter(([, v]) => validGraphContext(v))
        .slice(-30)
        .map(([k, v]) => [k, clean(v as GraphContext)]),
    );
} catch {
  unavailable = true;
}
function save(current: GraphContext, records: Record<string, GraphContext>) {
  try {
    localStorage.setItem('monomath-graphs', JSON.stringify({ current, saved: records }));
    return false;
  } catch {
    return true;
  }
}
export const useGraphWorkspace = create<WorkspaceStore>((set, get) => ({
  current: initial,
  rendered: null,
  saved,
  unavailable,
  setRendered: (context) => {
    if (context === null || validGraphContext(context))
      set({ rendered: context ? clean(context) : null });
  },
  set: (patch) => {
    const candidate = { ...get().current, ...patch };
    if (!validGraphContext(candidate)) return;
    const current = clean(candidate);
    const records = Object.fromEntries(
      [
        ...Object.entries(get().saved).filter(([key]) => key !== current.source),
        [current.source, current],
      ].slice(-30),
    );
    set({ current, saved: records, unavailable: save(current, records) });
  },
  open: (source) => {
    const current = Object.hasOwn(get().saved, source) ? get().saved[source] : defaultGraphContext(source);
    get().restore(current);
  },
  restore: (context) => {
    if (!validGraphContext(context)) return;
    const current = clean(context),
      records = Object.fromEntries(
        [
          ...Object.entries(get().saved).filter(([key]) => key !== current.source),
          [current.source, current],
        ].slice(-30),
      );
    set({ current, saved: records, unavailable: save(current, records) });
  },
}));
export const getGraphContext = () => clean(useGraphWorkspace.getState().current);
/** World notelets describe the actual plotted geometry, including retained last-valid results. */
export const getRenderedGraphContext = () =>
  clean(useGraphWorkspace.getState().rendered ?? useGraphWorkspace.getState().current);
export const restoreGraphContext = (context: GraphContext) =>
  useGraphWorkspace.getState().restore(context);
