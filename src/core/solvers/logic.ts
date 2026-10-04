import type { Solver } from '../labs/types';
import type { Step } from '../scene/spec';

export type LogicBinary = 'and' | 'or' | 'implies' | 'iff';
export type LogicAst =
  | { type: 'variable'; name: string }
  | { type: 'constant'; value: boolean }
  | { type: 'not'; value: LogicAst }
  | { type: 'binary'; op: LogicBinary; left: LogicAst; right: LogicAst };
export type LogicClassification = 'tautology' | 'contradiction' | 'contingent';
export type LogicAnswer = LogicClassification | 'valid' | 'invalid';
export type LogicMethod = 'truth-table' | 'gate-circuit';
export interface LogicProblem {
  expression: string;
  ast: LogicAst;
  variables: string[];
  argument?: { premises: LogicAst[]; conclusion: LogicAst };
}
export interface TruthRow {
  id: string;
  values: Record<string, boolean>;
  result: boolean;
  premises?: boolean;
  conclusion?: boolean;
}
export interface LogicNode {
  id: string;
  ast: LogicAst;
  inputs: string[];
  depth: number;
}
export interface LogicSolution {
  answer: LogicAnswer;
  classification: LogicClassification;
  rows: TruthRow[];
  trueWorlds: string[];
  falseWorlds: string[];
  steps: Step[];
  method: LogicMethod;
  code: { python: string; sql: string };
}
const MAX_VARIABLES = 4,
  MAX_NODES = 16,
  MAX_DEPTH = 16;
