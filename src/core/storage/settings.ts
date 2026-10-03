import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeId } from '../themes/themes';
export interface Settings {
  theme: ThemeId;
  dimension: '2d' | '3d';
  level: 'explorer' | 'scholar' | 'researcher';
  reducedMotion: boolean;
  holdDuration: number;
  mascot: 'auto' | 'moni' | 'lumi' | 'sig' | 'vex' | 'bit' | 'quiet' | 'off';
  sound: boolean;
  haptics: boolean;
  textSize: number;
  dock: 'left' | 'right';
  flatCarousel: boolean;
  speed: number;
  tutorialComplete: boolean;
  tutorialStep: number;
  speech: boolean;
}
const defaults: Settings = {
  theme: matchMedia('(prefers-color-scheme: dark)').matches ? 'blueprint' : 'bench',
  dimension: '3d',
  level: 'explorer',
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  holdDuration: 500,
  mascot: 'auto',
  sound: false,
  haptics: false,
  textSize: 100,
  dock: 'left',
  flatCarousel: false,
  speed: 1,
  tutorialComplete: false,
  tutorialStep: 0,
  speech: false,
};
export const useSettings = create<Settings & { set: (patch: Partial<Settings>) => void }>()(
  persist((set) => ({ ...defaults, set: (patch) => set(patch) }), {
    name: 'monomath-settings',
    version: 1,
  }),
);
