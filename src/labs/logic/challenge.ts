import type { LabChallenge, LabBoss } from '../../core/labs/types';
import {
  parseLogicInput,
  solveLogic,
  worldDescription,
  type LogicAnswer,
  type LogicProblem,
  type LogicSolution,
} from '../../core/solvers/logic';
export interface LogicBuildState {
  selectedWorlds: string[];
  classification?: LogicAnswer;
  code?: string;
}
export const logicChallengeKinds = [
  'tautology',
  'contradiction',
  'truth-set',
  'counterworld',
  'equivalence',
  'validity',
] as const;
export type LogicChallengeKind = (typeof logicChallengeKinds)[number];
export interface LogicChallenge extends LabChallenge<LogicBuildState> {
  kind: LogicChallengeKind;
  seed: number;
  problem: LogicProblem;
  solution: LogicSolution;
  target: string[];
}
export function validLogicBuildState(
  value: unknown,
  solution?: LogicSolution,
): value is LogicBuildState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value as LogicBuildState;
  return (
    Array.isArray(state.selectedWorlds) &&
    state.selectedWorlds.length <= 16 &&
    new Set(state.selectedWorlds).size === state.selectedWorlds.length &&
    state.selectedWorlds.every(
      (id) =>
        typeof id === 'string' &&
        /^world-(?:[0-9]|1[0-5])$/.test(id) &&
        (!solution || solution.rows.some((row) => row.id === id)),
    ) &&
    (state.classification === undefined ||
      ['tautology', 'contradiction', 'contingent', 'valid', 'invalid'].includes(
        state.classification,
      )) &&
    (state.code === undefined || (typeof state.code === 'string' && state.code.length <= 512))
  );
}
const sameWorlds = (actual: string[], expected: string[]) =>
  actual.length === expected.length && expected.every((id) => actual.includes(id));
export function createLogicChallenge(kind: LogicChallengeKind, seed: number): LogicChallenge {
  const unsigned = seed >>> 0,
    names = [
      ['p', 'q'],
      ['q', 'r'],
      ['r', 's'],
      ['u', 'v'],
    ][unsigned % 4],
    [p, q] = names;
  const flip = !!(Math.floor(unsigned / 4) % 2),
    left = flip ? `¬${p}` : p;
  const expressions: Record<LogicChallengeKind, string> = {
    tautology: `${left} ∨ ¬(${left})`,
    contradiction: `${left} ∧ ¬(${left})`,
    'truth-set': Math.floor(unsigned / 8) % 2 ? `${left} ∨ ${q}` : `${left} ∧ ${q}`,
    counterworld: `${left} → ${q}`,
    equivalence: `¬(${p} ∧ ${q}) ≡ (¬${p} ∨ ¬${q})`,
    validity: flip ? `${p} → ${q}; ${q} ⊢ ${p}` : `${p} → ${q}; ${p} ⊢ ${q}`,
  };
  const parsed = parseLogicInput(expressions[kind]);
  if (!parsed.ok) throw new Error(parsed.reason);
  const solution = solveLogic(parsed.problem);
  const counter = kind === 'counterworld' || kind === 'validity';
  const target = counter ? solution.falseWorlds : solution.trueWorlds;
  const prompt = `${counter ? 'Mark every counter-world' : 'Mark every world where the whole formula is true'} for ${parsed.problem.expression}, then classify it.${kind === 'validity' ? ' A counter-world has all premises true and the conclusion false.' : ''}`;
  const hints: [string, string, string] = [
    'Keep each row’s input switches fixed; evaluate the complete formula.',
    counter
      ? 'An implication fails only when its left side is true and its right side is false.'
      : 'NOT flips one input, AND needs both, and OR needs at least one.',
    `The result is ${solution.answer}. Mark ${target.length ? target.map((id) => worldDescription(solution.rows.find((row) => row.id === id)!)).join('; ') : 'no worlds'}.`,
  ];
  return {
    id: `logic-${kind}-${unsigned}`,
    kind,
    seed: unsigned,
    problem: parsed.problem,
    solution,
    target,
    setup: { selectedWorlds: [] },
    prompt,
    hints,
    xp: 30,
    goal: (state) =>
      validLogicBuildState(state, solution) &&
      state.classification === solution.answer &&
      sameWorlds(state.selectedWorlds, target),
  };
}
export interface LogicBoss extends LabBoss<LogicBuildState> {
  problem: LogicProblem;
  solution: LogicSolution;
  target: string[];
  codeOptions: string[];
}
export function createLogicBoss(seed: number): LogicBoss {
  const practice = createLogicChallenge('counterworld', seed),
    { solution, problem } = practice;
  const correct = solution.code.sql;
  const [p, q] = problem.variables;
  const codeOptions = [
    correct,
    `SELECT * FROM worlds WHERE (${p} AND ${q});`,
    `SELECT * FROM worlds WHERE (${p} OR ${q});`,
  ];
  const read = (state: LogicBuildState) =>
    validLogicBuildState(state, solution) && state.classification === solution.answer;
  const worlds = (state: LogicBuildState) =>
    validLogicBuildState(state, solution) && sameWorlds(state.selectedWorlds, practice.target);
  const code = (state: LogicBuildState) =>
    validLogicBuildState(state, solution) && state.code === correct;
  return {
    id: `logic-boss-${seed >>> 0}`,
    prompt:
      'Classify the implication, mark exactly its counter-worlds, then choose the same Boolean rule in SQL.',
    problem,
    solution,
    target: practice.target,
    setup: { selectedWorlds: [] },
    codeOptions,
    hints: practice.hints,
    xp: 100,
    phases: [
      {
        id: 'read',
        title: 'Read the formula',
        prompt: `Classify ${problem.expression}.`,
        goal: read,
      },
      {
        id: 'worlds',
        title: 'Build the counter-worlds',
        prompt: 'Mark every row where the implication is false, and no other row.',
        goal: worlds,
      },
      {
        id: 'code',
        title: 'Connect the query',
        prompt:
          'Choose the SQL predicate equivalent to the complete formula. Boolean columns contain no NULL values.',
        goal: code,
      },
    ],
    goal: (state) => read(state) && worlds(state) && code(state),
  };
}
