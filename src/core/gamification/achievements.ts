import type { GameData, CosmeticId } from './types';
import { isMastered } from './types';
export interface Achievement {
  id: string;
  title: string;
  description: string;
  earned: (data: GameData) => boolean;
  cosmetic?: CosmeticId;
}
const awards = (d: GameData, kind: string, unhinted = false) =>
  Object.values(d.ledger).filter((e) => e.kind === kind && (!unhinted || !e.hinted)).length;
const actions = (d: GameData, kind: string) =>
  Object.values(d.events).filter((e) => e.kind === kind).length;
function fullDial(d: GameData) {
  const topics = new Map<string, Set<string>>();
  Object.values(d.events)
    .filter((e) => e.kind === 'dial')
    .forEach((e) => {
      const lab = e.labId ?? e.key.split(':')[0];
      const layers = topics.get(lab) ?? new Set<string>();
      ['thing', 'shape', 'symbol', 'code'].forEach((layer) => {
        if (e.key.split(':').includes(layer)) layers.add(layer);
      });
      topics.set(lab, layers);
    });
  return [...topics.values()].some((layers) => layers.size === 4);
}
export const achievements: Achievement[] = [
  {
    id: 'first-hold',
    title: 'First Hold',
    description: 'Save your first notelet.',
    earned: (d) => awards(d, 'notelet') >= 1,
    cosmetic: 'sunhat',
  },
  {
    id: 'scribe-1',
    title: 'Scribe I',
    description: 'Save 5 different notelets.',
    earned: (d) => awards(d, 'notelet') >= 5,
  },
  {
    id: 'scribe-2',
    title: 'Scribe II',
    description: 'Save 25 different notelets.',
    earned: (d) => awards(d, 'notelet') >= 25,
  },
  {
    id: 'scribe-3',
    title: 'Scribe III',
    description: 'Save 100 different notelets.',
    earned: (d) => awards(d, 'notelet') >= 100,
  },
  {
    id: 'observer',
    title: 'Good Look',
    description: 'Finish one worked example.',
    earned: (d) => awards(d, 'watch') >= 1,
  },
  {
    id: 'observer-5',
    title: 'Patient Eye',
    description: 'Finish 5 different worked examples.',
    earned: (d) => awards(d, 'watch') >= 5,
  },
  {
    id: 'predict-5',
    title: 'Perfect Prediction ×5',
    description: 'Make 5 correct predictions without hints.',
    earned: (d) => awards(d, 'predict', true) >= 5,
    cosmetic: 'starcap',
  },
  {
    id: 'play-first',
    title: 'Hands On',
    description: 'Reach a real Play milestone.',
    earned: (d) => awards(d, 'play') >= 1,
  },
  {
    id: 'play-5',
    title: 'Tinkerer',
    description: 'Reach 5 different Play milestones.',
    earned: (d) => awards(d, 'play') >= 5,
  },
  {
    id: 'prove-first',
    title: 'Show Your Work',
    description: 'Solve a scene-state Prove challenge.',
    earned: (d) => awards(d, 'prove') >= 1,
  },
  {
    id: 'prove-10',
    title: 'Steady Builder',
    description: 'Solve 10 different Prove challenges.',
    earned: (d) => awards(d, 'prove') >= 10,
  },
  {
    id: 'boss-first',
    title: 'Big Picture',
    description: 'Complete every checkpoint of a Boss puzzle.',
    earned: (d) => awards(d, 'boss') >= 1,
  },
  {
    id: 'boss-clear',
    title: 'Zero-Hint Boss',
    description: 'Complete a Boss puzzle without hints.',
    earned: (d) => awards(d, 'boss', true) >= 1,
  },
  {
    id: 'echo-first',
    title: 'Welcome Back',
    description: 'Recall one due Echo successfully.',
    earned: (d) => awards(d, 'echo') >= 1,
  },
  {
    id: 'echo-10',
    title: 'Long Memory',
    description: 'Recall 10 due Echoes successfully.',
    earned: (d) => awards(d, 'echo') >= 10,
  },
  {
    id: 'mastery',
    title: 'A Clear Gem',
    description: 'Fill all facets and recall on two different days.',
    earned: (d) => Object.values(d.gems).some(isMastered),
  },
  {
    id: 'dial',
    title: 'Dial Master',
    description: 'Visit all four layers of one topic.',
    earned: fullDial,
  },
  {
    id: 'tether',
    title: 'Tether Tapper',
    description: 'Follow 10 symbols or objects.',
    earned: (d) => actions(d, 'tether') >= 10,
  },
  {
    id: 'flatlander',
    title: 'Flatlander',
    description: 'Switch between 2D and 3D 5 times.',
    earned: (d) => actions(d, 'dimension') >= 5,
  },
  {
    id: 'bridges',
    title: 'Bridge Builder',
    description: 'Follow 3 different Bridges.',
    earned: (d) =>
      new Set(
        Object.values(d.events)
          .filter((e) => e.kind === 'bridge')
          .map((e) => e.key),
      ).size >= 3,
  },
  {
    id: 'bug',
    title: 'Bug Squasher',
    description: 'Fix and verify a programming challenge.',
    earned: (d) => actions(d, 'bug') >= 1,
  },
  {
    id: 'quiet',
    title: 'Quiet Company',
    description: 'Choose the guide’s quiet mode.',
    earned: (d) => actions(d, 'quiet') >= 1,
  },
  {
    id: 'bond',
    title: 'Workshop Friend',
    description: 'Share 20 distinct moments with your guide.',
    earned: (d) => actions(d, 'bond') >= 20,
    cosmetic: 'mint',
  },
  {
    id: 'rhythm',
    title: 'Little Rhythm',
    description: 'Learn on 3 consecutive days; a freeze can help.',
    earned: (d) => d.rhythm.best >= 3,
  },
];
export function cosmeticUnlocked(data: GameData, cosmetic: CosmeticId): boolean {
  return (
    cosmetic === 'plain' || achievements.some((a) => a.cosmetic === cosmetic && a.earned(data))
  );
}
