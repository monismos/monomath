import { registerEchoProvider } from '../../core/gamification/echoProviders';
import { createLogicChallenge, logicChallengeKinds } from './challenge';
import { parseLogicInput, solveLogic } from '../../core/solvers/logic';
export function installLogicEchoes() {
  return registerEchoProvider('logic', (seed) => {
    const challenge = createLogicChallenge(
      logicChallengeKinds[(seed >>> 0) % logicChallengeKinds.length],
      seed,
    );
    return {
      prompt: `Classify ${challenge.problem.expression}.`,
      choices: challenge.problem.argument
        ? ['valid', 'invalid']
        : ['tautology', 'contradiction', 'contingent'],
      check: (answer) => {
        const parsed = parseLogicInput(challenge.problem.expression);
        return parsed.ok && solveLogic(parsed.problem).answer === answer.trim().toLowerCase();
      },
      hints: challenge.hints,
      explanation: `The complete truth table classifies it as ${challenge.solution.answer}.`,
    };
  });
}
