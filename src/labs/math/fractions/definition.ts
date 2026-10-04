import type { LabDefinition } from '../../../core/labs/types';
import type { SceneSpec } from '../../../core/scene/spec';
import { fractionsSolver } from '../../../core/solvers/fractions';
import type { FractionProblem, FractionSolution } from '../../../core/solvers/fractions';
import { createFractionBoss, createFractionChallenge, fractionChallengeKinds } from './challenge';
import type { FractionBoss, FractionBuildState, FractionChallenge } from './challenge';

export const fractionsExamples = [
  { id: 'add', title: 'Add with common cuts', input: '3/4 + 1/6' },
  { id: 'subtract', title: 'Remove equal parts', input: '5/8 − 1/4' },
  { id: 'multiply', title: 'Find the overlap', input: '2/3 × 3/5' },
  { id: 'divide', title: 'Count measuring bars', input: '3/4 ÷ 1/8' },
  { id: 'mixed', title: 'Group complete wholes', input: 'mixed 7/4' },
  { id: 'simplify', title: 'Group equivalent cuts', input: 'simplify 12/18' },
];

export interface FractionsDefinition extends LabDefinition<
  FractionProblem,
  FractionBuildState,
  FractionSolution
> {
  challenges: FractionChallenge[];
  boss: FractionBoss;
}

/** The UI supplies its generated scenes so content never imports a renderer. */
export function createFractionsDefinition(scenes: SceneSpec[]): FractionsDefinition {
  return {
    id: 'fractions',
    title: 'Fractions and parts of a whole',
    domain: 'math',
    prerequisites: [],
    bridges: [
      {
        id: 'fractions-sets',
        labId: 'sets',
        title: 'Parts become subsets',
        description:
          'Selecting equal pieces of a whole is a concrete subset. An intersection selects pieces shared by two selections, just like the multiplication overlap.',
      },
      {
        id: 'fractions-functions',
        labId: 'functions',
        title: 'Ratios become points',
        description:
          'A fraction is an exact number. Place it on a number line, or use that ratio as the slope connecting horizontal and vertical changes.',
      },
      {
        id: 'fractions-equations',
        labId: 'equations',
        title: 'Measure a ratio on a graph',
        description:
          'Enter y = 3/4 in the equation workspace. Every point has the same height, connecting selected area to a fixed numerical value.',
      },
      {
        id: 'fractions-summation',
        labId: 'summation',
        title: 'Pieces become a sum',
        description:
          'Adding n selected pieces of size 1/d is the finite sum n × (1/d). The hopper counts the same exact amount one term at a time.',
      },
    ],
    examples: fractionsExamples,
    scenes,
    solvers: [fractionsSolver],
    challenges: fractionChallengeKinds.map((kind, index) =>
      createFractionChallenge(kind, 42 + index),
    ),
    boss: createFractionBoss(2026),
    predicts: scenes.flatMap((scene) =>
      scene.steps.flatMap((step) => (step.predict ? [step.predict] : [])),
    ),
    mascotScript: {
      intro: [
        'One whole can wear many different cuts.',
        'Count pieces, and keep the whole fixed.',
        'Let us give every part a place.',
      ],
      hint1: [
        'Keep the size of one whole unchanged.',
        'Check which amount each piece represents.',
        'Follow the selected pieces before counting.',
      ],
      hint2: [
        'Match the cuts before combining the parts.',
        'Two selected directions reveal their shared overlap.',
        'A measuring unit asks how many fit.',
      ],
      hint3: [
        'Count the highlighted equal pieces carefully.',
        'Compare the top count with the cuts.',
        'Use the exact ratio shown by this model.',
      ],
      correct: [
        'Your pieces and symbols agree.',
        'That arrangement preserves the exact amount.',
        'You made the relationship visible.',
      ],
      wrong: [
        'Keep exploring; every move teaches the model.',
        'Your current pieces reveal what to adjust.',
        'Check the unit, then try another arrangement.',
      ],
      idle: [
        'Try changing the shape while keeping its value.',
        'The dial connects the pieces to symbols.',
        'Save a note about the connection you noticed.',
      ],
    },
    dialDefaults: { explorer: 0.3, scholar: 1.4, researcher: 2.5 },
  };
}
