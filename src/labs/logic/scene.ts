import type { Entity, SceneSpec, Vec3 } from '../../core/scene/spec';
import {
  evaluateLogic,
  logicAstTex,
  logicCodeExpression,
  logicNodes,
  worldDescription,
  type LogicMethod,
  type LogicProblem,
  type LogicSolution,
} from '../../core/solvers/logic';
import { validLogicBuildState, type LogicBuildState } from './challenge';

export function canRenderLogicScene(problem: LogicProblem) {
  return problem.variables.length <= 4 && logicNodes(problem.ast).length <= 16;
}
function label(id: string, text: string, pos: Vec3, tether: string, color = 'paper'): Entity {
  return {
    id,
    kind: 'label',
    pos,
    color,
    text: { plain: text },
    tether,
    scale: [0.72, 0.72, 0.72],
    layers: { code: { opacity: 0 } },
  };
}
function connection(id: string, from: Vec3, to: Vec3, tether: string, opacity: number): Entity {
  const dx = to[0] - from[0],
    dz = to[2] - from[2];
  return {
    id,
    kind: 'bar',
    pos: [(from[0] + to[0]) / 2, 0.07, (from[2] + to[2]) / 2],
    rot: [0, -Math.atan2(dz, dx), 0],
    size: [Math.hypot(dx, dz), 0.035, 0.035],
    color: 'paper',
    opacity,
    tether,
    text: { plain: 'Wire sends a child gate value to its parent gate' },
    layers: { shape: { opacity: 0 }, code: { opacity: 0 } },
  };
}
function vennPosition(row: LogicSolution['rows'][number], names: string[], index: number): Vec3 {
  const a = row.values[names[0]],
    b = row.values[names[1]];
  const x = names.length === 1 ? 0 : a ? (b ? 0 : -1.85) : b ? 1.85 : 0;
  const z = a || b ? 0 : -2.15;
  const sameRegion = index % Math.max(1, 2 ** Math.max(0, names.length - 2));
  return [x + (sameRegion % 2 ? 0.23 : -0.23), 0.28, z + (sameRegion > 1 ? 0.24 : -0.24)];
}
export function logicScene(
  problem: LogicProblem,
  solution: LogicSolution,
  worldId = 'world-0',
  method: LogicMethod = solution.method,
  build?: LogicBuildState,
): SceneSpec {
  if (!canRenderLogicScene(problem))
    throw new RangeError(
      'Use up to four variables and sixteen logical nodes for the visual workspace.',
    );
  const row = solution.rows.find((candidate) => candidate.id === worldId) ?? solution.rows[0];
  const nodes = logicNodes(problem.ast),
    selected = build?.selectedWorlds ?? [];
  const circuit = method === 'gate-circuit',
    practice = !!build;
  const entities: Entity[] = [];
  const positions = new Map<string, Vec3>();
  const leaves = nodes.filter((node) => !node.inputs.length),
    maxDepth = Math.max(...nodes.map((node) => node.depth));
  nodes.forEach((node) => {
    const x = node.inputs.length
      ? node.inputs.reduce((sum, id) => sum + positions.get(id)![0], 0) / node.inputs.length
      : leaves.length === 1
        ? 0
        : -2.6 + (leaves.indexOf(node) * 5.2) / (leaves.length - 1);
    positions.set(node.id, [x, 0.25, -0.75 + (node.depth * 2.3) / Math.max(1, maxDepth)]);
  });
  nodes.forEach((node) => {
    const pos = positions.get(node.id)!,
      value = evaluateLogic(node.ast, row.values),
      tether = node.ast.type === 'variable' ? node.ast.name : node.id;
    const name =
      node.ast.type === 'variable'
        ? node.ast.name
        : node.ast.type === 'constant'
          ? node.ast.value
            ? '⊤'
            : '⊥'
          : node.ast.type === 'not'
            ? 'NOT'
            : { and: 'AND', or: 'OR', implies: '→', iff: '↔' }[node.ast.op];
    entities.push({
      id: node.id,
      kind: node.inputs.length ? 'block' : 'token',
      pos,
      size: [0.74, 0.19, 0.46],
      color: value ? 'logic' : 'paper',
      opacity: circuit ? 1 : 0,
      tether,
      text: { plain: `${name}: ${value ? 'T ✓' : 'F ×'}` },
      layers: {
        shape: { opacity: 0 },
        symbol: { opacity: circuit ? 0.9 : 0 },
        code: { opacity: 0.025 },
      },
    });
    if (node.inputs.length)
      entities.push({
        ...label(
          node.id + '-label',
          practice ? `${name} ${value ? '✓' : '×'}` : `${name} ?`,
          [pos[0], 0.45, pos[2]],
          tether,
          'ink',
        ),
        opacity: circuit ? 1 : 0,
        layers: {
          shape: { opacity: 0 },
          symbol: { opacity: circuit ? 1 : 0 },
          code: { opacity: 0 },
        },
      });
    node.inputs.forEach((id) =>
      entities.push(
        connection(`wire-${node.id}-${id}`, positions.get(id)!, pos, tether, circuit ? 0.7 : 0),
      ),
    );
  });
  const a = problem.variables[0],
    b = problem.variables[1];
  for (const [index, name] of [a, b].entries())
    if (name) {
      const center: Vec3 = [b ? (index === 0 ? -0.95 : 0.95) : 0, 0.12, 0];
      entities.push({
        id: 'region-' + name,
        kind: 'sphere',
        pos: center,
        size: [1.65, 1.65, 1.65],
        scale: [1, 0.03, 1],
        color: index ? 'part' : 'whole',
        opacity: 0,
        text: { plain: `Set of worlds where ${name} is true` },
        tether: name,
        layers: {
          shape: { opacity: 0.2 },
          symbol: { opacity: circuit ? 0 : 0.09 },
          code: { opacity: 0 },
        },
      });
      const title = label('region-label-' + name, `${name}=T`, [center[0], 0.12, 1.9], name);
      entities.push({
        ...title,
        opacity: 0,
        layers: {
          shape: { opacity: 1 },
          symbol: { opacity: circuit ? 0 : 1 },
          code: { opacity: 0 },
        },
      });
    }
  const columns = Math.min(4, solution.rows.length);
  solution.rows.forEach((world, index) => {
    const table: Vec3 = [
      ((index % columns) - (columns - 1) / 2) * 1.24,
      0.32,
      1.55 - Math.floor(index / columns) * 0.89,
    ];
    const symbol: Vec3 = [
      ((index % columns) - (columns - 1) / 2) * 1.24,
      0.1,
      1.55 - Math.floor(index / columns) * 0.89,
    ];
    const picked = selected.includes(world.id),
      pos = table;
    entities.push({
      id: world.id,
      kind: 'lantern',
      pos,
      size: [0.18, 0.18, 0.18],
      color: picked ? 'highlight' : practice ? 'ink' : 'paper',
      opacity: circuit ? 0 : 1,
      glow: picked ? 0.3 : 0,
      text: {
        plain: `${worldDescription(world)}: ${practice ? (picked ? 'marked ✓' : 'unmarked ○') : 'predict first'}`,
      },
      tether: 'result',
      layers: {
        shape: {
          pos: vennPosition(world, problem.variables, index),
          opacity: 1,
          scale: [0.95, 0.45, 0.95],
        },
        symbol: { pos: symbol, opacity: circuit ? 0 : 1 },
        code: { opacity: 0.02 },
      },
    });
    const mark = label(
      world.id + '-mark',
      `${index}: ${practice ? (picked ? '✓' : '○') : '?'}`,
      [pos[0], 0.45, pos[2]],
      'result',
      picked ? 'highlight' : 'paper',
    );
    entities.push({
      ...mark,
      opacity: circuit ? 0 : 1,
      layers: {
        shape: {
          pos: [
            vennPosition(world, problem.variables, index)[0],
            0.5,
            vennPosition(world, problem.variables, index)[2],
          ],
          opacity: 1,
        },
        symbol: { pos: [symbol[0], 0.3, symbol[2]], opacity: circuit ? 0 : 1 },
        code: { opacity: 0 },
      },
    });
    if (problem.variables.length <= 2) {
      const region = vennPosition(world, problem.variables, index);
      entities.push({
        id: `${world.id}-truth-region`,
        kind: 'sphere',
        pos: [region[0], 0.14, region[2]],
        size: [0.5, 0.5, 0.5],
        scale: [1, 0.04, 1],
        color: practice && picked ? 'highlight' : 'ink',
        opacity: 0,
        text: { plain: `Truth-set region for ${worldDescription(world)}` },
        tether: 'result',
        layers: { shape: { opacity: 0.18 }, symbol: { opacity: 0 }, code: { opacity: 0 } },
      });
    }
  });
  entities.push(
    label(
      'truth-table',
      circuit ? `Circuit: ${worldDescription(row)}` : 'Each lantern is one complete assignment',
      [circuit ? -1.35 : 0, 0.12, 2.75],
      'result',
    ),
  );
  entities.push({
    ...label('result', practice ? 'Marked worlds' : solution.answer, [2.5, 0.15, 2.35], 'result'),
    opacity: practice ? 1 : 0,
  });
  const steps = practice
    ? [
        {
          id: 'logic-build',
          title: 'Your lantern construction',
          latexAfter: logicAstTex(problem.ast),
          say: {
            quick: 'Mark the requested worlds and classify the pattern.',
            standard:
              'Your marked lanterns are the actual challenge state. Use the table checkboxes or tap a lantern in either dimension. Input switches preview one world’s circuit.',
            deep: 'Mark only the requested truth set or counter-worlds. A validity counter-world has true premises and a false conclusion; rows with false premises do not refute an argument.',
          },
          ops: [],
          tethers: solution.steps[0].tethers,
          gaze: ['gate-root'],
          aria: 'Build and verify the actual marked lantern set.',
        },
      ]
    : solution.steps.map((step, index) => ({
        ...step,
        ops: [
          ...step.ops,
          ...(index === 2
            ? solution.rows.flatMap((world) => [
                {
                  t: 'tween' as const,
                  id: world.id,
                  to: {
                    color: world.result ? 'logic' : 'ink',
                    glow: world.result ? 0.18 : 0,
                    text: { plain: `${worldDescription(world)} → ${world.result ? 'T ✓' : 'F ×'}` },
                  },
                  ms: 420,
                },
                ...(problem.variables.length <= 2
                  ? [
                      {
                        t: 'tween' as const,
                        id: `${world.id}-truth-region`,
                        to: {
                          color: world.result ? 'logic' : 'ink',
                          glow: world.result ? 0.15 : 0,
                        },
                        ms: 420,
                      },
                    ]
                  : []),
                {
                  t: 'tween' as const,
                  id: world.id + '-mark',
                  to: {
                    text: { plain: `${solution.rows.indexOf(world)}: ${world.result ? '✓' : '×'}` },
                  },
                  ms: 420,
                },
              ])
            : []),
        ],
      }));
  // Gate values remain hidden before Predict; practice inputs are user controlled.
  if (!practice)
    nodes.forEach((node) => {
      const entity = entities.find((item) => item.id === node.id)!;
      const output = { color: entity.color, text: entity.text };
      entity.color = 'paper';
      entity.text = { plain: node.ast.type === 'variable' ? node.ast.name : 'Gate: predict first' };
      steps[2].ops.push({ t: 'tween', id: node.id, to: output, ms: 420 });
      if (node.inputs.length)
        steps[2].ops.push({
          t: 'tween',
          id: node.id + '-label',
          to: {
            text: {
              plain: `${node.ast.type === 'not' ? 'NOT' : node.ast.type === 'binary' ? { and: 'AND', or: 'OR', implies: '→', iff: '↔' }[node.ast.op] : ''} ${evaluateLogic(node.ast, row.values) ? '✓' : '×'}`,
            },
          },
          ms: 420,
        });
    });
  if (entities.length > 96) throw new RangeError('This circuit exceeds the 96-part scene budget.');
  const gates = nodes.filter((node) => node.ast.type !== 'variable');
  const gateBindings = Object.fromEntries(gates.map((node, index) => [`gate${index}`, node.id]));
  const python = `# Selected world: ${worldDescription(row)}\n${problem.variables.map((name) => `${name} = ${row.values[name] ? 'True' : 'False'}`).join('\n')}\n${gates.map((node, index) => `gate${index} = ${logicCodeExpression(node.ast, 'python')}`).join('\n')}\nresult = ${problem.ast.type === 'variable' ? problem.ast.name : `gate${gates.length - 1}`}\nprint(result)`;
  return {
    id: `logic:${problem.expression}`,
    entities,
    steps,
    code: build?.code ?? python,
    codeLanguage: build?.code ? 'SQL' : 'Python',
    codeBindings: {
      ...Object.fromEntries(problem.variables.map((name) => [name, name])),
      ...gateBindings,
      result: 'result',
    },
  };
}
export function logicBuildScene(
  problem: LogicProblem,
  solution: LogicSolution,
  build: LogicBuildState,
  world = 'world-0',
  method: LogicMethod = 'truth-table',
): SceneSpec {
  if (!validLogicBuildState(build, solution))
    throw new RangeError('Use distinct bounded world ids and a supported classification.');
  return logicScene(problem, solution, world, method, build);
}
