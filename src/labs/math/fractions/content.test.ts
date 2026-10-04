import { describe, expect, it } from 'vitest';
import type { SceneSpec } from '../../../core/scene/spec';
import { fractionsSolver } from '../../../core/solvers/fractions';
import { createFractionsDefinition, fractionsExamples } from './definition';
import { fractionScene } from './scene';
import type { FractionShape } from './scene';

const shapes: FractionShape[] = ['pie', 'bar', 'stack'];
function workedScenes(): SceneSpec[] {
  return fractionsExamples.map((example) => {
    const problem = fractionsSolver.parse(example.input);
    if (!problem) throw new Error(`Invalid published example: ${example.input}`);
    const solution = fractionsSolver.solve(problem);
    return fractionScene(problem, solution.result, solution.steps, 'pie', solution.method);
  });
}

function lintScene(scene: SceneSpec) {
  const ids = new Set(scene.entities.map((entity) => entity.id));
  expect(ids.size, scene.id).toBe(scene.entities.length);
  expect(scene.entities.length, scene.id).toBeLessThanOrEqual(96);
  expect(new Set(scene.steps.map((step) => step.id)).size).toBe(scene.steps.length);
  expect(scene.steps.length).toBeGreaterThanOrEqual(4);
  expect(scene.steps.some((step) => step.predict)).toBe(true);
  expect(scene.code).toContain('Fraction');
  const layerVariants = new Set(
    scene.entities.flatMap((entity) => Object.keys(entity.layers ?? {})),
  );
  expect(layerVariants.size).toBeGreaterThanOrEqual(3);
  for (const entity of scene.entities) {
    expect(entity.id).toMatch(/^[a-z][a-z0-9-]*$/);
    expect(entity.pos.every(Number.isFinite)).toBe(true);
  }
  for (const step of scene.steps) {
    expect(step.id).toMatch(/^[a-z][a-z0-9-]*$/);
    for (const text of [step.title, step.say.quick, step.say.standard, step.say.deep, step.aria]) {
      expect(text.trim().length).toBeGreaterThan(5);
      expect(text).not.toMatch(/lorem|todo|placeholder/i);
    }
    const math = `${step.latexBefore ?? ''} ${step.latexAfter}`;
    for (const tether of step.tethers) {
      expect(math).toContain(`tk-${tether.token}`);
      expect(tether.entities.length).toBeGreaterThan(0);
      expect(
        tether.entities.every((id) => ids.has(id)),
        `${scene.id}/${step.id}/${tether.token}`,
      ).toBe(true);
    }
    expect((step.gaze ?? []).every((id) => ids.has(id))).toBe(true);
    for (const operation of step.ops) {
      if (operation.t === 'pulse') expect(operation.ids.every((id) => ids.has(id))).toBe(true);
      if (operation.t === 'tween' || operation.t === 'remove')
        expect(ids.has(operation.id)).toBe(true);
      if (operation.t === 'morph')
        expect(ids.has(operation.from) && ids.has(operation.to)).toBe(true);
      if (operation.t === 'camera') expect(operation.focus.every((id) => ids.has(id))).toBe(true);
    }
    if (step.predict) {
      expect(step.predict.prompt.length).toBeGreaterThan(5);
      expect(step.predict.hints).toHaveLength(3);
      expect(step.predict.hints.every((hint) => hint.length > 5)).toBe(true);
    }
  }
}

describe('Fractions published lab content', () => {
  it('declares six worked examples, eight verified challenge families, one Boss and real Bridges', () => {
    const definition = createFractionsDefinition(workedScenes());
    expect(definition.id).toBe('fractions');
    expect(definition.domain).toBe('math');
    expect(new Set(definition.examples.map((example) => example.id)).size).toBe(6);
    expect(definition.scenes).toHaveLength(6);
    expect(definition.challenges).toHaveLength(8);
    expect(definition.boss.phases).toHaveLength(3);
    expect(definition.predicts.length).toBeGreaterThanOrEqual(6);
    expect(definition.bridges.some((bridge) => bridge.labId === 'equations')).toBe(true);
    expect(new Set(definition.bridges.map((bridge) => bridge.id)).size).toBe(
      definition.bridges.length,
    );
    for (const lines of Object.values(definition.mascotScript)) {
      expect(lines).toHaveLength(3);
      expect(lines.every((line) => line.split(/\s+/).length <= 12)).toBe(true);
    }
    expect(Object.values(definition.dialDefaults).every((value) => value >= 0 && value <= 3)).toBe(
      true,
    );
  });
  it('keeps all depths, Predicts, accessibility labels and references valid for every shape and method', () => {
    for (const example of fractionsExamples) {
      const problem = fractionsSolver.parse(example.input)!;
      for (const method of fractionsSolver.methods(problem)) {
        const solution = fractionsSolver.solve(problem, method.id);
        for (const step of solution.steps)
          expect(
            [step.say.quick, step.say.standard, step.say.deep, step.aria].every(
              (text) => text.length > 5,
            ),
          ).toBe(true);
        if (!solution.visualSupported) {
          expect(solution.visualCuts).toBeGreaterThan(24);
          continue;
        }
        for (const shape of shapes)
          lintScene(fractionScene(problem, solution.result, solution.steps, shape, method.id));
      }
    }
  });
  it('reads before asking for a prediction and does not reveal the exact result in that first step', () => {
    for (const example of fractionsExamples) {
      const steps = fractionsSolver.solve(fractionsSolver.parse(example.input)!).steps;
      expect(steps[0].id.endsWith('-read')).toBe(true);
      expect(steps[0].predict).toBeUndefined();
      expect(steps[0].latexAfter).toContain('{?}');
      expect(steps.slice(1).some((step) => step.predict)).toBe(true);
    }
  });
});
