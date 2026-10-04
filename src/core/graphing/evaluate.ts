import type { NumericAST, Evaluation, WorkBudget } from './types';
export function evaluateAST(
  ast: NumericAST,
  scope: Record<string, number>,
  budget?: WorkBudget,
): Evaluation {
  if (budget) {
    if (++budget.nodeVisits > budget.maxNodeVisits || performance.now() > budget.deadline) {
      budget.limited = true;
      return { valid: false, reason: 'Sampling detail budget reached' };
    }
  }
  if (ast.t === 'number') return { valid: true, value: ast.v };
  if (ast.t === 'symbol') {
    const value = scope[ast.name];
    return Number.isFinite(value)
      ? { valid: true, value }
      : { valid: false, reason: `Missing parameter ${ast.name}` };
  }
  const run = (node: NumericAST) => evaluateAST(node, scope, budget);
  if (ast.t === 'unary') {
    const a = run(ast.arg);
    return a.valid ? { valid: true, value: ast.op === '-' ? -a.value! : a.value } : a;
  }
  let value: number;
  if (ast.t === 'binary') {
    const a = run(ast.left),
      b = run(ast.right);
    if (!a.valid) return a;
    if (!b.valid) return b;
    const x = a.value!,
      y = b.value!;
    if (ast.op === '+') value = x + y;
    else if (ast.op === '-') value = x - y;
    else if (ast.op === '*') value = x * y;
    else if (ast.op === '/') {
      if (y === 0) return { valid: false, reason: 'Division by zero' };
      value = x / y;
    } else {
      if (x === 0 && y === 0)
        return { valid: false, reason: '0^0 is left undefined in this workspace' };
      if (x < 0 && !Number.isInteger(y))
        return { valid: false, reason: 'This power has no real value' };
      value = x ** y;
    }
  } else {
    const args = ast.args.map(run);
    const invalid = args.find((a) => !a.valid);
    if (invalid) return invalid;
    const values = args.map((a) => a.value!),
      x = values[0];
    switch (ast.fn) {
      case 'sin':
        value = Math.sin(x);
        break;
      case 'cos':
        value = Math.cos(x);
        break;
      case 'tan':
        if (Math.abs(Math.cos(x)) < 1e-12)
          return { valid: false, reason: 'Tangent is undefined at this pole' };
        value = Math.tan(x);
        break;
      case 'asin':
      case 'acos':
        if (x < -1 || x > 1)
          return { valid: false, reason: 'Inverse trig needs an input from −1 to 1' };
        value = ast.fn === 'asin' ? Math.asin(x) : Math.acos(x);
        break;
      case 'atan':
        value = Math.atan(x);
        break;
      case 'sqrt':
        if (x < 0) return { valid: false, reason: 'Square root has no real value here' };
        value = Math.sqrt(x);
        break;
      case 'abs':
        value = Math.abs(x);
        break;
      case 'exp':
        value = Math.exp(x);
        break;
      case 'log':
      case 'log10':
        if (x <= 0) return { valid: false, reason: 'Logarithms need positive inputs' };
        if (ast.fn === 'log' && values.length === 2) {
          const b = values[1];
          if (b <= 0 || b === 1)
            return { valid: false, reason: 'A log base must be positive and different from 1' };
          value = Math.log(x) / Math.log(b);
        } else value = ast.fn === 'log10' ? Math.log10(x) : Math.log(x);
        break;
      case 'floor':
        value = Math.floor(x);
        break;
      case 'ceil':
        value = Math.ceil(x);
        break;
      case 'min':
        value = Math.min(...values);
        break;
      case 'max':
        value = Math.max(...values);
        break;
    }
  }
  return Number.isFinite(value)
    ? { valid: true, value }
    : { valid: false, reason: 'The value overflows or is outside the real domain' };
}
type Interval = [number, number];
export function intervalOf(
  ast: NumericAST,
  a: Record<string, number>,
  b: Record<string, number>,
): Interval | null {
  if (ast.t === 'number') return [ast.v, ast.v];
  if (ast.t === 'symbol') {
    const x = a[ast.name],
      y = b[ast.name];
    return Number.isFinite(x) && Number.isFinite(y) ? [Math.min(x, y), Math.max(x, y)] : null;
  }
  if (ast.t === 'unary') {
    const v = intervalOf(ast.arg, a, b);
    return v ? (ast.op === '-' ? [-v[1], -v[0]] : v) : null;
  }
  if (ast.t !== 'binary') return null;
  const x = intervalOf(ast.left, a, b),
    y = intervalOf(ast.right, a, b);
  if (!x || !y) return null;
  if (ast.op === '+') return [x[0] + y[0], x[1] + y[1]];
  if (ast.op === '-') return [x[0] - y[1], x[1] - y[0]];
  if (ast.op === '*') {
    const v = [x[0] * y[0], x[0] * y[1], x[1] * y[0], x[1] * y[1]];
    return [Math.min(...v), Math.max(...v)];
  }
  if (ast.op === '/') {
    if (y[0] <= 0 && y[1] >= 0) return null;
    const v = [x[0] / y[0], x[0] / y[1], x[1] / y[0], x[1] / y[1]];
    return [Math.min(...v), Math.max(...v)];
  }
  if (y[0] === y[1] && Number.isInteger(y[0]) && y[0] >= 0 && y[0] <= 100) {
    const lo = x[0] ** y[0],
      hi = x[1] ** y[0];
    return [y[0] % 2 === 0 && x[0] <= 0 && x[1] >= 0 ? 0 : Math.min(lo, hi), Math.max(lo, hi)];
  }
  return null;
}
/** Conservative guards preserve original denominators and known discontinuities. */
export function crossesDomain(
  ast: NumericAST,
  a: Record<string, number>,
  b: Record<string, number>,
): boolean {
  if (ast.t === 'binary') {
    if (ast.op === '/') {
      const range = intervalOf(ast.right, a, b);
      if (range && range[0] <= 0 && range[1] >= 0) return true;
    }
    if (ast.op === '^') {
      const range = intervalOf(ast.left, a, b),
        power = intervalOf(ast.right, a, b);
      if (
        range &&
        power &&
        ((range[0] < 0 && !(power[0] === power[1] && Number.isInteger(power[0]))) ||
          (range[0] <= 0 && range[1] >= 0 && power[0] < 0))
      )
        return true;
    }
    return crossesDomain(ast.left, a, b) || crossesDomain(ast.right, a, b);
  }
  if (ast.t === 'unary') return crossesDomain(ast.arg, a, b);
  if (ast.t === 'call') {
    const range = intervalOf(ast.args[0], a, b);
    if (range) {
      if (
        ast.fn === 'tan' &&
        Math.ceil((range[0] - Math.PI / 2) / Math.PI) <=
          Math.floor((range[1] - Math.PI / 2) / Math.PI)
      )
        return true;
      if ((ast.fn === 'log' || ast.fn === 'log10') && range[0] <= 0) return true;
      if (ast.fn === 'sqrt' && range[0] < 0) return true;
      if (
        (ast.fn === 'floor' || ast.fn === 'ceil') &&
        Math.floor(range[0]) !== Math.floor(range[1])
      )
        return true;
      if ((ast.fn === 'asin' || ast.fn === 'acos') && (range[0] < -1 || range[1] > 1)) return true;
    }
    return ast.args.some((arg) => crossesDomain(arg, a, b));
  }
  return false;
}
