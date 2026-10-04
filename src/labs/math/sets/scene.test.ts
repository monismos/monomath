import { describe, expect, it } from 'vitest';
import { resolveTimeline } from '../../../core/scene/timeline';
import { parseSetsInput, setsSolver } from '../../../core/solvers/sets';
import { setsExamples } from './definition';
import { canRenderSetsScene, setBuildScene, setScene } from './scene';
import type { SetsBuildState } from './challenge';

function published(input: string) {
  const parsed = parseSetsInput(input);
  if (!parsed.ok) throw new Error(parsed.reason);
  const solution = setsSolver.solve(parsed.problem);
  return { problem: parsed.problem, solution };
}

describe('truthful bounded Sets geometry', () => {
  it('keeps every displayed universe member addressable and within the renderer budget', () => {
    for (const example of setsExamples) {
      const { problem, solution } = published(example.input);
      const spec = setScene(problem, solution, solution.kind === 'builder' ? 'sieve' : 'venn');
      const ids = new Set(spec.entities.map((entity) => entity.id));
      expect(ids.size).toBe(spec.entities.length);
      expect(spec.entities.length).toBeLessThanOrEqual(96);
      expect(spec.entities.filter((entity) => entity.kind === 'sphere').length).toBeLessThanOrEqual(
        25,
      );
      expect(spec.entities.every((entity) => entity.pos.every(Number.isFinite))).toBe(true);
      expect(spec.steps.length).toBeGreaterThanOrEqual(4);
      expect(spec.steps.some((step) => step.predict)).toBe(true);
      for (const step of spec.steps) {
        expect(step.say.quick.length).toBeGreaterThan(5);
        expect(step.say.standard.length).toBeGreaterThan(5);
        expect(step.say.deep.length).toBeGreaterThan(5);
        expect(step.aria.length).toBeGreaterThan(5);
        expect((step.gaze ?? []).every((id) => ids.has(id))).toBe(true);
        expect(step.tethers.every((tether) => tether.entities.every((id) => ids.has(id)))).toBe(
          true,
        );
        expect(
          step.ops.every((op) =>
            op.t === 'pulse'
              ? op.ids.every((id) => ids.has(id))
              : op.t === 'tween' || op.t === 'remove'
                ? ids.has(op.id)
                : op.t === 'camera'
                  ? op.focus.every((id) => ids.has(id))
                  : op.t === 'morph'
                    ? ids.has(op.from) && ids.has(op.to)
                    : true,
          ),
        ).toBe(true);
      }
    }
  });

  it('reveals the result only in the final timeline step and keeps the result tether valid', () => {
    const { problem } = published('A ∩ (B ∪ C)');
    const solution = setsSolver.solve(problem, 'algebra');
    const spec = setScene(problem, solution, 'venn', 'algebra');
    expect(spec.steps[0].latexAfter).toContain('{?}');
    expect(spec.steps[1].predict).toBeDefined();
    expect(spec.steps[2].say.standard).toContain('{1, 2, 3, 4, 5, 6, 9}');
    expect(spec.steps.at(-1)?.latexAfter).toContain('tk-result');
    const resolved = resolveTimeline(spec, spec.steps.length - 1, 1, 2);
    expect(resolved.entities.result.opacity).toBe(1);
    expect(
      spec.steps.every((step) =>
        step.tethers.every((tether) => tether.entities.every((id) => !!resolved.entities[id])),
      ),
    ).toBe(true);
  });

  it('supports the power-set cube and Cartesian/function grids with bounded actual state', () => {
    const powerInput = parseSetsInput('A ∪ B', { U: [0, 2, 4], A: [0, 2, 4], B: [], C: [] });
    if (!powerInput.ok) throw new Error(powerInput.reason);
    const powerBuild: SetsBuildState = {
      universe: [0, 2, 4],
      a: [0, 2, 4],
      b: [],
      selected: [],
      subsets: [[], [0], [2], [4], [0, 2], [0, 4], [2, 4], [0, 2, 4]],
    };
    const cube = setBuildScene(powerBuild, 'power', { U: [0, 2, 4], A: [0, 2, 4], B: [], C: [] });
    expect(cube.entities.filter((entity) => /^subset-\d+$/.test(entity.id))).toHaveLength(8);
    expect(cube.entities.length).toBeLessThanOrEqual(96);
    const gridBuild: SetsBuildState = {
      universe: [1, 2, 3, 4],
      a: [1, 2],
      b: [3, 4],
      selected: [],
      pairs: [
        [1, 3],
        [1, 4],
        [2, 3],
        [2, 4],
      ],
    };
    const grid = setBuildScene(gridBuild, 'product', {
      U: [1, 2, 3, 4],
      A: [1, 2],
      B: [3, 4],
      C: [],
    });
    expect(grid.entities.filter((entity) => entity.id.startsWith('cell-'))).toHaveLength(4);
    expect(grid.code).toContain('result');
    expect(canRenderSetsScene(powerInput.problem, 'power')).toBe(true);
    expect(
      canRenderSetsScene(
        { expression: 'A', sets: { U: [0, 1, 2, 3], A: [0, 1, 2, 3], B: [], C: [] } },
        'power',
      ),
    ).toBe(false);
  });
});
