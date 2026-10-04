export type NumericFunction =
  | 'sin'
  | 'cos'
  | 'tan'
  | 'asin'
  | 'acos'
  | 'atan'
  | 'sqrt'
  | 'abs'
  | 'exp'
  | 'log'
  | 'log10'
  | 'floor'
  | 'ceil'
  | 'min'
  | 'max';
export type NumericAST =
  | { t: 'number'; v: number; literal?: string }
  | { t: 'symbol'; name: string }
  | { t: 'unary'; op: '+' | '-'; arg: NumericAST }
  | { t: 'binary'; op: '+' | '-' | '*' | '/' | '^'; left: NumericAST; right: NumericAST }
  | { t: 'call'; fn: NumericFunction; args: NumericAST[] };
export type GraphMode = 'curve' | 'relation' | 'surface' | 'constant' | 'constantRelation';
export type Interpretation = 'auto' | 'curve' | 'relation' | 'surface';
export interface ParsedGraph {
  requestedInterpretation: Interpretation;
  source: string;
  normalized: string;
  mode: GraphMode;
  ast: NumericAST;
  originalAst: NumericAST;
  parameters: string[];
  tex: string;
  interpretation: string;
  constantComparison?: { exact: boolean; equal: boolean };
}
export interface Viewport {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
  zmin: number;
  zmax: number;
}
export const defaultViewport: Viewport = {
  xmin: -5,
  xmax: 5,
  ymin: -5,
  ymax: 5,
  zmin: -5,
  zmax: 5,
};
export interface Point2 {
  x: number;
  y: number;
}
export interface SampleStats {
  evaluations: number;
  nodeVisits: number;
  limited: boolean;
}
export interface SurfaceData {
  vertices: number[];
  indices: number[];
  resolution: number;
  heights: number[];
  valid: boolean[];
  cellValid: boolean[];
}
export interface GraphSpec {
  id: string;
  mode: GraphMode;
  source: string;
  tex: string;
  interpretation: string;
  viewport: Viewport;
  parameters: Record<string, number>;
  segments: Point2[][];
  surface?: SurfaceData;
  outcome: 'graph' | 'value' | 'all' | 'none' | 'outsideDomain';
  value?: number;
  approximate?: boolean;
  diagnostics: string[];
  stats: SampleStats;
}
export interface Evaluation {
  valid: boolean;
  value?: number;
  reason?: string;
}
export interface WorkBudget {
  evaluations: number;
  nodeVisits: number;
  maxEvaluations: number;
  maxNodeVisits: number;
  deadline: number;
  limited: boolean;
}
export interface GraphRequest {
  id: number;
  source: string;
  interpretation: Interpretation;
  parameters: Record<string, number>;
  viewport: Viewport;
  detail: 'standard' | 'fine';
}
export type GraphResponse =
  | { id: number; ok: true; graph: GraphSpec; parsed: ParsedGraph }
  | { id: number; ok: false; error: string };
