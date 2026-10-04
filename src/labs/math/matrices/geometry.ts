import type { Matrix } from '../../../core/solvers/matrices';
import { numQ } from '../../../core/solvers/matrices';
import type { Vec3 } from '../../../core/scene/spec';
export const cubeFaces = [
  [0, 2, 3, 1],
  [4, 5, 7, 6],
  [0, 1, 5, 4],
  [2, 6, 7, 3],
  [0, 4, 6, 2],
  [1, 3, 7, 5],
];
export const cubePoints: Vec3[] = Array.from({ length: 8 }, (_, i) => [
  i & 1,
  (i >> 1) & 1,
  (i >> 2) & 1,
]);
export function applyMatrix(a: Matrix, v: number[]): number[] {
  return a.map((row) => row.reduce((sum, value, j) => sum + numQ(value) * v[j], 0));
}
function nullDirections(a: number[][]): number[][] {
  const rows = a.map((row) => [...row]),
    n = rows.length,
    pivots: number[] = [];
  let r = 0;
  for (let col = 0; col < n && r < n; col++) {
    let best = r;
    for (let j = r + 1; j < n; j++)
      if (Math.abs(rows[j][col]) > Math.abs(rows[best][col])) best = j;
    if (Math.abs(rows[best][col]) < 1e-7) continue;
    [rows[r], rows[best]] = [rows[best], rows[r]];
    const d = rows[r][col];
    rows[r] = rows[r].map((v) => v / d);
    for (let j = 0; j < n; j++)
      if (j !== r) {
        const f = rows[j][col];
        rows[j] = rows[j].map((v, k) => v - f * rows[r][k]);
      }
    pivots.push(col);
    r++;
  }
  return Array.from({ length: n }, (_, i) => i)
    .filter((i) => !pivots.includes(i))
    .map((free) => {
      const v = Array(n).fill(0) as number[];
      v[free] = 1;
      pivots.forEach((col, row) => (v[col] = -rows[row][free]));
      const length = Math.hypot(...v);
      return v.map((x) => x / length);
    });
}
export function nullSpace(a: Matrix) {
  return nullDirections(a.map((row) => row.map(numQ)));
}
export function realEigenvectors(a: Matrix): { value: number; direction: number[] }[] {
  const m = a.map((row) => row.map(numQ)),
    n = m.length;
  let roots: number[];
  if (n === 2) {
    const trace = m[0][0] + m[1][1],
      det = m[0][0] * m[1][1] - m[0][1] * m[1][0],
      d = trace * trace - 4 * det;
    if (d < -1e-9) return [];
    roots = [(trace + Math.sqrt(Math.max(0, d))) / 2, (trace - Math.sqrt(Math.max(0, d))) / 2];
  } else {
    const trace = m[0][0] + m[1][1] + m[2][2];
    const b =
      m[0][0] * m[1][1] +
      m[0][0] * m[2][2] +
      m[1][1] * m[2][2] -
      m[0][1] * m[1][0] -
      m[0][2] * m[2][0] -
      m[1][2] * m[2][1];
    const det =
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const p = b - (trace * trace) / 3,
      q = (-2 * trace ** 3) / 27 + (trace * b) / 3 - det,
      d = (q * q) / 4 + p ** 3 / 27;
    if (d > 1e-10)
      roots = [Math.cbrt(-q / 2 + Math.sqrt(d)) + Math.cbrt(-q / 2 - Math.sqrt(d)) + trace / 3];
    else if (Math.abs(p) < 1e-10) roots = [trace / 3];
    else if (d >= -1e-10) {
      const u = Math.cbrt(-q / 2);
      roots = [2 * u + trace / 3, -u + trace / 3];
    } else {
      const r = 2 * Math.sqrt(-p / 3),
        theta = Math.acos(Math.max(-1, Math.min(1, ((3 * q) / (2 * p)) * Math.sqrt(-3 / p)))) / 3;
      roots = [0, 1, 2].map((k) => r * Math.cos(theta - (k * 2 * Math.PI) / 3) + trace / 3);
    }
  }
  return roots
    .filter((value, index) => roots.findIndex((other) => Math.abs(value - other) < 1e-6) === index)
    .flatMap((value) =>
      nullDirections(m.map((row, i) => row.map((x, j) => x - (i === j ? value : 0)))).map(
        (direction) => ({ value, direction }),
      ),
    );
}
export function linePrism(start: Vec3, end: Vec3, width = 0.025): Vec3[] {
  const d = end.map((v, i) => v - start[i]),
    length = Math.hypot(...d);
  const axis = length < 1e-8 ? [1, 0, 0] : d.map((v) => v / length);
  const ref = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const u = cross(axis, ref),
    ul = Math.hypot(...u);
  u.forEach((v, i) => (u[i] = (v / ul) * width));
  const v = cross(axis, u);
  return [start, end].flatMap((point) =>
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].map(([a, b]) => point.map((x, i) => x + a * u[i] + b * v[i]) as Vec3),
  );
}
export function equationSlice(row: number[], rhs: number, bound: number): number[][] {
  const n = row.length,
    corners = Array.from({ length: 2 ** n }, (_, i) =>
      Array.from({ length: n }, (_, j) => ((i >> j) & 1 ? bound : -bound)),
    );
  const result: number[][] = [];
  corners.forEach((a, i) => {
    for (let j = 0; j < n; j++) {
      const k = i ^ (1 << j);
      if (k <= i) continue;
      const b = corners[k],
        fa = a.reduce((sum, v, j) => sum + v * row[j], 0) - rhs,
        fb = b.reduce((sum, v, j) => sum + v * row[j], 0) - rhs;
      if (Math.abs(fa) < 1e-9) result.push(a);
      if (Math.abs(fb) < 1e-9) result.push(b);
      if (fa * fb < 0) {
        const t = fa / (fa - fb);
        result.push(a.map((v, j) => v + (b[j] - v) * t));
      }
    }
  });
  const unique = result.filter(
    (p, i) => result.findIndex((q) => p.every((v, j) => Math.abs(v - q[j]) < 1e-7)) === i,
  );
  if (n === 2) return unique.slice(0, 2);
  const center = row.map(
    (_, j) => unique.reduce((sum, p) => sum + p[j], 0) / Math.max(1, unique.length),
  );
  const pivot = row.findIndex((v) => Math.abs(v) > 1e-9);
  if (pivot < 0) return [];
  const axis = Array(3).fill(0) as number[];
  axis[(pivot + 1) % 3] = 1;
  const cross = (a: number[], b: number[]) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const u = cross(row, axis),
    v = cross(row, u);
  const angle = (p: number[]) =>
    Math.atan2(
      p.reduce((s, x, j) => s + (x - center[j]) * v[j], 0),
      p.reduce((s, x, j) => s + (x - center[j]) * u[j], 0),
    );
  return unique.sort((a, b) => angle(a) - angle(b));
}
