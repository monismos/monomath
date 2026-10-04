import type { LabDefinition } from '../../core/labs/types';
import type { SceneSpec } from '../../core/scene/spec';
import { logicSolver } from '../../core/solvers/logic';
import type { LogicProblem, LogicSolution } from '../../core/solvers/logic';
import { createLogicBoss, createLogicChallenge, logicChallengeKinds } from './challenge';
import type { LogicBuildState, LogicChallenge } from './challenge';
export const logicExamples = [
  { id: 'implication', title: 'A conditional claim', input: '(p → q) ∧ ¬q' },
  { id: 'de-morgan', title: 'An equivalence', input: '¬(p ∧ q) ↔ (¬p ∨ ¬q)' },
  { id: 'tautology', title: 'Every world lights', input: 'p ∨ ¬p' },
  { id: 'contradiction', title: 'No world lights', input: 'p ∧ ¬p' },
  { id: 'valid-argument', title: 'A valid connection', input: 'p → q; p ⊢ q' },
  { id: 'invalid-argument', title: 'Find the counter-world', input: 'p → q; q ⊢ p' },
];
export interface LogicDefinition extends LabDefinition<
  LogicProblem,
  LogicBuildState,
  LogicSolution
> {
  challenges: LogicChallenge[];
  boss: ReturnType<typeof createLogicBoss>;
}
export function createLogicDefinition(scenes: SceneSpec[]): LogicDefinition {
  return {
    id: 'logic',
    title: 'Truth Lanterns: propositional logic',
    domain: 'logic',
    prerequisites: ['sets'],
    bridges: [
      {
        id: 'logic-sets',
        labId: 'sets',
        title: 'Membership becomes truth',
        description:
          'Each set membership is a proposition. Intersection behaves like AND, union like OR and complement like NOT.',
      },
      {
        id: 'logic-summation',
        labId: 'summation',
        title: 'Count lit worlds',
        description: 'Indicator functions turn truth values into 1s and 0s that can be summed.',
      },
      {
        id: 'logic-code',
        labId: 'memory',
        title: 'Gates become code',
        description:
          'The same finite truth table can be written as Python conditions or SQL predicates.',
      },
    ],
    examples: logicExamples,
    scenes,
    solvers: [logicSolver],
    challenges: logicChallengeKinds.map((kind, index) => createLogicChallenge(kind, 81 + index)),
    boss: createLogicBoss(2026),
    predicts: scenes.flatMap((scene) =>
      scene.steps.flatMap((step) => (step.predict ? [step.predict] : [])),
    ),
    mascotScript: {
      intro: [
        'Every world is one assignment of truth values.',
        'Lanterns make hidden counter-worlds visible.',
        'Follow each gate before you name the whole pattern.',
      ],
      hint1: [
        'List every variable assignment once.',
        'Implication is dark only for true → false.',
        'A contradiction cannot light any world.',
      ],
      hint2: [
        'Negation flips one truth value.',
        'Conjunction needs both inputs lit.',
        'Equivalence compares the two sides.',
      ],
      hint3: [
        'A counter-world is enough to disprove “always”.',
        'Mark the exact rows, then read the pattern.',
        'Write the same rule in SQL or Python.',
      ],
      correct: [
        'Your lanterns match the truth table.',
        'The classification and worlds agree.',
        'That gate connection preserves the meaning.',
      ],
      wrong: [
        'Check one world at a time.',
        'Look for a dark counter-world.',
        'The table is a map, not a guess.',
      ],
      idle: [
        'Try the smallest formula first.',
        'Switch to the gate view when the table feels crowded.',
        'Select a lantern to tether it to the symbol.',
      ],
    },
    dialDefaults: { explorer: 0.3, scholar: 1.4, researcher: 2.5 },
  };
}
