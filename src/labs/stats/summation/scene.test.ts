import { expect, it } from 'vitest';
import { parseSummationInput, solveSummation } from '../../../core/solvers/summation';
import { resolveTimeline } from '../../../core/scene/timeline';
import { createSummationChallenge } from './challenge';
import { summationExamples } from './definition';
import { summationScene } from './scene';
const parse = (raw: string) => {
  const parsed = parseSummationInput(raw);
  if (!parsed.ok) throw new Error(parsed.reason);
  return parsed.problem;
};
it('keeps all examples and layers deterministic, bounded and tethered', () => {
  for (const example of [
    ...summationExamples,
    { input: 'data(0,0)' },
    { input: 'sum(i=0..3,j=0..3,i+j)' },
  ])
    for (const method of ['accumulate', 'structure'] as const)
      for (const view of ['machine', 'structure'] as const) {
        const problem = parse(example.input),
          scene = summationScene(problem, solveSummation(problem, method), { view });
        expect(scene.entities.length).toBeLessThanOrEqual(96);
        expect(new Set(scene.entities.map((entity) => entity.id)).size).toBe(scene.entities.length);
        for (const dial of [0, 1, 2, 3])
          for (const step of [0, 1, 2, scene.steps.length - 1]) {
            const frame = resolveTimeline(scene, step, 1, dial);
            expect(resolveTimeline(scene, step, 1, dial)).toEqual(frame);
            expect(
              Object.values(frame.entities).every((entity) => entity.pos.every(Number.isFinite)),
            ).toBe(true);
          }
      }
});
it('walks inclusive indices and increases the actual collected stack exactly once per term', () => {
  const problem = parse('sum(i=1..5,2i+1)'),
    scene = summationScene(problem);
  expect(resolveTimeline(scene, 1).entities.result.text?.plain).toBe('Total: 0');
  expect(resolveTimeline(scene, 2).entities.result.text?.plain).toBe('Total: 3');
  expect(resolveTimeline(scene, 2, 0).entities['collected-0'].pos).not.toEqual(
    resolveTimeline(scene, 2, 1).entities['collected-0'].pos,
  );
  expect(resolveTimeline(scene, 3).entities.result.text?.plain).toBe('Total: 8');
  for (let term = 0; term < 5; term++)
    expect(resolveTimeline(scene, term + 2).entities['collected-' + term].opacity).toBe(1);
  expect(resolveTimeline(scene, 7).entities.result.text?.plain).toBe('Total: 35 ✓');
  expect(scene.entities.find((entity) => entity.id === 'collected-4')?.scale?.[1]).toBeCloseTo(
    (11 / 35) * 2,
  );
});
it('actually folds first/last terms and changes the double-grid visit order', () => {
  const problem = parse('sum(i=1..5,i)'),
    normal = summationScene(problem),
    paired = summationScene(problem, solveSummation(problem, 'structure'), { view: 'structure' });
  expect(paired.entities.find((entity) => entity.id === 'term-0')?.pos[0]).toBe(
    paired.entities.find((entity) => entity.id === 'term-4')?.pos[0],
  );
  expect(paired.entities.find((entity) => entity.id === 'term-4')?.pos).not.toEqual(
    normal.entities.find((entity) => entity.id === 'term-4')?.pos,
  );
  const grid = parse('sum(i=1..2,j=1..2,i+j)'),
    row = summationScene(grid),
    column = summationScene(grid, solveSummation(grid, 'structure'));
  expect(resolveTimeline(row, 3).entities.walker.text?.plain).toBe('i=1,j=2');
  expect(resolveTimeline(column, 3).entities.walker.text?.plain).toBe('i=2,j=1');
  expect(resolveTimeline(row, row.steps.length - 1).entities.result.text?.plain).toBe(
    resolveTimeline(column, column.steps.length - 1).entities.result.text?.plain,
  );
});
it('reveals exact balance, proportionate square areas and a genuine ring only after prediction', () => {
  const problem = parse('data(4,8,6,5,3)'),
    solution = solveSummation(problem),
    balance = summationScene(problem, solution),
    squares = summationScene(problem, solution, { view: 'structure' });
  expect(resolveTimeline(balance, 1).entities['mean-pin'].opacity).toBe(0);
  expect(resolveTimeline(balance, 2).entities.mean.text?.plain).toBe('Mean: 26/5');
  expect(resolveTimeline(squares, 1).entities['term-0'].opacity).toBe(0);
  const first = squares.entities.find((entity) => entity.id === 'term-0')!,
    second = squares.entities.find((entity) => entity.id === 'term-1')!;
  expect(first.scale![0] ** 2 / second.scale![0] ** 2).toBeCloseTo(36 / 196);
  expect(resolveTimeline(squares, 4).entities.result.text?.plain).toBe(
    'Population variance: 74/25',
  );
  expect(resolveTimeline(balance, 4).entities['sd-ring-0'].opacity).toBe(0);
  expect(resolveTimeline(balance, 5).entities['sd-ring-0'].opacity).toBe(0.7);
  expect(balance.entities.filter((entity) => entity.id.startsWith('sd-ring-'))).toHaveLength(24);
});
it('learner edits change the actual block, included stack, balance pin and square area', () => {
  const challenge = createSummationChallenge('linear', 1),
    state = { ...challenge.setup, included: ['term-0'], values: { 'term-0': '5' } };
  const first = summationScene(challenge.problem, challenge.solution, { build: state });
  const second = summationScene(challenge.problem, challenge.solution, {
    build: { ...state, values: { 'term-0': '7' } },
  });
  expect(first.entities.find((entity) => entity.id === 'term-0')?.scale).not.toEqual(
    second.entities.find((entity) => entity.id === 'term-0')?.scale,
  );
  expect(first.entities.find((entity) => entity.id === 'collected-0')?.opacity).toBe(1);
  const data = createSummationChallenge('variance', 1),
    a = summationScene(data.problem, data.solution, {
      view: 'structure',
      kind: 'variance',
      build: { ...data.setup, included: ['term-0'], values: { 'term-0': '1' }, balance: '4' },
    });
  const b = summationScene(data.problem, data.solution, {
    view: 'structure',
    kind: 'variance',
    build: { ...data.setup, included: ['term-0'], values: { 'term-0': '4' }, balance: '5' },
  });
  expect(b.entities.find((entity) => entity.id === 'term-0')?.scale?.[0]).toBeCloseTo(
    a.entities.find((entity) => entity.id === 'term-0')!.scale![0] * 2,
  );
  expect(a.entities.find((entity) => entity.id === 'mean-pin')?.pos).not.toEqual(
    b.entities.find((entity) => entity.id === 'mean-pin')?.pos,
  );
});
