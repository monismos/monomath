import { describe, expect, it } from 'vitest';
import { resolveTimeline } from '../../core/scene/timeline';
import { evaluateLogic, logicNodes, parseLogicInput, solveLogic } from '../../core/solvers/logic';
import { logicExamples } from './definition';
import { logicBuildScene, logicScene } from './scene';
describe('truthful lanterns, gates and Venn morph', () => {
  it('keeps all published scenes bounded, deterministic and addressable in both methods', () => {
    for (const example of logicExamples) {
      const parsed = parseLogicInput(example.input);
      if (!parsed.ok) throw new Error(parsed.reason);
      for (const method of ['truth-table', 'gate-circuit'] as const) {
        const solution = solveLogic(parsed.problem, method),
          spec = logicScene(parsed.problem, solution, 'world-0', method);
        const ids = new Set(spec.entities.map((entity) => entity.id));
        expect(ids.size).toBe(spec.entities.length);
        expect(spec.entities.length).toBeLessThanOrEqual(96);
        expect(
          spec.entities.filter((entity) => entity.kind === 'sphere' || entity.kind === 'lantern')
            .length,
        ).toBeLessThanOrEqual(25);
        expect(spec.entities.every((entity) => entity.pos.every(Number.isFinite))).toBe(true);
        spec.steps.forEach((step) => {
          expect(step.tethers.every((tether) => tether.entities.every((id) => ids.has(id)))).toBe(
            true,
          );
          expect((step.gaze ?? []).every((id) => ids.has(id))).toBe(true);
        });
        expect(resolveTimeline(spec, 3, 1, 2)).toEqual(resolveTimeline(spec, 3, 1, 2));
        expect(resolveTimeline(spec, 0, 1, 0).entities.result.opacity).toBe(0);
        expect(resolveTimeline(spec, 3, 1, 0).entities.result.opacity).toBe(1);
        const initial = resolveTimeline(spec, 0, 1, 0),
          revealed = resolveTimeline(spec, 2, 1, 0);
        solution.rows.forEach((row) => {
          expect(initial.entities[row.id].text?.plain).toContain('predict first');
          expect(revealed.entities[row.id].text?.plain).toContain(row.result ? 'T ✓' : 'F ×');
        });
      }
    }
  });
  it('lights each selected world’s actual gate outputs and wires children to parents', () => {
    const parsed = parseLogicInput('(p → q) ∧ ¬q');
    if (!parsed.ok) throw new Error(parsed.reason);
    const solution = solveLogic(parsed.problem);
    for (const row of solution.rows) {
      const spec = logicScene(parsed.problem, solution, row.id, 'gate-circuit'),
        state = resolveTimeline(spec, 2, 1, 0);
      for (const node of logicNodes(parsed.problem.ast)) {
        expect(state.entities[node.id].text?.plain).toContain(
          evaluateLogic(node.ast, row.values) ? 'T ✓' : 'F ×',
        );
        node.inputs.forEach((input) =>
          expect(state.entities[`wire-${node.id}-${input}`]).toBeDefined(),
        );
      }
    }
  });
  it('places truth worlds in the correct variable regions and changes three dial layers', () => {
    const parsed = parseLogicInput('p ∧ q');
    if (!parsed.ok) throw new Error(parsed.reason);
    const solution = solveLogic(parsed.problem),
      spec = logicScene(parsed.problem, solution),
      shape = resolveTimeline(spec, 3, 1, 1),
      thing = resolveTimeline(spec, 3, 1, 0),
      symbol = resolveTimeline(spec, 3, 1, 2);
    expect(shape.entities['region-p'].opacity).toBeGreaterThan(0);
    expect(thing.entities['region-p'].opacity).toBe(0);
    solution.rows.forEach((row) => {
      const point = shape.entities[row.id].pos;
      for (const name of parsed.problem.variables) {
        const center = shape.entities['region-' + name].pos;
        const inside = Math.hypot(point[0] - center[0], point[2] - center[2]) < 1.65;
        expect(inside).toBe(row.values[name]);
      }
    });
    expect(thing.entities['world-0'].pos).not.toEqual(shape.entities['world-0'].pos);
    expect(shape.entities['world-0'].pos).not.toEqual(symbol.entities['world-0'].pos);
  });
  it('builds marked worlds from scene state without including the solved classification', () => {
    const parsed = parseLogicInput('p → q');
    if (!parsed.ok) throw new Error(parsed.reason);
    const solution = solveLogic(parsed.problem),
      spec = logicBuildScene(parsed.problem, solution, { selectedWorlds: ['world-2'] });
    expect(spec.steps).toHaveLength(1);
    expect(spec.entities.find((entity) => entity.id === 'world-2')?.color).toBe('highlight');
    expect(spec.entities.find((entity) => entity.id === 'world-0')?.color).toBe('ink');
  });
});
