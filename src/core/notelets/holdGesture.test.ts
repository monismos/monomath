import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { HoldGesture } from './holdGesture';
import { carouselRadius, visibleIndices, wrapIndex } from './carousel';
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());
const pointer = { id: 1, x: 40, y: 50, type: 'mouse', primary: true, button: 0 };
function setup() {
  const callbacks = { charge: vi.fn(), complete: vi.fn(), cancel: vi.fn(), release: vi.fn() };
  return { callbacks, gesture: new HoldGesture(500, callbacks) };
}
it('charges at 150ms and composes at exactly 500ms', () => {
  const { gesture, callbacks } = setup();
  gesture.down(pointer);
  vi.advanceTimersByTime(149);
  expect(gesture.phase).toBe('pressing');
  vi.advanceTimersByTime(1);
  expect(callbacks.charge).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(350);
  expect(callbacks.complete).toHaveBeenCalledOnce();
  gesture.up();
  expect(gesture.consumeClick()).toBe(true);
  expect(gesture.consumeClick()).toBe(false);
});
it('movement, early release, and a second pointer cancel the hold', () => {
  for (const action of ['move', 'up', 'second']) {
    const { gesture, callbacks } = setup();
    gesture.down(pointer);
    if (action === 'move') gesture.move(1, 51, 50);
    if (action === 'up') gesture.up();
    if (action === 'second') gesture.down({ ...pointer, id: 2, primary: false });
    vi.advanceTimersByTime(700);
    expect(callbacks.complete).not.toHaveBeenCalled();
  }
});
it.each([1, 2, 7, 40])('carousel geometry stays finite with %s notes', (count) => {
  expect(Number.isFinite(carouselRadius(count))).toBe(true);
  expect(visibleIndices(count, 0).length).toBeLessThanOrEqual(15);
  expect(wrapIndex(-1, count)).toBe(count - 1);
});
