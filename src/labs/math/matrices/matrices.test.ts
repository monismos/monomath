import { it, expect } from 'vitest';
import { multiply, det, eigs } from 'mathjs';
import {
  parseMatrixInput,
  solveMatrix,
  numQ,
  matrixText,
  identityMatrix,
} from '../../../core/solvers/matrices';
import { fractionText } from '../../../core/solvers/fractions';
import {
  createMatrixChallenge,
  createMatrixBoss,
  blankMatrixBuild,
  matrixChallengeKinds,
  validMatrixBuild,
  enteredMatrix,
} from './challenge';
import { initialMatrixVariant, readMatrixVariant } from './context';
import { applyMatrix, realEigenvectors, equationSlice, nullSpace } from './geometry';
import { matrixScene } from './scene';
import { resolveTimeline } from '../../../core/scene/timeline';
import { entityVisible } from '../../../core/scene/spec';
import { createMatrixDefinition, matrixExamples } from './definition';
const parse = (raw: string) => {
  const p = parseMatrixInput(raw);
  if (!p.ok) throw new Error(p.reason);
  return p.problem;
};
const built = (c: ReturnType<typeof createMatrixChallenge>) => ({
  cells: Object.fromEntries(
    c.expected.flatMap((row, i) => row.map((v, j) => [`out-${i}-${j}`, fractionText(v)])),
  ),
  included: [...c.cellIds],
  claim: fractionText(c.solution.determinant),
  classification: c.solution.classification ?? '',
});
it.each(matrixChallengeKinds)(
  'seeded construction %s agrees with an independent oracle',
  (kind) => {
    [0, 1, 2, 17, 12345, 4294967295].forEach((seed) => {
      const c = createMatrixChallenge(kind, seed),
        state = built(c);
      expect(c.goal(state)).toBe(true);
      expect(c.goal({ ...state, included: [] })).toBe(false);
      expect(c.goal({ ...state, cells: { ...state.cells, [c.cellIds[0]]: '99' } })).toBe(false);
      expect(c.goal({ ...state, included: [...state.included, state.included[0]] })).toBe(false);
      const a = c.problem.a.map((row) => row.map(numQ));
      expect(numQ(c.solution.determinant)).toBeCloseTo(det(a), 10);
      if (kind === 'solve')
        expect(
          multiply(
            a,
            c.solution.result.map((row) => row.map(numQ)),
          ),
        ).toEqual(c.problem.b!.map((row) => row.map(numQ)));
      if (kind === 'inverse')
        expect(
          multiply(
            a,
            c.solution.result.map((row) => row.map(numQ)),
          ),
        ).toEqual([
          [1, 0],
          [0, 1],
        ]);
    });
  },
);
it('Boss needs signed scale, actual basis and the complete composition loop', () => {
  const boss = createMatrixBoss(12345),
    c = createMatrixChallenge('determinant', 12345),
    state = built(c);
  expect(boss.phases[0].goal(state)).toBe(true);
  expect(boss.phases[1].goal(state)).toBe(true);
  expect(boss.goal(state)).toBe(false);
  boss.codeOptions.slice(1).forEach((code) => expect(boss.goal({ ...state, code })).toBe(false));
  expect(boss.goal({ ...state, code: boss.codeOptions[0] })).toBe(true);
});
it('imported construction is bounded and cloned', () => {
  expect(validMatrixBuild({ ...blankMatrixBuild(), cells: { 'out-3-0': '1' } })).toBe(false);
  expect(validMatrixBuild({ ...blankMatrixBuild(), cells: { 'out-0-0': 'x'.repeat(33) } })).toBe(
    false,
  );
  expect(validMatrixBuild({ ...blankMatrixBuild(), included: ['out-0-0', 'out-0-0'] })).toBe(false);
  const initial = initialMatrixVariant(),
    c = createMatrixChallenge('determinant', 17),
    source = {
      ...initial,
      mode: 'prove',
      kind: 'determinant',
      seed: 17,
      view: 'lattice',
      cursor: 3,
      build: built(c),
      eigen: true,
      language: 'numpy',
    };
  const restored = readMatrixVariant(JSON.stringify(source));
  expect(restored).toEqual(source);
  source.build.cells['out-0-0'] = '0';
  expect(restored.build.cells['out-0-0']).not.toBe('0');
  [
    '{',
    JSON.stringify({ ...initial, seed: -1 }),
    JSON.stringify({ ...source, cursor: 8 }),
    JSON.stringify({ ...initial, expression: 'eval([1,0;0,1])' }),
    JSON.stringify({ ...initial, build: { ...blankMatrixBuild(), included: ['out-9-9'] } }),
  ].forEach((raw) => expect(readMatrixVariant(raw)).toEqual(initial));
});
it('solves real eigenspaces independently, including repeated roots and complex pairs', () => {
  [
    'transform([2,0;0,3])',
    'transform([1,1;0,1])',
    'transform([0,-1;1,0])',
    'transform([1,1,0;0,2,0;0,0,-1])',
    'transform([0,-1,0;1,0,0;0,0,2])',
    'transform([2,0,0;0,2,0;0,0,2])',
    'transform([1,0,1;0,2,0;1,0,1])',
  ].forEach((raw) => {
    const a = parse(raw).a,
      real = realEigenvectors(a),
      oracle = eigs(a.map((row) => row.map(numQ))).values;
    real.forEach((e) => {
      const image = multiply(
        a.map((row) => row.map(numQ)),
        e.direction,
      ) as number[];
      image.forEach((v, j) => expect(v).toBeCloseTo(e.value * e.direction[j], 6));
      expect(
        (oracle as (number | { re: number; im: number })[]).some((value) =>
          typeof value === 'number'
            ? Math.abs(value - e.value) < 1e-5
            : Math.abs(value.im) < 1e-6 && Math.abs(value.re - e.value) < 1e-5,
        ),
      ).toBe(true);
    });
    if (raw.includes('0,-1;')) expect(real).toHaveLength(0);
    if (raw.includes('2,0,0;0,2')) expect(real).toHaveLength(3);
  });
});
it('line and plane vertices satisfy their actual equation', () => {
  [
    [2, 1],
    [1, -1],
    [1, 2, 3],
    [0, 1, 0],
  ].forEach((row) => {
    const points = equationSlice(row, 1, 3);
    expect(points.length).toBeGreaterThanOrEqual(2);
    points.forEach((p) =>
      expect(p.reduce((sum, value, j) => sum + value * row[j], 0)).toBeCloseTo(1, 8),
    );
  });
  const a = parse('transform([1,2;2,4])').a;
  nullSpace(a).forEach((v) =>
    applyMatrix(a, v).forEach((value) => expect(value).toBeCloseTo(0, 8)),
  );
});
it('deforms vertices continuously and measures actual signed area', () => {
  const p = parse('determinant([0,1;1,0])'),
    s = solveMatrix(p),
    scene = matrixScene(p, s, { view: 'lattice' });
  const start = resolveTimeline(scene, 1, 1, 1).entities.unit.points!,
    mid = resolveTimeline(scene, 2, 0.5, 1).entities.unit.points!,
    end = resolveTimeline(scene, 2, 1, 1).entities.unit.points!;
  expect(mid).not.toEqual(start);
  expect(mid).not.toEqual(end);
  const area = (v: typeof end) =>
    v.reduce(
      (sum, p, i) => sum + p[0] * v[(i + 1) % v.length][2] - p[2] * v[(i + 1) % v.length][0],
      0,
    ) / 2;
  expect(area(end) / area(start)).toBeCloseTo(-1);
  expect(scene.steps[1].predict!.check('-1')).toBe(true);
});
it('preserves topology, tethers and budgets for every layer, method and worked example', () => {
  const scenes = matrixExamples.map((example) => {
    const p = parse(example.input);
    return matrixScene(p, solveMatrix(p));
  });
  const d = createMatrixDefinition(scenes);
  expect(d.challenges.length).toBeGreaterThanOrEqual(5);
  expect(d.predicts).toHaveLength(scenes.length);
  expect(d.boss.phases).toHaveLength(3);
  expect(d.bridges.length).toBeGreaterThanOrEqual(3);
  Object.values(d.mascotScript).forEach((lines) => {
    expect(lines).toHaveLength(3);
    expect(lines.every((line) => line.split(/\s+/).length <= 12)).toBe(true);
  });
  for (const example of matrixExamples)
    for (const method of ['cells', 'columns'] as const)
      for (const view of ['auto', 'blocks', 'lattice'] as const) {
        const p = parse(example.input),
          s = solveMatrix(p, method),
          scene = matrixScene(p, s, { view, eigen: true });
        const ids = new Set(scene.entities.map((e) => e.id));
        expect(ids.size).toBe(scene.entities.length);
        expect(scene.entities.length).toBeLessThanOrEqual(96);
        expect(scene.entities.every((e) => !!e.tether)).toBe(true);
        scene.steps.forEach((step) => {
          [step.title, step.say.quick, step.say.standard, step.say.deep, step.aria].forEach(
            (text) => {
              expect(text.length).toBeGreaterThan(5);
              expect(text).not.toMatch(/lorem|todo|placeholder/i);
            },
          );
          expect(step.tethers.every((t) => t.entities.every((id) => ids.has(id)))).toBe(true);
        });
        for (const dial of [0, 0.5, 1, 1.5, 2, 2.5, 3]) {
          const a = resolveTimeline(scene, scene.steps.length - 1, 1, dial),
            b = resolveTimeline(scene, scene.steps.length - 1, 1, dial);
          expect(a).toEqual(b);
          if (view === 'blocks') expect(entityVisible(a.entities['a-0-0'])).toBe(true);
          Object.values(a.entities).forEach((e) =>
            [e.pos, ...(e.points ?? [])]
              .flat()
              .forEach((v) => expect(Number.isFinite(v)).toBe(true)),
          );
        }
      }
});
it('entered matrix coordinates determine the real unit geometry', () => {
  const c = createMatrixChallenge('determinant', 12345),
    state = built(c),
    empty = blankMatrixBuild();
  expect(matrixText(enteredMatrix(empty, c.expected))).toBe('[0,0;0,0]');
  const a = matrixScene(c.problem, c.solution, {
      build: state,
      expected: c.expected,
      view: 'lattice',
    }),
    b = matrixScene(c.problem, c.solution, {
      build: { ...state, cells: { ...state.cells, 'out-0-1': '0' } },
      expected: c.expected,
      view: 'lattice',
    });
  expect(a.entities.find((e) => e.id === 'unit')?.points).not.toEqual(
    b.entities.find((e) => e.id === 'unit')?.points,
  );
});
it('row-column products move and remain exact', () => {
  const p = parse('multiply([1,2;3,4],[2,0;1,2])'),
    s = solveMatrix(p),
    scene = matrixScene(p, s);
  const start = resolveTimeline(scene, 2, 0).entities['product-0'],
    end = resolveTimeline(scene, 2, 1).entities['product-0'];
  expect(start.pos).not.toEqual(end.pos);
  expect(resolveTimeline(scene, 2, 0.5).entities['product-0'].opacity).toBe(1);
  expect(end.opacity).toBe(0);
  expect(resolveTimeline(scene, 2, 1).entities['product-label-0'].text?.plain).toBe('1×2=2');
  const column = matrixScene(p, solveMatrix(p, 'columns'));
  expect(column.id).toBe(scene.id);
});
it('inverse and determinant alternative methods are mathematical alternatives', () => {
  const inverse = solveMatrix(parse('inverse([2,1;1,1])'), 'columns');
  expect(inverse.steps[2].say.standard).toContain('Reduce [A | I]');
  const determinant = solveMatrix(parse('determinant([0,1;1,0])'), 'columns');
  expect(determinant.steps[2].say.standard).toContain('1 row swaps');
  expect(solveMatrix(parse('solve([2,1;1,-1],[5;1])'), 'columns').steps[2].say.standard).toContain(
    'Cramer',
  );
  expect(matrixText(identityMatrix(2))).toBe('[1,0;0,1]');
});
