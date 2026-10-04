import type { LabDefinition } from '../../../core/labs/types';
import type { SceneSpec } from '../../../core/scene/spec';
import {
  functionSolver,
  type FunctionProblem,
  type FunctionSolution,
} from '../../../core/solvers/functions';
import {
  createFunctionChallenge,
  createFunctionBoss,
  functionChallengeKinds,
  type FunctionBuild,
} from './challenge';
export const functionExamples = [
  { id: 'line', title: 'A constant rise', input: 'y=2*x+1' },
  { id: 'roots', title: 'Find two crossings', input: 'x^2-4*x+3=0' },
  { id: 'derivative', title: 'Slope under the ball', input: 'derivative(3*x^2+2*x)' },
  { id: 'integral', title: 'Thin the rectangles', input: 'integral(x^2,0,3)' },
  { id: 'sine', title: 'A repeating hill', input: 'y=2*sin(x)+1' },
  { id: 'exponential', title: 'A growing hill', input: 'y=exp(x)' },
  { id: 'surface', title: 'Slice a height surface', input: 'z=x^2+y^2' },
];
export function createFunctionDefinition(
  scenes: SceneSpec[],
): LabDefinition<FunctionProblem, FunctionBuild, FunctionSolution> {
  return {
    id: 'functions',
    title: 'Functions and graphs',
    domain: 'math',
    prerequisites: ['matrices'],
    examples: functionExamples,
    scenes,
    solvers: [functionSolver],
    challenges: functionChallengeKinds.map((kind, i) => createFunctionChallenge(kind, 77 + i)),
    boss: createFunctionBoss(2026),
    predicts: scenes.flatMap((scene) =>
      scene.steps.flatMap((step) => (step.predict ? [step.predict] : [])),
    ),
    dialDefaults: { explorer: 0, scholar: 1, researcher: 2 },
    bridges: [
      {
        id: 'functions-sum',
        labId: 'summation',
        title: 'An integral begins as a sum',
        description:
          'Every signed rectangle contributes height times width. The Hopper can add those finite contributions.',
      },
      {
        id: 'functions-matrix',
        labId: 'matrices',
        title: 'A matrix is a coordinate rule',
        description:
          'A linear map assigns one vector to another. Function composition and matrix multiplication share the same order.',
      },
      {
        id: 'functions-general',
        labId: 'equations',
        title: 'Explore your own equation',
        description:
          'The equation workspace draws a broader range of real curves, implicit contours and surfaces with its budgeted local worker.',
      },
      {
        id: 'functions-motion',
        labId: 'kinematics',
        title: 'Slope can mean velocity',
        description:
          'Position as a function of time has a slope that describes velocity. Signed area under velocity measures displacement.',
      },
    ],
    mascotScript: {
      intro: [
        'Follow one input into one output.',
        'The ball carries a coordinate pair.',
        'A thin rectangle adds signed area.',
      ],
      hint1: [
        'Read the rule before placing a point.',
        'A root has zero output.',
        'The tangent must pass through the ball.',
      ],
      hint2: [
        'Check each midpoint height.',
        'Split the linear term into two strips.',
        'Hold one surface input still.',
      ],
      hint3: [
        'Keep the sign below the floor.',
        'Restore the corner counted twice.',
        'Compare rise with one unit of run.',
      ],
      correct: [
        'Your rule and coordinates agree.',
        'The tangent follows the local change.',
        'Your rectangles add to the signed sum.',
      ],
      wrong: [
        'Move one point and check again.',
        'A claim needs the actual construction.',
        'Try a smaller change in the rule.',
      ],
      idle: [
        'Roll the ball along the hill.',
        'Thin the rectangles with the n slider.',
        'Slide the plane across the surface.',
      ],
    },
  };
}
