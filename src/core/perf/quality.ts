export type Quality = 'high' | 'medium' | 'low' | '2d-only';
export function detectQuality(): Quality {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return '2d-only';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
    return navigator.hardwareConcurrency >= 8 && memory >= 8
      ? 'high'
      : memory >= 4
        ? 'medium'
        : 'low';
  } catch {
    return '2d-only';
  }
}
export function probeFPS(duration = 2000): Promise<number> {
  return new Promise((resolve) => {
    let start = 0,
      frames = 0;
    const frame = (time: number) => {
      if (!start) start = time;
      frames++;
      if (time - start < duration) requestAnimationFrame(frame);
      else resolve(Math.round((frames * 1000) / (time - start)));
    };
    requestAnimationFrame(frame);
  });
}
