import type { Solver } from '../labs/types';
import type { Step } from '../scene/spec';

export const MAX_SET_SIZE = 12;
export const MAX_SET_VALUE = 20;
export type SetName = 'A' | 'B' | 'C' | 'U';
export interface SetsConfig {
  A: number[];
  B: number[];
  C: number[];
  U: number[];
}
export interface SetsProblem {
  expression: string;
  sets: SetsConfig;
}
export type SetMethod = 'membership' | 'algebra';
export type BuilderPredicate =
  | { kind: 'parity'; value: 'even' | 'odd' }
  | { kind: 'comparison'; op: 'lt' | 'le' | 'gt' | 'ge' | 'eq' | 'ne'; value: number };
export type SetAst =
  | { type: 'named'; name: SetName }
  | { type: 'literal'; values: number[] }
  | { type: 'builder'; predicates: BuilderPredicate[] }
  | { type: 'complement'; value: SetAst }
  | {
      type: 'binary';
      op: 'union' | 'intersection' | 'difference' | 'symmetric';
      left: SetAst;
      right: SetAst;
    };
export interface SetsSolution {
  answer: string;
  result: number[];
  steps: Step[];
  method: SetMethod;
  code: { python: string; sql: string };
  ast: SetAst;
  kind: 'venn' | 'builder';
}
export const defaultSets: SetsConfig = {
  U: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  A: [0, 2, 4, 6, 8],
  B: [1, 2, 3, 4, 5],
  C: [3, 6, 9],
};
const canonical = (values: number[]) => [...new Set(values)].sort((a, b) => a - b);
export const sameSet = (a: number[], b: number[]) => {
  const left = canonical(a),
    right = canonical(b);
  return left.length === right.length && left.every((value, i) => value === right[i]);
};
export const isSubset = (a: number[], b: number[]) => a.every((value) => b.includes(value));
export const setUnion = (a: number[], b: number[]) => canonical([...a, ...b]);
export const setIntersection = (a: number[], b: number[]) =>
  canonical(a.filter((value) => b.includes(value)));
export const setDifference = (a: number[], b: number[]) =>
  canonical(a.filter((value) => !b.includes(value)));
export const symmetricDifference = (a: number[], b: number[]) =>
  setUnion(setDifference(a, b), setDifference(b, a));
