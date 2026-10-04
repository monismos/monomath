import { parse, Unit } from 'mathjs';
import type {
  MathNode,
  ConstantNode,
  SymbolNode,
  OperatorNode,
  ParenthesisNode,
  FunctionNode,
} from 'mathjs';
import type { NumericAST, NumericFunction, ParsedGraph, Interpretation, GraphMode } from './types';
const functions: Record<NumericFunction, [number, number]> = {
  sin: [1, 1],
  cos: [1, 1],
  tan: [1, 1],
  asin: [1, 1],
  acos: [1, 1],
  atan: [1, 1],
  sqrt: [1, 1],
  abs: [1, 1],
  exp: [1, 1],
  log: [1, 2],
  log10: [1, 1],
  floor: [1, 1],
  ceil: [1, 1],
  min: [2, 8],
  max: [2, 8],
};
const operators: Record<string, { op: '+' | '-' | '*' | '/' | '^'; arity: number }> = {
  add: { op: '+', arity: 2 },
  subtract: { op: '-', arity: 2 },
  multiply: { op: '*', arity: 2 },
  divide: { op: '/', arity: 2 },
  pow: { op: '^', arity: 2 },
  unaryPlus: { op: '+', arity: 1 },
  unaryMinus: { op: '-', arity: 1 },
};
const reserved = new Set([
  'constructor',
  'prototype',
  '__proto__',
  'import',
  'createUnit',
  'parse',
  'evaluate',
  'compile',
  'random',
  'i',
  'Infinity',
  'NaN',
  'true',
  'false',
]);
export function normalizeSource(source: string): string {
  if (source.length > 1024) throw new Error('Keep an expression within 1,024 characters.');
  const normalized = source
    .replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, 'pi')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .trim();
  if (!normalized) throw new Error('Enter an expression, such as y=sin(x), x^2+y^2=4, or z=x*y.');
  if (/[;{}[\]<>!&|?:"'`\\]/.test(normalized))
    throw new Error(
      'This workspace draws real scalar expressions and equalities. Statements, collections and inequalities are not supported.',
    );
  let depth = 0;
  for (const c of normalized) {
    if (c === '(' && ++depth > 24)
      throw new Error('This expression is too deeply nested. Use at most 24 parentheses levels.');
    if (c === ')' && --depth < 0) throw new Error('Check the matching parentheses.');
  }
  if (depth) throw new Error('Check the matching parentheses.');
  return normalized;
}
export function splitEquality(source: string): [string, string] | null {
  let depth = 0,
    start = -1,
    end = -1;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '(') depth++;
    if (c === ')') depth--;
    if (c === '=') {
      if (depth !== 0 || start !== -1)
        throw new Error(
          'Use one equality between two expressions, with no nested or chained equals signs.',
        );
      start = i;
      end = i + 1;
      if (source[i + 1] === '=') {
        end++;
        i++;
      }
    }
  }
  if (start < 0) return null;
  const left = source.slice(0, start).trim(),
    right = source.slice(end).trim();
  if (!left || !right) throw new Error('An equation needs an expression on both sides of =.');
  return [left, right];
}
function allowedAST(
  root: MathNode,
  symbols: Set<string>,
  counter: { nodes: number; literals: string[] },
  depth = 0,
): NumericAST {
  if (++counter.nodes > 128 || depth > 24)
    throw new Error('Keep the expression within 128 pieces and 24 nesting levels.');
  const next = (node: MathNode) => allowedAST(node, symbols, counter, depth + 1);
  if (root.type === 'ConstantNode') {
    const v = (root as ConstantNode).value;
    if (typeof v !== 'number' || !Number.isFinite(v))
      throw new Error('Only finite real numeric literals are supported.');
    return { t: 'number', v, literal: counter.literals.shift() ?? String(v) };
  }
  if (root.type === 'ParenthesisNode') return next((root as ParenthesisNode).content);
  if (root.type === 'SymbolNode') {
    const name = (root as SymbolNode).name;
    if (name === 'pi') return { t: 'number', v: Math.PI };
    if (name === 'e') return { t: 'number', v: Math.E };
    if (
      reserved.has(name) ||
      Object.hasOwn(functions, name) ||
      name === 'ln' ||
      !/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(name)
    )
      throw new Error(`“${name}” is not an approved axis, parameter or real constant.`);
    symbols.add(name);
    return { t: 'symbol', name };
  }
  if (root.type === 'OperatorNode') {
    const node = root as OperatorNode;
    if (node.implicit && node.args[1]?.type === 'SymbolNode') {
      const name = (node.args[1] as SymbolNode).name;
      if (name.length > 1 && Unit.isValuelessUnit(name))
        throw new Error(
          'Units are not supported in this real scalar graph. Use a named scalar parameter and explicit multiplication instead.',
        );
    }
    const info = operators[node.fn];
    if (!info || node.args.length !== info.arity || node.op !== info.op)
      throw new Error(
        'Use +, −, multiplication, division or powers; this operator is not supported.',
      );
    if (info.arity === 1) return { t: 'unary', op: info.op as '+' | '-', arg: next(node.args[0]) };
    return { t: 'binary', op: info.op, left: next(node.args[0]), right: next(node.args[1]) };
  }
  if (root.type === 'FunctionNode') {
    const node = root as FunctionNode<MathNode>;
    if (node.fn.type !== 'SymbolNode')
      throw new Error('Functions must be direct approved names, such as sin(x) or sqrt(x).');
    const raw = (node.fn as SymbolNode).name;
    const name = raw === 'ln' ? 'log' : raw;
    if (!Object.hasOwn(functions, name))
      throw new Error(`“${raw}” is not supported. Try sin, cos, sqrt, abs, log, exp, min or max.`);
    const [min, max] = functions[name as NumericFunction];
    if (node.args.length < min || node.args.length > max)
      throw new Error(
        `${raw} needs ${min === max ? min : `${min}–${max}`} argument${max === 1 ? '' : 's'}.`,
      );
    return { t: 'call', fn: name as NumericFunction, args: node.args.map(next) };
  }
  throw new Error(
    `This ${root.type.replace('Node', '').toLowerCase()} form is not a real scalar expression. Try y=sin(x), x^2+y^2=4 or z=x*y.`,
  );
}
interface Rational {
  n: bigint;
  d: bigint;
}
function rational(ast: NumericAST): Rational | null {
  if (ast.t === 'number') {
    if (ast.literal === undefined) return null;
    const [base, expText] = ast.literal.toLowerCase().split('e');
    const exp = Number(expText ?? 0);
    if (Math.abs(exp) > 100) return null;
    const digits = base.replace('.', '');
    if (digits.replace(/[-+]/g, '').length > 15) return null;
    const decimals = base.includes('.') ? base.length - base.indexOf('.') - 1 : 0;
    const shift = exp - decimals;
    return shift >= 0
      ? { n: BigInt(digits) * 10n ** BigInt(shift), d: 1n }
      : { n: BigInt(digits), d: 10n ** BigInt(-shift) };
  }
  if (ast.t === 'unary') {
    const a = rational(ast.arg);
    return a ? { n: ast.op === '-' ? -a.n : a.n, d: a.d } : null;
  }
  if (ast.t !== 'binary') return null;
  const a = rational(ast.left),
    b = rational(ast.right);
  if (!a || !b) return null;
  let r: Rational;
  if (ast.op === '+') r = { n: a.n * b.d + b.n * a.d, d: a.d * b.d };
  else if (ast.op === '-') r = { n: a.n * b.d - b.n * a.d, d: a.d * b.d };
  else if (ast.op === '*') r = { n: a.n * b.n, d: a.d * b.d };
  else if (ast.op === '/') {
    if (b.n === 0n) return null;
    r = { n: a.n * b.d, d: a.d * b.n };
  } else {
    if (b.d !== 1n || b.n < 0n || b.n > 20n || (a.n === 0n && b.n === 0n)) return null;
    r = { n: a.n ** b.n, d: a.d ** b.n };
  }
  return r.n.toString().length + r.d.toString().length > 1200 ? null : r;
}
export function parseGraph(source: string, interpretation: Interpretation = 'auto'): ParsedGraph {
  const normalized = normalizeSource(source),
    equality = splitEquality(normalized),
    symbols = new Set<string>(),
    counter = {
      nodes: 0,
      literals:
        normalized.match(/(?<![A-Za-z0-9_])(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/g) ?? [],
    };
  let left: MathNode, right: MathNode | undefined;
  try {
    left = parse(equality?.[0] ?? normalized);
    right = equality ? parse(equality[1]) : undefined;
  } catch {
    throw new Error(
      'That expression could not be read. Check brackets and operators; try y=sin(x), x^2+y^2=4 or z=x*y.',
    );
  }
  const a = allowedAST(left, symbols, counter),
    b = right ? allowedAST(right, symbols, counter) : undefined;
  let ast = a,
    mode: GraphMode,
    label = '';
  const axis = (node: NumericAST, name: string) => node.t === 'symbol' && node.name === name;
  if (equality && b) {
    if (axis(a, 'z') || axis(b, 'z')) {
      ast = axis(a, 'z') ? b : a;
      mode = 'surface';
      label = `Interpreted as z = ${axis(a, 'z') ? equality[1] : equality[0]}`;
      symbols.delete('z');
      if (hasSymbol(ast, 'z'))
        throw new Error(
          'A height surface needs z=f(x,y), with no z on the other side. General implicit 3D surfaces are not supported yet.',
        );
    } else if (
      (axis(a, 'y') && !hasSymbol(b, 'y') && !hasSymbol(b, 'z')) ||
      (axis(b, 'y') && !hasSymbol(a, 'y') && !hasSymbol(a, 'z'))
    ) {
      ast = axis(a, 'y') ? b : a;
      mode = 'curve';
      label = `Interpreted as y = ${axis(a, 'y') ? equality[1] : equality[0]}`;
      symbols.delete('y');
    } else {
      ast = { t: 'binary', op: '-', left: a, right: b };
      mode = symbols.size ? 'relation' : 'constantRelation';
      label = 'Zero contour of left side − right side';
      if (symbols.has('z'))
        throw new Error(
          'General implicit 3D equations need an isosurface method. Try z=x^2+y^2 for a height surface.',
        );
    }
  } else {
    if (symbols.has('z'))
      throw new Error('Use z=f(x,y) for a surface. A bare expression cannot contain z.');
    mode = symbols.has('y')
      ? 'surface'
      : symbols.has('x')
        ? 'curve'
        : symbols.size
          ? 'curve'
          : 'constant';
    label =
      mode === 'surface'
        ? `Interpreted as z = ${normalized}`
        : mode === 'constant'
          ? 'A constant real value'
          : `Interpreted as y = ${normalized}`;
  }
  if (interpretation === 'curve') {
    if (hasSymbol(ast, 'y') || hasSymbol(ast, 'z'))
      throw new Error('Curve mode needs a value depending on x and parameters only.');
    if (mode === 'relation' || mode === 'constantRelation')
      throw new Error(
        'A relation cannot be silently changed to a function. Use y=f(x) to choose Curve mode.',
      );
    if (mode !== 'constant') mode = 'curve';
  }
  if (interpretation === 'surface') {
    if (mode === 'relation' || mode === 'constantRelation')
      throw new Error('Surface mode needs z=f(x,y), not an implicit relation.');
    mode = 'surface';
    label = `Interpreted as z = ${equality ? (axis(a, 'z') ? equality[1] : axis(b!, 'z') ? equality[0] : axis(a, 'y') ? equality[1] : equality[0]) : normalized}`;
  }
  if (interpretation === 'relation' && mode !== 'relation' && mode !== 'constantRelation') {
    if (!equality) throw new Error('Relation mode needs an equality, such as x^2+y^2=4.');
    ast = { t: 'binary', op: '-', left: a, right: b! };
    mode = 'relation';
    label = 'Zero contour of left side − right side';
    symbols.add('y');
  }
  const parameters = [...symbols].filter((name) => !['x', 'y', 'z'].includes(name)).sort();
  if (parameters.length > 4)
    throw new Error(
      'Use at most four free parameters. Axes x/y/z and constants pi/e do not count.',
    );
  const originalAst = ast;
  if (mode === 'relation') {
    // This rewrite only changes zero detection, never the original domain guards.
    if (
      ast.t === 'binary' &&
      ast.op === '-' &&
      ast.right.t === 'number' &&
      ast.right.v === 0 &&
      ast.left.t === 'binary' &&
      ast.left.op === '^' &&
      ast.left.right.t === 'number' &&
      Number.isInteger(ast.left.right.v) &&
      ast.left.right.v > 0
    )
      ast = ast.left.left;
  }
  let constantComparison: ParsedGraph['constantComparison'];
  if (mode === 'constantRelation' && b) {
    const ar = rational(a),
      br = rational(b);
    if (ar && br) constantComparison = { exact: true, equal: ar.n * br.d === br.n * ar.d };
  }
  const tex = right ? `${left.toTex()}=${right.toTex()}` : left.toTex();
  return {
    requestedInterpretation: interpretation,
    source,
    normalized,
    mode,
    ast,
    originalAst,
    parameters,
    tex,
    interpretation: label,
    constantComparison,
  };
}
export function hasSymbol(ast: NumericAST, name: string): boolean {
  if (ast.t === 'symbol') return ast.name === name;
  if (ast.t === 'unary') return hasSymbol(ast.arg, name);
  if (ast.t === 'binary') return hasSymbol(ast.left, name) || hasSymbol(ast.right, name);
  if (ast.t === 'call') return ast.args.some((arg) => hasSymbol(arg, name));
  return false;
}
