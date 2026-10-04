import { describe, it, expect } from 'vitest';
import { evaluate, derivative as mathDerivative } from 'mathjs';
import {
  parseFunctionInput,
  solveFunction,
  valueAt,
  slopeAt,
  exactIntegral,
  functionMethods,
  closeNumber,
  modelText,
} from './functions';
const parse = (input: string) => {
  const r = parseFunctionInput(input);
  if (!r.ok) throw new Error(r.reason);
  return r.problem;
};
describe('closed Functions parser and authored mathematics', () => {
  it.each([
    'y=2*x+1',
    'y=-3*x^3+2*x^2-1',
    'y=2*sin(3*x)+1',
    'y=exp(x)',
    'x^2-4*x+3=0',
    'derivative(3*x^2+2*x)',
    'integral(x^2,0,3)',
    'integral(-2*x^3+x,-2,3)',
    'z=x^2-y^2+1',
    'z=0*x^2+2*y^2-1',
  ])('round-trips supported %s', (input) => {
    const p = parse(input);
    expect(parse(p.expression)).toEqual(p);
    const s = solveFunction(p);
    expect(s.steps.length).toBeGreaterThanOrEqual(5);
    expect(s.steps[1].predict?.check(String(s.prediction))).toBe(true);
    expect(s.steps[1].predict?.check(String(s.prediction + 1))).toBe(false);
    s.steps.forEach((step) =>
      [step.say.quick, step.say.standard, step.say.deep, step.aria].forEach((text) =>
        expect(text.length).toBeGreaterThan(12),
      ),
    );
  });
  it.each([
    'y=tan(x)',
    'y=x^4',
    'y=13*x',
    'y=sin(x)+exp(x)',
    'y=sin(x+1)',
    'y=sin(0*x)',
    'y=sin(4*x)',
    'y=a*x',
    'integral(x^2,3,0)',
    'integral(x,0,9)',
    'derivative(sin(x))',
    'x+1=0',
    'z=x*y+x^2',
    'z=x^2+sin(y)',
    'z=x^2+y^2+0.5',
    'z=x^3+y^2',
    'y=constructor(x)',
    'y=[1,2]',
    'y=(import(1))',
    'x=2',
    'y=x;random()',
    'x'.repeat(161),
  ])('rejects unsupported or forged %s', (input) =>
    expect(parseFunctionInput(input).ok).toBe(false),
  );
  it.each(['y=2*x+1', 'y=-3*x^3+2*x^2-1', 'y=2*sin(3*x)+1', 'y=-2*exp(2*x)+3'])(
    'values and derivatives agree with mathjs for %s',
    (input) => {
      const p = parse(input),
        expression = modelText(p.model),
        d = mathDerivative(expression, 'x');
      [-2, -0.25, 0, 1, 2].forEach((x) => {
        expect(valueAt(p, x)).toBeCloseTo(evaluate(expression, { x }), 9);
        expect(slopeAt(p, x)).toBeCloseTo(d.evaluate({ x }), 9);
      });
    },
  );
  it('keeps polynomial signed integrals exact against independent Simpson integration', () => {
    for (const c of [
      [0, 0, 1],
      [-2, 3],
      [1, -2, 3, -1],
      [0, 0, -2],
    ]) {
      const p = parse(`integral(${c.map((v, i) => `(${v})*x^${i}`).join('+')},-2,3)`);
      const h = 5 / 100,
        sum =
          (Array.from(
            { length: 101 },
            (_, i) =>
              evaluate(modelText(p.model), { x: -2 + i * h }) *
              (i === 0 || i === 100 ? 1 : i % 2 ? 4 : 2),
          ).reduce((a, b) => a + b, 0) *
            h) /
          3;
      const area = exactIntegral(c, -2, 3);
      expect(area.n / area.d).toBeCloseTo(sum, 9);
      expect(solveFunction(p).area).toEqual(area);
    }
    expect(solveFunction(parse('integral(x^2,0,3)')).answer).toBe('9');
    expect(solveFunction(parse('integral(-x^2,0,3)')).answer).toBe('-9');
  });
  it('all three quadratic methods preserve roots, including repeated and absent roots', () => {
    for (const input of ['x^2-4*x+3=0', 'x^2-2*x+1=0', 'x^2+1=0', '2*x^2+x-1=0', '-x^2+2*x+2=0']) {
      const p = parse(input),
        reference = solveFunction(p);
      for (const method of functionMethods(p)) {
        const s = solveFunction(p, method.id);
        expect(s.roots).toEqual(reference.roots);
        s.roots.forEach((x) => expect(evaluate(modelText(p.model), { x })).toBeCloseTo(0, 8));
      }
    }
    expect(functionMethods(parse('x^2-4*x+3=0')).map((m) => m.id)).toEqual([
      'factor',
      'square',
      'formula',
    ]);
    expect(solveFunction(parse('x^2-4*x+3=0'), 'square').steps[2].say.standard).toContain(
      'Add its square',
    );
    expect(solveFunction(parse('derivative(3*x^2+2*x)')).answer).toBe('6*x+2');
    expect(solveFunction(parse('derivative(3*x^2+2*x)')).steps.at(-1)!.latexAfter).toBe(
      "\\htmlClass{tk-curve}{f'(x)=6\\cdot x+2}",
    );
    expect(solveFunction(parse('x^2-4*x+3=0'), 'square').steps[2].latexAfter).toBe(
      '\\htmlClass{tk-square}{x^2-4x+4=1}',
    );
    expect(solveFunction(parse('x^2-4*x+3=0'), 'formula').steps[2].latexAfter).toContain('(-4)^2');
    expect(solveFunction(parse('x^2-4*x+3=0')).tex).not.toContain('y=');
    expect(solveFunction(parse('integral(x^2,0,3)')).tex).not.toContain('y=');
  });
  it('surface values agree with its original two-axis expression', () => {
    const p = parse('z=2*x^2-3*y^2+1');
    for (const x of [-2, 0, 1])
      for (const y of [-1, 0, 2])
        expect(valueAt(p, x, y)).toBe(evaluate('2*x^2-3*y^2+1', { x, y }));
  });
  it('bounded numeric answers accept exact fractions without statements or objects', () => {
    expect(closeNumber('2/3', 2 / 3)).toBe(true);
    expect(closeNumber('1/0', 0)).toBe(false);
    expect(closeNumber('0x10', 16)).toBe(false);
    expect(closeNumber({ value: 2 }, 2)).toBe(false);
    expect(closeNumber('2;alert()', 2)).toBe(false);
  });
});

it('zero sine amplitude remains a constant hill with a usable parameter', () => {
  const p = parse('y=0*sin(x)+1');
  expect(valueAt(p, 3)).toBe(1);
  expect(slopeAt(p, 3)).toBeCloseTo(0, 12);
  expect(parse(p.expression)).toEqual(p);
});
