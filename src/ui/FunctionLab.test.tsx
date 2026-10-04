import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { initialGame } from '../core/gamification/logic';
import { useGame } from '../core/gamification/store';
import { useLesson } from '../core/scene/store';
import { initialFunctionVariant, readFunctionVariant } from '../labs/math/functions/context';
import { createFunctionChallenge, createFunctionBoss } from '../labs/math/functions/challenge';
import { valueAt, slopeAt } from '../core/solvers/functions';
import type { SceneSpec } from '../core/scene/spec';
import FunctionLab from './FunctionLab';
const model = vi.hoisted(() => ({
  spec: null as SceneSpec | null,
  method: undefined as (() => void) | undefined,
}));
vi.mock('./Explainer', () => ({
  Explainer: ({ spec, onMethod }: { spec: SceneSpec; onMethod?: () => void }) => {
    model.spec = spec;
    model.method = onMethod;
    return <section aria-label="Rendered function">{spec.steps[0].aria}</section>;
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
      <input name="problem" aria-label="Test function" defaultValue={value} />
      <button>Study test function</button>
    </form>
  ),
}));
beforeEach(() => {
  useGame.setState(initialGame());
  useLesson.setState({
    labId: 'functions',
    problem: 'y=2*x+1',
    variant: JSON.stringify(initialFunctionVariant()),
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
const fill = (name: string, value: string) =>
  fireEvent.change(screen.getByRole('textbox', { name }), { target: { value } });
it('accepts a worked calculus problem and retains it when teaching syntax is unsupported', () => {
  render(<FunctionLab />);
  fill('Test function', 'derivative(3*x^2+2*x)');
  fireEvent.click(screen.getByRole('button', { name: 'Study test function' }));
  expect(model.spec!.steps[2].say.standard).toContain('Multiply each coefficient');
  fill('Test function', 'y=tan(x)');
  fireEvent.click(screen.getByRole('button', { name: 'Study test function' }));
  expect(useLesson.getState().problem).toBe('derivative(3*x^2+2*x)');
  expect(screen.getByText(/This teaching lab supports/)).toBeInTheDocument();
});
it('manual coefficients and points drive the real curve and must both agree, with deduplicated XP', () => {
  render(<FunctionLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Prove' }));
  const before = model.spec!.entities.find((e) => e.id === 'curve')!.points;
  const c = createFunctionChallenge('line', 12345);
  if (c.problem.model.type === 'polynomial')
    c.problem.model.coefficients.forEach((v, i) =>
      fireEvent.change(screen.getByRole('spinbutton', { name: `Construct coefficient x^${i}` }), {
        target: { value: String(v) },
      }),
    );
  expect(model.spec!.entities.find((e) => e.id === 'curve')!.points).not.toEqual(before);
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Keep exploring');
  for (const x of [0, 1]) {
    fill(`Point output x=${x}`, String(valueAt(c.problem, x)));
    fireEvent.click(screen.getByRole('checkbox', { name: `Include point x=${x}` }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Proof complete');
  const xp = useGame.getState().xp;
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(useGame.getState().xp).toBe(xp);
  fill('Point output x=1', '99');
  fireEvent.click(screen.getByRole('button', { name: 'Check proof' }));
  expect(screen.getByRole('status')).toHaveTextContent('Keep exploring');
});
it('alternative methods and controls preserve the current step, dial and selection', () => {
  useLesson.setState({
    problem: 'x^2-4*x+3=0',
    step: 2,
    dial: 1.5,
    selection: 'roots',
    variant: JSON.stringify({
      ...initialFunctionVariant(),
      expression: 'x^2-4*x+3=0',
      trace: 2.5,
      zoom: 1.5,
    }),
  });
  render(<FunctionLab />);
  act(() => model.method!());
  const v = readFunctionVariant(useLesson.getState().variant);
  expect(v.method).toBe('square');
  expect(v.trace).toBe(2.5);
  expect(v.zoom).toBe(1.5);
  expect(useLesson.getState()).toMatchObject({ step: 2, dial: 1.5, selection: 'roots' });
  expect(model.spec!.steps[2].title).toBe('Restore the missing corner');
});
it('Try-first hides worked steps until a prediction is committed or explicitly revealed', () => {
  render(<FunctionLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Try first' }));
  expect(screen.queryByRole('region', { name: 'Rendered function' })).not.toBeInTheDocument();
  fill('Try-first prediction', '99');
  fireEvent.click(screen.getByRole('button', { name: 'Check my prediction' }));
  expect(screen.getByRole('status')).toHaveTextContent('Keep exploring');
  fill('Try-first prediction', '3');
  fireEvent.click(screen.getByRole('button', { name: 'Check my prediction' }));
  expect(screen.getByRole('region', { name: 'Rendered function' })).toBeInTheDocument();
});
it('the Boss verifies slope, entered points and Python as three distinct connections', () => {
  render(<FunctionLab />);
  fireEvent.click(screen.getByRole('button', { name: 'Boss' }));
  const boss = createFunctionBoss(12345);
  fill('Function claim', String(slopeAt(boss.problem, 1)));
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  expect(screen.getByRole('heading', { name: 'Connection 2 of 3' })).toBeInTheDocument();
  if (boss.problem.model.type === 'polynomial')
    boss.problem.model.coefficients.forEach((v, i) =>
      fireEvent.change(screen.getByRole('spinbutton', { name: `Construct coefficient x^${i}` }), {
        target: { value: String(v) },
      }),
    );
  for (const x of [0, 1]) {
    fill(`Point output x=${x}`, String(valueAt(boss.problem, x)));
    fireEvent.click(screen.getByRole('checkbox', { name: `Include point x=${x}` }));
  }
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Rule option 2' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  expect(screen.getByRole('status')).toHaveTextContent('Keep exploring');
  fireEvent.click(screen.getByRole('radio', { name: 'Rule option 1' }));
  fireEvent.click(screen.getByRole('button', { name: 'Check connection' }));
  expect(screen.getByRole('status')).toHaveTextContent('Boss complete');
});
