import katex from 'katex';
import { lineCrossing } from './scene';
import { it, expect } from 'vitest';
import { evaluate, derivative } from 'mathjs';
import {
  parseFunctionInput,
  solveFunction,
  functionMethods,
  valueAt,
  slopeAt,
  modelText,
} from '../../../core/solvers/functions';
import {
  createFunctionChallenge,
  createFunctionBoss,
  functionChallengeKinds,
  blankFunctionBuild,
  validFunctionBuild,
  type FunctionBuild,
} from './challenge';
import { initialFunctionVariant, readFunctionVariant } from './context';
import { functionScene, midpointHeights, midpointSum } from './scene';
import { createFunctionDefinition, functionExamples } from './definition';
import { resolveTimeline } from '../../../core/scene/timeline';
const parse = (raw: string) => {
  const p = parseFunctionInput(raw);
  if (!p.ok) throw new Error(p.reason);
  return p.problem;
};
const options = { trace: 1, slice: 1, zoom: 1, n: 4, tangent: true, rectangles: true };
const built = (c: ReturnType<typeof createFunctionChallenge>): FunctionBuild => ({
  ...blankFunctionBuild(),
  coefficients: c.problem.model.type === 'polynomial' ? [...c.problem.model.coefficients] : [],
  points: [
    String(valueAt(c.problem, 0, c.kind === 'slice' ? 1 : 0)),
    String(valueAt(c.problem, 1, c.kind === 'slice' ? 1 : 0)),
  ],
  included: ['p0', 'p1'],
  markers: solveFunction(c.problem).roots,
  tangent: String(slopeAt(c.problem, 1)),
  heights: midpointHeights(c.problem, 4).map(String),
  claim: String(
    c.kind === 'area' ? midpointSum(c.problem, 4) : c.kind === 'slice' ? 1 : slopeAt(c.problem, 1),
  ),
});
it.each(functionChallengeKinds)('seeded %s checks the actual construction', (kind) => {
  [0, 1, 17, 12345, 4294967295].forEach((seed) => {
    const c = createFunctionChallenge(kind, seed),
      state = built(c);
    expect(c.goal(state)).toBe(true);
    expect(c.goal({ ...c.setup, claim: state.claim })).toBe(false);
    expect(c.goal({ ...state, coefficients: state.coefficients.map((v) => v + 1) })).toBe(false);
    if (kind === 'line' || kind === 'tangent' || kind === 'slice')
      expect(c.goal({ ...state, included: [] })).toBe(false);
    if (kind === 'roots') {
      expect(c.goal({ ...state, markers: [0] })).toBe(false);
      expect(c.goal({ ...state, markers: [state.markers[0], state.markers[0]] })).toBe(false);
    }
    if (kind === 'area') expect(c.goal({ ...state, heights: ['0', '0', '0', '0'] })).toBe(false);
    const expression = modelText(c.problem.model);
    expect(valueAt(c.problem, 1)).toBeCloseTo(evaluate(expression, { x: 1 }), 9);
    expect(slopeAt(c.problem, 1)).toBeCloseTo(derivative(expression, 'x').evaluate({ x: 1 }), 9);
  });
});
it('Boss needs all three connections, not merely its final code', () => {
  const boss = createFunctionBoss(12345),
    c = createFunctionChallenge('line', 12345),
    state = built(c);
  expect(boss.phases[0].goal(state)).toBe(true);
  expect(boss.phases[1].goal(state)).toBe(true);
  expect(boss.goal(state)).toBe(false);
  expect(boss.goal({ ...state, code: boss.codeOptions[0] })).toBe(true);
  boss.codeOptions.slice(1).forEach((code) => expect(boss.goal({ ...state, code })).toBe(false));
});
it('restored context is bounded, closed, complete and cloned', () => {
  const v = {
    ...initialFunctionVariant(),
    mode: 'prove' as const,
    kind: 'area' as const,
    n: 4,
    build: built(createFunctionChallenge('area', 12345)),
    trace: 2,
    slice: -1,
    zoom: 1.5,
    rectangles: true,
    phase: 2,
  };
  const restored = readFunctionVariant(JSON.stringify({ ...v, unrelated: 'drop me' }));
  expect(restored).toEqual(v);
  v.build.coefficients[0] = 99;
  expect(restored.build.coefficients[0]).not.toBe(99);
  [
    { ...initialFunctionVariant(), n: 17 },
    { ...initialFunctionVariant(), expression: 'y=eval(1)' },
    { ...initialFunctionVariant(), trace: Infinity },
    { ...initialFunctionVariant(), build: { ...blankFunctionBuild(), markers: [13] } },
    { ...initialFunctionVariant(), build: { ...blankFunctionBuild(), coefficients: [99] } },
  ].forEach((v) =>
    expect(readFunctionVariant(JSON.stringify(v))).toEqual(initialFunctionVariant()),
  );
  expect(validFunctionBuild({ ...blankFunctionBuild(), points: ['', '', ''] })).toBe(false);
  expect(validFunctionBuild({ ...blankFunctionBuild(), markers: Array(2) })).toBe(false);
});
it('all authored methods, dial layers, entity ids, tethers and content remain deterministic', () => {
  const scenes = functionExamples.map((example) => {
    const p = parse(example.input);
    return functionScene(p, solveFunction(p), options);
  });
  const definition = createFunctionDefinition(scenes);
  expect(definition.challenges).toHaveLength(5);
  expect(definition.predicts).toHaveLength(7);
  expect(definition.boss.phases).toHaveLength(3);
  Object.values(definition.mascotScript).forEach((lines) =>
    expect(lines.every((line) => line.split(/\s+/).length <= 12)).toBe(true),
  );
  for (const example of functionExamples) {
    const p = parse(example.input);
    for (const method of functionMethods(p)) {
      const scene = functionScene(p, solveFunction(p, method.id), options),
        ids = new Set(scene.entities.map((e) => e.id));
      expect(ids.size).toBe(scene.entities.length);
      expect(scene.entities.length).toBeLessThan(75);
      expect(scene.entities.every((e) => !!e.tether)).toBe(true);
      scene.steps.forEach((step) => {
        [step.say.quick, step.say.standard, step.say.deep, step.aria].forEach((text) =>
          expect(text).not.toMatch(/todo|lorem|placeholder/i),
        );
        expect(step.tethers.every((t) => t.entities.every((id) => ids.has(id)))).toBe(true);
        expect(() =>
          katex.renderToString(step.latexAfter, {
            throwOnError: true,
            trust: true,
            strict: 'ignore',
          }),
        ).not.toThrow();
      });
      for (const dial of [0, 0.5, 1, 2, 3]) {
        const a = resolveTimeline(scene, scene.steps.length - 1, 1, dial),
          b = resolveTimeline(scene, scene.steps.length - 1, 1, dial);
        expect(a).toEqual(b);
        Object.values(a.entities).forEach((e) =>
          [e.pos, ...(e.points ?? [])].flat().forEach((v) => expect(Number.isFinite(v)).toBe(true)),
        );
      }
    }
  }
});
it('entered coefficients, point heights and rectangle heights change the rendered model', () => {
  const c = createFunctionChallenge('area', 12345),
    s = solveFunction(c.problem),
    state = built(c);
  const correct = functionScene(c.problem, s, { ...options, build: state }),
    wrong = functionScene(c.problem, s, {
      ...options,
      build: { ...state, coefficients: [0, 0, 0], heights: ['0', '0', '0', '0'] },
    });
  expect(correct.entities.find((e) => e.id === 'curve')!.points).not.toEqual(
    wrong.entities.find((e) => e.id === 'curve')!.points,
  );
  expect(correct.entities.find((e) => e.id === 'rectangle-2')!.points).not.toEqual(
    wrong.entities.find((e) => e.id === 'rectangle-2')!.points,
  );
});
it('signed rectangles converge, and the square construction has literal strip and corner areas', () => {
  const p = parse('integral(x^2,0,3)');
  expect(Math.abs(midpointSum(p, 16) - 9)).toBeLessThan(Math.abs(midpointSum(p, 4) - 9));
  expect(midpointSum(parse('integral(-x^2,0,3)'), 4)).toBeLessThan(0);
  const q = parse('x^2-4*x+3=0'),
    scene = functionScene(q, solveFunction(q, 'square'), options),
    state = resolveTimeline(scene, 2, 1, 0);
  expect(state.entities['square-left'].text?.plain).toContain('2x');
  expect(state.entities['square-corner'].text?.plain).toContain('4');
  expect(state.entities['square-result'].text?.plain).toContain('(x−2)²');
  expect(state.entities['square-left'].opacity).toBe(1);
  expect(state.entities.curve.opacity).toBe(0);
});

