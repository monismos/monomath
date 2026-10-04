import {
  createFractionBoss,
  createFractionChallenge,
  fractionChallengeKinds,
  validBuildState,
} from './challenge';
import type { FractionBuildState, FractionChallengeKind } from './challenge';
import type { FractionShape } from './scene';

export type FractionMode = 'watch' | 'play' | 'prove' | 'boss';
export interface FractionVariant {
  shape: FractionShape;
  mode: FractionMode;
  seed: number;
  kind: FractionChallengeKind;
  method?: string;
  build: FractionBuildState;
  phase: number;
  hint: number;
}
export const initialFractionVariant = (): FractionVariant => ({
  shape: 'pie',
  mode: 'watch',
  seed: 12345,
  kind: 'shade',
  build: createFractionChallenge('shade', 12345).setup,
  phase: 0,
  hint: 0,
});
const integer = (value: unknown, min: number, max: number): value is number =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
const indices = (value: unknown, capacity: number): value is number[] =>
  Array.isArray(value) &&
  value.length <= capacity &&
  new Set(value).size === value.length &&
  value.every((v) => integer(v, 0, capacity - 1));
const methods = new Set([
  'common',
  'product',
  'area',
  'cancel',
  'measure',
  'reciprocal',
  'group',
  'quotient',
  'gcd',
  'groups',
]);
/** Recreate only trusted DTO fields; notelet imports cannot add executable/store properties. */
export function readFractionVariant(raw?: string): FractionVariant {
  try {
    if (!raw || raw.length > 12000) return initialFractionVariant();
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (
      !v ||
      typeof v !== 'object' ||
      !['pie', 'bar', 'stack'].includes(String(v.shape)) ||
      !['watch', 'play', 'prove', 'boss'].includes(String(v.mode)) ||
      !fractionChallengeKinds.includes(v.kind as FractionChallengeKind) ||
      !integer(v.seed, 0, 4294967295) ||
      !integer(v.phase, 0, 3) ||
      !integer(v.hint, 0, 3)
    )
      return initialFractionVariant();
    const source = v.build as Record<string, unknown>;
    if (
      !source ||
      typeof source !== 'object' ||
      !validBuildState(source as unknown as FractionBuildState)
    )
      return initialFractionVariant();
    const kind = v.kind as FractionChallengeKind,
      mode = v.mode as FractionMode;
    const challenge =
      mode === 'boss' ? createFractionBoss(v.seed) : createFractionChallenge(kind, v.seed);
    const accepted = new Set([
      ...Object.keys(challenge.setup),
      ...(mode === 'boss' ? ['symbolAnswer', 'code'] : []),
    ]);
    const denominator = source.denominator as number,
      units = (source.units ?? 1) as number;
    if (units !== (challenge.setup.units ?? 1) || (source.sign ?? 1) !== 1)
      return initialFractionVariant();
    const state: FractionBuildState = {
      denominator,
      selected: [...(source.selected as number[])],
      units,
      sign: 1,
    };
    for (const name of ['leftCuts', 'rightCuts', 'groups'] as const) {
      if (accepted.has(name) && source[name] !== undefined) {
        if (!integer(source[name], 1, 24)) return initialFractionVariant();
        state[name] = source[name];
      }
    }
    for (const [name, operand] of [
      ['leftCuts', challenge.givens.a],
      ['rightCuts', challenge.givens.b],
    ] as const)
      if (state[name] !== undefined && (!operand || state[name]! % operand.d !== 0))
        return initialFractionVariant();
    if (accepted.has('removed') && source.removed !== undefined) {
      if (!indices(source.removed, challenge.givens.a.n)) return initialFractionVariant();
      state.removed = [...source.removed];
    }
    if (accepted.has('fits') && source.fits !== undefined) {
      if (!integer(source.fits, 0, 24) || source.fits !== state.selected.length)
        return initialFractionVariant();
      state.fits = source.fits;
    }
    if (accepted.has('rows') && (source.rows !== undefined || source.columns !== undefined)) {
      if (
        !integer(source.rows, 1, 24) ||
        !integer(source.columns, 1, 24) ||
        source.rows * source.columns !== denominator ||
        !indices(source.horizontalSelected, source.columns) ||
        !indices(source.verticalSelected, source.rows)
      )
        return initialFractionVariant();
      state.rows = source.rows;
      state.columns = source.columns;
      state.horizontalSelected = [...source.horizontalSelected];
      state.verticalSelected = [...source.verticalSelected];
    }
    if (mode !== 'boss' && ['subtract', 'multiply', 'divide', 'mixed'].includes(kind)) {
      if (denominator !== challenge.setup.denominator) return initialFractionVariant();
      if (
        kind === 'multiply' &&
        (state.rows !== challenge.setup.rows || state.columns !== challenge.setup.columns)
      )
        return initialFractionVariant();
      if (kind === 'divide' && state.fits === undefined) return initialFractionVariant();
      if (
        kind === 'subtract' &&
        (!state.removed ||
          state.selected.some((i) => i >= challenge.givens.a.n) ||
          !Array.from({ length: challenge.givens.a.n }, (_, i) => i).every(
            (i) => state.selected.includes(i) !== state.removed!.includes(i),
          ))
      )
        return initialFractionVariant();
    }
    if (
      mode !== 'boss' &&
      kind === 'simplify' &&
      (state.groups === undefined ||
        challenge.givens.a.d % state.groups !== 0 ||
        challenge.givens.a.n % state.groups !== 0 ||
        denominator !== challenge.givens.a.d / state.groups)
    )
      return initialFractionVariant();
    for (const name of ['symbolAnswer', 'code'] as const)
      if (accepted.has(name) && source[name] !== undefined) {
        if (typeof source[name] !== 'string' || source[name].length > (name === 'code' ? 512 : 160))
          return initialFractionVariant();
        state[name] = source[name];
      }
    for (const name of Object.keys(challenge.setup) as (keyof FractionBuildState)[])
      if (state[name] === undefined) return initialFractionVariant();
    return {
      shape: v.shape as FractionShape,
      mode,
      seed: v.seed,
      kind,
      method: typeof v.method === 'string' && methods.has(v.method) ? v.method : undefined,
      build: state,
      phase: v.phase,
      hint: v.hint,
    };
  } catch {
    return initialFractionVariant();
  }
}

export function recutBuild(
  state: FractionBuildState,
  denominator: number,
): FractionBuildState | null {
  if (!integer(denominator, 1, 24)) return null;
  const numerator = state.selected.length * denominator;
  if (numerator % state.denominator !== 0) return null;
  const count = numerator / state.denominator;
  if (count > denominator * (state.units ?? 1)) return null;
  return { ...state, denominator, selected: Array.from({ length: count }, (_, i) => i) };
}
