import { expect, it } from 'vitest';
import { parseSummationInput, solveSummation } from '../../../core/solvers/summation';
import { createSummationDefinition, summationExamples } from './definition';
import { summationScene } from './scene';
const scenes = summationExamples.map((example) => {
  const parsed = parseSummationInput(example.input);
  if (!parsed.ok) throw new Error(parsed.reason);
  return summationScene(parsed.problem, solveSummation(parsed.problem));
});
it('supplies every required example, six seeded proof families, Boss, Bridges and dialogue', () => {
  const definition = createSummationDefinition(scenes);
  expect(definition.examples.length).toBeGreaterThanOrEqual(3);
  expect(definition.challenges.length).toBeGreaterThanOrEqual(5);
  expect(definition.boss.phases).toHaveLength(3);
  expect(definition.bridges.length).toBeGreaterThanOrEqual(3);
  expect(definition.predicts).toHaveLength(scenes.length);
  for (const lines of Object.values(definition.mascotScript)) {
    expect(lines).toHaveLength(3);
    expect(lines.every((line) => line.split(/\s+/).length <= 12)).toBe(true);
  }
});
it('lints every text depth, aria, stable id and tether', () => {
  for (const scene of scenes) {
    const ids = new Set(scene.entities.map((entity) => entity.id));
    expect(ids.size).toBe(scene.entities.length);
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
      expect(step.tethers.every((tether) => tether.entities.every((id) => ids.has(id)))).toBe(true);
      if (step.predict) expect(step.predict.hints).toHaveLength(3);
    }
    expect(scene.entities.every((entity) => !!entity.tether)).toBe(true);
  }
});
