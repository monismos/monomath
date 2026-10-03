export const gameConfig = {
  xp: {
    watch: 5,
    predict: 10,
    hintedPredict: 5,
    play: 5,
    prove: 25,
    boss: 100,
    echo: 8,
    notelet: 3,
  },
  dailyNoteLimit: 5,
  levelThreshold: (level: number) => Math.ceil(100 * Math.max(0, level) ** 1.4),
  echoDays: [1, 3, 7, 14] as const,
  weeklyFreezes: 1,
} as const;
export type AwardKind = Exclude<keyof typeof gameConfig.xp, 'hintedPredict'>;
export type ActionKind =
  | 'tether'
  | 'dimension'
  | 'bridge'
  | 'theme'
  | 'quiet'
  | 'bond'
  | 'dial'
  | 'hold'
  | 'bug'
  | 'checkpoint';
