import { create } from 'zustand';
import type { Vec3 } from '../scene/spec';
export const useStageHold = create<{ paused: boolean; setPaused: (paused: boolean) => void }>(
  (set) => ({ paused: false, setPaused: (paused) => set({ paused }) }),
);
export let stageHit: { entityId: string; p: Vec3 } | null = null;
export function setStageHit(hit: typeof stageHit) {
  stageHit = hit;
}
