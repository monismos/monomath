import { closeNumber } from './realNumbers';
export { closeNumber } from './realNumbers';
import type { Solver } from '../labs/types';
import type { Step } from '../scene/spec';
import type { NumericAST } from '../graphing/types';
import { parseGraph, normalizeSource } from '../graphing/parser';
import { fractionText, normalizeFraction, type Fraction } from './fractions';

export type CurveModel =
  | { type: 'polynomial'; coefficients: number[] }
  | { type: 'sin' | 'exp'; amplitude: number; frequency: number; offset: number };
export type FunctionKind = 'curve' | 'roots' | 'derivative' | 'integral' | 'surface';
export interface FunctionProblem {
  kind: FunctionKind;
  model: CurveModel;
  expression: string;
  lower: number;
  upper: number;
  surface?: [number, number, number];
}
export interface FunctionSolution {
  answer: string;
  tex: string;
  steps: Step[];
  method: string;
  roots: number[];
  derivative?: number[];
  area?: Fraction;
  prediction: number;
  code: string;
}
export const tidy = (n: number) => Number(n.toPrecision(8)).toString();
const trim = (v: number[]) => {
  while (v.length > 1 && Math.abs(v.at(-1)!) < 1e-10) v.pop();
  return v;
};
function polynomial(ast: NumericAST, axis: string): number[] | null {
  if (ast.t === 'number') return [ast.v];
  if (ast.t === 'symbol') return ast.name === axis ? [0, 1] : null;
  if (ast.t === 'call') return null;
  if (ast.t === 'unary') {
    const v = polynomial(ast.arg, axis);
    return v?.map((x) => (ast.op === '-' ? -x : x)) ?? null;
  }
  const a = polynomial(ast.left, axis),
    b = polynomial(ast.right, axis);
  if (!a || !b) return null;
  if (ast.op === '+' || ast.op === '-')
    return trim(
      Array.from(
        { length: Math.max(a.length, b.length) },
        (_, i) => (a[i] ?? 0) + (ast.op === '-' ? -1 : 1) * (b[i] ?? 0),
      ),
    );
  if (ast.op === '/' && b.length === 1 && b[0] !== 0) return trim(a.map((v) => v / b[0]));
  const product = (x: number[], y: number[]) => {
    if (x.length + y.length - 1 > 4) return null;
    const out = Array(x.length + y.length - 1).fill(0) as number[];
    x.forEach((v, i) => y.forEach((w, j) => (out[i + j] += v * w)));
    return trim(out);
  };
  if (ast.op === '*') return product(a, b);
  if (ast.op === '^' && b.length === 1 && Number.isInteger(b[0]) && b[0] >= 0 && b[0] <= 3) {
    let out: number[] | null = [1];
    for (let i = 0; i < b[0] && out; i++) out = product(out, a);
    return out;
  }
  return null;
}
function curveModel(ast: NumericAST): CurveModel | null {
  const c = polynomial(ast, 'x');
  if (c && c.every((v) => Number.isInteger(v) && Math.abs(v) <= 12))
    return { type: 'polynomial', coefficients: c };
  let call: Extract<NumericAST, { t: 'call' }> | undefined,
    count = 0;
  const replace = (node: NumericAST): NumericAST => {
    if (node.t === 'call') {
      call = node;
      count++;
      return { t: 'symbol', name: 't' };
    }
    if (node.t === 'unary') return { ...node, arg: replace(node.arg) };
    if (node.t === 'binary')
      return { ...node, left: replace(node.left), right: replace(node.right) };
    return node;
  };
  const linear = polynomial(replace(ast), 't');
  if (
    !call ||
    count !== 1 ||
    !['sin', 'exp'].includes(call.fn) ||
    call.args.length !== 1 ||
    !linear ||
    linear.length > 2
  )
    return null;
  const inner = polynomial(call.args[0], 'x');
  if (
    !inner ||
    inner.length !== 2 ||
    inner[0] !== 0 ||
    !Number.isInteger(inner[1]) ||
    inner[1] < 1 ||
    inner[1] > 3 ||
    !linear.every((v) => Number.isInteger(v) && Math.abs(v) <= 4)
  )
    return null;
  return {
    type: call.fn as 'sin' | 'exp',
    amplitude: linear[1] ?? 0,
    frequency: inner[1],
    offset: linear[0],
  };
}
export function polynomialText(c: number[]): string {
  const text = [...c]
    .reverse()
    .flatMap((value, reversed) => {
      const power = c.length - reversed - 1;
      if (!value) return [];
      const term = power
        ? `${Math.abs(value) === 1 ? '' : `${Math.abs(value)}*`}x${power > 1 ? `^${power}` : ''}`
        : String(Math.abs(value));
      return [`${value < 0 ? '-' : '+'}${term}`];
    })
    .join('');
  return text.replace(/^\+/, '') || '0';
}
export function modelText(model: CurveModel): string {
  if (model.type === 'polynomial') return polynomialText(model.coefficients);
  return `${model.amplitude === 1 ? '' : `${model.amplitude}*`}${model.type}(${model.frequency === 1 ? '' : `${model.frequency}*`}x)${model.offset ? `${model.offset > 0 ? '+' : ''}${model.offset}` : ''}`;
}
export function parseFunctionInput(
  raw: string,
): { ok: true; problem: FunctionProblem } | { ok: false; reason: string } {
  try {
    if (raw.length > 160) throw new Error('Keep a teaching problem within 160 characters.');
    const input = normalizeSource(raw).replace(/\s+/g, '');
    let kind: FunctionKind = 'curve',
      source = input,
      lower = 0,
      upper = 3;
    const derivative = /^derivative\((.+)\)$/.exec(input),
      integral = /^integral\((.+),(-?\d),(-?\d)\)$/.exec(input);
    if (derivative) {
      kind = 'derivative';
      source = 'y=' + derivative[1];
    } else if (integral) {
      kind = 'integral';
      lower = Number(integral[2]);
      upper = Number(integral[3]);
      if (lower < -4 || upper > 4 || lower >= upper)
        throw new Error('Integral bounds must increase and stay between −4 and 4.');
      source = 'y=' + integral[1];
    } else if (input.endsWith('=0') && !input.startsWith('y=')) {
      kind = 'roots';
      source = 'y=' + input.slice(0, -2);
    }
    const graph = parseGraph(source);
    if (graph.parameters.length || !['curve', 'constant', 'surface'].includes(graph.mode))
      throw new Error(
        'Use a supported curve, quadratic =0, derivative(...), integral(...,a,b), or z=a*x^2+b*y^2+c.',
      );
    let model: CurveModel | null, surface: FunctionProblem['surface'];
    if (graph.mode === 'surface') {
      kind = 'surface';
      // A closed additive quadratic surface, with no cross terms or linear terms.
      const sx = polynomial(replaceAxis(graph.ast, 'y', 0), 'x'),
        sy = polynomial(replaceAxis(graph.ast, 'x', 0), 'y');
      if (!sx || !sy || sx.length > 3 || sy.length > 3 || (sx[1] ?? 0) || (sy[1] ?? 0))
        throw new Error('Surfaces use z=a*x^2+b*y^2+c.');
      surface = [sx[2] ?? 0, sy[2] ?? 0, sx[0]];
      const safe = surface.every((v) => Number.isInteger(v) && Math.abs(v) <= 4);
      // Rebuilding the allowed AST prevents hidden cross terms from disappearing at x=y=0.
      const expected = parseGraph(`z=${surface[0]}*x^2+${surface[1]}*y^2+${surface[2]}`);
      if (!safe || !sameSurface(graph.ast, expected.ast))
        throw new Error('Surfaces use bounded coefficients and exactly a*x^2+b*y^2+c.');
      model = { type: 'polynomial', coefficients: [surface[2], 0, surface[0]] };
    } else model = curveModel(graph.ast);
    if (!model)
      throw new Error(
        'This teaching lab supports degree≤3 integer polynomials, a*sin(b*x)+c and a*exp(b*x)+c. Use the equation workspace for other graphs.',
      );
    if (['roots', 'derivative', 'integral'].includes(kind) && model.type !== 'polynomial')
      throw new Error('Worked root and calculus problems use polynomials.');
    if (kind === 'roots' && (model.type !== 'polynomial' || model.coefficients.length !== 3))
      throw new Error('Root lessons use quadratic equations.');
    const expression =
      kind === 'surface'
        ? `z=${surface![0]}*x^2+${surface![1]}*y^2+${surface![2]}`
        : kind === 'roots'
          ? modelText(model) + '=0'
          : kind === 'derivative'
            ? `derivative(${modelText(model)})`
            : kind === 'integral'
              ? `integral(${modelText(model)},${lower},${upper})`
              : 'y=' + modelText(model);
    return {
      ok: true,
      problem: { kind, model, expression, lower, upper, ...(surface ? { surface } : {}) },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Check the function syntax.',
    };
  }
}
function replaceAxis(ast: NumericAST, axis: string, value: number): NumericAST {
  if (ast.t === 'symbol' && ast.name === axis) return { t: 'number', v: value };
  if (ast.t === 'binary')
    return {
      ...ast,
      left: replaceAxis(ast.left, axis, value),
      right: replaceAxis(ast.right, axis, value),
    };
  if (ast.t === 'unary') return { ...ast, arg: replaceAxis(ast.arg, axis, value) };
  if (ast.t === 'call')
    return { ...ast, args: ast.args.map((arg) => replaceAxis(arg, axis, value)) };
  return ast;
}
function surfaceTerms(ast: NumericAST): Map<string, number> | null {
  if (ast.t === 'number') return new Map([['', ast.v]]);
  if (ast.t === 'symbol') return ['x', 'y'].includes(ast.name) ? new Map([[ast.name, 1]]) : null;
  if (ast.t === 'call') return null;
  if (ast.t === 'unary') {
    const a = surfaceTerms(ast.arg);
    return a ? new Map([...a].map(([k, v]) => [k, ast.op === '-' ? -v : v])) : null;
  }
  const a = surfaceTerms(ast.left),
    b = surfaceTerms(ast.right);
  if (!a || !b) return null;
  const merge = new Map(a);
  if (ast.op === '+' || ast.op === '-') {
    b.forEach((v, k) => merge.set(k, (merge.get(k) ?? 0) + (ast.op === '-' ? -v : v)));
    return merge;
  }
  const mul = (x: Map<string, number>, y: Map<string, number>) => {
    const out = new Map<string, number>();
    for (const [i, v] of x)
      for (const [j, w] of y) {
        const key = (i + j).split('').sort().join('');
        if (key.length > 2) return null;
        out.set(key, (out.get(key) ?? 0) + v * w);
      }
    return out;
  };
  if (ast.op === '*') return mul(a, b);
  if (ast.op === '^' && b.size === 1 && b.get('') === 2) return mul(a, a);
  return null;
}
function sameSurface(a: NumericAST, b: NumericAST): boolean {
  const x = surfaceTerms(a),
    y = surfaceTerms(b);
  return (
    !!x &&
    !!y &&
    [...new Set([...x.keys(), ...y.keys()])].every((k) => (x.get(k) ?? 0) === (y.get(k) ?? 0))
  );
}
export const derivativeCoefficients = (c: number[]) =>
  c.length < 2 ? [0] : c.slice(1).map((v, i) => v * (i + 1));
