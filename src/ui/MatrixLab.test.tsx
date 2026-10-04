import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { initialGame } from '../core/gamification/logic';
import { useGame } from '../core/gamification/store';
import { useLesson } from '../core/scene/store';
import type { SceneSpec } from '../core/scene/spec';
import { fractionText } from '../core/solvers/fractions';
import { initialMatrixVariant, readMatrixVariant } from '../labs/math/matrices/context';
import { createMatrixChallenge, createMatrixBoss } from '../labs/math/matrices/challenge';
import MatrixLab from './MatrixLab';
const model = vi.hoisted(() => ({
  spec: null as SceneSpec | null,
  method: undefined as undefined | (() => void),
}));
vi.mock('./Explainer', () => ({
  Explainer: ({ spec, onMethod }: { spec: SceneSpec; onMethod?: () => void }) => {
    model.spec = spec;
    model.method = onMethod;
    return <section aria-label="Rendered matrix">{spec.steps[0].aria}</section>;
  },
}));
vi.mock('./ProblemBar', () => ({
  ProblemBar: ({ value, onSolve }: { value: string; onSolve: (raw: string) => boolean }) => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSolve((e.currentTarget.elements.namedItem('problem') as HTMLInputElement).value);
      }}
    >
      <input name="problem" aria-label="Test matrix" defaultValue={value} />
      <button>Study test matrix</button>
    </form>
  ),
}));
beforeEach(() => {
  useGame.setState(initialGame());
  useLesson.setState({
    labId: 'matrices',
    problem: 'transform([1,1;0,1])',
    variant: JSON.stringify(initialMatrixVariant()),
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
it('accepts exact supported matrices and preserves the existing lesson for malformed input', () => {
  render(<MatrixLab />);
  const input = screen.getByRole('textbox', { name: 'Test matrix' });
  fireEvent.change(input, { target: { value: 'inverse([2,1;1,1])' } });
  fireEvent.click(screen.getByRole('button', { name: 'Study test matrix' }));
  expect(model.spec?.steps[2].say.standard).toContain('1');
  fireEvent.change(input, { target: { value: 'inverse([1,2;2,4])' } });
  fireEvent.click(screen.getByRole('button', { name: 'Study test matrix' }));
  expect(useLesson.getState().problem).toBe('inverse([2,1;1,1])');
  expect(screen.getByRole('status')).toHaveTextContent('singular');
});
it('checks the actual construction and deduplicates earned XP', () => {
  render(<MatrixLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Prove' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Keep exploring');
  const c = createMatrixChallenge('multiply', 12345),
    before = model.spec?.entities.find((e) => e.id === 'unit')?.points;
  c.expected.forEach((row, i) =>
    row.forEach((v, j) => {
      fireEvent.change(screen.getByRole('textbox', { name: `Cell ${i + 1},${j + 1}` }), {
        target: { value: fractionText(v) },
      });
      fireEvent.click(screen.getByRole('checkbox', { name: `Include cell ${i + 1},${j + 1}` }));
    }),
  );
  expect(model.spec?.entities.find((e) => e.id === 'unit')?.points).not.toEqual(before);
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Proof complete');
  const xp = useGame.getState().xp;
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(useGame.getState().xp).toBe(xp);
});
it('preserves dial, step and selection through a real method and code change', () => {
  render(<MatrixLab />);
  act(() => useLesson.getState().set({ step: 3, dial: 1.4, selection: 'A' }));
  const id = model.spec?.id;
  act(() => model.method?.());
  expect(model.spec?.id).toBe(id);
  expect(readMatrixVariant(useLesson.getState().variant).method).toBe('columns');
  expect(useLesson.getState()).toMatchObject({ step: 3, dial: 1.4, selection: 'A' });
  fireEvent.change(screen.getByRole('combobox', { name: 'Matrix code language' }), {
    target: { value: 'numpy' },
  });
  expect(model.spec?.code).toContain('np.array');
});
it('requires all three Boss connections and never treats a claim as a matrix', () => {
  render(<MatrixLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Boss' }));
  const boss = createMatrixBoss(12345);
  fireEvent.change(screen.getByRole('textbox', { name: 'Determinant claim' }), {
    target: { value: fractionText(boss.solution.determinant) },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  expect(readMatrixVariant(useLesson.getState().variant).phase).toBe(1);
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  expect(screen.getByRole('status')).toHaveTextContent('Keep exploring');
  boss.expected.forEach((row, i) =>
    row.forEach((value, j) => {
      fireEvent.change(screen.getByRole('textbox', { name: `Cell ${i + 1},${j + 1}` }), {
        target: { value: fractionText(value) },
      });
      fireEvent.click(screen.getByRole('checkbox', { name: `Include cell ${i + 1},${j + 1}` }));
    }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Loop option 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  expect(screen.getByRole('status')).toHaveTextContent('Keep exploring');
  fireEvent.click(screen.getByRole('radio', { name: 'Loop option 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  expect(screen.getByRole('status')).toHaveTextContent('Boss complete');
});
it('Try-first accepts exact fractions and can open worked steps after a guess', () => {
  render(<MatrixLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Try first' }));
  expect(screen.getByRole('button', { name: 'Check my prediction' })).toBeDisabled();
  fireEvent.change(screen.getByRole('textbox', { name: 'Try-first prediction' }), {
    target: { value: '2/2' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Check my prediction' }));
  expect(screen.getByRole('region', { name: 'Rendered matrix' })).toBeVisible();
});
