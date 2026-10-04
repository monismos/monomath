import type { Predict, SceneSpec, Step } from '../scene/spec';

export type LabDomain = 'math' | 'logic' | 'stats' | 'physics' | 'code' | 'philosophy';
export interface SolverResult {
  answer: string;
  steps: Step[];
}
export interface Solver<P, R extends SolverResult = SolverResult> {
  id: string;
  domain: LabDomain;
  parse: (input: string) => P | null;
  methods: (problem: P) => { id: string; name: string }[];
  solve: (problem: P, method?: string) => R;
}
export interface LabChallenge<S> {
  id: string;
  prompt: string;
  setup: S;
  goal: (state: S) => boolean;
  hints: [string, string, string];
  xp: number;
}
export interface LabBoss<S> extends LabChallenge<S> {
  phases: { id: string; title: string; prompt: string; goal: (state: S) => boolean }[];
}
export interface LabDefinition<P, S, R extends SolverResult = SolverResult> {
  id: string;
  title: string;
  domain: LabDomain;
  prerequisites: string[];
  bridges: { id: string; labId: string; title: string; description: string }[];
  examples: { id: string; title: string; input: string }[];
  scenes: SceneSpec[];
  solvers: Solver<P, R>[];
  challenges: LabChallenge<S>[];
  boss: LabBoss<S>;
  predicts: Predict[];
  mascotScript: Record<
    'intro' | 'hint1' | 'hint2' | 'hint3' | 'correct' | 'wrong' | 'idle',
    [string, string, string]
  >;
  dialDefaults: Record<'explorer' | 'scholar' | 'researcher', number>;
}
