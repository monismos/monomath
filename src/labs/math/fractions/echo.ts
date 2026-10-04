import { createFractionChallenge } from './challenge';
import { fractionText, isEquivalentAnswer } from '../../../core/solvers/fractions';
import { registerEchoProvider } from '../../../core/gamification/echoProviders';
export function installFractionEchoes() {
  return registerEchoProvider('fractions',seed=>{
    const challenge=createFractionChallenge(['add','subtract','multiply','divide','simplify'][seed%5] as 'add',seed);
    const a=challenge.givens.a,b=challenge.givens.b;
    const op={add:'+',subtract:'−',multiply:'×',divide:'÷',simplify:''}[challenge.kind as 'add'];
    return {prompt:`Find the exact value: ${fractionText(a)} ${op} ${b?fractionText(b):'(lowest terms)'}.`,check:answer=>isEquivalentAnswer(answer,challenge.target),hints:challenge.hints,explanation:`The exact answer is ${fractionText(challenge.target)}. Equal cuts keep the whole fixed.`};
  });
}
