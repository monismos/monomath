import { registerEchoProvider } from '../../../core/gamification/echoProviders';
import { numericMatches } from '../../../core/solvers/summation';
import { fractionText } from '../../../core/solvers/fractions';
import { createSummationChallenge, summationChallengeKinds } from './challenge';
export function installSummationEchoes() {
  return registerEchoProvider('summation', (seed) => {
    const challenge = createSummationChallenge(
      summationChallengeKinds[(seed >>> 0) % summationChallengeKinds.length],
      seed,
    );
    return {
      prompt: `${challenge.kind === 'mean' ? 'Find the exact mean' : challenge.kind === 'variance' ? 'Find the exact population variance' : 'Find the inclusive sum'}: ${challenge.problem.expression}`,
      check: (answer) => numericMatches(answer, challenge.target),
      hints: challenge.hints,
      explanation: `The exact value is ${fractionText(challenge.target)}.`,
    };
  });
}
