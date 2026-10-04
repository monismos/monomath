import { describe, expect, it } from 'vitest';
import { createSetsDefinition, setsExamples } from './definition';
import { parseSetsInput, setsSolver } from '../../../core/solvers/sets';
import { setScene } from './scene';

function scenes() {
  return setsExamples.map((example) => {
    const parsed = parseSetsInput(example.input);
    if (!parsed.ok) throw new Error(parsed.reason);
    const solution = setsSolver.solve(parsed.problem);
    return setScene(parsed.problem, solution, solution.kind === 'builder' ? 'sieve' : 'venn');
  });
}

describe('Sets published lab content', () => {
  it('declares four required examples, seeded proof families, a three-part Boss and real Bridges', () => {
    const definition = createSetsDefinition(scenes());
    expect(definition.examples).toHaveLength(4);
    expect(new Set(definition.examples.map((example) => example.id)).size).toBe(4);
    expect(definition.challenges.length).toBeGreaterThanOrEqual(5);
    expect(definition.boss.phases.map((phase) => phase.id)).toEqual(['read', 'build', 'code']);
    expect(definition.bridges.length).toBeGreaterThanOrEqual(3);
    expect(definition.bridges.every((bridge) => bridge.description.length > 20)).toBe(true);
    expect(definition.scenes).toHaveLength(4);
    expect(definition.predicts.length).toBeGreaterThanOrEqual(4);
    for (const lines of Object.values(definition.mascotScript)) {
      expect(lines).toHaveLength(3);
      expect(lines.every((line) => line.split(/\s+/).length <= 12)).toBe(true);
    }
  });

  it('keeps every published step readable, addressable and predictive before the reveal', () => {
    for (const scene of scenes()) {
      const ids = new Set(scene.entities.map((entity) => entity.id));
      expect(scene.entities.length).toBeGreaterThan(0);
      expect(scene.steps[0].latexAfter).toContain('{?}');
      expect(scene.steps.slice(1).some((step) => step.predict)).toBe(true);
      for (const step of scene.steps) {
        for (const text of [
          step.title,
          step.say.quick,
          step.say.standard,
          step.say.deep,
          step.aria,
        ]) {
          expect(text.trim().length).toBeGreaterThan(5);
          expect(text).not.toMatch(/lorem|todo|placeholder/i);
        }
        expect(step.tethers.every((tether) => tether.entities.every((id) => ids.has(id)))).toBe(
          true,
        );
        expect((step.gaze ?? []).every((id) => ids.has(id))).toBe(true);
        if (step.predict) expect(step.predict.hints).toHaveLength(3);
      }
    }
  });
});
