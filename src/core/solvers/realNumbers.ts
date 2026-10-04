export function closeNumber(answer: unknown, expected: number, tolerance = 1e-6): boolean {
  if (typeof answer !== 'string' && typeof answer !== 'number') return false;
  const text = String(answer).trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\/[+-]?\d+)?$/.test(text) || text.length > 32) return false;
  const parts = text.split('/').map(Number),
    n = parts[0] / (parts[1] ?? 1);
  return (
    Number.isFinite(n) && Math.abs(n - expected) <= tolerance * Math.max(1, Math.abs(expected))
  );
}
