import type { Entity, Op, SceneSpec, Vec3 } from '../../../core/scene/spec';
import { fractionText } from '../../../core/solvers/fractions';
import {
  solveSummation,
  sumToken,
  summationTex,
  type SummationProblem,
  type SummationSolution,
} from '../../../core/solvers/summation';
import {
  buildNumber,
  validSummationBuildState,
  type SummationBuildState,
  type SummationChallengeKind,
} from './challenge';

export interface SummationSceneOptions {
  view?: 'machine' | 'structure';
  cursor?: number;
  language?: 'python' | 'r' | 'sql';
  build?: SummationBuildState;
  kind?: SummationChallengeKind;
}
function label(id: string, text: string, pos: Vec3, tether: string, color = 'paper'): Entity {
  return {
    id,
    kind: 'label',
    text: { plain: text },
    pos,
    color,
    tether,
    scale: [0.75, 0.75, 0.75],
    layers: { code: { opacity: 0 } },
  };
}
function block(id: string, pos: Vec3, scale: Vec3, tether: string, color = 'stats'): Entity {
  return {
    id,
    kind: 'block',
    pos,
    size: [1, 1, 1],
    scale,
    color,
    tether,
    layers: { code: { opacity: 0.02 } },
  };
}
const tween = (id: string, to: Partial<Entity>): Op => ({
  t: 'tween',
  id,
  to,
  ms: 420,
  ease: 'outCubic',
});
export function summationScene(
  problem: SummationProblem,
  solution: SummationSolution = solveSummation(problem),
  options: SummationSceneOptions = {},
): SceneSpec {
  const { terms, metrics } = solution,
    { build, kind } = options;
  if (build && !validSummationBuildState(build, solution))
    throw new RangeError('Use bounded term ids and numeric construction fields.');
  const practice = !!build,
    structural = options.view === 'structure',
    cursor = Math.max(0, Math.min(terms.length - 1, options.cursor ?? 0));
  const entities: Entity[] = [],
    positions = new Map<string, Vec3>();
  const steps = practice
    ? [
        {
          id: 'sum-build',
          title: 'Your contribution model',
          latexAfter: summationTex(problem),
          say: {
            quick: 'Build the contributions before checking the claim.',
            standard: metrics
              ? 'Your values set the actual equal weights or square areas. Include every contribution and place the exact mean pin.'
              : 'Your values set the actual term blocks. Include every required contribution once, then claim the total.',
            deep: 'A claim alone is insufficient. The validator checks each individual contribution, the included set, and the exact balance point for data. Fractions and terminating decimals are accepted when exactly equivalent.',
          },
          ops: [] as Op[],
          tethers: solution.steps[0].tethers,
          gaze: ['walker'],
          aria: 'Construct the actual contributions with the controls below the scene.',
        },
      ]
    : solution.steps.map((step) => ({ ...step, ops: [...step.ops] }));
  const hidden = (id: string, tether: string): Entity => ({
    ...label(id, '', [0, 0, 0], tether),
    opacity: 0,
  });
  entities.push(hidden('mean', 'mean'), hidden('variance', 'variance'), hidden('grid', 'grid'));
  if (!metrics) {
    const columns =
      problem.kind === 'double' ? problem.d - problem.c + 1 : Math.min(4, terms.length);
    const rows = Math.ceil(terms.length / columns);
    const entered = terms
      .map((term) => buildNumber(build?.values[term.id]))
      .filter((value): value is number => value !== null && value >= 0 && value <= 100);
    const maxValue = Math.max(1, ...terms.map((term) => term.value), ...entered),
      unit = (problem.kind === 'double' ? 0.45 : rows > 1 ? 0.65 : 1.1) / maxValue;
    const contribution = (id: string) => {
      const value = buildNumber(build?.values[id]);
      return build?.included.includes(id) && value !== null && value >= 0 && value <= 100
        ? value
        : 0;
    };
    const totalScale = Math.max(
      1,
      solution.total,
      terms.reduce((sum, term) => sum + contribution(term.id), 0),
    );
    terms.forEach((term, index) => {
      const pos: Vec3 = [
        -2.7 + (index % columns) * (3.2 / Math.max(1, columns - 1)),
        0.2,
        1.3 - Math.floor(index / columns) * (1.7 / Math.max(1, rows - 1)),
      ];
      const mirrorIndex = terms.length - 1 - index;
      const shape: Vec3 =
        problem.kind === 'double'
          ? [pos[0], 0.1, pos[2]]
          : [
              -2.7 +
                Math.min(index, mirrorIndex) * (3.2 / Math.max(1, Math.ceil(terms.length / 2) - 1)),
              0.12,
              index <= mirrorIndex ? 1.3 : -0.1,
            ];
      const raw = build?.values[term.id],
        actual = practice ? buildNumber(raw) : term.value;
      const valid = actual !== null && actual >= 0 && actual <= 100;
      const value = valid ? actual! : 0,
        picked = build?.included.includes(term.id);
      positions.set(term.id, structural && problem.kind !== 'double' ? shape : pos);
      entities.push({
        ...block(
          term.id,
          structural && problem.kind !== 'double' ? shape : pos,
          [0.62, 0.15, Math.max(0.045, value * unit)],
          term.id,
          picked ? 'highlight' : 'stats',
        ),
        opacity: practice ? (valid ? 1 : 0.3) : 0.15,
        text: {
          plain: `i=${term.i}${term.j === undefined ? '' : `,j=${term.j}`}: ${practice ? (valid ? raw : 'not built') : 'waiting'}${picked ? ', included ✓' : ''}`,
        },
        layers: {
          shape: { pos: shape, scale: [0.62, 0.04, Math.max(0.045, value * unit)] },
          symbol: { pos: [pos[0], 0.05, pos[2]], scale: [0.62, 0.04, 0.2] },
          code: { opacity: 0.015 },
        },
      });
      entities.push({
        ...label(
          term.id + '-label',
          practice
            ? `${term.i}${term.j === undefined ? '' : ',' + term.j}: ${valid ? raw : '?'} ${picked ? '✓' : '○'}`
            : `${term.i}${term.j === undefined ? '' : ',' + term.j}: ?`,
          [positions.get(term.id)![0], 0.38, positions.get(term.id)![2] + 0.08],
          term.id,
        ),
        layers: {
          shape: { pos: [shape[0], 0.25, shape[2] + 0.08] },
          symbol: { pos: [pos[0], 0.25, pos[2] + 0.08] },
          code: { opacity: 0 },
        },
      });
      const height = (term.value / totalScale) * 2;
      const stackBase = index ? (terms[index - 1].running / totalScale) * 2 : 0;
      const includedTotal = terms
        .slice(0, index)
        .reduce((sum, previous) => sum + contribution(previous.id), 0);
      const practiceHeight = (value / totalScale) * 2;
      const collectedPosition: Vec3 = [
        2.2,
        (practice
          ? (includedTotal / totalScale) * 2 + practiceHeight / 2
          : stackBase + height / 2) + 0.1,
        0.2,
      ];
      entities.push({
        ...block(
          'collected-' + index,
          practice ? collectedPosition : positions.get(term.id)!,
          [0.9, Math.max(0.025, practice ? practiceHeight : height), 0.6],
          term.id,
          index % 2 ? 'part' : 'result',
        ),
        opacity: practice && picked && valid ? 1 : 0,
        text: { plain: `Contribution ${index + 1} in the Hopper` },
        layers: { shape: { opacity: 0 }, symbol: { opacity: 0 }, code: { opacity: 0 } },
      });
      if (!practice) {
        steps[index + 2].ops.push(
          tween(term.id, {
            opacity: 1,
            text: {
              plain: `i=${term.i}${term.j === undefined ? '' : `,j=${term.j}`}, term=${term.value}`,
            },
          }),
          tween(term.id + '-label', {
            text: {
              plain: `${term.i}${term.j === undefined ? '' : ',' + term.j}: ${term.value} ✓`,
            },
          }),
          tween('collected-' + index, { opacity: 1, pos: collectedPosition }),
          tween('walker', {
            pos: [positions.get(term.id)![0], 0.3, positions.get(term.id)![2] + 0.7],
            text: { plain: `i=${term.i}${term.j === undefined ? '' : `,j=${term.j}`}` },
          }),
          tween('result', { text: { plain: `Total: ${term.running}` } }),
        );
      }
    });
    entities.push(
      {
        ...label(
          'walker',
          `i=${terms[cursor].i}${terms[cursor].j === undefined ? '' : `,j=${terms[cursor].j}`}`,
          [positions.get(terms[cursor].id)![0], 0.3, positions.get(terms[cursor].id)![2] + 0.7],
          'walker',
          'highlight',
        ),
        scale: [0.9, 0.9, 0.9],
      },
      {
        ...block('hopper', [2.2, 0.08, 0.2], [1.2, 0.1, 0.9], 'result', 'ink'),
        text: { plain: 'Hopper base collects term contributions' },
      },
      label('hopper-title', 'Hopper', [2.2, 0.15, 1.65], 'result'),
      label(
        'result',
        practice
          ? `Built total: ${terms.reduce((sum, term) => sum + contribution(term.id), 0)}`
          : 'Total: 0',
        [2.2, 0.12, -0.65],
        'result',
      ),
    );
    if (problem.kind === 'double') {
      const grid = entities.find((entity) => entity.id === 'grid')!;
      Object.assign(grid, block('grid', [-1.1, 0.04, 0.4], [4, 0.03, 2.4], 'grid', 'ink'), {
        opacity: 0.16,
        text: { plain: 'Every ordered index pair is one grid cell' },
      });
      // Structure follows column order; terms retain their stable cell ids.
      if (solution.method === 'structure' && !practice) {
        const columnOrder = [...terms].sort((a, b) => a.j! - b.j! || a.i - b.i);
        let prefix = 0;
        const columnStack = new Map<string, Vec3>();
        columnOrder.forEach((item) => {
          columnStack.set(item.id, [
            2.2,
            ((prefix + item.value / 2) / Math.max(1, solution.total)) * 2 + 0.1,
            0.2,
          ]);
          prefix += item.value;
        });
        let running = 0;
        const revealed = new Set<string>();
        columnOrder.forEach((term, index) => {
          running += term.value;
          revealed.add(term.id);
          const step = steps[index + 2],
            pos = positions.get(term.id)!;
          step.title = `Fill cell ${index + 1} by columns`;
          step.latexAfter = `${sumToken('walker', `i=${term.i}`)},${sumToken('grid', `j=${term.j}`)}\\quad ${sumToken('result', `S=${running}`)}`;
          step.say = {
            quick: `Cell (${term.i},${term.j}) adds ${term.value}.`,
            standard: `Column order has collected ${running}. Each ordered pair still occurs exactly once.`,
            deep: 'Changing finite summation order changes the route through the grid, not the set of cells or their total.',
          };
          step.aria = step.say.standard;
          step.ops = [
            ...terms.flatMap((item) => [
              tween(item.id, {
                opacity: revealed.has(item.id) ? 1 : 0.15,
                text: {
                  plain: revealed.has(item.id)
                    ? `i=${item.i},j=${item.j}, term=${item.value}`
                    : 'waiting',
                },
              }),
              tween(item.id + '-label', {
                text: { plain: `${item.i},${item.j}: ${revealed.has(item.id) ? item.value : '?'}` },
              }),
            ]),
            tween('walker', {
              pos: [pos[0], 0.3, pos[2] + 0.7],
              text: { plain: `i=${term.i},j=${term.j}` },
            }),
            tween('result', { text: { plain: `Total: ${running}` } }),
            ...terms.map((item, k) =>
              tween('collected-' + k, {
                opacity: revealed.has(item.id) ? 1 : 0,
                ...(revealed.has(item.id) ? { pos: columnStack.get(item.id)! } : {}),
              }),
            ),
          ];
        });
      }
    }
    if (!practice)
      steps
        .at(-1)!
        .ops.push(
          tween('result', { color: 'highlight', text: { plain: `Total: ${solution.total} ✓` } }),
        );
  } else {
    const mean = metrics.mean.n / metrics.mean.d;
    const pin = practice ? buildNumber(build.balance) : null;
    const pinValid = pin !== null && pin >= -20 && pin <= 20;
    const varianceMode = practice && kind === 'variance';
    const enteredValues = varianceMode
      ? []
      : terms
          .map((term) => buildNumber(build?.values[term.id]))
          .filter((value): value is number => value !== null && Math.abs(value) <= 20);
    const enteredAreas = varianceMode
      ? terms
          .map((term) => buildNumber(build?.values[term.id]))
          .filter((value): value is number => value !== null && value >= 0 && value <= 1600)
      : [];
    const span = Math.max(
      1,
      ...terms.map((term) => Math.abs(term.value - mean)),
      ...enteredValues.map((value) => Math.abs(value - mean)),
      ...(pinValid ? [Math.abs(pin! - mean)] : []),
    );
    const squareScale = Math.max(span, ...enteredAreas.map(Math.sqrt));
    const unit = 2.65 / span;
    const position = (value: number) => (value - mean) * unit;
    const meanEntity = entities.find((entity) => entity.id === 'mean')!;
    Object.assign(
      meanEntity,
      label(
        'mean',
        practice ? `Mean pin: ${pinValid ? build.balance : '?'}` : 'Mean: ?',
        [practice && pinValid ? position(pin!) : 0, 0.12, 1.6],
        'mean',
        'highlight',
      ),
      { opacity: structural ? 0 : 1 },
    );
    const varianceEntity = entities.find((entity) => entity.id === 'variance')!;
    Object.assign(
      varianceEntity,
      label(
        'variance',
        practice ? 'Your square areas' : 'Square areas wait',
        [0, 0.12, 2.6],
        'variance',
      ),
      { opacity: structural ? 1 : 0 },
    );
    entities.push(
      {
        ...block('beam', [0, 0.1, 0.8], [6.2, 0.06, 0.11], 'mean', 'paper'),
        opacity: structural ? 0 : 1,
        text: { plain: 'Equal-weight balance beam; coordinates use the data units' },
      },
      {
        ...block(
          'mean-pin',
          [pinValid ? position(pin!) : 0, 0.12, 0.7],
          [0.12, 0.2, 0.5],
          'mean',
          'highlight',
        ),
        opacity: practice && pinValid && !structural ? 1 : 0,
        text: { plain: 'Mean fulcrum' },
      },
      {
        ...label('walker', `Observation ${cursor + 1}`, [-2.4, 0.12, 2.5], 'walker', 'highlight'),
        opacity: structural ? 0 : 1,
      },
      label(
        'result',
        practice ? `Your claim: ${build.claim || '?'}` : 'Population variance: ?',
        [0, 0.1, -0.5],
        'result',
      ),
    );
    const radius = metrics.sd * unit;
    for (let segment = 0; segment < 24; segment++) {
      const angle = (segment * 2 * Math.PI) / 24;
      entities.push({
        ...block(
          `sd-ring-${segment}`,
          [radius * Math.cos(angle), 0.07, 0.8 + radius * Math.sin(angle)],
          [Math.max(0.015, (radius * 2 * Math.PI) / 24), 0.025, 0.025],
          'result',
          'highlight',
        ),
        rot: [0, -angle - Math.PI / 2, 0],
        opacity: 0,
        text: {
          plain: `Standard-deviation ring boundary; radius approximately ${metrics.sd.toFixed(3)} units`,
        },
        layers: { code: { opacity: 0 } },
      });
    }
    terms.forEach((term, index) => {
      const actual = practice ? buildNumber(build.values[term.id]) : term.value;
      const valid =
        actual !== null && (varianceMode ? actual >= 0 && actual <= 1600 : Math.abs(actual) <= 20);
      const value = valid ? actual! : 0;
      const duplicate = terms
        .slice(0, index)
        .filter((previous) => previous.value === term.value).length;
      const pos: Vec3 = [
        position(varianceMode ? term.value : value),
        0.25 + (index % 3) * 0.18,
        0.8 + duplicate * 0.18,
      ];
      const squareValue =
        practice && varianceMode
          ? value
          : metrics.deviationSquares[index].n / metrics.deviationSquares[index].d;
      const side = (Math.sqrt(squareValue) / squareScale) * 0.85;
      const squarePos: Vec3 = [-2.4 + (index % 5) * 1.2, 0.12, 1.5 - Math.floor(index / 5) * 1.2];
      const picked = build?.included.includes(term.id);
      entities.push({
        ...block(
          term.id,
          structural ? squarePos : pos,
          structural ? [Math.max(0.02, side), 0.05, Math.max(0.02, side)] : [0.25, 0.35, 0.25],
          term.id,
          picked ? 'highlight' : 'stats',
        ),
        opacity: practice ? (valid && picked ? 1 : 0.25) : structural ? 0 : 1,
        text: {
          plain: structural
            ? `Deviation-square area ${practice && varianceMode ? (valid ? build.values[term.id] : '?') : 'waits for prediction'}`
            : `Observation ${index + 1}: ${practice ? (valid ? build.values[term.id] : '?') : term.value}`,
        },
        layers: {
          shape: {
            scale: structural
              ? [Math.max(0.02, side), 0.03, Math.max(0.02, side)]
              : [0.25, 0.03, 0.25],
          },
          symbol: { scale: [0.25, 0.03, 0.25] },
          code: { opacity: 0.01 },
        },
      });
      entities.push({
        ...label(
          term.id + '-label',
          structural
            ? practice && varianceMode
              ? build.values[term.id] || '?'
              : '?'
            : `${practice ? (valid ? build.values[term.id] : '?') : term.value}`,
          [
            structural ? squarePos[0] : pos[0],
            0.6 + (structural ? 0 : (index % 3) * 0.2),
            structural ? squarePos[2] : pos[2],
          ],
          term.id,
        ),
        opacity: practice || !structural ? 1 : 0,
      });
      if (!practice) {
        steps[2].ops.push(
          tween('mean-pin', { opacity: structural ? 0 : 1, pos: [0, 0.12, 0.7] }),
          tween('mean', { text: { plain: `Mean: ${fractionText(metrics.mean)}` } }),
        );
        steps[3].ops.push(
          tween(term.id, {
            opacity: 1,
            text: {
              plain: `Observation ${term.value}; squared deviation ${fractionText(metrics.deviationSquares[index])}`,
            },
          }),
          tween(term.id + '-label', {
            opacity: 1,
            text: {
              plain: structural
                ? fractionText(metrics.deviationSquares[index])
                : String(term.value),
            },
          }),
          tween('variance', { text: { plain: 'Squares share one area scale' } }),
        );
      }
    });
    if (!practice) {
      steps[4].ops.push(
        tween('result', {
          text: { plain: `Population variance: ${fractionText(metrics.variance)}` },
        }),
      );
      steps[5].ops.push(
        ...Array.from({ length: 24 }, (_, segment) =>
          tween(`sd-ring-${segment}`, { opacity: metrics.sd ? 0.7 : 0 }),
        ),
        tween('result', { text: { plain: `σ ≈ ${metrics.sd.toFixed(3)} units` } }),
      );
    }
  }
  if (entities.length > 96) throw new RangeError('The Hopper exceeded its scene budget.');
  return {
    id: `summation:${problem.expression}`,
    entities,
    steps,
    code: build?.code ?? solution.code[options.language ?? 'python'],
    codeLanguage:
      (options.language ?? 'python') === 'r'
        ? 'R'
        : (options.language ?? 'python') === 'sql'
          ? 'SQL'
          : 'Python',
    codeBindings: {
      i: 'walker',
      j: 'grid',
      term: 'term-rule',
      total: 'result',
      values: 'term-rule',
      mean: 'mean',
      squares: 'variance',
      variance: 'variance',
      sd: 'result',
    },
  };
}
