import { describe, expect, it } from 'vitest';
import { fractionsSolver } from '../../../core/solvers/fractions';
import { resolveTimeline } from '../../../core/scene/timeline';
import { buildScene, canRenderFractionScene, fractionScene } from './scene';
import type { FractionShape } from './scene';

describe('truthful bounded Fractions geometry', () => {
  it('renders every selectable piece of a valid 96-piece construction', () => {
    const spec = buildScene({ denominator: 24, units: 4, selected: [0, 72, 95] }, 'pie');
    expect(spec.entities).toHaveLength(96);
    expect(spec.entities.find((e) => e.id === 'result-piece-95')?.text?.plain).toContain(
      'selected',
    );
    expect(spec.entities.filter((e) => e.color === 'part')).toHaveLength(3);
    const unitCenters = [0, 24, 48, 72].map((i) => spec.entities[i].pos);
    expect(new Set(unitCenters.map((pos) => `${pos[0]},${pos[2]}`)).size).toBe(4);
    for (let i = 0; i < unitCenters.length; i++)
      for (let j = i + 1; j < unitCenters.length; j++)
        expect(
          Math.hypot(unitCenters[i][0] - unitCenters[j][0], unitCenters[i][2] - unitCenters[j][2]),
        ).toBeGreaterThan(1.72);
  });
  it('rejects excessive meshes and incompatible cuts before creating partial geometry', () => {
    const p = fractionsSolver.parse('96/24 + 0/24')!,
      solution = fractionsSolver.solve(p);
    expect(solution.visualSupported).toBe(true);
    expect(canRenderFractionScene(p, solution.result, solution.method)).toBe(false);
    expect(() => fractionScene(p, solution.result, solution.steps, 'pie', solution.method)).toThrow(
      'visual workspace',
    );
    expect(() =>
      buildScene({ denominator: 4, selected: [], rows: 10000, columns: 10000 }, 'pie'),
    ).toThrow('grid cuts');
    expect(() =>
      buildScene({ denominator: 4, selected: [], leftCuts: 4, rightCuts: 4 }, 'pie', {
        a: { n: 1, d: 3 },
        b: { n: 1, d: 2 },
      }),
    ).toThrow('grouped cuts');
  });
  it('keeps source cuts and a visibly grouped equivalent result in every shape', () => {
    for (const shape of ['pie', 'bar', 'stack'] as FractionShape[]) {
      const spec = buildScene({ denominator: 3, selected: [0, 1], groups: 6 }, shape, {
        a: { n: 12, d: 18 },
      });
      expect(spec.entities.filter((e) => /^left-piece/.test(e.id))).toHaveLength(18);
      expect(spec.entities.filter((e) => /^result-piece/.test(e.id))).toHaveLength(3);
      expect(spec.entities.find((e) => e.id === 'left-piece-6')?.text?.plain).toContain(
        'group 2 of 6 old cuts',
      );
      expect(spec.steps[0].latexAfter).toContain('tk-left');
      expect(spec.steps[0].latexAfter).toContain('tk-result');
    }
  });
  it('uses quotient units for division, including a truthful zero outline', () => {
    const build = buildScene({ denominator: 8, selected: [0, 1, 2], fits: 3 }, 'pie', {
      a: { n: 3, d: 8 },
      b: { n: 1, d: 8 },
    });
    expect(build.steps[0].latexAfter).toContain('tk-result}{3}');
    expect(build.steps[0].latexAfter).not.toContain('frac{3}{8}');
    expect(build.steps[0].aria).toContain('3 measuring bars');
    const p = fractionsSolver.parse('0 ÷ 1/8')!,
      solution = fractionsSolver.solve(p);
    const spec = fractionScene(p, solution.result, solution.steps, 'bar', solution.method);
    expect(spec.entities.find((e) => e.id === 'result-piece')?.text?.plain).toContain(
      'zero units fit',
    );
    const resolved = resolveTimeline(spec, spec.steps.length - 1, 1, 2);
    expect(resolved.entities['result-label'].opacity).toBe(1);
    expect(
      spec.steps.every((step) =>
        step.tethers.every((tether) => tether.entities.every((id) => !!resolved.entities[id])),
      ),
    ).toBe(true);
  });
  it('keeps area-cell unit size independent of improper factors', () => {
    const p = fractionsSolver.parse('3/2 × 2/3')!,
      solution = fractionsSolver.solve(p),
      spec = fractionScene(p, solution.result, solution.steps, 'pie', solution.method);
    expect(spec.entities.find((e) => e.id === 'result-piece')?.size).toEqual([
      2.34 / 2,
      0.18,
      2.34 / 3,
    ]);
    expect(spec.entities.filter((e) => e.text?.plain?.includes('product overlap'))).toHaveLength(6);
  });
});
