import type { LabDefinition } from '../../../core/labs/types';
import type { SceneSpec } from '../../../core/scene/spec';
import {
  summationSolver,
  type SummationProblem,
  type SummationSolution,
} from '../../../core/solvers/summation';
import {
  createSummationBoss,
  createSummationChallenge,
  summationChallengeKinds,
  type SummationBuildState,
  type SummationChallenge,
} from './challenge';
export const summationExamples = [
  { id: 'linear', title: 'Build 2i+1', input: 'sum(i=1..5, 2i+1)' },
  { id: 'squares', title: 'Sum square terms', input: 'sum(i=1..5, i^2)' },
  { id: 'pairing', title: 'Gauss pairs', input: 'sum(i=1..10, i)' },
  { id: 'double', title: 'Fill a double-sum grid', input: 'sum(i=1..3, j=1..3, i+j)' },
  { id: 'data', title: 'Balance and square the distances', input: 'data(4,8,6,5,3)' },
];
export interface SummationDefinition extends LabDefinition<
  SummationProblem,
  SummationBuildState,
  SummationSolution
> {
  challenges: SummationChallenge[];
  boss: ReturnType<typeof createSummationBoss>;
}
export function createSummationDefinition(scenes: SceneSpec[]): SummationDefinition {
  return {
    id: 'summation',
    title: 'Σ Summation: the Hopper',
    domain: 'stats',
    prerequisites: ['logic'],
    examples: summationExamples,
    scenes,
    solvers: [summationSolver],
    challenges: summationChallengeKinds.map((kind, index) =>
      createSummationChallenge(kind, 83 + index),
    ),
    boss: createSummationBoss(2026),
    predicts: scenes.flatMap((scene) =>
      scene.steps.flatMap((step) => (step.predict ? [step.predict] : [])),
    ),
    bridges: [
      {
        id: 'sum-fractions',
        labId: 'fractions',
        title: 'Exact averages',
        description:
          'A mean is an exact fraction: the total divided by the number of equal weights.',
      },
      {
        id: 'sum-functions',
        labId: 'functions',
        title: 'Rectangles become an integral',
        description:
          'A Riemann sum adds function-height rectangles. Increasing their count connects this finite machine to an integral.',
      },
      {
        id: 'sum-code',
        labId: 'memory',
        title: 'The index becomes a loop',
        description:
          'Python range stops before its endpoint, so an inclusive upper bound b uses range(a,b+1). R sum and SQL SUM aggregate the same terms.',
      },
      {
        id: 'sum-distributions',
        labId: 'distributions',
        title: 'Average squared distances',
        description:
          'Mean, variance and standard deviation describe a distribution. Population variance divides by n.',
      },
      {
        id: 'sum-logic',
        labId: 'logic',
        title: 'Count lit worlds',
        description:
          'Use 1 for true and 0 for false; summing these indicator values counts a finite truth set.',
      },
    ],
    mascotScript: {
      intro: [
        'Every index makes one contribution.',
        'The Hopper remembers every term.',
        'An average balances equal weights.',
      ],
      hint1: [
        'Include the upper bound.',
        'The index and term are different.',
        'Count repeated observations separately.',
      ],
      hint2: [
        'Substitute before adding.',
        'Pair the first and last terms.',
        'Square each distance from the mean.',
      ],
      hint3: [
        'Check every included contribution.',
        'Population variance divides by the count.',
        'The code needs the same inclusive bounds.',
      ],
      correct: [
        'Your blocks and claim agree.',
        'Every contribution arrived exactly once.',
        'That loop preserves the sum.',
      ],
      wrong: [
        'Keep exploring one contribution at a time.',
        'Check the bounds and block values.',
        'Place the mean pin before squaring distances.',
      ],
      idle: [
        'Try the paired view.',
        'Compare row and column order.',
        'Tap a term to follow its symbol.',
      ],
    },
    dialDefaults: { explorer: 0, scholar: 1.5, researcher: 2.7 },
  };
}
