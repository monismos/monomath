import { describe, expect, it } from 'vitest';
import { createLogicDefinition, logicExamples } from './definition';
import { parseLogicInput, solveLogic } from '../../core/solvers/logic';
import { logicScene } from './scene';
describe('Logic content quality gate', () => {
  const scenes = logicExamples.map((example) => {
    const parsed = parseLogicInput(example.input);
    if (!parsed.ok) throw new Error(parsed.reason);
    return logicScene(parsed.problem, solveLogic(parsed.problem));
  });
  it('declares required formula and argument examples, six proof families, Boss and Bridges', () => {
    const definition = createLogicDefinition(scenes);
    expect(definition.examples.length).toBeGreaterThanOrEqual(5);
    expect(new Set(definition.examples.map((example) => example.id)).size).toBe(
      definition.examples.length,
    );
    expect(definition.challenges.length).toBeGreaterThanOrEqual(5);
    expect(definition.boss.phases).toHaveLength(3);
    expect(definition.bridges.length).toBeGreaterThanOrEqual(3);
    expect(definition.predicts).toHaveLength(scenes.length);
    for (const lines of Object.values(definition.mascotScript)) {
      expect(lines).toHaveLength(3);
      expect(lines.every((line) => line.split(/\s+/).length <= 12)).toBe(true);
    }
  });
  it('checks every text depth, aria, id, predictive reveal and tether', () => {
    for (const scene of scenes) {
      const ids = new Set(scene.entities.map((entity) => entity.id));
      for (const step of scene.steps) {
        for (const text of [
          step.title,
          step.say.quick,
          step.say.standard,
          step.say.deep,
          step.aria,
        ]) {
          expect(text.length).toBeGreaterThan(5);
          expect(text).not.toMatch(/lorem|todo|placeholder/i);
        }
        expect(step.tethers.every((tether) => tether.entities.every((id) => ids.has(id)))).toBe(
          true,
        );
        if (step.predict) expect(step.predict.hints).toHaveLength(3);
      }
    }
  });
});
