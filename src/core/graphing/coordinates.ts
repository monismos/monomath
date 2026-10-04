import type { GraphSpec, Point2, Viewport } from './types';
export const graphPlotId = (graph: GraphSpec) => `${graph.id}:plot`;
export function graphPosition(
  graph: GraphSpec,
  x: number,
  y: number,
  z = 0,
): [number, number, number] {
  const v = graph.viewport;
  return [
    ((x - v.xmin) / (v.xmax - v.xmin)) * 6.8 - 3.4,
    graph.mode === 'surface'
      ? ((Math.max(v.zmin, Math.min(v.zmax, z)) - v.zmin) / (v.zmax - v.zmin)) * 4.6 - 2.3
      : 0.02,
    ((y - v.ymin) / (v.ymax - v.ymin)) * 6.8 - 3.4,
  ];
}
/** Clip a true line segment; clamping each vertex would invent boundary strokes. */
export function clipGraphLine(view: Viewport, a: Point2, b: Point2): [Point2, Point2] | null {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy],
    q = [a.x - view.xmin, view.xmax - a.x, a.y - view.ymin, view.ymax - a.y];
  let first = 0,
    last = 1;
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
      continue;
    }
    const ratio = q[i] / p[i];
    if (p[i] < 0) first = Math.max(first, ratio);
    else last = Math.min(last, ratio);
    if (first > last) return null;
  }
  return [
    { x: a.x + first * dx, y: a.y + first * dy },
    { x: a.x + last * dx, y: a.y + last * dy },
  ];
}
