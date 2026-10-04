import type { LabDefinition } from '../../../core/labs/types';
import type { SceneSpec } from '../../../core/scene/spec';
import {
  matrixSolver,
  type MatrixProblem,
  type MatrixSolution,
} from '../../../core/solvers/matrices';
import {
  createMatrixChallenge,
  createMatrixBoss,
  matrixChallengeKinds,
  type MatrixBuild,
} from './challenge';
export const matrixExamples = [
  { id: 'shear', title: 'Shear the unit square', input: 'transform([1,1;0,1])' },
  { id: 'multiply', title: 'A row meets a column', input: 'multiply([1,2;3,4],[2,0;1,2])' },
  { id: 'reflection', title: 'Flip orientation', input: 'determinant([0,1;1,0])' },
  { id: 'inverse', title: 'Reverse the shear', input: 'inverse([2,1;1,1])' },
  { id: 'solve', title: 'Two lines, one point', input: 'solve([2,1;1,-1],[5;1])' },
  { id: 'cube', title: 'Stretch and flip a cube', input: 'transform([1,1,0;0,2,0;0,0,-1])' },
  { id: 'add', title: 'Add corresponding cells', input: 'add([1,2;0,1],[2,0;1,2])' },
  { id: 'transpose', title: 'Swap row and column', input: 'transpose([1,2;3,4])' },
];
export function createMatrixDefinition(
  scenes: SceneSpec[],
): LabDefinition<MatrixProblem, MatrixBuild, MatrixSolution> {
  return {
    id: 'matrices',
    title: 'Matrices and transformations',
    domain: 'math',
    prerequisites: ['summation'],
    examples: matrixExamples,
    scenes,
    solvers: [matrixSolver],
    challenges: matrixChallengeKinds.map((kind, i) => createMatrixChallenge(kind, 77 + i)),
    boss: createMatrixBoss(2026),
    predicts: scenes.flatMap((scene) =>
      scene.steps.flatMap((step) => (step.predict ? [step.predict] : [])),
    ),
    dialDefaults: { explorer: 0, scholar: 1, researcher: 2 },
    bridges: [
      {
        id: 'matrix-sum',
        labId: 'summation',
        title: 'Every output is a sum',
        description:
          'The inner loop adds one product for each paired coordinate. A row-by-column product is a finite sum.',
      },
      {
        id: 'matrix-fractions',
        labId: 'fractions',
        title: 'An inverse keeps exact ratios',
        description:
          'Divide the adjugate by the determinant. Exact fractions avoid rounding away a successful composition.',
      },
      {
        id: 'matrix-functions',
        labId: 'functions',
        title: 'A linear map is a function',
        description: 'Every vector has one image. Matrix multiplication composes two functions.',
      },
      {
        id: 'matrix-code',
        labId: 'memory',
        title: 'Three indices, one loop machine',
        description: 'Rows, columns and shared coordinates become the i, j and k loops.',
      },
    ],
    mascotScript: {
      intro: [
        'Each column moves one basis vector.',
        'The square measures signed area.',
        'A matrix can be a space machine.',
      ],
      hint1: [
        'Follow the row and column.',
        'Swap indices to transpose.',
        'Check whether a pivot is missing.',
      ],
      hint2: [
        'Add every paired product.',
        'Negative area means reversed orientation.',
        'Try composing with your inverse.',
      ],
      hint3: [
        'Build every coordinate before checking.',
        'A zero determinant collapses dimension.',
        'Substitute into every original equation.',
      ],
      correct: [
        'Your cells and map agree.',
        'Every basis image is connected.',
        'The composition returns the identity.',
      ],
      wrong: [
        'Try another coordinate.',
        'Check one paired product at a time.',
        'An exact fraction can help.',
      ],
      idle: [
        'Unfold the blocks into a lattice.',
        'Look for directions that only stretch.',
        'Compare the two cell traversal orders.',
      ],
    },
  };
}
