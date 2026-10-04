import { registerEchoProvider } from '../../../core/gamification/echoProviders';
import { closeNumber } from '../../../core/solvers/realNumbers';
import { functionLineSeed } from './seed';
export function installFunctionEchoes() {
  return registerEchoProvider('functions', (seed) => {
    const { slope, intercept } = functionLineSeed(seed);
    return {
      prompt: `Find the slope of y=${slope}*x+(${intercept})`,
      check: (answer) => closeNumber(answer, slope),
      hints: [
        'Compare two outputs one input step apart.',
        'Slope is rise divided by run.',
        `The slope is ${slope}.`,
      ],
      explanation: `Each unit of input changes the output by ${slope}.`,
    };
  });
}
