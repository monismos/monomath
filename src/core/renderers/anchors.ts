export const projectedEntities = new Map<string, { x: number; y: number }>();
export const anchorProjectors = new Map<
  string,
  (p: [number, number, number]) => { x: number; y: number }
>();
