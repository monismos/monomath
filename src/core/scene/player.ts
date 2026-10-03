import type { ResolvedState, SceneSpec } from './spec';
import { resolveTimeline } from './timeline';
export class ScenePlayer {
  state: ResolvedState;
  private frame = 0;
  private listeners = new Set<() => void>();
  constructor(
    private spec: SceneSpec,
    private step: number,
    private dial: number,
    private duration = 450,
  ) {
    this.state = resolveTimeline(spec, step, duration ? 0 : 1, dial);
  }
  subscribe(callback: () => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
  start() {
    this.stop();
    const start = performance.now();
    const animate = (time: number) => {
      const t = this.duration ? Math.min(1, (time - start) / this.duration) : 1;
      const next = resolveTimeline(this.spec, this.step, t, this.dial);
      Object.entries(next.entities).forEach(([id, value]) => {
        if (this.state.entities[id]) Object.assign(this.state.entities[id], value);
        else this.state.entities[id] = value;
      });
      Object.keys(this.state.entities).forEach((id) => {
        if (!next.entities[id]) delete this.state.entities[id];
      });
      this.listeners.forEach((callback) => callback());
      if (t < 1 && !document.hidden) this.frame = requestAnimationFrame(animate);
    };
    this.frame = requestAnimationFrame(animate);
  }
  stop() {
    cancelAnimationFrame(this.frame);
  }
}
