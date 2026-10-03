import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Mascot } from '../../ui/Mascot';
import { useSettings } from '../storage/settings';
import { useLesson } from '../scene/store';
import { projectedEntities } from '../renderers/anchors';
import { useGame } from '../gamification/store';
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  projectedEntities.clear();
});
describe('guide interface', () => {
  it('renders exactly one SVG eye, switches domain and removes off rigs', () => {
    useSettings.getState().set({ dimension: '2d', mascot: 'auto' });
    const { container, rerender } = render(<Mascot domain="logic" />);
    expect(screen.getByLabelText('Lumi guide')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-guide-eye]')).toHaveLength(1);
    rerender(<Mascot domain="code" />);
    expect(screen.getByLabelText('Bit guide')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-guide-eye]')).toHaveLength(1);
    act(() => useSettings.getState().set({ mascot: 'off' }));
    rerender(<Mascot domain="code" />);
    expect(container.querySelector('aside')).toBeNull();
  });
  it('cues the current projected entity and retargets after a backward seek', () => {
    useSettings.getState().set({ dimension: '2d', mascot: 'moni', reducedMotion: true });
    projectedEntities.set('piece-a', { x: 320, y: 240 });
    projectedEntities.set('piece-b', { x: 140, y: 100 });
    let frame: FrameRequestCallback | undefined;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frame = callback;
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const { container, rerender } = render(<Mascot gaze={['piece-a']} />);
    act(() => frame?.(100));
    const cue = container.querySelector('circle[stroke-dasharray]');
    expect(cue).toHaveAttribute('cx', '320');
    expect(cue).toHaveAttribute('cy', '240');
    expect(cue).toHaveAttribute('opacity', '0.75');
    act(() => useLesson.getState().set({ step: 0 }));
    rerender(<Mascot gaze={['piece-b']} />);
    act(() => frame?.(200));
    expect(cue).toHaveAttribute('cx', '140');
    expect(cue).toHaveAttribute('cy', '100');
    expect(container.querySelector('[data-guide-eye]')).toHaveAttribute(
      'transform',
      'translate(60 56) scale(1 1) translate(-60 -56)',
    );
  });
  it('shows earned and applied Trophy Shelf cosmetics immediately', () => {
    useSettings.getState().set({ dimension: '2d', mascot: 'moni' });
    useGame.getState().reset();
    const { container } = render(<Mascot />);
    expect(container.querySelector('aside')).toHaveAttribute('data-guide-cosmetic', 'plain');
    expect(useGame.getState().selectCosmetic('sunhat')).toBe(false);
    act(() => {
      useGame.getState().award('notelet', 'guide-cosmetic-fixture', 'demo');
      useGame.getState().selectCosmetic('sunhat');
    });
    expect(container.querySelector('aside')).toHaveAttribute('data-guide-cosmetic', 'sunhat');
    expect(container.querySelector('path[d="M39 29 L47 13 H73 L81 29 Z"]')).toBeInTheDocument();
    act(() => useGame.getState().selectCosmetic('plain'));
    expect(container.querySelector('path[d="M39 29 L47 13 H73 L81 29 Z"]')).toBeNull();
  });
  it('provides an accessible quick action, another layer, dock movement and quiet mode', () => {
    useSettings.getState().set({ dimension: '2d', mascot: 'moni', dock: 'left' });
    useLesson.getState().set({ dial: 0 });
    render(<Mascot />);
    const event = vi.fn();
    window.addEventListener('monomath:guide-action', event);
    fireEvent.click(screen.getByRole('button', { name: 'Moni quick menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Another way' }));
    expect(useLesson.getState().dial).toBe(1);
    expect(event).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Moni quick menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move to right' }));
    expect(useSettings.getState().dock).toBe('right');
    fireEvent.click(screen.getByRole('button', { name: 'Moni quick menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quiet' }));
    expect(useSettings.getState().mascot).toBe('quiet');
    expect(screen.queryByRole('status')).toBeNull();
    window.removeEventListener('monomath:guide-action', event);
  });
});
