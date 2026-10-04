import { useEffect, useMemo, useState } from 'react';
import { useLesson, type LessonContext } from '../core/scene/store';
import { useGame } from '../core/gamification/store';
import { emitMascot } from '../core/mascots/events';
import type { MascotScript } from '../core/mascots/dialogue/lines';
import { sound } from '../core/audio/sounds';
import {
  parseFunctionInput,
  solveFunction,
  functionMethods,
  modelText,
  valueAt,
  slopeAt,
  closeNumber,
  tidy,
  type FunctionProblem,
} from '../core/solvers/functions';
import { createFunctionDefinition } from '../labs/math/functions/definition';
import {
  createFunctionChallenge,
  createFunctionBoss,
  functionChallengeKinds,
  numeric,
  type FunctionBuild,
  type FunctionChallengeKind,
} from '../labs/math/functions/challenge';
import {
  readFunctionVariant,
  initialFunctionVariant,
  type FunctionVariant,
  type FunctionMode,
} from '../labs/math/functions/context';
import {
  functionScene,
  midpointSum,
  plottedProblem,
  lineCrossing,
} from '../labs/math/functions/scene';
import { Explainer } from './Explainer';
import { ProblemBar } from './ProblemBar';
import base from './MatrixLab.module.css';
import extra from './FunctionLab.module.css';
const styles = { ...base, ...extra };
const definition = createFunctionDefinition([]);
const examples = definition.examples.map((e) => e.input);
const script: MascotScript = {
  intro: definition.mascotScript.intro,
  'hint-1': definition.mascotScript.hint1,
  'hint-2': definition.mascotScript.hint2,
  'hint-3': definition.mascotScript.hint3,
  correct: definition.mascotScript.correct,
  wrong: definition.mascotScript.wrong,
  'idle-nudge': definition.mascotScript.idle,
};
const names: Record<FunctionChallengeKind, string> = {
  line: 'Line and two points',
  roots: 'Quadratic root markers',
  tangent: 'Curve and tangent',
  area: 'Signed midpoint rectangles',
  slice: 'Surface slice and height',
};
const parse = (raw: string) => {
  const p = parseFunctionInput(raw);
  if (!p.ok) throw new Error(p.reason);
  return p.problem;
};
export default function FunctionLab() {
  const lesson = useLesson();
  const v = useMemo(
    () => readFunctionVariant(lesson.labId === 'functions' ? lesson.variant : undefined),
    [lesson.labId, lesson.variant],
  );
  const [status, setStatus] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    if (useLesson.getState().labId !== 'functions')
      useLesson.getState().set({
        labId: 'functions',
        problem: examples[0],
        variant: JSON.stringify(initialFunctionVariant()),
        step: 0,
        selection: null,
      });
  }, []);
  const input = lesson.labId === 'functions' ? lesson.problem : examples[0];
  const parsed = useMemo(() => parseFunctionInput(input), [input]);
  const challenge = useMemo(() => createFunctionChallenge(v.kind, v.seed), [v.kind, v.seed]),
    boss = useMemo(() => createFunctionBoss(v.seed), [v.seed]);
  const active = v.mode === 'boss' ? boss : challenge,
    practice = v.mode !== 'watch';
  const problem = practice ? active.problem : parsed.ok ? parsed.problem : parse(examples[0]);
  const solution = useMemo(() => solveFunction(problem, v.method), [problem, v.method]);
  const trace = practice ? active.trace : v.trace,
    slice = practice ? active.slice : v.slice,
    n = practice ? active.n : v.n;
  const tangent = practice ? active.kind === 'tangent' || active.kind === 'line' : v.tangent;
  const rectangles = practice
    ? active.kind === 'area'
    : v.rectangles || problem.kind === 'integral';
  const scene = useMemo(
    () =>
      functionScene(problem, solution, {
        trace,
        slice,
        zoom: v.zoom,
        n,
        tangent,
        rectangles,
        ...(!practice && v.compare
          ? { compare: [v.compareSlope, v.compareIntercept] as [number, number] }
          : {}),
        ...(practice ? { build: v.build, kind: active.kind } : {}),
      }),
    [
      problem,
      solution,
      trace,
      slice,
      v.zoom,
      n,
      tangent,
      rectangles,
      practice,
      v.build,
      v.compare,
      v.compareSlope,
      v.compareIntercept,
      active.kind,
    ],
  );
  const actual = plottedProblem(problem, practice ? v.build : undefined);
  const linear =
    !practice &&
    problem.kind === 'curve' &&
    problem.model.type === 'polynomial' &&
    problem.model.coefficients.length === 2;
  const crossing =
    linear && v.compare && problem.model.type === 'polynomial'
      ? lineCrossing(problem.model.coefficients, [v.compareSlope, v.compareIntercept])
      : undefined;
  const revealed = useGame((game) => !!game.events[`checkpoint:${scene.id}:function-predict`]);
  const write = (patch: Partial<FunctionVariant>, context: Partial<LessonContext> = {}) => {
    useLesson.getState().set({
      labId: 'functions',
      problem: input,
      variant: JSON.stringify({ ...v, ...patch }),
      ...context,
    });
    setStatus('');
  };
  const update = (patch: Partial<FunctionBuild>) => write({ build: { ...v.build, ...patch } });
  const mode = (mode: FunctionMode) => {
    const c = mode === 'boss' ? boss : challenge;
    write(
      {
        mode,
        phase: 0,
        hint: 0,
        tryFirst: false,
        guess: '',
        build: {
          ...c.setup,
          coefficients: [...c.setup.coefficients],
          heights: [...c.setup.heights],
        },
      },
      { step: 0, selection: null },
    );
  };
  const apply = (raw: string) => {
    const r = parseFunctionInput(raw);
    if (!r.ok) {
      setError(r.reason);
      return false;
    }
    write(
      {
        expression: r.problem.expression,
        mode: 'watch',
        method: 'rule',
        tryFirst: false,
        guess: '',
        trace: 1,
        slice: 1,
      },
      { problem: r.problem.expression, step: 0, selection: null },
    );
    setError('');
    return true;
  };
  const adjust = (p: FunctionProblem) => {
    const raw = p.surface
      ? `z=${p.surface[0]}*x^2+${p.surface[1]}*y^2+${p.surface[2]}`
      : p.kind === 'roots'
        ? modelText(p.model) + '=0'
        : p.kind === 'derivative'
          ? `derivative(${modelText(p.model)})`
          : p.kind === 'integral'
            ? `integral(${modelText(p.model)},${p.lower},${p.upper})`
            : 'y=' + modelText(p.model);
    const r = parseFunctionInput(raw);
    if (!r.ok) {
      setError(r.reason);
      return;
    }
    write({ expression: r.problem.expression }, { problem: r.problem.expression });
    setError('');
  };
  const check = () => {
    const correct =
      v.mode === 'boss' ? boss.phases[Math.min(v.phase, 2)].goal(v.build) : challenge.goal(v.build);
    if (!correct) {
      setStatus('Keep exploring. Check the rule and the actual plotted construction.');
      emitMascot('wrong');
      useGame.getState().queueChallengeEcho({
        skillId: 'functions',
        key: active.id,
        labId: 'functions',
        seed: v.seed,
        prompt: active.prompt,
      });
      return;
    }
    emitMascot('correct');
    sound('success');
    if (v.mode === 'boss' && v.phase < 2) {
      write({ phase: v.phase + 1 });
      setStatus('That connection holds. Continue to the next part.');
    } else if (v.mode === 'boss' && !boss.goal(v.build))
      setStatus('Revisit the whole construction by restarting the Boss.');
    else {
      useGame
        .getState()
        .award(
          v.mode === 'boss' ? 'boss' : v.mode === 'play' ? 'play' : 'prove',
          active.id,
          'functions',
          v.hint > 0,
        );
      if (v.mode === 'boss') write({ phase: 3 });
      setStatus(
        v.mode === 'boss'
          ? 'Boss complete. All three connections are verified.'
          : 'Proof complete. Your actual plotted construction is verified.',
      );
    }
  };
  const selected = useLesson((state) => state.selection);
  return (
    <div className={styles.lab} data-anchor-id="functions-lab">
      <header className={styles.heading}>
        <span>Mathematics / Coordinate stories</span>
        <h1>A rule becomes a place.</h1>
        <p>Roll along a curve, move its tangent and watch small signed areas become an integral.</p>
      </header>
      <ProblemBar
        value={input}
        examples={examples}
        onSolve={apply}
        historyKey="function-problems"
        placeholder="y=2*x+1"
        keypadKeys={['x', 'y', '=', '+', '−', '*', '^', '(', ')', '0', '1', '2', '3', '4']}
        preview={(raw) => {
          const p = parseFunctionInput(raw);
          return p.ok ? solveFunction(p.problem).tex : '\\text{Check the function syntax}';
        }}
        unsupportedMessage="Try a bounded teaching problem, or open your equation in the graph workspace."
      />
      {error && <p role="status">{error}</p>}
      <details className={styles.scope}>
        <summary>Teaching notation and limits</summary>
        <p>
          Use degree≤3 polynomials with integer coefficients −12…12, quadratic =0,
          derivative(polynomial), integral(polynomial,lower,upper), a*sin(b*x)+c, a*exp(b*x)+c or
          z=a*x^2+b*y^2+c. Integral bounds stay within −4…4; sine and exponential frequency is 1…3
          and other coefficients −4…4. Coordinate displays and root decimals are approximate;
          polynomial integrals keep exact fractions.
        </p>
        <p>
          Use the equation workspace for broader real equations. Midpoint rectangles give a finite
          signed approximation. Values below the floor contribute negative area.
        </p>
      </details>
      <div className={styles.toolbar}>
        <div aria-label="Learning mode">
          {(['watch', 'play', 'prove', 'boss'] as const).map((m) => (
            <button key={m} aria-pressed={v.mode === m} onClick={() => mode(m)}>
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {!practice && (
        <div className={styles.method}>
          <p>Method: {functionMethods(problem).find((m) => m.id === solution.method)?.name}.</p>
          <button
            aria-pressed={v.tryFirst}
            onClick={() => write({ tryFirst: !v.tryFirst, guess: '' })}
          >
            Try first
          </button>
        </div>
      )}
      {!practice && v.tryFirst ? (
        <section className={styles.proof} aria-label="Try first">
          <h2>Your prediction comes first</h2>
          <p>{solution.steps[1].predict!.prompt}</p>
          <label className={styles.answer}>
            Your prediction
            <input
              aria-label="Try-first prediction"
              maxLength={32}
              value={v.guess}
              onChange={(e) => write({ guess: e.target.value })}
            />
          </label>
          <div className={styles.actions}>
            <button
              disabled={!v.guess.trim()}
              onClick={() => {
                if (closeNumber(v.guess, solution.prediction)) {
                  useGame
                    .getState()
                    .award('predict', `try-first:${problem.expression}`, 'functions');
                  write({ tryFirst: false });
                } else {
                  emitMascot('wrong');
                  setStatus(
                    'Keep exploring. Try substituting one input, or open the worked steps.',
                  );
                }
              }}
            >
              Check my prediction
            </button>
            <button onClick={() => write({ tryFirst: false })}>Show the worked steps</button>
          </div>
          {status && <p role="status">{status}</p>}
        </section>
      ) : (
        <>
          <Explainer
            spec={scene}
            echoSkillId="functions"
            watchCredit={v.mode === 'watch'}
            domain="math"
            mascotScript={script}
            caption={
              problem.surface
                ? 'One slice. The same surface.'
                : problem.kind === 'integral'
                  ? 'Height × width. Keep the sign.'
                  : 'Each input finds its output.'
            }
            onMethod={
              !practice
                ? () => {
                    const methods = functionMethods(problem),
                      i = methods.findIndex((m) => m.id === solution.method);
                    write({ method: methods[(i + 1) % methods.length].id });
                  }
                : undefined
            }
            onActivate={(id) => {
              const entity = scene.entities.find((e) => e.id === id);
              useLesson.getState().set({ selection: entity?.tether ?? id });
            }}
            onStagePoint={(point) => {
              if (!practice)
                write({
                  trace: Math.max(
                    -4,
                    Math.min(
                      4,
                      problem.surface
                        ? point[0] / v.zoom
                        : ((problem.kind === 'integral' ? Math.min(-1, problem.lower - 1) : -4) +
                            ((point[0] + 3) / 6) *
                              ((problem.kind === 'integral' ? Math.max(4, problem.upper + 1) : 4) -
                                (problem.kind === 'integral'
                                  ? Math.min(-1, problem.lower - 1)
                                  : -4))) /
                            v.zoom,
                    ),
                  ),
                });
            }}
            onStageZoom={
              !practice
                ? (factor) => write({ zoom: Math.max(0.5, Math.min(2, v.zoom * factor)) })
                : undefined
            }
          />
          <section className={styles.proof} aria-label="Function construction controls">
            <div className={styles.proofHeading}>
              <h2>
                {practice
                  ? v.mode === 'boss'
                    ? `Connection ${Math.min(3, v.phase + 1)} of 3`
                    : 'Build the coordinate rule'
                  : 'Follow the coordinates'}
              </h2>
              <span>{problem.surface ? 'Two inputs, one height' : 'One input, one output'}</span>
            </div>
            {practice && (
              <>
                <p>{active.prompt}</p>
                {v.mode === 'boss' ? (
                  <p>{boss.phases[Math.min(2, v.phase)].prompt}</p>
                ) : (
                  <label className={styles.answer}>
                    Challenge
                    <select
                      aria-label="Function challenge"
                      value={v.kind}
                      onChange={(e) => {
                        const kind = e.target.value as FunctionChallengeKind,
                          c = createFunctionChallenge(kind, v.seed);
                        write(
                          { kind, phase: 0, hint: 0, build: c.setup },
                          { step: 0, selection: null },
                        );
                      }}
                    >
                      {functionChallengeKinds.map((kind) => (
                        <option value={kind} key={kind}>
                          {names[kind]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
            <div className={styles.controls}>
              {!practice && (
                <>
                  <label>
                    Trace input x: {tidy(v.trace)}
                    <input
                      aria-label="Trace input"
                      type="range"
                      min="-4"
                      max="4"
                      step="0.05"
                      value={v.trace}
                      onChange={(e) =>
                        write({ trace: Number(e.target.value) }, { selection: 'point' })
                      }
                    />
                  </label>
                  <label>
                    Graph zoom: {tidy(v.zoom)}×
                    <input
                      aria-label="Graph zoom"
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.05"
                      value={v.zoom}
                      onChange={(e) => write({ zoom: Number(e.target.value) })}
                    />
                  </label>
                  {problem.surface ? (
                    <label>
                      Slice y: {tidy(v.slice)}
                      <input
                        aria-label="Surface slice"
                        type="range"
                        min="-3"
                        max="3"
                        step="0.1"
                        value={v.slice}
                        onChange={(e) =>
                          write({ slice: Number(e.target.value) }, { selection: 'slice' })
                        }
                      />
                    </label>
                  ) : (
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        aria-label="Show tangent"
                        checked={v.tangent}
                        onChange={(e) => write({ tangent: e.target.checked })}
                      />
                      Show tangent and rise/run
                    </label>
                  )}
                  {problem.model.type === 'polynomial' && !problem.surface
                    ? problem.model.coefficients.map((coefficient, i) => (
                        <label key={i}>
                          Coefficient of x^{i}
                          <input
                            aria-label={`Coefficient x^${i}`}
                            type="range"
                            min="-12"
                            max="12"
                            step="1"
                            value={coefficient}
                            onChange={(e) => {
                              if (problem.model.type === 'polynomial') {
                                const coefficients = [...problem.model.coefficients];
                                coefficients[i] = Number(e.target.value);
                                if (problem.kind === 'roots' && coefficients[2] === 0) return;
                                adjust({ ...problem, model: { type: 'polynomial', coefficients } });
                              }
                            }}
                          />
                          <output>{coefficient}</output>
                        </label>
                      ))
                    : problem.surface
                      ? problem.surface.map((coefficient, i) => (
                          <label key={i}>
                            {['x² coefficient', 'y² coefficient', 'offset'][i]}
                            <input
                              aria-label={`Surface coefficient ${i}`}
                              type="range"
                              min="-4"
                              max="4"
                              step="1"
                              value={coefficient}
                              onChange={(e) => {
                                const surface = [...problem.surface!] as [number, number, number];
                                surface[i] = Number(e.target.value);
                                adjust({ ...problem, surface });
                              }}
                            />
                            <output>{coefficient}</output>
                          </label>
                        ))
                      : problem.model.type !== 'polynomial'
                        ? (['amplitude', 'frequency', 'offset'] as const).map((key) => (
                            <label key={key}>
                              {key}
                              <input
                                aria-label={`Function ${key}`}
                                type="range"
                                min={key === 'frequency' ? 1 : -4}
                                max={key === 'frequency' ? 3 : 4}
                                step="1"
                                value={problem.model.type !== 'polynomial' ? problem.model[key] : 0}
                                onChange={(e) => {
                                  if (problem.model.type !== 'polynomial')
                                    adjust({
                                      ...problem,
                                      model: { ...problem.model, [key]: Number(e.target.value) },
                                    });
                                }}
                              />
                            </label>
                          ))
                        : null}
                </>
              )}
              {(rectangles || problem.kind === 'integral') && !practice && (
                <label>
                  Rectangle count n: {v.n}
                  <input
                    aria-label="Rectangle count"
                    type="range"
                    min="1"
                    max="16"
                    step="1"
                    value={v.n}
                    onChange={(e) => write({ n: Number(e.target.value) }, { selection: 'area' })}
                  />
                </label>
              )}
              {practice &&
                v.build.coefficients.map((value, i) => (
                  <label key={i}>
                    Construct coefficient x^{i}
                    <input
                      aria-label={`Construct coefficient x^${i}`}
                      type="number"
                      min="-12"
                      max="12"
                      step="1"
                      value={value}
                      disabled={v.mode === 'boss' && v.phase !== 1}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (!Number.isInteger(value) || Math.abs(value) > 12) return;
                        const coefficients = [...v.build.coefficients];
                        coefficients[i] = value;
                        update({ coefficients });
                      }}
                    />
                  </label>
                ))}
            </div>
            {linear && (
              <div className={styles.controls}>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    aria-label="Compare a second line"
                    checked={v.compare}
                    onChange={(e) => write({ compare: e.target.checked })}
                  />
                  Compare a second line
                </label>
                {v.compare && (
                  <>
                    {(['compareSlope', 'compareIntercept'] as const).map((key) => (
                      <label key={key}>
                        {key === 'compareSlope' ? 'Second slope' : 'Second intercept'}
                        <input
                          aria-label={key === 'compareSlope' ? 'Second slope' : 'Second intercept'}
                          type="number"
                          min="-12"
                          max="12"
                          step="1"
                          value={v[key]}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (Number.isInteger(value) && Math.abs(value) <= 12)
                              write({ [key]: value });
                          }}
                        />
                      </label>
                    ))}
                  </>
                )}
              </div>
            )}
            {crossing && (
              <p aria-live="polite">
                {crossing.kind === 'point'
                  ? `Line crossing ≈ (${tidy(crossing.x)}, ${tidy(crossing.y)}). Both rules give the same output here.`
                  : crossing.kind === 'parallel'
                    ? 'Parallel distinct lines have no crossing.'
                    : 'The two rules coincide: every point is shared.'}
              </p>
            )}
            {!practice && (
              <p className={styles.readout} aria-live="polite">
                {revealed ? (
                  <>
                    Trace ({tidy(trace)}
                    {problem.surface ? `, ${tidy(slice)}` : ''},{' '}
                    {tidy(valueAt(actual, trace, slice))}); {problem.surface ? 'height z' : 'slope'}{' '}
                    ≈{' '}
                    {tidy(problem.surface ? valueAt(actual, trace, slice) : slopeAt(actual, trace))}
                    . {selected ? `Selected connection: ${selected}.` : ''}
                  </>
                ) : (
                  'Move the trace, then commit a prediction to compare its coordinates and slope.'
                )}
              </p>
            )}
            {rectangles && (
              <p aria-live="polite">
                Midpoint sum at n={n}:{' '}
                {tidy(
                  practice
                    ? v.build.heights.reduce(
                        (sum, h) => sum + (numeric(h) * (problem.upper - problem.lower)) / n,
                        0,
                      )
                    : midpointSum(problem, n),
                )}
                .{' '}
                {solution.area && (practice || revealed)
                  ? `Exact signed integral: ${solution.answer}.`
                  : 'A finite rectangle sum approximates signed area.'}
              </p>
            )}
            {practice && (
              <div className={styles.terms}>
                {(['line', 'tangent', 'slice'].includes(active.kind)
                  ? active.kind === 'line'
                    ? [0, 1]
                    : [1]
                  : []
                ).map((i) => (
                  <article key={i} data-anchor-id={`function-point-${i}`}>
                    <label>
                      Output at x={i}
                      <input
                        aria-label={`Point output x=${i}`}
                        value={v.build.points[i]}
                        maxLength={32}
                        disabled={v.mode === 'boss' && v.phase !== 1}
                        onChange={(e) => {
                          const points = [...v.build.points] as [string, string];
                          points[i] = e.target.value;
                          update({ points });
                        }}
                      />
                    </label>
                    <label className={styles.include}>
                      <input
                        type="checkbox"
                        aria-label={`Include point x=${i}`}
                        checked={v.build.included.includes(`p${i}`)}
                        disabled={v.mode === 'boss' && v.phase !== 1}
                        onChange={() =>
                          update({
                            included: v.build.included.includes(`p${i}`)
                              ? v.build.included.filter((id) => id !== `p${i}`)
                              : [...v.build.included, `p${i}`],
                          })
                        }
                      />
                      Place point ✓
                    </label>
                  </article>
                ))}
                {active.kind === 'area' &&
                  v.build.heights.map((height, i) => (
                    <article key={i}>
                      <label>
                        Rectangle {i + 1} midpoint height
                        <input
                          aria-label={`Rectangle height ${i + 1}`}
                          value={height}
                          maxLength={32}
                          onChange={(e) => {
                            const heights = [...v.build.heights];
                            heights[i] = e.target.value;
                            update({ heights });
                          }}
                        />
                      </label>
                      <p>
                        x={tidy(problem.lower + ((i + 0.5) * (problem.upper - problem.lower)) / n)},
                        width={tidy((problem.upper - problem.lower) / n)}
                      </p>
                    </article>
                  ))}
              </div>
            )}
            {practice && active.kind === 'roots' && (
              <div className={styles.controls}>
                {[0, 1].map((i) => (
                  <label key={i}>
                    Root marker {i + 1}
                    <input
                      aria-label={`Root marker ${i + 1}`}
                      type="number"
                      min="-12"
                      max="12"
                      step="0.1"
                      value={v.build.markers[i] ?? ''}
                      onChange={(e) => {
                        const markers = [...v.build.markers];
                        if (!e.target.value) {
                          markers.splice(i, 1);
                        } else {
                          const x = Number(e.target.value);
                          if (!Number.isFinite(x) || Math.abs(x) > 12) return;
                          if (i === 1 && markers.length === 0) markers.push(0);
                          markers[i] = x;
                        }
                        update({ markers });
                      }}
                    />
                  </label>
                ))}
              </div>
            )}
            {practice && active.kind === 'tangent' && (
              <label className={styles.answer}>
                Actual tangent slope
                <input
                  aria-label="Construct tangent slope"
                  value={v.build.tangent}
                  maxLength={32}
                  onChange={(e) => update({ tangent: e.target.value })}
                />
              </label>
            )}
            {practice &&
              (active.kind === 'area' || active.kind === 'slice' || v.mode === 'boss') && (
                <label className={styles.answer}>
                  {active.kind === 'area'
                    ? 'Finite signed sum claim'
                    : active.kind === 'slice'
                      ? 'Slice y claim'
                      : 'Slope claim'}
                  <input
                    aria-label="Function claim"
                    value={v.build.claim}
                    maxLength={32}
                    disabled={v.mode === 'boss' && v.phase > 0}
                    onChange={(e) => update({ claim: e.target.value })}
                  />
                </label>
              )}
            {v.mode === 'boss' && v.phase >= 2 && (
              <fieldset className={styles.codeChoices}>
                <legend>Connect the Python rule</legend>
                {boss.codeOptions.map((code, i) => (
                  <label key={code}>
                    <input
                      type="radio"
                      name="function-code"
                      aria-label={`Rule option ${i + 1}`}
                      checked={v.build.code === code}
                      disabled={v.phase === 3}
                      onChange={() => update({ code })}
                    />
                    <code>{code}</code>
                  </label>
                ))}
              </fieldset>
            )}
            {practice && (
              <>
                <p className={styles.givens}>
                  Your entries change the actual curve, points, tangent or rectangles. The complete
                  construction must agree.
                </p>
                <div className={styles.actions}>
                  <button disabled={v.mode === 'boss' && v.phase === 3} onClick={check}>
                    {v.mode === 'boss' ? 'Check connection' : 'Check proof'}
                  </button>
                  <button
                    disabled={v.hint >= 3}
                    onClick={() => {
                      const hint = Math.min(3, v.hint + 1);
                      write({ hint });
                      emitMascot(`hint-${hint}` as 'hint-1' | 'hint-2' | 'hint-3');
                    }}
                  >
                    Hint {Math.min(3, v.hint + 1)}
                  </button>
                  <button
                    onClick={() => {
                      const seed = (Math.imul(v.seed, 1664525) + 1013904223) >>> 0,
                        c =
                          v.mode === 'boss'
                            ? createFunctionBoss(seed)
                            : createFunctionChallenge(v.kind, seed);
                      write(
                        { seed, phase: 0, hint: 0, build: c.setup },
                        { step: 0, selection: null },
                      );
                    }}
                  >
                    {v.mode === 'boss' ? 'Restart Boss' : 'Next challenge'}
                  </button>
                </div>
                {v.hint > 0 && <p className={styles.hint}>{active.hints[v.hint - 1]}</p>}
                {status && <p role="status">{status}</p>}
              </>
            )}
          </section>
        </>
      )}
      <section className={styles.bridges}>
        <h2>Bridges</h2>
        {definition.bridges.map((bridge) => (
          <details key={bridge.id}>
            <summary>{bridge.title}</summary>
            <p>{bridge.description}</p>
            {bridge.labId === 'kinematics' ? (
              <span className={styles.comingSoon}>Coming soon</span>
            ) : (
              <button
                onClick={() => {
                  useLesson
                    .getState()
                    .set({ labId: '', variant: undefined, step: 0, selection: null });
                  location.hash = bridge.labId;
                }}
              >
                Open {bridge.labId === 'equations' ? 'equation workspace' : bridge.labId}
              </button>
            )}
          </details>
        ))}
      </section>
    </div>
  );
}
