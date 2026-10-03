export type HoldPhase = 'idle' | 'pressing' | 'charging' | 'armed' | 'composing';
export interface HoldPointer {
  id: number;
  x: number;
  y: number;
  type: string;
  primary: boolean;
  button: number;
}
export class HoldGesture {
  phase: HoldPhase = 'idle';
  pointer: HoldPointer | null = null;
  suppressUntil = 0;
  private charge: ReturnType<typeof setTimeout> | undefined;
  private complete: ReturnType<typeof setTimeout> | undefined;
  constructor(
    private duration: number,
    private callbacks: {
      charge: (point: HoldPointer) => void;
      complete: (point: HoldPointer) => void;
      cancel: () => void;
      release: () => void;
    },
  ) {}
  down(pointer: HoldPointer) {
    if (this.pointer) {
      this.cancel();
      return;
    }
    if (!pointer.primary || pointer.button !== 0) return;
    this.pointer = pointer;
    this.phase = 'pressing';
    this.charge = setTimeout(() => {
      if (this.pointer) {
        this.phase = 'charging';
        this.callbacks.charge(pointer);
      }
    }, 150);
    this.complete = setTimeout(() => {
      if (this.pointer) {
        this.phase = 'armed';
        this.suppressUntil = Date.now() + this.duration + 400;
        this.callbacks.complete(pointer);
        this.phase = 'composing';
      }
    }, this.duration);
  }
  move(id: number, x: number, y: number) {
    if (!this.pointer || id !== this.pointer.id) return;
    const slop = this.pointer.type === 'touch' ? 12 : 10;
    if (Math.hypot(x - this.pointer.x, y - this.pointer.y) > slop && this.phase !== 'composing')
      this.cancel();
  }
  up() {
    if (this.phase === 'composing') {
      this.suppressUntil = Date.now() + 400;
      this.callbacks.release();
      this.clear();
      this.phase = 'idle';
      this.pointer = null;
    } else this.cancel();
  }
  cancel() {
    this.clear();
    this.pointer = null;
    this.phase = 'idle';
    this.callbacks.cancel();
    this.callbacks.release();
  }
  consumeClick() {
    if (Date.now() <= this.suppressUntil) {
      this.suppressUntil = 0;
      return true;
    }
    return false;
  }
  private clear() {
    clearTimeout(this.charge);
    clearTimeout(this.complete);
  }
}
