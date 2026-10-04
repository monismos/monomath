import type { LabDefinition } from '../../../core/labs/types';
import type { SceneSpec } from '../../../core/scene/spec';
import { setsSolver } from '../../../core/solvers/sets';
import type { SetsProblem, SetsSolution } from '../../../core/solvers/sets';
import { createSetsBoss, createSetsChallenge, setsChallengeKinds } from './challenge';
import type { SetsBoss, SetsBuildState, SetsChallenge } from './challenge';
export const setsExamples = [
  { id: 'union', title: 'Either membership', input: 'A ∪ B' },
  { id: 'nested', title: 'Meet a combined set', input: 'A ∩ (B ∪ C)' },
  { id: 'complement', title: 'Everything outside the difference', input: '(A \\ B)ᶜ' },
  { id: 'builder', title: 'Filter through a sieve', input: '{x | x even, x < 10}' },
];
export interface SetsDefinition extends LabDefinition<SetsProblem, SetsBuildState, SetsSolution> {
  challenges: SetsChallenge[];
  boss: SetsBoss;
}
export function createSetsDefinition(scenes: SceneSpec[]): SetsDefinition {
  return {
    id: 'sets',
    title: 'Sets, memberships and connections',
    domain: 'math',
    prerequisites: ['fractions'],
    bridges: [
      {
        id: 'sets-logic',
        labId: 'logic',
        title: 'Membership becomes truth',
        description:
          'An element’s membership is a true or false statement. Intersection follows AND, union follows OR, and complement follows NOT.',
      },
      {
        id: 'sets-fractions',
        labId: 'fractions',
        title: 'A subset becomes a share',
        description:
          'Count selected members of a finite universe to form an exact fraction. Keep every universe member the same counting unit.',
      },
      {
        id: 'sets-summation',
        labId: 'summation',
        title: 'Count through a sum',
        description:
          'Give each member a 1 when it passes the set predicate and 0 otherwise. Summing these indicators counts the selected set.',
      },
      {
        id: 'sets-functions',
        labId: 'functions',
        title: 'One output becomes a graph',
        description:
          'A function relation assigns one output to each input. A graph places those input-output pairs on the same coordinate table.',
      },
      {
        id: 'sets-code',
        labId: 'memory',
        title: 'Rows follow the same operations',
        description:
          'SQL UNION, INTERSECT, EXCEPT and CROSS JOIN use the same membership and ordered-pair rules shown by this lab.',
      },
    ],
    examples: setsExamples,
    scenes,
    solvers: [setsSolver],
    challenges: setsChallengeKinds.map((kind, i) => createSetsChallenge(kind, 42 + i)),
    boss: createSetsBoss(2026),
    predicts: scenes.flatMap((scene) =>
      scene.steps.flatMap((step) => (step.predict ? [step.predict] : [])),
    ),
    mascotScript: {
      intro: [
        'A set tells us where each element belongs.',
        'These bubbles show memberships you can move.',
        'One universe keeps every complement well defined.',
      ],
      hint1: [
        'Follow one element through the whole expression.',
        'Keep the requested input sets fixed.',
        'Check the universe before finding what lies outside.',
      ],
      hint2: [
        'Intersection asks for both memberships together.',
        'A union keeps either membership without duplicates.',
        'A difference keeps the left membership only.',
      ],
      hint3: [
        'Every input needs one output in a function.',
        'The empty set belongs to every power set.',
        'A sieve accepts only elements passing every condition.',
      ],
      correct: [
        'Your selected tokens follow the exact membership rule.',
        'The picture and symbols describe the same set.',
        'Those connections preserve every requested membership.',
      ],
      wrong: [
        'Your current memberships show what to adjust.',
        'Keep exploring the rule one element at a time.',
        'Check the input memberships before changing the result.',
      ],
      idle: [
        'Try moving one element between the bubbles.',
        'The cube reveals all possible subset choices.',
        'A grid turns memberships into ordered pairs.',
      ],
    },
    dialDefaults: { explorer: 0.3, scholar: 1.4, researcher: 2.5 },
  };
}