function tokenise(source: string): string[] {
  if (typeof source !== 'string' || !source.trim() || source.length > 256)
    throw new Error('Enter a propositional formula of at most 256 characters.');
  const tokens: string[] = [];
  for (let i = 0; i < source.length;) {
    const rest = source.slice(i);
    if (/^\s/.test(rest)) {
      i++;
      continue;
    }
    const multi = rest.match(/^(?:<->|<=>|↔|≡|->|=>|→)/);
    if (multi) {
      tokens.push(['↔', '≡', '<->', '<=>'].includes(multi[0]) ? '↔' : '→');
      i += multi[0].length;
      continue;
    }
    const one = source[i];
    if ('()¬~!∧&∨|⊤⊥'.includes(one)) {
      tokens.push(one);
      i++;
      continue;
    }
    if (one === 'T') {
      tokens.push('⊤');
      i++;
      continue;
    }
    if (one === 'F') {
      tokens.push('⊥');
      i++;
      continue;
    }
    if (/^[p-z]$/i.test(one)) {
      tokens.push(one.toLowerCase());
      i++;
      continue;
    }
    throw new Error('Use variables p–z, parentheses, ¬, ∧, ∨, →, ↔, ⊤ and ⊥.');
  }
  if (tokens.length > 64) throw new Error('Keep the formula within 64 logical tokens.');
  return tokens;
}
export function parseLogicExpression(source: string): LogicAst {
  const tokens = tokenise(source);
  let index = 0,
    nodes = 0;
  const count = <T extends LogicAst>(node: T): T => {
    if (++nodes > MAX_NODES)
      throw new Error('Use at most sixteen logical nodes for a readable circuit.');
    return node;
  };
  const peek = () => tokens[index] ?? null;
  const unary = (depth: number): LogicAst => {
    if (depth > MAX_DEPTH) throw new Error('Use at most 16 nested logical operations.');
    const token = peek();
    if (token === '¬' || token === '~' || token === '!') {
      index++;
      return count({ type: 'not', value: unary(depth + 1) });
    }
    if (token === '(') {
      index++;
      const value = iff(depth + 1);
      if (peek() !== ')') throw new Error('Close each parenthesis in the formula.');
      index++;
      return value;
    }
    if (token === '⊤' || token === '⊥') {
      index++;
      return count({ type: 'constant', value: token === '⊤' });
    }
    if (token && /^[p-z]$/.test(token)) {
      index++;
      return count({ type: 'variable', name: token });
    }
    throw new Error('Each connective needs a proposition on both sides.');
  };
  const and = (depth: number): LogicAst => {
    let left = unary(depth);
    while (peek() === '∧' || peek() === '&') {
      index++;
      left = count({ type: 'binary', op: 'and', left, right: unary(depth) });
    }
    return left;
  };
  const or = (depth: number): LogicAst => {
    let left = and(depth);
    while (peek() === '∨' || peek() === '|') {
      index++;
      left = count({ type: 'binary', op: 'or', left, right: and(depth) });
    }
    return left;
  };
  const implies = (depth: number): LogicAst => {
    if (depth > MAX_DEPTH) throw new Error('Use at most 16 nested logical operations.');
    const left = or(depth);
    if (peek() === '→') {
      index++;
      return count({ type: 'binary', op: 'implies', left, right: implies(depth + 1) });
    }
    return left;
  };
  const iff = (depth: number): LogicAst => {
    let left = implies(depth);
    while (peek() === '↔') {
      index++;
      left = count({ type: 'binary', op: 'iff', left, right: implies(depth) });
    }
    return left;
  };
  const ast = iff(0);
  if (index !== tokens.length)
    throw new Error('Separate complete propositions with a supported connective.');
  return ast;
}
export function logicNodes(ast: LogicAst, id = 'gate-root', depth = 0): LogicNode[] {
  const children =
    ast.type === 'not'
      ? logicNodes(ast.value, id + '-v', depth + 1)
      : ast.type === 'binary'
        ? [
            ...logicNodes(ast.left, id + '-l', depth + 1),
            ...logicNodes(ast.right, id + '-r', depth + 1),
          ]
        : [];
  const inputs =
    ast.type === 'not' ? [id + '-v'] : ast.type === 'binary' ? [id + '-l', id + '-r'] : [];
  return [...children, { id, ast, inputs, depth }];
}
export function evaluateLogic(ast: LogicAst, world: Record<string, boolean>): boolean {
  if (ast.type === 'variable') return world[ast.name] === true;
  if (ast.type === 'constant') return ast.value;
  if (ast.type === 'not') return !evaluateLogic(ast.value, world);
  const left = evaluateLogic(ast.left, world),
    right = evaluateLogic(ast.right, world);
  return ast.op === 'and'
    ? left && right
    : ast.op === 'or'
      ? left || right
      : ast.op === 'implies'
        ? !left || right
        : left === right;
}
export function logicAstTex(ast: LogicAst, id = 'gate-root'): string {
  if (ast.type === 'variable') return `\\htmlClass{tk-${ast.name}}{${ast.name}}`;
  if (ast.type === 'constant') return `\\htmlClass{tk-${id}}{${ast.value ? '\\top' : '\\bot'}}`;
  if (ast.type === 'not')
    return `\\htmlClass{tk-${id}}{\\neg} ${logicAstTex(ast.value, id + '-v')}`;
  const op = { and: '\\land', or: '\\lor', implies: '\\to', iff: '\\leftrightarrow' }[ast.op];
  return `(${logicAstTex(ast.left, id + '-l')} \\htmlClass{tk-${id}}{${op}} ${logicAstTex(ast.right, id + '-r')})`;
}
export function logicExpressionTex(source: string): string | null {
  const parsed = parseLogicInput(source);
  return parsed.ok ? logicAstTex(parsed.problem.ast) : null;
}
export function logicCodeExpression(ast: LogicAst, language: 'python' | 'sql'): string {
  if (ast.type === 'variable') return ast.name;
  if (ast.type === 'constant')
    return language === 'python' ? (ast.value ? 'True' : 'False') : ast.value ? 'TRUE' : 'FALSE';
  const not = language === 'python' ? 'not' : 'NOT';
  if (ast.type === 'not') return `(${not} ${logicCodeExpression(ast.value, language)})`;
  const left = logicCodeExpression(ast.left, language),
    right = logicCodeExpression(ast.right, language);
  if (ast.op === 'implies')
    return `(${not} ${left} ${language === 'python' ? 'or' : 'OR'} ${right})`;
  const op =
    language === 'python'
      ? { and: 'and', or: 'or', iff: '==' }
      : { and: 'AND', or: 'OR', iff: '=' };
  return `(${left} ${op[ast.op]} ${right})`;
}
export function parseLogicInput(
  expression: string,
): { ok: true; problem: LogicProblem } | { ok: false; reason: string } {
  try {
    if (typeof expression !== 'string' || expression.length > 256)
      throw new Error('Keep the expression within 256 characters.');
    const parts = expression.split(/\|-|⊢/);
    if (parts.length > 2) throw new Error('Use one conclusion after |- or ⊢.');
    const argument =
      parts.length === 2
        ? {
            premises: parts[0].split(';').map((part) => parseLogicExpression(part)),
            conclusion: parseLogicExpression(parts[1]),
          }
        : undefined;
    if (argument && argument.premises.length > 3)
      throw new Error('Use at most three premises before the conclusion.');
    const premise = argument?.premises.reduce((left, right): LogicAst => ({
      type: 'binary',
      op: 'and',
      left,
      right,
    }));
    const ast: LogicAst =
      argument && premise
        ? { type: 'binary', op: 'implies', left: premise, right: argument.conclusion }
        : parseLogicExpression(expression);
    const nodes = logicNodes(ast);
    if (nodes.length > MAX_NODES)
      throw new Error('Use at most sixteen logical nodes for a readable circuit.');
    const names = [
      ...new Set(nodes.flatMap((node) => (node.ast.type === 'variable' ? [node.ast.name] : []))),
    ].sort();
    if (names.length > MAX_VARIABLES)
      throw new Error('Use at most four variables so every possible world stays visible.');
    return {
      ok: true,
      problem: {
        expression: expression.trim(),
        ast,
        variables: names,
        ...(argument ? { argument } : {}),
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'That formula needs a correction.',
    };
  }
}
export const worldDescription = (row: TruthRow): string =>
  Object.entries(row.values)
    .map(([name, value]) => `${name}=${value ? 'T' : 'F'}`)
    .join(', ') || 'constant world';
export function solveLogic(
  problem: LogicProblem,
  method: LogicMethod = 'truth-table',
): LogicSolution {
  const names = [...problem.variables],
    rows: TruthRow[] = [];
  for (let mask = 0; mask < 2 ** names.length; mask++) {
    const values = Object.fromEntries(
      names.map((name, index) => [name, !!(mask & (1 << (names.length - index - 1)))]),
    );
    rows.push({
      id: `world-${mask}`,
      values,
      result: evaluateLogic(problem.ast, values),
      ...(problem.argument
        ? {
            premises: problem.argument.premises.every((ast) => evaluateLogic(ast, values)),
            conclusion: evaluateLogic(problem.argument.conclusion, values),
          }
        : {}),
    });
  }
  const trueWorlds = rows.filter((row) => row.result).map((row) => row.id),
    falseWorlds = rows.filter((row) => !row.result).map((row) => row.id);
  const classification: LogicClassification =
    trueWorlds.length === rows.length
      ? 'tautology'
      : trueWorlds.length === 0
        ? 'contradiction'
        : 'contingent';
  const answer: LogicAnswer = problem.argument
    ? falseWorlds.length === 0
      ? 'valid'
      : 'invalid'
    : classification;
  const tagged = logicAstTex(problem.ast),
    nodes = logicNodes(problem.ast),
    first = rows[0],
    counter = rows.find((row) => !row.result);
  const bindings = nodes.map((node) => ({
    token: node.ast.type === 'variable' ? node.ast.name : node.id,
    entities: [node.id],
    color: node.ast.type === 'variable' ? 'logic' : 'code',
  }));
  const options = problem.argument
    ? ['Valid', 'Invalid']
    : ['Tautology', 'Contradiction', 'Contingent'];
  const steps: Step[] = [
    {
      id: 'logic-read',
      title: problem.argument ? 'Read the premises and conclusion' : 'Read the connectives',
      latexAfter: `${tagged}=\\htmlClass{tk-result}{?}`,
      say: {
        quick: `${names.length} variable${names.length === 1 ? '' : 's'} give ${rows.length} worlds.`,
        standard: problem.argument
          ? 'The statements before ⊢ are the premises; the statement after it is the conclusion. Test whether true premises can ever lead to a false conclusion.'
          : 'Each switch is a proposition: a statement that is true or false. The gates combine their values in the order fixed by the parentheses.',
        deep: 'NOT flips a value; AND needs both inputs; OR needs at least one. An implication is false only for true → false. An equivalence is true when its two sides agree. In an argument, the combined implication tests all premises together.',
      },
      ops: [],
      tethers: bindings,
      gaze: nodes.filter((node) => !node.inputs.length).map((node) => node.id),
      aria: `Read ${names.length} switches and ${rows.length} possible worlds.`,
    },
    {
      id: 'logic-predict',
      title: 'Predict before lighting the worlds',
      latexAfter: tagged,
      say: {
        quick: problem.argument
          ? 'Could true premises lead to a false conclusion?'
          : 'Will every world light, none light, or some light?',
        standard: problem.argument
          ? 'Commit to valid or invalid. Valid means that no possible world has true premises and a false conclusion.'
          : 'A tautology is true in every world; a contradiction is false in every world; a contingent formula is true in some worlds and false in others.',
        deep: 'One counter-world disproves an “always” claim. Do not confuse a false premise with an invalid argument: validity concerns only worlds where every premise is true.',
      },
      ops: [
        { t: 'pulse', ids: nodes.filter((node) => !node.inputs.length).map((node) => node.id) },
      ],
      tethers: bindings,
      predict: {
        kind: 'choice',
        prompt: problem.argument ? 'Is this argument valid?' : 'What kind of formula is this?',
        options,
        check: (value) => String(value).trim().toLowerCase() === answer,
        hints: [
          'Try every switch false, then every switch true.',
          'For an implication, look for true on the left and false on the right.',
          `The complete table says ${answer}.`,
        ],
      },
      gaze: ['gate-root'],
      aria: 'Commit to a prediction before the result appears.',
    },
    {
      id: 'logic-worlds',
      title:
        method === 'gate-circuit'
          ? 'Follow the gates in one world'
          : 'Evaluate every possible world',
      latexAfter: tagged,
      say: {
        quick:
          method === 'gate-circuit'
            ? `${worldDescription(first)} gives ${first.result ? 'T' : 'F'}.`
            : `${rows.length} assignments are checked.`,
        standard:
          method === 'gate-circuit'
            ? `In ${worldDescription(first)}, work from inputs to output. ${
                nodes
                  .filter((node) => node.inputs.length)
                  .map(
                    (node) =>
                      `${node.ast.type === 'not' ? 'NOT' : node.ast.type === 'binary' ? node.ast.op.toUpperCase() : ''} gives ${evaluateLogic(node.ast, first.values) ? 'T' : 'F'}`,
                  )
                  .join('; ') || 'There is only one input switch'
              }.`
            : `The rows cover all ${rows.length} combinations of ${names.join(', ') || 'the constant'}. Tap a row to light its circuit, then compare each gate output with the table.`,
        deep:
          method === 'gate-circuit'
            ? 'The circuit and table compute the same Boolean function. A gate receives values from its connected children; implication computes NOT left OR right. Tapping another row changes the switches without changing the wiring.'
            : 'All 2ⁿ assignments make this an exhaustive check, not a sample. Every lit lantern belongs to the truth set. The Venn layer places each world inside precisely the sets of variables that are true.',
      },
      ops: [{ t: 'camera', focus: ['gate-root'], angle: 'front' }],
      tethers: bindings,
      gaze: ['gate-root'],
      aria: `Evaluate all ${rows.length} assignments, or inspect the selected circuit.`,
    },
    {
      id: 'logic-result',
      title: problem.argument ? 'Read the validity test' : 'Read the truth pattern',
      latexAfter: `${tagged}=\\htmlClass{tk-result}{\\mathrm{${answer}}}`,
      say: {
        quick: `The ${problem.argument ? 'argument is' : 'formula is'} ${answer}.`,
        standard: problem.argument
          ? answer === 'valid'
            ? 'No world has all premises true and the conclusion false. The argument is valid.'
            : `The argument is invalid: ${counter ? worldDescription(counter) : ''} has true premises and a false conclusion.`
          : `The formula is ${answer}: ${trueWorlds.length} of ${rows.length} worlds are true.`,
        deep: problem.argument
          ? 'Validity describes the connection between premises and conclusion. It does not assert that the premises describe the real world. A counter-world is an assignment showing the connection can fail.'
          : classification === 'tautology'
            ? 'Every world belongs to the truth set, so no counter-world exists.'
            : classification === 'contradiction'
              ? 'The truth set is empty. Every assignment fails the complete formula.'
              : `The truth set is a proper nonempty subset. ${counter ? worldDescription(counter) : ''} makes the formula false.`,
      },
      ops: [{ t: 'tween', id: 'result', to: { opacity: 1 }, ms: 380 }],
      tethers: [...bindings, { token: 'result', entities: ['result'], color: 'result' }],
      gaze: ['result'],
      aria: `The exact result is ${answer}.`,
    },
  ];
  return {
    answer,
    classification,
    rows,
    trueWorlds,
    falseWorlds,
    steps,
    method,
    code: {
      python: `# Inputs are the selected world's Boolean values\n${names.map((name) => `${name} = ${first.values[name] ? 'True' : 'False'}`).join('\n')}\nresult = ${logicCodeExpression(problem.ast, 'python')}\nprint(result)`,
      sql: `-- worlds stores Boolean columns, without NULL values\nSELECT * FROM worlds\nWHERE ${logicCodeExpression(problem.ast, 'sql')};`,
    },
  };
}
export const logicSolver: Solver<LogicProblem, LogicSolution> = {
  id: 'logic',
  domain: 'logic',
  parse: (input) => {
    const result = parseLogicInput(input);
    return result.ok ? result.problem : null;
  },
  methods: () => [
    { id: 'truth-table', name: 'Enumerate worlds' },
    { id: 'gate-circuit', name: 'Follow the gates' },
  ],
  solve: (problem, method) =>
    solveLogic(problem, method === 'gate-circuit' ? method : 'truth-table'),
};
