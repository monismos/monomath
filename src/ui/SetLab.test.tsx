import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { SceneSpec } from '../core/scene/spec';
import { useGame } from '../core/gamification/store';
import { initialGame } from '../core/gamification/logic';
import { useLesson } from '../core/scene/store';
import { createSetsChallenge } from '../labs/math/sets/challenge';
import { initialSetVariant, readSetVariant } from '../labs/math/sets/context';
import SetLab from './SetLab';

const model = vi.hoisted(() => ({ spec: null as SceneSpec | null }));
vi.mock('./Explainer', () => ({
  Explainer: ({ spec }: { spec: SceneSpec }) => {
    model.spec = spec;
    return <section aria-label="Rendered model">{spec.steps[0].aria}</section>;
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
      <input aria-label="Test set problem" name="problem" defaultValue={value} />
      <button>Study test set</button>
    </form>
  ),
}));

beforeEach(() => {
  model.spec = null;
  useGame.setState(initialGame());
  useLesson.setState({
    labId: 'sets',
    problem: 'A ∪ B',
    step: 0,
    dial: 0,
    selection: null,
    variant: JSON.stringify(initialSetVariant()),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Sets learner controls drive actual memberships and constructions', () => {
  it('renders the authored example and accepts a changed finite expression', () => {
    render(<SetLab />);
    expect(screen.getByRole('heading', { name: 'Sets' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Element memberships' })).toBeInTheDocument();
    expect(model.spec?.code).toContain('result =');
    const input = screen.getByRole('textbox', { name: 'Test set problem' });
    fireEvent.change(input, { target: { value: 'A ∩ (B ∪ C)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Study test set' }));
    expect(useLesson.getState().problem).toBe('A ∩ (B ∪ C)');
    expect(model.spec?.codeBindings).toEqual({ A: 'a', B: 'b', C: 'c', U: 'u', result: 'result' });
  });

  it('changes a real membership through the pointer-free checkbox path', () => {
    render(<SetLab />);
    const checkbox = screen.getByRole('checkbox', { name: 'Element 0 in B' });
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(readSetVariant(useLesson.getState().variant).sets.B).toContain(0);
  });

  it('checks selected result members against a seeded challenge and awards once', () => {
    render(<SetLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Prove' }));
    const challenge = createSetsChallenge(
      readSetVariant(useLesson.getState().variant).kind,
      readSetVariant(useLesson.getState().variant).seed,
    );
    const proof = screen.getByRole('region', { name: 'Set proof' });
    for (const value of challenge.target) {
      const checkbox = screen.getByRole('checkbox', {
        name: `Element ${value} selected in result`,
      });
      if (!checkbox.hasAttribute('disabled')) fireEvent.click(checkbox);
    }
    fireEvent.click(within(proof).getByRole('button', { name: 'Check my proof' }));
    expect(within(proof).getByRole('status')).toHaveTextContent('Proof complete');
    const xp = useGame.getState().xp;
    fireEvent.click(within(proof).getByRole('button', { name: 'Check my proof' }));
    expect(useGame.getState().xp).toBe(xp);
  });
});
