import { registerEchoProvider } from '../../../core/gamification/echoProviders';
import { exactMatrixNumber } from '../../../core/solvers/matrices';
import { fractionText } from '../../../core/solvers/fractions';
import { createMatrixChallenge } from './challenge';
export function installMatrixEchoes() {
  return registerEchoProvider('matrices', (seed) => {
    const challenge = createMatrixChallenge('determinant', seed);
    return {
      prompt: 'Find the signed area scale: ' + challenge.problem.expression,
      check: (answer) => exactMatrixNumber(answer, challenge.solution.determinant),
      hints: challenge.hints,
      explanation:
        'The determinant is ' +
        fractionText(challenge.solution.determinant) +
        '. Its sign records orientation.',
    };
  });
}
