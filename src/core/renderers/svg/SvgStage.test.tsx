import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SvgStage from './SvgStage';
import { ScenePlayer } from '../../scene/player';
import type { SceneSpec } from '../../scene/spec';
import { anchorProjectors, projectedEntities } from '../anchors';
const spec: SceneSpec = {
  id: 'accessible-parts',
  entities: [
    {
      id: 'piece',
      kind: 'block',
      pos: [0, 0, 0],
      color: 'whole',
      tether: 'left',
      text: { plain: 'An equal part' },
    },
    {
      id: 'hidden',
      kind: 'block',
      pos: [1, 0, 0],
      color: 'part',
      opacity: 0,
      text: { plain: 'Revealed later' },
    },
  ],
  steps: [
    {
      id: 'start',
      title: 'Start',
      latexAfter: '',
      say: { quick: 'Part.', standard: 'Equal part.', deep: 'An equal part of one whole.' },
      aria: 'Two equal pieces.',
      ops: [],
      tethers: [],
    },
  ],
  code: '',
};
describe('SVG entity interaction', () => {
  it('keeps hidden and removed pieces outside the tab order throughout animation and rerenders', () => {
    const player = new ScenePlayer(spec, 0, 0, 0);
    let draw = () => {};
    const unsubscribe = vi.fn();
    vi.spyOn(player, 'subscribe').mockImplementation((callback) => {
      draw = callback;
      return unsubscribe;
    });
    const props = { state: player.state, player, selection: null, onSelect: vi.fn() };
    const { container, rerender, unmount } = render(<SvgStage {...props} />);
    const hidden = container.querySelector('[data-entity-id="hidden"]')!;
    expect(hidden).toHaveAttribute('aria-hidden', 'true');
    expect(hidden).toHaveAttribute('tabindex', '-1');
    act(() => {
      player.state.entities.hidden.opacity = 1;
      draw();
    });
    expect(screen.getByRole('button', { name: 'Revealed later' })).toHaveAttribute('tabindex', '0');
    act(() => {
      player.state.entities.hidden.opacity = 0;
      draw();
    });
    rerender(<SvgStage {...props} selection="left" />);
    expect(hidden).toHaveAttribute('tabindex', '-1');
    act(() => {
      delete player.state.entities.piece;
      draw();
    });
    expect(container.querySelector('[data-entity-id="piece"]')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
    expect(screen.queryByRole('button', { name: 'An equal part' })).not.toBeInTheDocument();
    unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(anchorProjectors.has('piece')).toBe(false);
    expect(projectedEntities.has('piece')).toBe(false);
  });
  it('uses tether ids for hover while keyboard and click activation use the exact piece id', () => {
    const player = new ScenePlayer(spec, 0, 0, 0);
    const select = vi.fn(),
      activate = vi.fn();
    render(
      <SvgStage
        state={player.state}
        player={player}
        selection={null}
        onSelect={select}
        onActivate={activate}
      />,
    );
    const piece = screen.getByRole('button', { name: 'An equal part' });
    fireEvent.pointerEnter(piece);
    expect(select).toHaveBeenCalledWith('left');
    fireEvent.keyDown(piece, { key: 'Enter' });
    fireEvent.keyDown(piece, { key: ' ' });
    fireEvent.click(piece);
    expect(activate.mock.calls).toEqual([['piece'], ['piece'], ['piece']]);
  });
  it('updates visible and accessible labels when the timeline reveals a value without a React frame render', () => {
    const player = new ScenePlayer(
      {
        ...spec,
        entities: [
          {
            id: 'label',
            kind: 'label',
            pos: [0, 0, 0],
            color: 'paper',
            text: { plain: 'Predict first' },
          },
        ],
      },
      0,
      0,
      0,
    );
    let draw = () => {};
    vi.spyOn(player, 'subscribe').mockImplementation((callback) => {
      draw = callback;
      return () => {};
    });
    const { container } = render(
      <SvgStage state={player.state} player={player} selection={null} onSelect={vi.fn()} />,
    );
    act(() => {
      player.state.entities.label.text = { plain: 'T ✓' };
      draw();
    });
    expect(container.querySelector('[data-entity-id="label"] text')).toHaveTextContent('T ✓');
    expect(container.querySelector('[data-entity-id="label"]')).toHaveAttribute(
      'aria-label',
      'T ✓',
    );
  });
});
