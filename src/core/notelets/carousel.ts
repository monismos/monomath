export function carouselRadius(count: number, width = 270, gap = 32) {
  if (count <= 2) return 180;
  return Math.max(180, (width + gap) / (2 * Math.tan(Math.PI / count)));
}
export function wrapIndex(index: number, count: number) {
  return count ? ((index % count) + count) % count : 0;
}
export function visibleIndices(count: number, active: number, limit = 15) {
  if (count <= limit) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: limit }, (_, i) =>
    wrapIndex(active + i - Math.floor(limit / 2), count),
  );
}
