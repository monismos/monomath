import {
  parseLogicInput,
  solveLogic,
  type LogicAnswer,
  type LogicMethod,
} from '../../core/solvers/logic';
import {
  createLogicBoss,
  createLogicChallenge,
  logicChallengeKinds,
  validLogicBuildState,
  type LogicBuildState,
  type LogicChallengeKind,
} from './challenge';
export type LogicMode = 'watch' | 'play' | 'prove' | 'boss';
export interface LogicVariant {
  version: 1;
  mode: LogicMode;
  seed: number;
  kind: LogicChallengeKind;
  method: LogicMethod;
  expression: string;
  build: LogicBuildState;
  world: string;
  phase: number;
  hint: number;
  tryFirst: boolean;
  guess?: LogicAnswer;
}
const integer = (v: unknown, min: number, max: number): v is number =>
  Number.isSafeInteger(v) && Number(v) >= min && Number(v) <= max;
export const cloneLogicBuild = (state: LogicBuildState): LogicBuildState => ({
  selectedWorlds: [...state.selectedWorlds],
  ...(state.classification ? { classification: state.classification } : {}),
  ...(state.code !== undefined ? { code: state.code } : {}),
});
export function initialLogicVariant(): LogicVariant {
  return {
    version: 1,
    mode: 'watch',
    seed: 12345,
    kind: 'tautology',
    method: 'truth-table',
    expression: '(p → q) ∧ ¬q',
    build: { selectedWorlds: [] },
    world: 'world-0',
    phase: 0,
    hint: 0,
    tryFirst: false,
  };
}
export function readLogicVariant(raw?: string): LogicVariant {
  try {
    if (!raw || raw.length > 10000) return initialLogicVariant();
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      !value ||
      value.version !== 1 ||
      !['watch', 'play', 'prove', 'boss'].includes(String(value.mode)) ||
      !logicChallengeKinds.includes(value.kind as LogicChallengeKind) ||
      !['truth-table', 'gate-circuit'].includes(String(value.method)) ||
      !integer(value.seed, 0, 4294967295) ||
      !integer(value.phase, 0, 3) ||
      !integer(value.hint, 0, 3) ||
      typeof value.expression !== 'string' ||
      !validLogicBuildState(value.build) ||
      typeof value.tryFirst !== 'boolean'
    )
      return initialLogicVariant();
    const parsed = parseLogicInput(value.expression);
    if (!parsed.ok) return initialLogicVariant();
    const challenge =
      value.mode === 'boss'
        ? createLogicBoss(value.seed)
        : createLogicChallenge(value.kind as LogicChallengeKind, value.seed);
    if (!validLogicBuildState(value.build, challenge.solution)) return initialLogicVariant();
    const solution = value.mode === 'watch' ? solveLogic(parsed.problem) : challenge.solution;
    if (typeof value.world !== 'string' || !solution.rows.some((row) => row.id === value.world))
      return initialLogicVariant();
    if (
      value.guess !== undefined &&
      !['tautology', 'contradiction', 'contingent', 'valid', 'invalid'].includes(
        String(value.guess),
      )
    )
      return initialLogicVariant();
    return {
      version: 1,
      mode: value.mode as LogicMode,
      seed: value.seed,
      kind: value.kind as LogicChallengeKind,
      method: value.method as LogicMethod,
      expression: parsed.problem.expression,
      build: cloneLogicBuild(value.build),
      world: value.world,
      phase: value.phase,
      hint: value.hint,
      tryFirst: value.tryFirst,
      ...(value.guess ? { guess: value.guess as LogicAnswer } : {}),
    };
  } catch {
    return initialLogicVariant();
  }
}
