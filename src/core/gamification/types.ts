import type { AwardKind, ActionKind } from './gameConfig';
import type { Rhythm } from './calendar';
import type { Schedule } from './srs';
export interface AwardEvent {
  kind: AwardKind;
  key: string;
  at: number;
  day: string;
  xp: number;
  labId?: string;
  hinted?: boolean;
}
export interface ActionEvent {
  kind: ActionKind;
  key: string;
  at: number;
  day: string;
  labId?: string;
}
export interface Gem {
  observe: boolean;
  play: boolean;
  prove: boolean;
  echoDays: string[];
}
export interface NoteEcho {
  id: string;
  kind: 'note';
  noteId: string;
  labId: string;
  preview: string;
  context: string;
  thumb?: string;
  schedule: Schedule;
}
export interface ChallengeEcho {
  id: string;
  kind: 'challenge';
  skillId: string;
  labId: string;
  key: string;
  seed: number;
  prompt: string;
  schedule: Schedule;
}
export type EchoItem = NoteEcho | ChallengeEcho;
export type CosmeticId = 'plain' | 'sunhat' | 'starcap' | 'mint';
export interface GameData {
  version: 1;
  xp: number;
  ledger: Record<string, AwardEvent>;
  events: Record<string, ActionEvent>;
  gems: Record<string, Gem>;
  rhythm: Rhythm;
  echoes: EchoItem[];
  cosmetics: { selected: CosmeticId };
}
export function isMastered(gem: Gem | undefined): boolean {
  return !!gem && gem.observe && gem.play && gem.prove && new Set(gem.echoDays).size >= 2;
}
