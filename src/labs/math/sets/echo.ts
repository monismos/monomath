import { registerEchoProvider } from '../../../core/gamification/echoProviders';
import { formatSet, parseSetAnswer, sameSet } from '../../../core/solvers/sets';
import { createSetsChallenge } from './challenge';
export function installSetsEchoes() {
  return registerEchoProvider('sets', (seed) => {
    const kinds = [
        'union',
        'intersection',
        'difference',
        'complement',
        'symmetric',
        'builder',
      ] as const,
      challenge = createSetsChallenge(kinds[(seed >>> 0) % kinds.length], seed);
    return {
      prompt: `Find ${challenge.problem.expression}; A=${formatSet(challenge.givens.A)}, B=${formatSet(challenge.givens.B)}, U=${formatSet(challenge.givens.U)}.`,
      check: (answer) => {
        const result = parseSetAnswer(answer);
        return !!result && sameSet(result, challenge.target);
      },
      hints: challenge.hints,
      explanation: `The exact finite result is ${formatSet(challenge.target)}. Membership follows the complete expression inside the listed universe.`,
    };
  });
}
