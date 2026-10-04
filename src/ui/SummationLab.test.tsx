import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { SceneSpec } from '../core/scene/spec';
import { initialGame } from '../core/gamification/logic';
import { useGame } from '../core/gamification/store';
import { useLesson } from '../core/scene/store';
import { fractionText } from '../core/solvers/fractions';
import { createSummationChallenge } from '../labs/stats/summation/challenge';
import { initialSummationVariant, readSummationVariant } from '../labs/stats/summation/context';
import SummationLab from './SummationLab';
const model = vi.hoisted(() => ({
  spec: null as SceneSpec | null,
  onMethod: undefined as undefined | (() => void),
}));
vi.mock('./Explainer', () => ({
  Explainer: ({ spec, onMethod }: { spec: SceneSpec; onMethod?: () => void }) => {
    model.spec = spec;
    model.onMethod = onMethod;
    return <section aria-label="Rendered Hopper">{spec.steps[0].aria}</section>;
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
      <input name="problem" aria-label="Test sum" defaultValue={value} />
      <button>Study test sum</button>
    </form>
  ),
}));
beforeEach(() => {
  useGame.setState(initialGame());
  useLesson.setState({
    labId: 'summation',
    problem: 'sum(i=1..5,2i+1)',
    variant: JSON.stringify(initialSummationVariant()),
    step: 0,
    dial: 0,
    selection: null,
  });
  model.spec = null;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('accepts supported sums and keeps the current lesson for invalid syntax', () => {
  render(<SummationLab />);
  const input = screen.getByRole('textbox', { name: 'Test sum' });
  fireEvent.change(input, { target: { value: 'data(4,8,6,5,3)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Study test sum' }));
  expect(model.spec?.steps[2].say.standard).toContain('26/5');
  fireEvent.change(input, { target: { value: 'sum(i=1..999,i)' } });
  fireEvent.click(screen.getByRole('button', { name: 'Study test sum' }));
  expect(useLesson.getState().problem).toBe('data(4,8,6,5,3)');
  expect(screen.getByRole('status')).toHaveTextContent('inclusive bounds');
});
it('checks construction rather than a typed total, changes the actual model and deduplicates XP', () => {
  render(<SummationLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Prove' }));
  const variant = readSummationVariant(useLesson.getState().variant),
    challenge = createSummationChallenge(variant.kind, variant.seed);
  fireEvent.change(screen.getByRole('textbox', { name: 'Exact claim' }), {
    target: { value: fractionText(challenge.target) },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Keep exploring');
  challenge.solution.terms.forEach((term, index) => {
    fireEvent.change(screen.getByRole('textbox', { name: 'Term value ' + (index + 1) }), {
      target: { value: String(term.value) },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include term ' + (index + 1) }));
  });
  expect(model.spec?.entities.find((entity) => entity.id === 'collected-0')?.opacity).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Proof complete');
  const xp = useGame.getState().xp;
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(useGame.getState().xp).toBe(xp);
});
it('changes a genuine method and view without losing the step, dial or selection', () => {
  render(<SummationLab />);
  act(() => useLesson.getState().set({ step: 3, dial: 1.4, selection: 'term-0' }));
  const id = model.spec?.id;
  act(() => model.onMethod?.());
  expect(readSummationVariant(useLesson.getState().variant).method).toBe('structure');
  expect(model.spec?.id).toBe(id);
  expect(useLesson.getState().step).toBe(3);
  expect(useLesson.getState().dial).toBe(1.4);
  expect(useLesson.getState().selection).toBe('term-0');
  fireEvent.change(screen.getByRole('combobox', { name: 'Summation code language' }), {
    target: { value: 'sql' },
  });
  expect(model.spec?.codeLanguage).toBe('SQL');
  expect(model.spec?.code).toContain('SELECT SUM');
});
it('lets the learner try before opening the steps and supports dataset proof controls', () => {
  render(<SummationLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Try first' }));
  expect(screen.queryByRole('region', { name: 'Rendered Hopper' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('textbox', { name: 'Try-first prediction' }), {
    target: { value: '35' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Check my prediction' }));
  expect(screen.getByRole('region', { name: 'Rendered Hopper' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Prove' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Summation challenge' }), {
    target: { value: 'variance' },
  });
  expect(screen.getByRole('textbox', { name: 'Mean pin coordinate' })).toBeInTheDocument();
  expect(screen.getAllByRole('textbox', { name: /Square area/ })).toHaveLength(5);
  fireEvent.click(screen.getByRole('button', { name: 'Boss' }));
  expect(screen.getAllByRole('textbox', { name: /Term value/ })).toHaveLength(4);
  expect(screen.queryByRole('textbox', { name: 'Mean pin coordinate' })).not.toBeInTheDocument();
});
it('runs all three Boss phases with actual terms and the inclusive code', () => {
  render(<SummationLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Boss' }));
  const challenge = createSummationChallenge('linear', 12345);
  fireEvent.change(screen.getByRole('textbox', { name: 'Exact claim' }), {
    target: { value: fractionText(challenge.target) },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  expect(readSummationVariant(useLesson.getState().variant).phase).toBe(1);
  challenge.solution.terms.forEach((term, index) => {
    fireEvent.change(screen.getByRole('textbox', { name: 'Term value ' + (index + 1) }), {
      target: { value: String(term.value) },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include term ' + (index + 1) }));
  });
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Loop option 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  expect(screen.getByRole('status')).toHaveTextContent('Keep exploring');
  fireEvent.click(screen.getByRole('radio', { name: 'Loop option 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  expect(screen.getByRole('status')).toHaveTextContent('Boss complete');
  expect(readSummationVariant(useLesson.getState().variant).phase).toBe(3);
});
