import { gameConfig, type AwardKind, type ActionKind } from './gameConfig';
import { emptyRhythm, localDay, visitDay } from './calendar';
import type { GameData, Gem } from './types';
export function initialGame(): GameData {
  return {
    version: 1,
    xp: 0,
    ledger: {},
    events: {},
    gems: {},
    rhythm: emptyRhythm(),
    echoes: [],
    cosmetics: { selected: 'plain' },
  };
}
export function levelForXP(xp: number): number {
  if (!Number.isFinite(xp) || xp <= 0) return 0;
  let level = Math.floor((xp / 100) ** (1 / 1.4));
  if (xp < gameConfig.levelThreshold(level)) level--;
  if (xp >= gameConfig.levelThreshold(level + 1)) level++;
  return level;
}
export function awardEvent(
  data: GameData,
  kind: AwardKind,
  key: string,
  now: number,
  labId?: string,
  hinted = false,
): { data: GameData; xp: number } {
  const id = `${kind}:${key}`;
  if (data.ledger[id]) return { data, xp: 0 };
  const day = localDay(now);
  const notes = Object.values(data.ledger).filter(
    (event) => event.kind === 'notelet' && event.day === day && event.xp > 0,
  ).length;
  const xp =
    kind === 'notelet' && notes >= gameConfig.dailyNoteLimit
      ? 0
      : kind === 'predict' && hinted
        ? gameConfig.xp.hintedPredict
        : gameConfig.xp[kind];
  let gems = data.gems;
  if (labId && ['watch', 'play', 'prove', 'boss', 'echo'].includes(kind)) {
    const gem: Gem = {
      ...(gems[labId] ?? { observe: false, play: false, prove: false, echoDays: [] }),
    };
    if (kind === 'watch') gem.observe = true;
    if (kind === 'play') gem.play = true;
    if (kind === 'prove' || kind === 'boss') gem.prove = true;
    if (kind === 'echo') gem.echoDays = [...new Set([...gem.echoDays, day])];
    gems = { ...gems, [labId]: gem };
  }
  return {
    xp,
    data: {
      ...data,
      xp: data.xp + xp,
      gems,
      rhythm: visitDay(data.rhythm, now),
      ledger: { ...data.ledger, [id]: { kind, key, at: now, day, xp, labId, hinted } },
    },
  };
}
export function recordEvent(
  data: GameData,
  kind: ActionKind,
  key: string,
  now: number,
  labId?: string,
): GameData {
  const id = kind === 'dial' ? `${kind}:${key}:${localDay(now)}` : `${kind}:${key}`;
  if (data.events[id]) return data;
  return {
    ...data,
    rhythm: visitDay(data.rhythm, now),
    events: { ...data.events, [id]: { kind, key, at: now, day: localDay(now), labId } },
  };
}
export function dailyTasks(data: GameData, now: number) {
  const day = localDay(now);
  const awards = Object.values(data.ledger).filter((event) => event.day === day);
  const actions = Object.values(data.events).filter((event) => event.day === day);
  const topicLayers = new Map<string, Set<string>>();
  actions
    .filter((event) => event.kind === 'dial')
    .forEach((event) => {
      const lab = event.labId ?? event.key.split(':')[0];
      const layers = topicLayers.get(lab) ?? new Set<string>();
      ['thing', 'shape', 'symbol', 'code'].forEach((layer) => {
        if (event.key.split(':').includes(layer)) layers.add(layer);
      });
      topicLayers.set(lab, layers);
    });
  return [
    {
      id: 'look',
      title: 'Follow one symbol to its object',
      done: actions.some((event) => event.kind === 'tether'),
      target: 'tether',
    },
    {
      id: 'layers',
      title: 'Try two layers of one idea',
      done: [...topicLayers.values()].some((layers) => layers.size >= 2),
      target: 'dial',
    },
    {
      id: 'note',
      title: 'Save one thought as a notelet',
      done: awards.some((event) => event.kind === 'notelet'),
      target: 'notelet',
    },
  ];
}
