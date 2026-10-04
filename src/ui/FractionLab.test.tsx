import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { SceneSpec } from '../core/scene/spec';
import { useLesson } from '../core/scene/store';
import { useGame } from '../core/gamification/store';
import { initialGame } from '../core/gamification/logic';
import { createFractionChallenge } from '../labs/math/fractions/challenge';
import { initialFractionVariant, readFractionVariant } from '../labs/math/fractions/context';
import * as scenes from '../labs/math/fractions/scene';
import FractionLab from './FractionLab';

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
      <input aria-label="Test problem" name="problem" defaultValue={value} />
      <button>Study test expression</button>
    </form>
  ),
}));

beforeEach(() => {
  model.spec = null;
  useGame.setState(initialGame());
  useLesson.setState({
    labId: 'fractions',
    problem: '3/4 + 1/6',
    step: 0,
    dial: 0,
    selection: null,
    variant: JSON.stringify(initialFractionVariant()),
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const variant = () => readFractionVariant(useLesson.getState().variant);
const proof = () => screen.getByRole('region', { name: 'Fraction proof' });
const start = (kind: string) => {
  fireEvent.click(screen.getByRole('button', { name: 'Prove' }));
  fireEvent.change(within(proof()).getByRole('combobox', { name: 'Challenge' }), {
    target: { value: kind },
  });
};
const resultEntities = () =>
  model.spec!.entities.filter((e) => /^result-piece(?:-\d+)?$/.test(e.id));

describe('Fractions learner controls drive the rendered proof model', () => {
  it('verifies actual selected pieces, rejects a changed model and does not duplicate XP', () => {
    render(<FractionLab />);
    start('shade');
    const challenge = createFractionChallenge('shade', variant().seed);
    fireEvent.click(within(proof()).getByRole('button', { name: 'Check my pieces' }));
    expect(within(proof()).getByRole('status')).toHaveTextContent('Keep exploring');
    const count = (challenge.target.n * challenge.requiredDenominator) / challenge.target.d;
    for (let i = 1; i <= count; i++)
      fireEvent.click(within(proof()).getByRole('button', { name: `Piece ${i}` }));
    expect(resultEntities().filter((e) => e.color === 'part')).toHaveLength(count);
    fireEvent.click(within(proof()).getByRole('button', { name: 'Check my pieces' }));
    expect(within(proof()).getByRole('status')).toHaveTextContent('Proof complete');
    const xp = useGame.getState().xp;
    fireEvent.click(within(proof()).getByRole('button', { name: 'Check my pieces' }));
    expect(useGame.getState().xp).toBe(xp);
    fireEvent.click(within(proof()).getByRole('button', { name: 'Piece 1 · selected' }));
    expect(resultEntities().filter((e) => e.color === 'part')).toHaveLength(count - 1);
    fireEvent.click(within(proof()).getByRole('button', { name: 'Check my pieces' }));
    expect(within(proof()).getByRole('status')).toHaveTextContent('Keep exploring');
  });
  it('preserves selected area when cuts change and rejects a fractional subdivision', () => {
    render(<FractionLab />);
    start('equivalent');
    fireEvent.click(within(proof()).getByRole('button', { name: 'Piece 1' }));
    fireEvent.click(within(proof()).getByRole('button', { name: 'Piece 2' }));
    const before = variant().build;
    fireEvent.change(within(proof()).getByRole('slider', { name: 'Equal cuts per whole' }), {
      target: { value: before.denominator * 2 },
    });
    expect(variant().build.selected).toHaveLength(4);
    expect(resultEntities()).toHaveLength(before.denominator * 2);
    expect(resultEntities().filter((e) => e.color === 'part')).toHaveLength(4);
    fireEvent.change(within(proof()).getByRole('slider', { name: 'Equal cuts per whole' }), {
      target: { value: before.denominator * 2 - 1 },
    });
    expect(variant().build.denominator).toBe(before.denominator * 2);
    expect(within(proof()).getByRole('status')).toHaveTextContent('cannot preserve');
  });
  it('recuts both operands without rounding their selected area or changing unit size', () => {
    render(<FractionLab />);
    start('add');
    const challenge = createFractionChallenge('add', variant().seed),
      den = challenge.requiredDenominator;
    fireEvent.change(within(proof()).getByRole('spinbutton', { name: 'Left recut' }), {
      target: { value: den },
    });
    fireEvent.change(within(proof()).getByRole('spinbutton', { name: 'Right recut' }), {
      target: { value: den },
    });
    const left = model.spec!.entities.filter((e) => /^left-piece/.test(e.id)),
      right = model.spec!.entities.filter((e) => /^right-piece/.test(e.id));
    expect(left).toHaveLength(den);
    expect(right).toHaveLength(den);
    expect(left.filter((e) => e.color === 'whole')).toHaveLength(
      (challenge.givens.a.n * den) / challenge.givens.a.d,
    );
    expect(left[0].size).toEqual(resultEntities()[0].size);
    fireEvent.change(within(proof()).getByRole('spinbutton', { name: 'Left recut' }), {
      target: { value: challenge.givens.a.d + 1 },
    });
    expect(variant().build.leftCuts).toBe(den);
  });
  it('shows original cut groups beside their equivalent simplified result', () => {
    render(<FractionLab />);
    start('simplify');
    const challenge = createFractionChallenge('simplify', variant().seed),
      factor = challenge.givens.a.d / challenge.target.d;
    fireEvent.change(within(proof()).getByRole('spinbutton', { name: 'Old cuts per group' }), {
      target: { value: factor },
    });
    expect(model.spec!.entities.filter((e) => /^left-piece/.test(e.id))).toHaveLength(
      challenge.givens.a.d,
    );
    expect(resultEntities()).toHaveLength(challenge.target.d);
    expect(resultEntities().filter((e) => e.color === 'part')).toHaveLength(challenge.target.n);
    expect(within(proof()).getByRole('slider', { name: 'Equal cuts per whole' })).toBeDisabled();
    fireEvent.click(within(proof()).getByRole('button', { name: 'Check my pieces' }));
    expect(within(proof()).getByRole('status')).toHaveTextContent('Proof complete');
  });
  it('locks the multiplication cut count and checks changed overlap cells', () => {
    render(<FractionLab />);
    start('multiply');
    expect(within(proof()).getByRole('slider', { name: 'Equal cuts per whole' })).toBeDisabled();
    const cols = within(proof()).getAllByRole('button', { name: /^Column \d+$/ }),
      rows = within(proof()).getAllByRole('button', { name: /^Row \d+$/ });
    cols.slice(0, -1).forEach((node) => fireEvent.click(node));
    rows.slice(0, -1).forEach((node) => fireEvent.click(node));
    expect(resultEntities().filter((e) => e.color === 'result')).toHaveLength(
      (cols.length - 1) * (rows.length - 1),
    );
    fireEvent.click(within(proof()).getByRole('button', { name: 'Check my pieces' }));
    expect(within(proof()).getByRole('status')).toHaveTextContent('Proof complete');
    fireEvent.click(within(proof()).getByRole('button', { name: 'Piece 1 · selected' }));
    fireEvent.click(within(proof()).getByRole('button', { name: 'Check my pieces' }));
    expect(within(proof()).getByRole('status')).toHaveTextContent('Keep exploring');
  });
  it('displays a count of divisor units rather than an original-whole fraction', () => {
    render(<FractionLab />);
    start('divide');
    const challenge = createFractionChallenge('divide', variant().seed);
    for (let i = 1; i <= challenge.target.n; i++)
      fireEvent.click(within(proof()).getByRole('button', { name: `Piece ${i}` }));
    expect(model.spec!.steps[0].latexAfter).toContain(`tk-result}{${challenge.target.n}}`);
    expect(model.spec!.steps[0].aria).toContain('measuring bars');
    expect(within(proof()).getByRole('slider', { name: 'Equal cuts per whole' })).toBeDisabled();
    fireEvent.click(within(proof()).getByRole('button', { name: 'Check my pieces' }));
    expect(within(proof()).getByRole('status')).toHaveTextContent('Proof complete');
  });
  it('bypasses scene allocation for large and invalid restored expressions', () => {
    const spy = vi.spyOn(scenes, 'fractionScene');
    useLesson.setState({ problem: '1/997 + 1/991' });
    render(<FractionLab />);
    expect(screen.getByRole('heading', { name: 'Exact result: 1988/988027' })).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Rendered model' })).not.toBeInTheDocument();
    cleanup();
    useLesson.setState({ problem: 'x + 1/2' });
    render(<FractionLab />);
    expect(
      screen.getByRole('heading', { name: 'This expression needs a correction' }),
    ).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });
  it('accepts exact Try-first equivalents and rejects excessive typed products safely', () => {
    render(<FractionLab />);
    fireEvent.click(screen.getByRole('button', { name: 'Try first' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Your expression' }), {
      target: { value: '22/24' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Check equivalence' }));
    expect(screen.queryByRole('heading', { name: 'Your turn' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Test problem' }), {
      target: { value: '10000 9999/10000 × 10000 9999/10000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Study test expression' }));
    expect(useLesson.getState().problem).toBe('3/4 + 1/6');
    expect(screen.getByRole('status')).toHaveTextContent('exact workspace limit');
  });
});
