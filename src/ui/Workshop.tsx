import { demo } from '../labs/demo';
import { Explainer } from './Explainer';
import { useEffect } from 'react';
import { useLesson } from '../core/scene/store';
export default function Workshop() {
  useEffect(() => {
    if (useLesson.getState().labId !== 'demo')
      useLesson
        .getState()
        .set({ labId: 'demo', problem: '3/4', step: 0, selection: null, variant: undefined });
  }, []);
  return <Explainer spec={demo} />;
}
