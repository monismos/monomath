import {
  defaultSets,
  setExpressionTex,
  validFiniteSet,
  validSetsConfig,
} from '../../../core/solvers/sets';
import type { SetsConfig } from '../../../core/solvers/sets';
import {
  createSetsBoss,
  createSetsChallenge,
  setsChallengeKinds,
  validSetsBuildState,
} from './challenge';
import type { SetsBuildState, SetsChallengeKind } from './challenge';
export type SetMode = 'watch' | 'play' | 'prove' | 'boss';
export type SetView = 'venn' | 'euler' | 'sieve' | 'power' | 'product' | 'relation';
export interface SetVariant {
  version: 1;
  mode: SetMode;
  view: SetView;
  seed: number;
  kind: SetsChallengeKind;
  method: 'membership' | 'algebra';
  codeLanguage: 'python' | 'sql';
  sets: SetsConfig;
  build: SetsBuildState;
  phase: number;
  hint: number;
}
const integer = (value: unknown, min: number, max: number): value is number =>
  Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
function members(value: unknown): value is number[] {
  return validFiniteSet(value);
}
export function validSetConfig(value: unknown): value is SetsConfig {
  return validSetsConfig(value);
}
export const cloneSetConfig = (sets: SetsConfig): SetsConfig => ({
  A: [...sets.A],
  B: [...sets.B],
  C: [...sets.C],
  U: [...sets.U],
});
export function cloneSetBuild(state: SetsBuildState): SetsBuildState {
  return {
    universe: [...state.universe],
    a: [...state.a],
    b: [...state.b],
    selected: [...state.selected],
    ...(state.subsets ? { subsets: state.subsets.map((subset) => [...subset]) } : {}),
    ...(state.pairs ? { pairs: state.pairs.map(([a, b]) => [a, b] as [number, number]) } : {}),
    ...(state.symbolAnswer !== undefined ? { symbolAnswer: state.symbolAnswer } : {}),
    ...(state.code !== undefined ? { code: state.code } : {}),
  };
}
export function initialSetVariant(): SetVariant {
  const kind = setsChallengeKinds[0],
    seed = 12345;
  return {
    version: 1,
    mode: 'watch',
    view: 'venn',
    seed,
    kind,
    method: 'membership',
    codeLanguage: 'python',
    sets: cloneSetConfig(defaultSets),
    build: cloneSetBuild(createSetsChallenge(kind, seed).setup),
    phase: 0,
    hint: 0,
  };
}
/** Only finite, bounded teaching data is restored from notelets and browser storage. */
export function readSetVariant(raw?: string): SetVariant {
  try {
    if (!raw || raw.length > 12000) return initialSetVariant();
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      !value ||
      value.version !== 1 ||
      !['watch', 'play', 'prove', 'boss'].includes(String(value.mode)) ||
      !['venn', 'euler', 'sieve', 'power', 'product', 'relation'].includes(String(value.view)) ||
      !setsChallengeKinds.includes(value.kind as SetsChallengeKind) ||
      !integer(value.seed, 0, 4294967295) ||
      !integer(value.phase, 0, 3) ||
      !integer(value.hint, 0, 3) ||
      !['membership', 'algebra'].includes(String(value.method)) ||
      !['python', 'sql'].includes(String(value.codeLanguage)) ||
      !validSetConfig(value.sets)
    )
      return initialSetVariant();
    const challenge =
      value.mode === 'boss'
        ? createSetsBoss(value.seed)
        : createSetsChallenge(value.kind as SetsChallengeKind, value.seed);
    if (!validSetsBuildState(value.build as SetsBuildState, challenge.givens))
      return initialSetVariant();
    return {
      version: 1,
      mode: value.mode as SetMode,
      view: value.view as SetView,
      seed: value.seed,
      kind: value.kind as SetsChallengeKind,
      method: value.method as SetVariant['method'],
      codeLanguage: value.codeLanguage as SetVariant['codeLanguage'],
      sets: cloneSetConfig(value.sets),
      build: cloneSetBuild(value.build as SetsBuildState),
      phase: value.phase,
      hint: value.hint,
    };
  } catch {
    return initialSetVariant();
  }
}
export function parseSetMembers(raw: string): number[] | null {
  const text = raw
    .trim()
    .replace(/^\{(.*)\}$/, '$1')
    .trim();
  if (!text || text === '∅') return [];
  const parts = text.split(/[\s,]+/);
  if (!parts.every((part) => /^[+-]?\d+$/.test(part))) return null;
  const result = [...new Set(parts.map(Number))].sort((a, b) => a - b);
  return members(result) ? result : null;
}
export function setEquals(a: number[], b: number[]) {
  return a.length === b.length && a.every((value) => b.includes(value));
}
export function setMembership(
  state: SetsBuildState,
  value: number,
  where: 'a' | 'b' | 'both' | 'neither',
): SetsBuildState {
  if (!state.universe.includes(value)) return state;
  const a = state.a.filter((item) => item !== value),
    b = state.b.filter((item) => item !== value);
  if (where === 'a' || where === 'both') a.push(value);
  if (where === 'b' || where === 'both') b.push(value);
  return { ...state, a: a.sort((x, y) => x - y), b: b.sort((x, y) => x - y) };
}
export function setPowerSubsets(values: number[]): number[][] {
  if (values.length > 3) return [];
  return Array.from({ length: 2 ** values.length }, (_, mask) =>
    values.filter((_value, index) => !!(mask & (1 << index))),
  );
}
export function setPreview(input: string) {
  const parsed = setExpressionTex(input);
  if (parsed) return parsed;
  const escapes: Record<string, string> = {
    '\\': '\\textbackslash{}',
    '{': '\\{',
    '}': '\\}',
    $: '\\$',
    '&': '\\&',
    '#': '\\#',
    _: '\\_',
    '%': '\\%',
    '^': '\\textasciicircum{}',
    '~': '\\textasciitilde{}',
  };
  return `\\text{${input.replace(/[\\{}$&#_%^~]/g, (character) => escapes[character])}}`;
}