export const polynomialValue = (c: number[], x: number) =>
  c.reduceRight((sum, v) => sum * x + v, 0);
export function valueAt(p: FunctionProblem, x: number, y = 0): number {
  if (p.surface) return p.surface[0] * x * x + p.surface[1] * y * y + p.surface[2];
  const m = p.model;
  return m.type === 'polynomial'
    ? polynomialValue(m.coefficients, x)
    : m.amplitude * (m.type === 'sin' ? Math.sin(m.frequency * x) : Math.exp(m.frequency * x)) +
        m.offset;
}
export function slopeAt(p: FunctionProblem, x: number): number {
  const m = p.model;
  return m.type === 'polynomial'
    ? polynomialValue(derivativeCoefficients(m.coefficients), x)
    : m.amplitude *
        m.frequency *
        (m.type === 'sin' ? Math.cos(m.frequency * x) : Math.exp(m.frequency * x));
}
export function exactIntegral(c: number[], lower: number, upper: number): Fraction {
  return c.reduce(
    (total, v, i) => {
      const term = normalizeFraction({ n: v * (upper ** (i + 1) - lower ** (i + 1)), d: i + 1 });
      return normalizeFraction({ n: total.n * term.d + term.n * total.d, d: total.d * term.d });
    },
    { n: 0, d: 1 },
  );
}
export function quadraticRoots(c: number[]): number[] {
  const [constant, b, a] = c,
    d = b * b - 4 * a * constant;
  if (d < 0) return [];
  if (!d) return [-b / (2 * a)];
  return [(-b - Math.sqrt(d)) / (2 * a), (-b + Math.sqrt(d)) / (2 * a)].sort((x, y) => x - y);
}
export function functionMethods(p: FunctionProblem) {
  if (p.kind === 'roots') {
    const roots = quadraticRoots(
      (p.model as Extract<CurveModel, { type: 'polynomial' }>).coefficients,
    );
    return [
      ...(roots.length && roots.every(Number.isInteger)
        ? [{ id: 'factor', name: 'Factor into two crossings' }]
        : []),
      { id: 'square', name: 'Complete a square' },
      { id: 'formula', name: 'Use the quadratic formula' },
    ];
  }
  return [
    { id: 'rule', name: 'Follow the rule' },
    {
      id: 'geometry',
      name: p.kind === 'integral' ? 'Compare signed rectangles' : 'Follow coordinates and change',
    },
  ];
}
const token = (id: string, tex: string) => `\\htmlClass{tk-${id}}{${tex}}`;
const expressionTex = (expression: string) => parseGraph(expression).tex.trim();
const rationalTex = (n: number, d = 1) => {
  const f = normalizeFraction({ n, d });
  return f.d === 1 ? String(f.n) : `\\frac{${f.n}}{${f.d}}`;
};
export function solveFunction(p: FunctionProblem, requested?: string): FunctionSolution {
  const methods = functionMethods(p),
    method = methods.some((m) => m.id === requested) ? requested! : methods[0].id;
  const c = p.model.type === 'polynomial' ? p.model.coefficients : [],
    roots = p.kind === 'roots' ? quadraticRoots(c) : [];
  const derivative = p.kind === 'derivative' ? derivativeCoefficients(c) : undefined,
    area = p.kind === 'integral' ? exactIntegral(c, p.lower, p.upper) : undefined;
  const prediction =
    p.kind === 'roots'
      ? roots.length
      : area
        ? area.n / area.d
        : p.kind === 'derivative'
          ? slopeAt(p, 1)
          : valueAt(p, 1, p.surface ? 1 : 0);
  const answer =
    p.kind === 'roots'
      ? roots.length
        ? `x = ${roots.map(tidy).join(' or ')}`
        : 'No real roots'
      : area
        ? fractionText(area)
        : derivative
          ? polynomialText(derivative)
          : p.expression;
  const tex =
    p.kind === 'roots'
      ? expressionTex(modelText(p.model)) + '=0'
      : p.kind === 'derivative'
        ? `\\frac{d}{dx}(${expressionTex(modelText(p.model))})`
        : p.kind === 'integral'
          ? `\\int_{${p.lower}}^{${p.upper}} ${expressionTex(modelText(p.model))}\\,dx`
          : parseGraph(p.expression).tex;
  const links = [
    { token: 'curve', entities: ['curve', 'surface'], color: 'mint' },
    { token: 'point', entities: ['trace', 'trace-label'], color: 'part' },
    { token: 'slope', entities: ['tangent', 'rise', 'run'], color: 'whole' },
    { token: 'roots', entities: ['root-0', 'root-1'], color: 'highlight' },
    {
      token: 'area',
      entities: Array.from({ length: 16 }, (_, i) => `rectangle-${i}`),
      color: 'part',
    },
    {
      token: 'square',
      entities: ['square-base', 'square-left', 'square-bottom', 'square-corner', 'square-result'],
      color: 'whole',
    },
    { token: 'slice', entities: ['slice', 'slice-plane'], color: 'part' },
  ];
  const step = (
    id: string,
    title: string,
    latex: string,
    quick: string,
    standard: string,
    deep: string,
  ): Step => ({
    id: `function-${id}`,
    title,
    latexAfter: latex,
    say: { quick, standard, deep },
    aria: `${title}. ${standard}`,
    ops: [],
    tethers: links,
    gaze: ['trace'],
  });
  const steps: Step[] = [
    step(
      'read',
      'Read the coordinate rule',
      token('curve', tex),
      'Each input has one output.',
      'Name the input, output and operation before drawing. Coordinates connect the rule to a place on the graph.',
      'A function assigns exactly one output to each allowed input. A quadratic equation instead asks which inputs produce zero. A derivative measures local change; an integral measures signed accumulation.',
    ),
    step(
      'predict',
      'Predict before the reveal',
      token(
        'point',
        `${p.kind === 'roots' ? '\\text{How many real roots?}' : p.kind === 'integral' ? '\\text{Predict the signed integral}' : p.kind === 'derivative' ? "f'(1)=?" : p.surface ? 'f(1,1)=?' : 'f(1)=?'}`,
      ),
      'Make a guess first.',
      'Use the rule to predict one value. Then compare your idea with the picture.',
      'Committing a prediction gives the diagram a job: checking a specific idea. A wrong guess is a useful place to begin another explanation.',
    ),
  ];
  steps[1].predict = {
    kind: p.kind === 'roots' ? 'choice' : 'number',
    ...(p.kind === 'roots' ? { options: ['0', '1', '2'] } : {}),
    prompt:
      p.kind === 'roots'
        ? 'How many real roots meet the floor?'
        : p.kind === 'integral'
          ? 'What is the signed integral?'
          : p.kind === 'derivative'
            ? 'What is the slope at x=1?'
            : p.surface
              ? 'What is the height at (1,1)?'
              : 'What is the output at x=1?',
    check: (a) => closeNumber(a, prediction),
    hints: [
      'Follow one input through the rule.',
      'Separate each term before combining it.',
      `The predicted value is ${tidy(prediction)}.`,
    ],
  };
  if (p.kind === 'roots') {
    const [constant, b, a] = c,
      h = -b / (2 * a),
      k = constant - (b * b) / (4 * a),
      discriminant = b * b - 4 * a * constant;
    if (method === 'factor') {
      const r1 = roots[0],
        r2 = roots[1] ?? roots[0];
      steps.push(
        step(
          'rewrite',
          'Factor the quadratic',
          token('roots', `${a}(x-(${tidy(r1)}))(x-(${tidy(r2)}))=0`),
          'Two factors give two crossings.',
          `Expand the factors to recover ${modelText(p.model)}. The product is zero when either factor is zero.`,
          'The zero-product rule follows because a product of two nonzero real numbers is nonzero. Repeated factors produce one distinct crossing with multiplicity two.',
        ),
      );
    } else if (method === 'square') {
      steps.push(
        step(
          'rewrite',
          'Restore the missing corner',
          token(
            'square',
            `x^2${b / a < 0 ? '-' : '+'}${rationalTex(Math.abs(b), Math.abs(a))}x+${rationalTex(b * b, 4 * a * a)}=${rationalTex(b * b - 4 * a * constant, 4 * a * a)}`,
          ),
          'Two strips need a corner.',
          `Half the linear coefficient is ${tidy(b / (2 * a))}. Add its square to both sides. The strips and corner assemble one complete square.`,
          'Divide by the leading coefficient first. Splitting the linear term into two equal strips exposes the missing corner. Negative strips represent removed area, with the overlap restored once.',
        ),
      );
      steps.push(
        step(
          'square',
          'Read the completed square',
          token('square', `(x-(${tidy(h)}))^2=${tidy(-k / a)}`),
          'The square gives the distance.',
          `The center is x=${tidy(h)}. Each real root is that center plus or minus the square-root distance.`,
          'A square cannot be negative for real coordinates. Zero gives one repeated root; a positive value gives two symmetric distances from the vertex.',
        ),
      );
    } else {
      steps.push(
        step(
          'rewrite',
          'Measure the discriminant',
          token('roots', `D=(${b})^2-4(${a})(${constant})=${discriminant}`),
          'The discriminant counts crossings.',
          `D is ${discriminant}: ${discriminant < 0 ? 'no real crossings' : discriminant === 0 ? 'one repeated crossing' : 'two real crossings'}.`,
          'Completing the square leads to the discriminant. Its sign determines whether the square-root distance is real and nonzero.',
        ),
      );
      steps.push(
        step(
          'formula',
          'Apply the quadratic formula',
          token('roots', `x=\\frac{-(${b})\\pm\\sqrt{${discriminant}}}{2(${a})}`),
          'Center plus or minus distance.',
          'Keep both signs of the square root, then divide by twice the leading coefficient.',
          'The formula expresses the same symmetry as completing the square. Decimal roots in this view are approximate coordinates, not an exact symbolic radical.',
        ),
      );
    }
    steps.push(
      step(
        'roots',
        'Place the roots on the floor',
        token('roots', `\\text{${answer}}`),
        'Zero output meets the floor.',
        roots.length
          ? `Substitute ${roots.map(tidy).join(' and ')} into the original rule. Each output is zero.`
          : 'The curve never meets the floor because its completed square requires a negative square.',
        'Checking in the original equation protects against losing a sign or a root while rewriting. A repeated root touches the floor without crossing it.',
      ),
    );
  } else if (p.kind === 'derivative') {
    steps.push(
      step(
        'rewrite',
        method === 'geometry' ? 'Shrink the secant gap' : 'Apply the power rule',
        token('slope', `f'(x)=${expressionTex(polynomialText(derivative!))}`),
        'Slope measures local change.',
        method === 'geometry'
          ? 'Compare f(x+h)−f(x) with h. As h approaches zero, the secant slope approaches the tangent slope.'
          : 'Multiply each coefficient by its power, then lower that power by one. A constant contributes zero.',
        'For an integer power, expanding (x+h)^n leaves n*x^(n−1) after dividing the difference by h and taking h toward zero. The tangent follows this limiting rate.',
      ),
    );
    steps.push(
      step(
        'slope',
        'Move the tangent with the ball',
        token('slope', `f'(1)=${tidy(prediction)}`),
        'A steep hill has a large slope.',
        `At x=1 the tangent has slope ${tidy(prediction)}. Move the trace point to see the slope change.`,
        'A tangent goes through (x,f(x)) and uses f′(x) as rise per unit run. Moving its slope away from that derivative constructs a secant-like line rather than the tangent.',
      ),
    );
  } else if (p.kind === 'integral') {
    const anti = c.map((v, i) => normalizeFraction({ n: v, d: i + 1 }));
    steps.push(
      step(
        'rewrite',
        method === 'geometry' ? 'Refine the signed rectangles' : 'Build an antiderivative',
        token(
          'area',
          `F(x)=${anti.map((v, i) => `${rationalTex(v.n, v.d)}x^{${i + 1}}`).join('+')}`,
        ),
        'Accumulate small signed areas.',
        method === 'geometry'
          ? 'Each rectangle uses its midpoint height times its width. Increasing n reduces the error for a smooth curve.'
          : 'Raise each power by one, then divide the coefficient by the new power. Differentiating this expression returns the original polynomial.',
        'Signed area counts values below the floor negatively. A finite rectangle sum is an approximation; evaluating an antiderivative at the two bounds gives the exact polynomial integral.',
      ),
    );
    steps.push(
      step(
        'area',
        'Subtract the two boundary totals',
        token('area', `F(${p.upper})-F(${p.lower})=${fractionText(area!)}`),
        'Upper total minus lower total.',
        `The exact signed integral is ${fractionText(area!)}. Compare it with the midpoint rectangles at your chosen n.`,
        'Changing the lower bound removes the accumulation before that bound. Orientation matters: reversing the integration limits changes the sign.',
      ),
    );
  } else if (p.surface) {
    steps.push(
      step(
        'rewrite',
        'Hold one input still',
        token('slice', `y=s,\\quad z=${p.surface[0]}x^2+${p.surface[1]}s^2+${p.surface[2]}`),
        'A slice turns two inputs into one.',
        `At (1,1), height is ${tidy(prediction)}. Moving the slice fixes a different y while x remains free.`,
        'The surface gives one height for each pair of inputs. A vertical plane at y=s intersects it in a one-input curve. Its highlighted ribbon lies on the same surface vertices.',
      ),
    );
    steps.push(
      step(
        'slice',
        'Trace the highlighted slice',
        token('slice', `z=f(x,s)`),
        'The ball stays on the slice.',
        'Move x to read a height. Move y=s to compare parallel slices across the surface.',
        'The table axes still mean x and y; height is z. A 2D projected diagram and the 3D surface use the same sampled coordinates.',
      ),
    );
  } else {
    const slope = slopeAt(p, 1);
    steps.push(
      step(
        'rewrite',
        method === 'geometry' ? 'Follow rise over run' : 'Substitute an input',
        token('point', `f(1)=${tidy(prediction)}`),
        'An input becomes a point.',
        `The input 1 produces ${tidy(prediction)}. Place the trace ball at that coordinate pair.`,
        'Evaluate every term at the same input before adding. A plotted point is a checkable claim about the rule; changing a coefficient redraws every affected output.',
      ),
    );
    steps.push(
      step(
        'slope',
        'Read the local change',
        token('slope', `f'(1)\\approx ${tidy(slope)}`),
        'The tangent follows the hill.',
        `At x=1, the local slope is ${tidy(slope)}. Compare the tangent with a run of one unit.`,
        p.model.type === 'sin'
          ? 'The sine wave repeats every 2π/frequency units. Amplitude controls height and offset moves the middle line.'
          : p.model.type === 'exp'
            ? 'An exponential changes by a constant factor over equal input intervals. Its local slope depends on its current height.'
            : 'For a line the slope is constant; for a curved polynomial it depends on the input. Horizontal shift and slope are different changes.',
      ),
    );
  }
  steps.push(
    step(
      'result',
      'Check the whole connection',
      token(
        p.kind === 'integral'
          ? 'area'
          : p.kind === 'roots'
            ? 'roots'
            : p.surface
              ? 'slice'
              : 'curve',
        p.kind === 'curve' || p.surface
          ? tex
          : p.kind === 'derivative'
            ? `f'(x)=${expressionTex(polynomialText(derivative!))}`
            : `\\text{${answer.replace(/[{}\\]/g, '')}}`,
      ),
      'Rule, point and picture agree.',
      'Check the original rule against the plotted coordinates, then unfold to the Python calculation.',
      'The code computes the same closed rule. Numeric display uses approximate coordinates where needed; the polynomial integral retains its exact fraction.',
    ),
  );
  const body = p.surface
    ? `return ${p.surface[0]}*x**2 + ${p.surface[1]}*y**2 + ${p.surface[2]}`
    : `return ${modelText(p.model).replace(/\^/g, '**').replace(/sin\(/g, 'math.sin(').replace(/exp\(/g, 'math.exp(')}`;
  const code = `import math\ndef f(x${p.surface ? ', y' : ''}):\n    ${body}\n${p.kind === 'derivative' ? `# Exact polynomial derivative\ndef slope(x):\n    return ${polynomialText(derivative!).replace(/\^/g, '**')}` : p.kind === 'integral' ? `# Midpoint signed sum; finite n approximates the integral\nn = 16\ndx = (${p.upper} - (${p.lower})) / n\narea = sum(f(${p.lower} + (i + 0.5)*dx)*dx for i in range(n))` : p.kind === 'roots' ? `# Verify the candidate roots in the original rule\nroots = [${roots.join(', ')}]\nchecks = [f(x) for x in roots]` : p.surface ? 'slice_y = 1\nheight = f(1, slice_y)' : 'point = (1, f(1))'}`;
  return { answer, tex, steps, method, roots, derivative, area, prediction, code };
}
export const functionSolver: Solver<FunctionProblem, FunctionSolution> = {
  id: 'functions',
  domain: 'math',
  parse: (input) => {
    const r = parseFunctionInput(input);
    return r.ok ? r.problem : null;
  },
  methods: functionMethods,
  solve: solveFunction,
};
