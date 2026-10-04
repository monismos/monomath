import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { GraphClient } from '../core/graphing/client';
import { GraphSvg } from '../core/graphing/GraphSvg';
import { graphPlotId } from '../core/graphing/coordinates';
import { evaluateAST } from '../core/graphing/evaluate';
import { defaultViewport } from '../core/graphing/types';
import type { GraphResponse, GraphSpec, ParsedGraph, Viewport } from '../core/graphing/types';
import { useGraphWorkspace } from '../core/graphing/workspaceStore';
import { useLesson } from '../core/scene/store';
import { useSettings } from '../core/storage/settings';
import { detectQuality } from '../core/perf/quality';
import { Mascot } from './Mascot';
import styles from './EquationWorkspace.module.css';

const MathText = lazy(() => import('./MathText'));
const GraphThree = lazy(() => import('./GraphThree'));
const examples = ['y=sin(x)', 'y=a*x^2+b*x+c', 'x^2+y^2=4', 'y=1/x', 'z=sin(x)*cos(y)', '2/3'];
const number = (value: number) => Number(value.toPrecision(6)).toString();
class GraphBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export default function EquationWorkspace() {
  const { current, set, open, unavailable } = useGraphWorkspace();
  const dimension = useSettings((state) => state.dimension);
  const [result, setResult] = useState<{ graph: GraphSpec; parsed: ParsedGraph }>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [detail, setDetail] = useState<'standard' | 'fine'>('standard');
  const [reset, setReset] = useState(0);
  const [lost, setLost] = useState(false);
  const [supports3D] = useState(() => detectQuality() !== '2d-only');
  const [showSlope, setShowSlope] = useState(false);
  const client = useRef<GraphClient>();
  const active = useRef(true);
  useEffect(() => {
    if (!supports3D && dimension === '3d') useSettings.getState().set({ dimension: '2d' });
  }, [supports3D, dimension]);
  const receive = useCallback((response: GraphResponse) => {
    if (!active.current) return;
    setBusy(false);
    if (response.ok) {
      setResult({ graph: response.graph, parsed: response.parsed });
      setError('');
      const workspace = useGraphWorkspace.getState();
      const parameters = Object.fromEntries(
        response.parsed.parameters.map((name) => [
          name,
          workspace.current.parameters[name] ?? response.graph.parameters[name],
        ]),
      );
      if (
        workspace.current.source === response.graph.source &&
        (Object.keys(workspace.current.parameters).length !== response.parsed.parameters.length ||
          response.parsed.parameters.some(
            (name) => workspace.current.parameters[name] !== parameters[name],
          ))
      )
        workspace.set({ parameters });
    } else setError(response.error);
  }, []);
  useEffect(() => {
    active.current = true;
    client.current = new GraphClient(receive);
    return () => {
      active.current = false;
      client.current?.dispose();
    };
  }, [receive]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusy(true);
      client.current?.request({
        source: current.source,
        interpretation: current.interpretation,
        parameters: current.parameters,
        viewport: current.viewport,
        detail,
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [current.source, current.interpretation, current.parameters, current.viewport, detail]);
  useEffect(() => {
    // Notes can restore a graph context before this lazy route mounts.
    const lesson = useLesson.getState();
    if (lesson.labId === 'equations' && lesson.problem !== current.source) open(lesson.problem);
    useLesson.getState().set({
      labId: 'equations',
      problem: useGraphWorkspace.getState().current.source,
      step: 0,
      variant: undefined,
    });
    return useLesson.subscribe((state, previous) => {
      if (
        state.labId === 'equations' &&
        state.problem !== previous.problem &&
        state.problem !== useGraphWorkspace.getState().current.source
      )
        open(state.problem);
    });
    // This only installs the route's external context listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    useLesson.getState().set({ labId: 'equations', problem: current.source, step: 0 });
  }, [current.source]);
  const inspect = useCallback(
    (x: number, y?: number) => {
      const view = useGraphWorkspace.getState().current.viewport;
      set({
        traceX: Math.max(view.xmin, Math.min(view.xmax, x)),
        ...(y !== undefined ? { sliceY: Math.max(view.ymin, Math.min(view.ymax, y)) } : {}),
      });
      const graph = result?.graph;
      if (graph) useLesson.getState().set({ selection: graphPlotId(graph) });
    },
    [set, result?.graph],
  );
  const onLost = useCallback(() => {
    setLost(true);
    useSettings.getState().set({ dimension: '2d' });
  }, []);
  const graph = result?.graph,
    parsed = result?.parsed;
  useEffect(() => {
    if (graph && parsed)
      useGraphWorkspace
        .getState()
        .setRendered({
          version: 1,
          source: graph.source,
          interpretation: parsed.requestedInterpretation,
          parameters: graph.parameters,
          viewport: graph.viewport,
          traceX: current.traceX,
          sliceY: current.sliceY,
        });
  }, [graph, parsed, current.traceX, current.sliceY]);
  useEffect(() => () => useGraphWorkspace.getState().setRendered(null), []);
  const stale = !!graph && graph.source !== current.source;
  const read = useMemo(() => {
    if (!graph || !parsed) return undefined;
    const scope = { ...graph.parameters, x: current.traceX, y: current.sliceY };
    const value = evaluateAST(parsed.originalAst, scope);
    if (!value.valid || graph.mode === 'relation' || graph.mode === 'constantRelation')
      return { value };
    const epsilon = Math.max(1e-6, (graph.viewport.xmax - graph.viewport.xmin) * 1e-5);
    const left = evaluateAST(parsed.ast, { ...scope, x: scope.x - epsilon });
    const right = evaluateAST(parsed.ast, { ...scope, x: scope.x + epsilon });
    const dLeft = left.valid ? (value.value! - left.value!) / epsilon : undefined;
    const dRight = right.valid ? (right.value! - value.value!) / epsilon : undefined;
    const corner =
      dLeft !== undefined &&
      dRight !== undefined &&
      Math.abs(dLeft - dRight) > Math.max(0.05, Math.abs(dLeft + dRight) * 0.01);
    return {
      value,
      slope:
        left.valid && right.valid && !corner
          ? (right.value! - left.value!) / (2 * epsilon)
          : undefined,
      corner,
    };
  }, [graph, parsed, current.traceX, current.sliceY]);
  const rows = useMemo(() => {
    if (!graph || !parsed) return [];
    return Array.from({ length: 9 }, (_, i) => {
      const x = graph.viewport.xmin + (i * (graph.viewport.xmax - graph.viewport.xmin)) / 8;
      return {
        x,
        result: evaluateAST(parsed.originalAst, { ...graph.parameters, x, y: current.sliceY }),
      };
    });
  }, [graph, parsed, current.sliceY]);
  const pan = (x: number, y: number) => {
    const v = current.viewport,
      dx = (x * (v.xmax - v.xmin)) / 5,
      dy = (y * (v.ymax - v.ymin)) / 5;
    set({
      viewport: {
        ...v,
        xmin: v.xmin + dx,
        xmax: v.xmax + dx,
        ymin: v.ymin + dy,
        ymax: v.ymax + dy,
      },
    });
  };
  const zoom = (factor: number) => {
    const v = current.viewport,
      x = (v.xmin + v.xmax) / 2,
      y = (v.ymin + v.ymax) / 2;
    const hx = ((v.xmax - v.xmin) * factor) / 2,
      hy = ((v.ymax - v.ymin) * factor) / 2;
    set({ viewport: { ...v, xmin: x - hx, xmax: x + hx, ymin: y - hy, ymax: y + hy } });
  };
  const bounds = (key: keyof Viewport, raw: string) => {
    if (raw.trim() && Number.isFinite(Number(raw)))
      set({ viewport: { ...current.viewport, [key]: Number(raw) } });
  };
  const choose = (source: string) => {
    open(source);
    setError('');
  };
  const svg =
    graph && parsed ? (
      <GraphSvg
        graph={graph}
        parsed={parsed}
        traceX={current.traceX}
        sliceY={current.sliceY}
        onInspect={inspect}
      />
    ) : undefined;
  const surface = graph?.mode === 'surface';
  const valueLabel = surface
    ? 'z'
    : graph?.mode === 'relation' || graph?.mode === 'constantRelation'
      ? 'left − right'
      : 'y';
  return (
    <section
      className={styles.workspace}
      data-anchor-id="equation-workspace"
      aria-labelledby="equation-title"
    >
      <header className={styles.heading}>
        <span>YOUR EQUATION BENCH</span>
        <h1 id="equation-title">Give an equation a shape.</h1>
        <p>
          Study a curve, a relation or a height surface. Change the window, move a parameter, then
          inspect what changes.
        </p>
      </header>
      <form
        className={styles.problem}
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          client.current?.request({
            source: current.source,
            interpretation: current.interpretation,
            parameters: current.parameters,
            viewport: current.viewport,
            detail,
          });
        }}
      >
        <label htmlFor="equation-source">Equation or expression</label>
        <div className={styles.inputRow}>
          <input
            id="equation-source"
            data-anchor-id="equation-input"
            value={current.source}
            maxLength={1024}
            spellCheck={false}
            autoComplete="off"
            onChange={(event) => set({ source: event.target.value })}
            aria-describedby="equation-help"
          />
          <button type="submit">Graph it</button>
        </div>
        <p id="equation-help">
          Use real arithmetic, powers and approved functions. Angles are in radians. A bare
          expression such as sin(x) means y=sin(x).
        </p>
        <div className={styles.examples} aria-label="Graph examples">
          {examples.map((source) => (
            <button key={source} type="button" onClick={() => choose(source)}>
              {source}
            </button>
          ))}
        </div>
        <div className={styles.options}>
          <label>
            Interpretation{' '}
            <select
              value={current.interpretation}
              onChange={(event) =>
                set({ interpretation: event.target.value as typeof current.interpretation })
              }
            >
              <option value="auto">Automatic</option>
              <option value="curve">Curve y=f(x)</option>
              <option value="relation">Relation F(x,y)=0</option>
              <option value="surface">Surface z=f(x,y)</option>
            </select>
          </label>
          <label>
            Detail{' '}
            <select
              value={detail}
              onChange={(event) => setDetail(event.target.value as typeof detail)}
            >
              <option value="standard">Standard</option>
              <option value="fine">Fine (bounded)</option>
            </select>
          </label>
        </div>
      </form>
      {unavailable && (
        <p className={styles.notice} role="status">
          This browser could not save your graph context. Your current session still works.
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
          {graph && <span> Your last valid graph is still below.</span>}
        </p>
      )}
      <div className={styles.resultHeader} aria-live="polite">
        <p>
          {busy
            ? 'Sampling your expression locally…'
            : (graph?.interpretation ?? 'The graph will appear here.')}
        </p>
        {graph && (
          <Suspense fallback={<code>{graph.source}</code>}>
            <MathText tex={graph.tex} />
          </Suspense>
        )}
        {stale && (
          <p>
            Shown graph: <code>{graph?.source}</code>
          </p>
        )}
      </div>
      {graph && parsed && (
        <>
          <div className={styles.toolbar}>
            <div className={styles.dimension} role="group" aria-label="Graph dimension">
              {(['2d', '3d'] as const).map((mode) => (
                <button
                  key={mode}
                  aria-pressed={dimension === mode}
                  disabled={mode === '3d' && !supports3D}
                  onClick={() => useSettings.getState().set({ dimension: mode })}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                set({ viewport: { ...defaultViewport }, traceX: 0, sliceY: 0 });
                setReset((n) => n + 1);
              }}
            >
              Reset view
            </button>
            <button onClick={() => zoom(0.8)} aria-label="Zoom in">
              ＋
            </button>
            <button onClick={() => zoom(1.25)} aria-label="Zoom out">
              −
            </button>
            <button onClick={() => pan(-1, 0)} aria-label="Pan view left">
              ←
            </button>
            <button onClick={() => pan(1, 0)} aria-label="Pan view right">
              →
            </button>
            <button onClick={() => pan(0, 1)} aria-label="Pan view up">
              ↑
            </button>
            <button onClick={() => pan(0, -1)} aria-label="Pan view down">
              ↓
            </button>
          </div>
          {lost && (
            <p className={styles.notice} role="status">
              The 3D view was interrupted. The same sampled graph is available in 2D.
            </p>
          )}
          {!supports3D && (
            <p className={styles.notice}>
              This browser uses the 2D graph view. A 3D view needs WebGL 2 support.
            </p>
          )}
          <div
            className={styles.stage}
            data-anchor-id="stage"
            data-stage-wrap="true"
            data-graph-source={graph.source}
            data-graph-mode={graph.mode}
          >
            <div className={styles.plot} aria-busy={busy}>
              {dimension === '3d' && supports3D && !lost ? (
                <GraphBoundary fallback={svg}>
                  <Suspense
                    fallback={<div className={styles.loading}>Preparing the 3D graph table…</div>}
                  >
                    <GraphThree
                      graph={graph}
                      parsed={parsed}
                      traceX={current.traceX}
                      sliceY={current.sliceY}
                      onInspect={inspect}
                      onLost={onLost}
                      reset={reset}
                    />
                  </Suspense>
                </GraphBoundary>
              ) : (
                svg
              )}
            </div>
            <Mascot domain="math" gaze={[graphPlotId(graph)]} />
          </div>
          <p className={styles.caption}>
            {surface
              ? '2D shows the sampled height heatmap; 3D shows the same mesh. The dashed line marks your y slice. Colours show height; numeric inspection gives the exact sampled expression value.'
              : 'Click a point in the plot or use the inspection controls. Gaps preserve excluded values and unresolved detail.'}
          </p>
          {!!parsed.parameters.length && (
            <fieldset className={styles.parameters}>
              <legend>Move a parameter</legend>
              {parsed.parameters.map((name) => (
                <label key={name}>
                  <span>{name}</span>
                  <input
                    aria-label={`Parameter ${name}`}
                    type="range"
                    min={Math.min(-5, graph.parameters[name])}
                    max={Math.max(5, graph.parameters[name])}
                    step=".1"
                    value={current.parameters[name] ?? graph.parameters[name]}
                    onChange={(event) =>
                      set({
                        parameters: { ...current.parameters, [name]: Number(event.target.value) },
                      })
                    }
                  />
                  <input
                    aria-label={`Numeric parameter ${name}`}
                    type="number"
                    min="-1000000"
                    max="1000000"
                    step=".1"
                    value={current.parameters[name] ?? graph.parameters[name]}
                    onChange={(event) => {
                      if (event.target.value.trim())
                        set({
                          parameters: { ...current.parameters, [name]: Number(event.target.value) },
                        });
                    }}
                  />
                </label>
              ))}
              <button
                onClick={() =>
                  set({
                    parameters: Object.fromEntries(parsed.parameters.map((name) => [name, 1])),
                  })
                }
              >
                Reset parameters
              </button>
            </fieldset>
          )}
          <div className={styles.study}>
            <section className={styles.inspection} data-anchor-id="graph-inspection">
              <h2>Inspect a point</h2>
              <label>
                x = {number(current.traceX)}
                <input
                  aria-label="Trace x coordinate"
                  type="range"
                  min={current.viewport.xmin}
                  max={current.viewport.xmax}
                  step={(current.viewport.xmax - current.viewport.xmin) / 500}
                  value={current.traceX}
                  onChange={(event) => inspect(Number(event.target.value))}
                />
              </label>
              <label className={styles.numeric}>
                Set x{' '}
                <input
                  aria-label="Numeric trace x coordinate"
                  type="number"
                  min={current.viewport.xmin}
                  max={current.viewport.xmax}
                  step="any"
                  value={current.traceX}
                  onChange={(event) => {
                    if (event.target.value.trim()) inspect(Number(event.target.value));
                  }}
                />
              </label>
              {(surface || graph.mode === 'relation') && (
                <label>
                  y {surface ? 'slice' : 'coordinate'} = {number(current.sliceY)}
                  <input
                    aria-label="Slice y coordinate"
                    type="range"
                    min={current.viewport.ymin}
                    max={current.viewport.ymax}
                    step={(current.viewport.ymax - current.viewport.ymin) / 500}
                    value={current.sliceY}
                    onChange={(event) => inspect(current.traceX, Number(event.target.value))}
                  />
                </label>
              )}
              <output className={styles.readout}>
                {valueLabel} = {read?.value.valid ? number(read.value.value!) : 'undefined'}
                {!read?.value.valid && <small>{read?.value.reason}</small>}
              </output>
              {graph.mode !== 'relation' && graph.mode !== 'constantRelation' && (
                <>
                  <label className={styles.checkbox}>
                    <input
                      type="checkbox"
                      checked={showSlope}
                      onChange={(event) => setShowSlope(event.target.checked)}
                    />
                    Approximate {surface ? 'x-slope on this slice' : 'slope'}
                  </label>
                  {showSlope && (
                    <p>
                      {read?.slope === undefined
                        ? read?.corner
                          ? 'The left and right slopes disagree here; a single slope is not shown.'
                          : 'A slope could not be estimated at this point.'
                        : `Finite-difference slope ≈ ${number(read.slope)}.`}{' '}
                      This numerical estimate does not prove differentiability.
                    </p>
                  )}
                </>
              )}
            </section>
            <section className={styles.pointTable}>
              <h2>{surface ? `Slice through y=${number(current.sliceY)}` : 'Point table'}</h2>
              <p>
                {graph.mode === 'relation'
                  ? 'Residuals on the selected y coordinate. A value near zero can suggest a solution; the table is sampled.'
                  : 'Values come from the original expression, so excluded points stay undefined.'}
              </p>
              <table>
                <thead>
                  <tr>
                    <th scope="col">x</th>
                    <th scope="col">{valueLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.x}>
                      <th scope="row">
                        <button
                          onClick={() => inspect(row.x)}
                          aria-label={`Inspect x ${number(row.x)}`}
                        >
                          {number(row.x)}
                        </button>
                      </th>
                      <td>{row.result.valid ? number(row.result.value!) : 'undefined'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
          <details className={styles.bounds}>
            <summary>Window bounds</summary>
            <div>
              {(
                [
                  'xmin',
                  'xmax',
                  'ymin',
                  'ymax',
                  ...(surface ? ['zmin', 'zmax'] : []),
                ] as (keyof Viewport)[]
              ).map((key) => (
                <label key={key}>
                  {key}
                  <input
                    type="number"
                    step="any"
                    value={current.viewport[key]}
                    onChange={(event) => bounds(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
            <p>Minimum must be smaller than maximum. Invalid bounds keep the last valid window.</p>
          </details>
          <div className={styles.diagnostics} aria-live="polite">
            {graph.outcome === 'value' && (
              <p>
                Constant value: {number(graph.value!)}. The horizontal line shows that value for
                every x.
              </p>
            )}
            {graph.outcome === 'none' && graph.mode === 'constantRelation' && (
              <p>No point satisfies this constant relation.</p>
            )}
            {graph.outcome === 'outsideDomain' && (
              <p>This expression has no real value in this view.</p>
            )}
            {graph.diagnostics.map((message) => (
              <p key={message}>{message}</p>
            ))}
            <p>
              Sampled locally: {graph.stats.evaluations.toLocaleString()} evaluations. Curves,
              contours and surfaces are finite numerical approximations.
            </p>
          </div>
        </>
      )}
      <details className={styles.grammar}>
        <summary>What can I enter?</summary>
        <p>
          Use +, −, *, /, ^, parentheses, x/y/z, pi/e and up to four named scalar parameters.
          Approved functions: sin, cos, tan, asin, acos, atan, sqrt, abs, exp, log, ln, log10,
          floor, ceil, min and max. log(x) and ln(x) use the natural logarithm; log(x,b) uses base
          b.
        </p>
        <p>
          Enter y=f(x) for a curve, an equality such as x²+y²=4 for a relation, or z=f(x,y) for a
          height surface. Custom functions, inequalities, integrals, matrices, complex values and
          general implicit 3D equations are not supported. This graph bench does not provide a
          symbolic proof for every equation.
        </p>
        <p>
          Sampling is bounded at 2,048 curve evaluations, 20,000 contour or surface evaluations,
          4,096 contour segments, and a 96×96 surface grid. Narrow details and isolated roots may be
          missed. 0^0 is left undefined.
        </p>
      </details>
    </section>
  );
}
