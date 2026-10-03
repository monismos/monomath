export type Vec3 = [number, number, number];
export type Layer = 'thing' | 'shape' | 'symbol' | 'code';
export type Ease = 'linear' | 'inOut' | 'outCubic' | 'outBack';
export interface Entity {
  id: string;
  kind:
    | 'block'
    | 'slice'
    | 'sphere'
    | 'cylinder'
    | 'arrow'
    | 'line'
    | 'plane'
    | 'grid'
    | 'bar'
    | 'lantern'
    | 'crate'
    | 'token'
    | 'label'
    | 'group';
  pos: Vec3;
  rot?: Vec3;
  scale?: Vec3;
  size?: Vec3;
  color: string;
  opacity?: number;
  glow?: number;
  text?: { tex?: string; plain?: string };
  layers?: Partial<Record<Layer, Partial<Entity>>>;
  tether?: string;
  parent?: string;
  arc?: [number, number];
}
export type Op =
  | { t: 'add'; entity: Entity }
  | { t: 'remove'; id: string }
  | { t: 'tween'; id: string; to: Partial<Entity>; ms?: number; ease?: Ease }
  | { t: 'morph'; from: string; to: string }
  | { t: 'pulse'; ids: string[] }
  | { t: 'camera'; focus: string[]; angle?: 'front' | 'iso' | 'top' };
export interface Predict {
  kind: 'choice' | 'number' | 'drag' | 'toggle';
  prompt: string;
  options?: string[];
  check: (answer: unknown) => boolean;
  hints: [string, string, string];
}
export interface Step {
  id: string;
  title: string;
  latexBefore?: string;
  latexAfter: string;
  say: { quick: string; standard: string; deep: string };
  ops: Op[];
  tethers: { token: string; entities: string[]; color: string }[];
  predict?: Predict;
  gaze?: string[];
  aria: string;
}
export interface SceneSpec {
  id: string;
  entities: Entity[];
  steps: Step[];
  code: string;
}
export interface ResolvedState {
  entities: Record<string, Entity>;
  stepIndex: number;
  dialT: number;
  focus: string[];
}
export const palette: Record<string, string> = {
  whole: '#507DF2',
  part: '#FFCD65',
  result: '#F4F7E9',
  mint: '#B5DED0',
  ink: '#10201C',
  paper: '#F5F7F6',
  highlight: '#FFE066',
  error: '#FF8C79',
  logic: '#FFB400',
  stats: '#E0449C',
  physics: '#FF5A36',
  code: '#A58AFF',
};
export const layers: Layer[] = ['thing', 'shape', 'symbol', 'code'];