it('linear systems distinguish crossings, parallel lines and coincident rules', () => {
  expect(lineCrossing([1, 2], [-1, 4])).toEqual({ kind: 'point', x: 1, y: 3 });
  expect(lineCrossing([1, 2], [2, 4])).toEqual({ kind: 'parallel' });
  expect(lineCrossing([1, 2], [2, 1])).toEqual({ kind: 'coincident' });
  for (const a of [-3, -1, 1, 3])
    for (const m of [-2, 0, 2]) {
      const crossing = lineCrossing([1, a], [m, 4]);
      if (crossing.kind === 'point') {
        expect(evaluate('a*x+1', { a, x: crossing.x })).toBeCloseTo(crossing.y, 9);
        expect(evaluate('m*x+4', { m, x: crossing.x })).toBeCloseTo(crossing.y, 9);
      }
    }
  const p = parse('y=2*x+1'),
    scene = functionScene(p, solveFunction(p), { ...options, compare: [-1, 4] });
  expect(scene.entities.find((e) => e.id === 'crossing')!.text!.plain).toContain('(1,3)');
  expect(() =>
    katex.renderToString(scene.steps[0].latexAfter, {
      throwOnError: true,
      trust: true,
      strict: 'ignore',
    }),
  ).not.toThrow();
});
it('surface zoom changes coordinate range and the slice position without changing the rule', () => {
  const p = parse('z=x^2+y^2'),
    s = solveFunction(p);
  const normal = functionScene(p, s, options),
    zoomed = functionScene(p, s, { ...options, zoom: 1.5 });
  expect(normal.entities.find((e) => e.id === 'slice-plane')!.points).not.toEqual(
    zoomed.entities.find((e) => e.id === 'slice-plane')!.points,
  );
  expect(zoomed.entities.find((e) => e.id === 'window-right')!.text!.plain).toBe('2');
});
