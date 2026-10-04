import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useLesson } from '../core/scene/store';
import { useGame } from '../core/gamification/store';
import { initialGame } from '../core/gamification/logic';
import { initialLogicVariant, readLogicVariant } from '../labs/logic/context';
import { createLogicChallenge } from '../labs/logic/challenge';
import type { SceneSpec } from '../core/scene/spec';
import LogicLab from './LogicLab';
const model = vi.hoisted(() => ({ spec: null as SceneSpec | null }));
vi.mock('./Explainer', () => ({
  Explainer: ({ spec }: { spec: SceneSpec }) => {
    model.spec = spec;
    return <section aria-label="Rendered lanterns">{spec.steps[0].aria}</section>;
  },
}));
vi.mock('./ProblemBar', () => ({
  ProblemBar: ({ value, onSolve }: { value: string; onSolve: (raw: string) => boolean }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSolve((event.currentTarget.elements.namedItem('problem') as HTMLInputElement).value);
      }}
    >
      <input aria-label="Test logic problem" name="problem" defaultValue={value} />
      <button>Study test logic</button>
    </form>
  ),
}));
beforeEach(() => {
  model.spec = null;
  useGame.setState(initialGame());
  useLesson.setState({
    labId: 'logic',
    problem: 'p ∨ ¬p',
    step: 0,
    dial: 0,
    selection: null,
    variant: JSON.stringify(initialLogicVariant()),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe('Logic learner controls', () => {
  it('accepts supported new formulas and explains invalid input without replacing the lesson', () => {
    render(<LogicLab />);
    const input = screen.getByRole('textbox', { name: 'Test logic problem' });
    fireEvent.change(input, { target: { value: 'p → q; q ⊢ p' } });
    fireEvent.click(screen.getByRole('button', { name: 'Study test logic' }));
    expect(useLesson.getState().problem).toBe('p → q; q ⊢ p');
    expect(model.spec?.steps[1].predict?.options).toEqual(['Valid', 'Invalid']);
    fireEvent.change(input, { target: { value: 'window()' } });
    fireEvent.click(screen.getByRole('button', { name: 'Study test logic' }));
    expect(useLesson.getState().problem).toBe('p → q; q ⊢ p');
    expect(screen.getByRole('status')).toHaveTextContent('Use variables');
  });
  it('checks actual lantern selections, persists the claim and deduplicates XP', () => {
    render(<LogicLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Prove' }));
    const proof = screen.getByRole('region', { name: 'Truth table' });
    fireEvent.change(within(proof).getByRole('combobox', { name: 'Classification' }), {
      target: { value: 'tautology' },
    });
    fireEvent.click(within(proof).getByRole('button', { name: 'Check this connection' }));
    expect(within(proof).getByRole('status')).toHaveTextContent('Keep exploring');
    const v = readLogicVariant(useLesson.getState().variant),
      challenge = createLogicChallenge(v.kind, v.seed);
    challenge.target.forEach((id) =>
      fireEvent.click(screen.getByRole('checkbox', { name: `Mark ${id}` })),
    );
    fireEvent.click(within(proof).getByRole('button', { name: 'Check this connection' }));
    expect(within(proof).getByRole('status')).toHaveTextContent('Proof complete');
    const xp = useGame.getState().xp;
    fireEvent.click(within(proof).getByRole('button', { name: 'Check this connection' }));
    expect(useGame.getState().xp).toBe(xp);
    expect(readLogicVariant(useLesson.getState().variant).build.selectedWorlds).toEqual(
      challenge.target,
    );
  });
  it('changes the actual preview world and visual without losing step, dial or selection', () => {
    render(<LogicLab />);
    act(() => useLesson.getState().set({ step: 2, dial: 1.4, selection: 'p' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Switch p' }));
    expect(readLogicVariant(useLesson.getState().variant).world).toBe('world-1');
    fireEvent.click(screen.getByRole('button', { name: 'Gate circuit' }));
    expect(
      model.spec?.entities.some((entity) => entity.id.startsWith('wire-') && entity.opacity),
    ).toBe(true);
    expect(useLesson.getState().step).toBe(2);
    expect(useLesson.getState().dial).toBe(1.4);
    expect(useLesson.getState().selection).toBe('p');
  });
  it('runs Try-first before showing the worked steps', () => {
    render(<LogicLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Try first' }));
    expect(screen.queryByRole('region', { name: 'Rendered lanterns' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Try-first claim' }), {
      target: { value: 'tautology' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check my claim' }));
    expect(screen.getByRole('region', { name: 'Rendered lanterns' })).toBeInTheDocument();
  });
  it('changes challenge family and validates a three-phase Boss against exact state', () => {
    render(<LogicLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Prove' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Logic challenge' }), {
      target: { value: 'counterworld' },
    });
    expect(readLogicVariant(useLesson.getState().variant).kind).toBe('counterworld');
    fireEvent.click(screen.getByRole('button', { name: 'Boss' }));
    const proof = screen.getByRole('region', { name: 'Truth table' });
    fireEvent.change(within(proof).getByRole('combobox', { name: 'Classification' }), {
      target: { value: 'contingent' },
    });
    fireEvent.click(within(proof).getByRole('button', { name: 'Check this connection' }));
    expect(readLogicVariant(useLesson.getState().variant).phase).toBe(1);
    const v = readLogicVariant(useLesson.getState().variant),
      challenge = createLogicChallenge('counterworld', v.seed);
    challenge.target.forEach((id) =>
      fireEvent.click(screen.getByRole('checkbox', { name: `Mark ${id}` })),
    );
    fireEvent.click(within(proof).getByRole('button', { name: 'Check this connection' }));
    fireEvent.click(within(proof).getAllByRole('radio')[0]);
    fireEvent.click(within(proof).getByRole('button', { name: 'Check this connection' }));
    expect(within(proof).getByRole('status')).toHaveTextContent('Boss complete');
    expect(readLogicVariant(useLesson.getState().variant).phase).toBe(3);
  });
});