export const formatSet = (values: number[]) => `{${canonical(values).join(', ')}}`;
export function validFiniteSet(value: unknown, limit = MAX_SET_SIZE): value is number[] {
  return (
    Array.isArray(value) &&
    value.length <= limit &&
    new Set(value).size === value.length &&
    value.every((v) => Number.isInteger(v) && Math.abs(v) <= MAX_SET_VALUE)
  );
}
export function validSetsConfig(value: unknown): value is SetsConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const sets = value as SetsConfig;
  return (
    [sets.A, sets.B, sets.C, sets.U].every((values) => validFiniteSet(values)) &&
    [sets.A, sets.B, sets.C].every((values) => isSubset(values, sets.U))
  );
}
export const cloneSets = (sets: SetsConfig): SetsConfig => ({
  A: canonical(sets.A),
  B: canonical(sets.B),
  C: canonical(sets.C),
  U: canonical(sets.U),
});
export function validSetsProblem(value: unknown): value is SetsProblem {
  if (!value || typeof value !== 'object') return false;
  const p = value as SetsProblem;
  return (
    typeof p.expression === 'string' &&
    validSetsConfig(p.sets) &&
    parseSetsInput(p.expression, p.sets).ok
  );
}
export function parseSetAnswer(input: unknown): number[] | null {
  if (typeof input !== 'string' || input.length > 256) return null;
  let text = input.trim();
  if (!text) return null;
  if (['∅', 'empty', 'empty set'].includes(text.toLowerCase())) return [];
  if (text.startsWith('{') && text.endsWith('}')) text = text.slice(1, -1).trim();
  if (!text) return [];
  if (!/^[+-]?\d+(?:\s*,\s*[+-]?\d+)*$/.test(text)) return null;
  const values = text.split(',').map(Number);
  return values.length <= MAX_SET_SIZE &&
    values.every((v) => Number.isInteger(v) && Math.abs(v) <= MAX_SET_VALUE)
    ? canonical(values)
    : null;
}
export function powerSet(values: number[]): number[][] {
  if (!validFiniteSet(values, 3))
    throw new Error('The power-set cube supports at most three distinct elements.');
  const set = canonical(values);
  return Array.from({ length: 1 << set.length }, (_, mask) =>
    set.filter((_, i) => !!(mask & (1 << i))),
  );
}
export function cartesianProduct(a: number[], b: number[]): [number, number][] {
  if (!validFiniteSet(a) || !validFiniteSet(b) || a.length * b.length > 64)
    throw new Error('Keep a Cartesian grid within 64 pairs.');
  return canonical(a).flatMap((left) =>
    canonical(b).map((right) => [left, right] as [number, number]),
  );
}
export function validPairs(value: unknown, a: number[], b: number[]): value is [number, number][] {
  return (
    Array.isArray(value) &&
    value.length <= 64 &&
    value.every(
      (pair) =>
        Array.isArray(pair) && pair.length === 2 && a.includes(pair[0]) && b.includes(pair[1]),
    ) &&
    new Set(value.map((pair) => `${pair[0]},${pair[1]}`)).size === value.length
  );
}
export function isFunctionRelation(
  pairs: [number, number][],
  domain: number[],
  codomain: number[],
): boolean {
  return (
    validPairs(pairs, domain, codomain) &&
    domain.every((value) => pairs.filter((pair) => pair[0] === value).length === 1)
  );
}
export function matchesPredicate(value: number, predicate: BuilderPredicate): boolean {
  if (predicate.kind === 'parity')
    return predicate.value === 'even' ? value % 2 === 0 : value % 2 !== 0;
  switch (predicate.op) {
    case 'lt':
      return value < predicate.value;
    case 'le':
      return value <= predicate.value;
    case 'gt':
      return value > predicate.value;
    case 'ge':
      return value >= predicate.value;
    case 'eq':
      return value === predicate.value;
    case 'ne':
      return value !== predicate.value;
  }
}
function predicatesFrom(text: string): BuilderPredicate[] {
  const parts = text.split(/\s*,\s*|\s+and\s+/i);
  if (parts.length < 1 || parts.length > 4)
    throw new Error('Use one to four even/odd or integer comparison conditions.');
  return parts.map((part) => {
    const parity = /^(?:x\s+(even|odd)|(even|odd)\s*\(\s*x\s*\))$/i.exec(part.trim());
    if (parity)
      return { kind: 'parity', value: (parity[1] ?? parity[2]).toLowerCase() as 'even' | 'odd' };
    const comparison = /^x\s*(<=|>=|!=|==|=|<|>|≤|≥|≠)\s*([+-]?\d+)$/i.exec(part.trim());
    if (
      !comparison ||
      !Number.isSafeInteger(Number(comparison[2])) ||
      Math.abs(Number(comparison[2])) > 10000
    )
      throw new Error(
        'Set-builder conditions support x even, x odd, and comparisons such as x < 10.',
      );
    const operations: { [op: string]: 'lt' | 'le' | 'gt' | 'ge' | 'eq' | 'ne' } = {
      '<': 'lt',
      '<=': 'le',
      '≤': 'le',
      '>': 'gt',
      '>=': 'ge',
      '≥': 'ge',
      '=': 'eq',
      '==': 'eq',
      '!=': 'ne',
      '≠': 'ne',
    };
    return { kind: 'comparison', op: operations[comparison[1]], value: Number(comparison[2]) };
  });
}
type Token = { kind: 'node'; value: SetAst } | { kind: 'symbol'; value: string };
function tokensFrom(expression: string): Token[] {
  const result: Token[] = [];
  let index = 0;
  while (index < expression.length) {
    const char = expression[index];
    if (/\s/.test(char)) {
      index++;
      continue;
    }
    if (/[ABCU]/.test(char)) {
      result.push({ kind: 'node', value: { type: 'named', name: char as SetName } });
      index++;
      continue;
    }
    if (char === '{') {
      const end = expression.indexOf('}', index + 1);
      if (end < 0) throw new Error('Close the set literal or set-builder with }.');
      const body = expression.slice(index + 1, end).trim(),
        builder = /^x\s*(?:∈\s*U\s*)?[|:]\s*(.+)$/i.exec(body);
      if (builder)
        result.push({
          kind: 'node',
          value: { type: 'builder', predicates: predicatesFrom(builder[1]) },
        });
      else {
        const values = parseSetAnswer(`{${body}}`);
        if (!values) throw new Error('A set literal uses at most 12 integers, such as {1, 3, 5}.');
        result.push({ kind: 'node', value: { type: 'literal', values } });
      }
      index = end + 1;
      continue;
    }
    if ('()∪|∩&\\∖Δᶜ~'.includes(char)) {
      result.push({ kind: 'symbol', value: char === '∖' ? '\\' : char });
      index++;
      continue;
    }
    throw new Error('Use A, B, C, U, integer sets, ∪, ∩, \\, Δ, ~ and parentheses.');
  }
  if (result.length > 128) throw new Error('Keep the set expression within 128 tokens.');
  return result;
}
export function parseSetExpression(expression: string): SetAst {
  if (typeof expression !== 'string' || !expression.trim() || expression.length > 512)
    throw new Error('Enter a set expression of at most 512 characters.');
  const tokens = tokensFrom(expression);
  let index = 0,
    nodes = 0;
  const counted = (node: SetAst) => {
    if (++nodes > 96) throw new Error('Keep the expression within 96 set operations.');
    return node;
  };
  const symbol = () =>
    tokens[index]?.kind === 'symbol'
      ? (tokens[index] as { kind: 'symbol'; value: string }).value
      : null;
  const unary = (depth: number): SetAst => {
    if (depth > 16) throw new Error('Use at most 16 nested operations.');
    let node: SetAst;
    if (symbol() === '~') {
      index++;
      node = counted({ type: 'complement', value: unary(depth + 1) });
    } else if (symbol() === '(') {
      index++;
      node = union(depth + 1);
      if (symbol() !== ')') throw new Error('Close each parenthesis in the set expression.');
      index++;
    } else {
      const token = tokens[index++];
      if (!token || token.kind !== 'node')
        throw new Error('Each operation needs a set on both sides.');
      node = counted(token.value);
    }
    while (symbol() === 'ᶜ') {
      index++;
      node = counted({ type: 'complement', value: node });
    }
    return node;
  };
  const intersection = (depth: number): SetAst => {
    let left = unary(depth);
    while (['∩', '&', '\\'].includes(symbol() ?? '')) {
      const op = symbol() === '\\' ? 'difference' : 'intersection';
      index++;
      left = counted({ type: 'binary', op, left, right: unary(depth) });
    }
    return left;
  };
  const union = (depth: number): SetAst => {
    let left = intersection(depth);
    while (['∪', '|', 'Δ'].includes(symbol() ?? '')) {
      const op = symbol() === 'Δ' ? 'symmetric' : 'union';
      index++;
      left = counted({ type: 'binary', op, left, right: intersection(depth) });
    }
    return left;
  };
  const ast = union(0);
  if (index !== tokens.length)
    throw new Error('Separate complete sets with a supported set operation.');
  return ast;
}
export function evaluateSetExpression(ast: SetAst, sets: SetsConfig): number[] {
  if (ast.type === 'named') return [...sets[ast.name]];
  if (ast.type === 'literal') {
    if (!isSubset(ast.values, sets.U))
      throw new Error('Every literal element must belong to the chosen universe U.');
    return [...ast.values];
  }
  if (ast.type === 'builder')
    return sets.U.filter((value) =>
      ast.predicates.every((predicate) => matchesPredicate(value, predicate)),
    );
  if (ast.type === 'complement')
    return setDifference(sets.U, evaluateSetExpression(ast.value, sets));
  const a = evaluateSetExpression(ast.left, sets),
    b = evaluateSetExpression(ast.right, sets);
  return {
    union: setUnion,
    intersection: setIntersection,
    difference: setDifference,
    symmetric: symmetricDifference,
  }[ast.op](a, b);
}
export type SetsParseResult = { ok: true; problem: SetsProblem } | { ok: false; reason: string };
export function parseSetsInput(
  expression: string,
  sets: SetsConfig = defaultSets,
): SetsParseResult {
  if (!validSetsConfig(sets))
    return {
      ok: false,
      reason:
        'Use distinct integers from −20 to 20, at most 12 per set. A, B and C must stay inside U.',
    };
  try {
    const config = cloneSets(sets),
      ast = parseSetExpression(expression);
    evaluateSetExpression(ast, config);
    return { ok: true, problem: { expression: expression.trim(), sets: config } };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'That set expression needs a correction.',
    };
  }
}
const opTex = {
  union: '\\cup',
  intersection: '\\cap',
  difference: '\\setminus',
  symmetric: '\\triangle',
};
const tagged = (token: string, value: string) => `\\htmlClass{tk-${token}}{${value}}`;
function tex(ast: SetAst): string {
  if (ast.type === 'named') return tagged(ast.name.toLowerCase(), ast.name);
  if (ast.type === 'literal') return tagged('a', `\\{${ast.values.join(',')}\\}`);
  if (ast.type === 'builder')
    return tagged(
      'a',
      String.raw`\{x\in U\mid ${ast.predicates.map((p) => (p.kind === 'parity' ? `x\\text{ ${p.value}}` : `x${{ lt: '<', le: '\\le', gt: '>', ge: '\\ge', eq: '=', ne: '\\ne' }[p.op]}${p.value}`)).join(',\\ ')}\}`,
    );
  if (ast.type === 'complement') return `(${tex(ast.value)})^{\\mathrm{c}}`;
  return `(${tex(ast.left)}${opTex[ast.op]}${tex(ast.right)})`;
}
export function setExpressionTex(expression: string): string | null {
  try {
    return tex(parseSetExpression(expression));
  } catch {
    return null;
  }
}
function expressionName(ast:SetAst):string {
  if(ast.type==='named')return ast.name;
  if(ast.type==='literal')return formatSet(ast.values);
  if(ast.type==='builder')return '{x in U | the stated conditions}';
  if(ast.type==='complement')return `(${expressionName(ast.value)})ᶜ`;
  return `(${expressionName(ast.left)} ${({union:'∪',intersection:'∩',difference:'∖',symmetric:'Δ'})[ast.op]} ${expressionName(ast.right)})`;
}
function intermediateSets(ast:SetAst,sets:SetsConfig):string[] {
  if(ast.type==='named'||ast.type==='literal')return [];
  const children=ast.type==='binary'?[...intermediateSets(ast.left,sets),...intermediateSets(ast.right,sets)]:ast.type==='complement'?intermediateSets(ast.value,sets):[];
  return [...children,`${expressionName(ast)} = ${formatSet(evaluateSetExpression(ast,sets))}`];
}
const pythonSet = (values: number[]) => (values.length ? formatSet(values) : 'set()');
function predicatePython(p: BuilderPredicate) {
  return p.kind === 'parity'
    ? `x % 2 ${p.value === 'even' ? '==' : '!='} 0`
    : `x ${{ lt: '<', le: '<=', gt: '>', ge: '>=', eq: '==', ne: '!=' }[p.op]} ${p.value}`;
}
function pythonExpression(ast: SetAst): string {
  if (ast.type === 'named') return ast.name;
  if (ast.type === 'literal') return pythonSet(ast.values);
  if (ast.type === 'builder')
    return `{x for x in U if ${ast.predicates.map(predicatePython).join(' and ')}}`;
  if (ast.type === 'complement') return `(U - ${pythonExpression(ast.value)})`;
  return `(${pythonExpression(ast.left)} ${{ union: '|', intersection: '&', difference: '-', symmetric: '^' }[ast.op]} ${pythonExpression(ast.right)})`;
}
function sqlCode(ast: SetAst, sets: SetsConfig): string {
  const clauses = (['A', 'B', 'C', 'U'] as SetName[]).map(
    (name) =>
      `${name}(value) AS (${sets[name].length ? `VALUES ${sets[name].map((v) => `(${v})`).join(', ')}` : 'SELECT 0 WHERE 1 = 0'})`,
  );
  let number = 0;
  const compile = (node: SetAst): string => {
    if (node.type === 'named') return node.name;
    let query: string;
    if (node.type === 'literal')
      query = node.values.length
        ? `VALUES ${node.values.map((v) => `(${v})`).join(', ')}`
        : 'SELECT value FROM U WHERE 1 = 0';
    else if (node.type === 'builder')
      query = `SELECT value FROM U WHERE ${node.predicates.map((p) => (p.kind === 'parity' ? `MOD(value, 2) ${p.value === 'even' ? '=' : '<>'} 0` : `value ${{ lt: '<', le: '<=', gt: '>', ge: '>=', eq: '=', ne: '<>' }[p.op]} ${p.value}`)).join(' AND ')}`;
    else if (node.type === 'complement')
      query = `SELECT value FROM U EXCEPT SELECT value FROM ${compile(node.value)}`;
    else {
      const left = compile(node.left),
        right = compile(node.right);
      query =
        node.op === 'symmetric'
          ? `(SELECT value FROM ${left} EXCEPT SELECT value FROM ${right}) UNION (SELECT value FROM ${right} EXCEPT SELECT value FROM ${left})`
          : `SELECT value FROM ${left} ${{ union: 'UNION', intersection: 'INTERSECT', difference: 'EXCEPT' }[node.op]} SELECT value FROM ${right}`;
    }
    const name = `part_${number++}`;
    clauses.push(`${name}(value) AS (${query})`);
    return name;
  };
  const result = compile(ast);
  return `WITH\n  ${clauses.join(',\n  ')}\nSELECT value FROM ${result} ORDER BY value;`;
}
export function solveSets(problem: SetsProblem, method: SetMethod = 'membership'): SetsSolution {
  if (!['membership', 'algebra'].includes(method) || !validSetsConfig(problem.sets))
    throw new Error('Choose a supported method and a bounded finite universe.');
  const ast = parseSetExpression(problem.expression),
    sets = cloneSets(problem.sets),
    result = evaluateSetExpression(ast, sets),
    before = tex(ast),
    candidate = sets.U[Math.floor(sets.U.length / 2)] ?? 0,
    included = result.includes(candidate);
  const bindings = [
    { token: 'a', entities: ['set-a'], color: 'whole' },
    { token: 'b', entities: ['set-b'], color: 'part' },
    { token: 'c', entities: ['set-c'], color: 'stats' },
    { token: 'u', entities: ['universe'], color: 'mint' },
    { token: 'result', entities: ['result'], color: 'result' },
  ];
  const make = (
    id: string,
    title: string,
    say: Step['say'],
    after = `${before}=${tagged('result', '?')}`,
  ): Step => ({
    id: `sets-${id}`,
    title,
    say,
    latexBefore: before,
    latexAfter: after,
    ops: [{ t: 'pulse', ids: [id === 'result' ? 'result' : 'set-a'] }],
    tethers: bindings.filter((binding) => `${before}${after}`.includes(`tk-${binding.token}`)),
    gaze: [id === 'result' ? 'result' : 'set-a'],
    aria: `${title}. ${say.standard}`,
  });
  const steps = [
    make('read', 'Read the sets and the universe', {
      quick: `U contains ${sets.U.length} distinct elements.`,
      standard: `A=${formatSet(sets.A)}, B=${formatSet(sets.B)}, C=${formatSet(sets.C)}. All memberships are measured inside U=${formatSet(sets.U)}.`,
      deep: 'A set records membership, not order or repeated copies. The universe fixes what a complement can include; changing the universe changes that question.',
    }),
    make(
      'rule',
      method === 'membership' ? 'Test one element at a time' : 'Apply the set operation rule',
      {
        quick:
          ast.type === 'builder'
            ? 'An element passes only when every condition holds.'
            : 'Union means either; intersection means both; difference means left only.',
        standard:
          method === 'membership'
            ? `Follow each universe element through the expression. Parentheses group the inner set operation before the outer operation.`
            : 'Evaluate the innermost set operation first. A complement subtracts that set from U; symmetric difference keeps elements in exactly one operand.',
        deep:
          ast.type === 'builder'
            ? 'Set-builder conditions are closed tests over the listed universe. They do not search all integers or run code; the sieve visibly accepts precisely the matching universe elements.'
            : 'Membership rules are Boolean conditions on one element. Nested operations compose those rules, so matching results follow from identical membership for every element.',
      },
    ),
    make('collect', 'Collect exactly the matching elements', {
      quick: 'Keep each matching element once.',
      standard:
        'Move or highlight only elements that satisfy the complete expression. A duplicate does not create a second set member, and an outside element must remain outside the result.',
      deep: 'The result is a subset of U. Its displayed order is a reading aid; any permutation of the same distinct elements is the same set.',
    }),
    make(
      'result',
      'Read the exact finite result',
      {
        quick: `The result is ${formatSet(result)}.`,
        standard: `The Venn regions, element tokens, Python set operations and SQL result rows all name ${formatSet(result)}.`,
        deep: 'SQL UNION, INTERSECT and EXCEPT remove duplicate rows, matching set membership. A Cartesian product would create ordered pairs instead; one output per first coordinate is the function rule.',
      },
      `${before}=${tagged('result', `\\{${result.join(',')}\\}`)}`,
    ),
  ];
  if(method==='algebra') {
    const intermediate=intermediateSets(ast,sets).slice(0,-1);
    const summary=intermediate.length?intermediate.join('; '):'Both input operands are already finite sets.';
    steps[2].title='Evaluate the inner sets, then combine';
    steps[2].say={quick:intermediate[0]??'Use the exact membership rule for the operation.',standard:`${summary} Now apply the outer operation to those actual elements.`,deep:'Each inner result becomes an operand of the next operation. This keeps grouping explicit: a complement removes the computed inner set from U, and an intersection keeps members shared with the computed other operand.'};
    if(ast.type==='binary') {
      const operand=(node:SetAst,tag:string)=>node.type==='named'?tex(node):tagged(tag,`\\{${evaluateSetExpression(node,sets).join(',')}\\}`);
      steps[2].latexAfter=`${operand(ast.left,'a')}${opTex[ast.op]}${operand(ast.right,'b')}=${tagged('result','?')}`;
    } else if(ast.type==='complement')steps[2].latexAfter=`${tagged('u','U')}\\setminus ${tagged('a',`\\{${evaluateSetExpression(ast.value,sets).join(',')}\\}`)}=${tagged('result','?')}`;
    else if(ast.type==='builder')steps[2].say.standard=`Test U=${formatSet(sets.U)} against every stated condition. The passing elements are collected without adding elements from outside U.`;
    steps[2].tethers=bindings.filter(binding=>`${before}${steps[2].latexAfter}`.includes(`tk-${binding.token}`));
    steps[2].aria=`${steps[2].title}. ${steps[2].say.standard}`;
  } else {
    steps[2].say.standard=sets.U.length?sets.U.map(value=>`${value}: ${result.includes(value)?'included':'excluded'}`).join('; ')+'. Keep exactly the included tokens.':'U is empty, so there are no elements to include.';
    steps[2].say.deep='For every element, evaluate the same nested membership condition. This element-by-element method and the inner-set algebra method agree because they test the same universe.';
    steps[2].aria=`${steps[2].title}. ${steps[2].say.standard}`;
  }
  steps[1].predict = {
    kind: 'choice',
    prompt: `Does ${candidate} belong to the complete result?`,
    options: ['Yes', 'No'],
    check: (answer) => String(answer).toLowerCase() === (included ? 'yes' : 'no'),
    hints: [
      'Start with this element’s memberships in the input sets.',
      'Evaluate the inner parentheses, then the outer operation.',
      `${candidate} ${included ? 'does' : 'does not'} belong to the result.`,
    ],
  };
  return {
    answer: formatSet(result),
    result,
    steps,
    method,
    ast,
    kind: ast.type === 'builder' ? 'builder' : 'venn',
    code: {
      python: `${(['A', 'B', 'C', 'U'] as SetName[]).map((name) => `${name} = ${pythonSet(sets[name])}`).join('\n')}\nresult = ${pythonExpression(ast)}\nprint(sorted(result))`,
      sql: sqlCode(ast, sets),
    },
  };
}
export const setsSolver: Solver<SetsProblem, SetsSolution> = {
  id: 'sets',
  domain: 'math',
  parse: (input) => {
    const result = parseSetsInput(input);
    return result.ok ? result.problem : null;
  },
  methods: () => [
    { id: 'membership', name: 'Follow each element' },
    { id: 'algebra', name: 'Apply operation rules' },
  ],
  solve: (problem, method) => solveSets(problem, method as SetMethod | undefined),
};
