import { useEffect, useMemo, useState } from 'react';
import { useLesson, type LessonContext } from '../core/scene/store';
import { useGame } from '../core/gamification/store';
import { emitMascot } from '../core/mascots/events';
import type { MascotScript } from '../core/mascots/dialogue/lines';
import { sound } from '../core/audio/sounds';
import { fractionText } from '../core/solvers/fractions';
import {
  parseMatrixInput,
  solveMatrix,
  matrixTex,
  exactMatrixNumber,
  matrixText,
  matrixDet,
} from '../core/solvers/matrices';
import { createMatrixDefinition } from '../labs/math/matrices/definition';
import {
  blankMatrixBuild,
  createMatrixChallenge,
  createMatrixBoss,
  matrixChallengeKinds,
  matrixOperationNames,
  buildDeterminant,
  enteredMatrix,
  type MatrixBuild,
  type MatrixChallengeKind,
} from '../labs/math/matrices/challenge';
import {
  readMatrixVariant,
  initialMatrixVariant,
  type MatrixVariant,
  type MatrixMode,
} from '../labs/math/matrices/context';
import { matrixScene } from '../labs/math/matrices/scene';
import { realEigenvectors } from '../labs/math/matrices/geometry';
import { Explainer } from './Explainer';
import { ProblemBar } from './ProblemBar';
import styles from './MatrixLab.module.css';
const definition = createMatrixDefinition([]);
const script: MascotScript = {
  intro: definition.mascotScript.intro,
  'hint-1': definition.mascotScript.hint1,
  'hint-2': definition.mascotScript.hint2,
  'hint-3': definition.mascotScript.hint3,
  correct: definition.mascotScript.correct,
  wrong: definition.mascotScript.wrong,
  'idle-nudge': definition.mascotScript.idle,
};
const examples = definition.examples.map((example) => example.input);
export default function MatrixLab() {
  const lesson = useLesson(),
    events = useGame((game) => game.events);
  const v = useMemo(
    () => readMatrixVariant(lesson.labId === 'matrices' ? lesson.variant : undefined),
    [lesson.labId, lesson.variant],
  );
  const [status, setStatus] = useState(''),
    [error, setError] = useState('');
  useEffect(() => {
    if (useLesson.getState().labId !== 'matrices')
      useLesson.getState().set({
        labId: 'matrices',
        problem: examples[0],
        variant: JSON.stringify(initialMatrixVariant()),
        step: 0,
        selection: null,
      });
  }, []);
  const input = lesson.labId === 'matrices' ? lesson.problem : examples[0],
    parsed = useMemo(() => parseMatrixInput(input), [input]);
  const fallback = useMemo(() => {
    const p = parseMatrixInput(examples[0]);
    if (!p.ok) throw new Error(p.reason);
    return p.problem;
  }, []);
  const challenge = useMemo(() => createMatrixChallenge(v.kind, v.seed), [v.kind, v.seed]),
    boss = useMemo(() => createMatrixBoss(v.seed), [v.seed]),
    active = v.mode === 'boss' ? boss : challenge;
  const problem = v.mode === 'watch' ? (parsed.ok ? parsed.problem : fallback) : active.problem;
  const solution = useMemo(() => solveMatrix(problem, v.method), [problem, v.method]),
    expected = v.mode === 'watch' ? solution.result : active.expected;
  const write = (patch: Partial<MatrixVariant>, context: Partial<LessonContext> = {}) => {
    useLesson.getState().set({
      labId: 'matrices',
      problem: input,
      variant: JSON.stringify({ ...v, ...patch }),
      ...context,
    });
    setStatus('');
  };
  const update = (patch: Partial<MatrixBuild>) => write({ build: { ...v.build, ...patch } });
  const changeMode = (mode: MatrixMode) =>
    write(
      { mode, cursor: 0, phase: 0, hint: 0, tryFirst: false, guess: '', build: blankMatrixBuild() },
      { step: 0, selection: null },
    );
  const toggle = (id: string) =>
    update({
      included: v.build.included.includes(id)
        ? v.build.included.filter((item) => item !== id)
        : [...v.build.included, id],
    });
  const next = () =>
    write(
      {
        seed: (Math.imul(v.seed, 1664525) + 1013904223) >>> 0,
        cursor: 0,
        phase: 0,
        hint: 0,
        build: blankMatrixBuild(),
      },
      { step: 0, selection: null },
    );
  const scene = useMemo(
    () =>
      matrixScene(problem, solution, {
        view: v.view,
        language: v.language,
        eigen: v.eigen,
        cursor: v.cursor,
        ...(v.mode === 'watch' ? {} : { build: v.build, expected }),
      }),
    [problem, solution, v.view, v.language, v.eigen, v.cursor, v.mode, v.build, expected],
  );
  const revealed =
    v.mode !== 'watch' || (lesson.step >= 2 && !!events[`checkpoint:${scene.id}:matrix-predict`]);
  const displayedMap = useMemo(
    () =>
      problem.kind === 'solve'
        ? problem.a
        : v.mode !== 'watch'
          ? enteredMatrix(v.build, expected)
          : problem.kind === 'determinant'
            ? problem.a
            : solution.result,
    [problem, v.mode, v.build, expected, solution],
  );
  const eigens = useMemo(() => realEigenvectors(displayedMap), [displayedMap]);
  const displayedDet = matrixDet(displayedMap);
  const check = () => {
    const correct =
      v.mode === 'boss' ? boss.phases[Math.min(v.phase, 2)].goal(v.build) : challenge.goal(v.build);
    if (!correct) {
      setStatus('Keep exploring. Check the actual cells, included coordinates and exact claim.');
      emitMascot('wrong');
      useGame.getState().queueChallengeEcho({
        skillId: 'matrices',
        key: active.id,
        labId: 'matrices',
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
        .award(v.mode === 'boss' ? 'boss' : 'prove', active.id, 'matrices', v.hint > 0);
      if (v.mode === 'boss') write({ phase: 3 });
      setStatus(
        v.mode === 'boss'
          ? 'Boss complete. All three connections are verified.'
          : 'Proof complete. Your actual matrix construction is verified.',
      );
    }
  };
  const first = solution.result[0][0];
  return (
    <div className={styles.lab} data-anchor-id="matrices-lab">
      <header className={styles.heading}>
        <span>Mathematics / Space machines</span>
        <h1>Move the axes. Move the world.</h1>
        <p>Build a matrix, follow its columns and watch the same map warp a square or cube.</p>
      </header>
      <ProblemBar
        value={input}
        examples={examples}
        onSolve={(raw) => {
          const p = parseMatrixInput(raw);
          if (!p.ok) {
            setError(p.reason);
            return false;
          }
          write(
            {
              mode: 'watch',
              expression: p.problem.expression,
              cursor: 0,
              phase: 0,
              hint: 0,
              tryFirst: false,
              guess: '',
              build: blankMatrixBuild(),
            },
            { problem: p.problem.expression, step: 0, selection: null },
          );
          setError('');
          return true;
        }}
        graphLink={false}
        historyKey="matrix-problems"
        placeholder="transform([1,1;0,1])"
        keypadKeys={['[', ']', ';', ',', '−', '(', ')', '0', '1', '2', '3', '4', '5', '6']}
        preview={(raw) => {
          const p = parseMatrixInput(raw);
          return p.ok ? `A = ${matrixTex(p.problem.a)}` : '\\text{Check the matrix syntax}';
        }}
        unsupportedMessage="Use one of the finite matrix operations below."
      />
      {error && <p role="status">{error}</p>}
      <details className={styles.scope}>
        <summary>Matrix notation and limits</summary>
        <p>
          Use 2×2 or 3×3 square matrices with integer entries −6…6. A semicolon starts a row; a
          comma starts a column. solve takes a matching column vector. inverse accepts nonsingular
          2×2 matrices. Answers accept exact fractions and terminating decimals.
        </p>
        <p>
          The determinant is signed area or volume scale. A negative sign reverses orientation; zero
          collapses space. Eigenvector directions are approximate and labelled with ≈. NumPy
          snippets use floating point; the steps keep exact arithmetic.
        </p>
      </details>
      <div className={styles.toolbar}>
        <div aria-label="Learning mode">
          {(['watch', 'play', 'prove', 'boss'] as const).map((mode) => (
            <button key={mode} aria-pressed={v.mode === mode} onClick={() => changeMode(mode)}>
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <label className={styles.selectLabel}>
          Code language
          <select
            aria-label="Matrix code language"
            value={v.language}
            onChange={(e) => write({ language: e.target.value as MatrixVariant['language'] })}
          >
            <option value="python">Python loops</option>
            <option value="numpy">NumPy</option>
          </select>
        </label>
      </div>
      <div className={styles.views} aria-label="Matrix visual">
        {(['auto', 'blocks', 'lattice'] as const).map((view) => (
          <button key={view} aria-pressed={v.view === view} onClick={() => write({ view })}>
            {view === 'auto' ? 'Follow dial' : view === 'blocks' ? 'Cell blocks' : 'Lattice'}
          </button>
        ))}
        <button
          aria-pressed={v.eigen && problem.kind !== 'solve'}
          disabled={problem.kind === 'solve'}
          onClick={() => write({ eigen: !v.eigen })}
        >
          Eigenvector directions
        </button>
      </div>
      {v.mode === 'watch' && (
        <div className={styles.method}>
          <p>
            Method:{' '}
            {v.method === 'cells'
              ? 'work across output rows.'
              : 'compose basis images, by output column.'}
          </p>
          <button
            aria-pressed={v.tryFirst}
            onClick={() => write({ tryFirst: !v.tryFirst, guess: '' })}
          >
            Try first
          </button>
        </div>
      )}
      {v.mode === 'watch' && v.tryFirst ? (
        <section className={styles.proof} aria-label="Try first">
          <h2>Your prediction comes first</h2>
          <p>
            {problem.kind === 'solve'
              ? 'Classify the system: unique, infinite or none.'
              : 'Predict the first result cell or the determinant.'}
          </p>
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
                if (
                  problem.kind === 'solve'
                    ? v.guess.trim() === solution.classification
                    : exactMatrixNumber(v.guess, first)
                ) {
                  useGame
                    .getState()
                    .award('predict', `try-first:${problem.expression}`, 'matrices');
                  write({ tryFirst: false });
                } else {
                  emitMascot('wrong');
                  setStatus(
                    'Keep exploring. Follow one row and one column, or open the worked steps.',
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
        <Explainer
          spec={scene}
          domain="math"
          echoSkillId="matrices"
          watchCredit={v.mode === 'watch'}
          mascotScript={script}
          caption={
            problem.kind === 'solve'
              ? 'Every equation shares the same coordinates.'
              : 'Each column is one basis image.'
          }
          onMethod={
            v.mode === 'watch'
              ? () => write({ method: v.method === 'cells' ? 'columns' : 'cells' })
              : undefined
          }
          onActivate={(id) => {
            const e = scene.entities.find((e) => e.id === id);
            const coordinate = id.replace(/^label-/, '');
            if (
              /^out-\d-\d$/.test(coordinate) &&
              v.mode !== 'watch' &&
              !(v.mode === 'boss' && v.phase !== 1)
            )
              toggle(coordinate);
            else useLesson.getState().set({ selection: e?.tether ?? id });
          }}
        />
      )}
      {!(v.mode === 'watch' && v.tryFirst) && (
        <section className={styles.proof} aria-label="Matrix construction controls">
          <div className={styles.proofHeading}>
            <h2>
              {v.mode === 'watch'
                ? 'Follow the coordinates'
                : v.mode === 'boss'
                  ? `Connection ${Math.min(3, v.phase + 1)} of 3`
                  : 'Build the output'}
            </h2>
            <span>{problem.a.length} dimensions</span>
          </div>
          {v.mode !== 'watch' && <p>{active.prompt}</p>}
          {v.mode === 'boss' && <p>{boss.phases[Math.min(2, v.phase)].prompt}</p>}
          {v.mode !== 'watch' && v.mode !== 'boss' && (
            <label className={styles.answer}>
              Challenge
              <select
                aria-label="Matrix challenge"
                value={v.kind}
                onChange={(e) =>
                  write(
                    {
                      kind: e.target.value as MatrixChallengeKind,
                      cursor: 0,
                      phase: 0,
                      hint: 0,
                      build: blankMatrixBuild(),
                    },
                    { step: 0, selection: null },
                  )
                }
              >
                {matrixChallengeKinds.map((kind) => (
                  <option value={kind} key={kind}>
                    {matrixOperationNames[kind]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {v.mode === 'watch' && (
            <p aria-live="polite">
              {revealed
                ? problem.kind === 'solve'
                  ? `Solutions: ${solution.classification}. ${solution.answer}`
                  : `det(A) = ${fractionText(solution.determinant)}; the displayed ${problem.kind === 'determinant' ? 'A' : 'C'} map has signed scale ${fractionText(displayedDet)}: ${displayedDet.n < 0 ? 'orientation reverses' : displayedDet.n === 0 ? 'space collapses' : 'orientation is preserved'}.`
                : 'The output waits for your prediction.'}
            </p>
          )}
          {v.eigen && problem.kind !== 'solve' && revealed && (
            <p>
              {eigens.length
                ? `Real eigenspaces (approximate): ${eigens.map((e) => `λ≈${e.value.toFixed(3)}, v≈(${e.direction.map((v) => v.toFixed(3)).join(',')})`).join('; ')}. Each direction stays on its own line after transformation.`
                : 'This map has no real eigenvector directions. A quarter-turn rotates every nonzero real vector away from its original line.'}
            </p>
          )}
          <div className={styles.terms}>
            {expected.flatMap((row, i) =>
              row.map((value, j) => {
                const id = `out-${i}-${j}`,
                  index = i * row.length + j,
                  shown =
                    lesson.step >= 2 &&
                    revealed &&
                    solution.steps
                      .slice(0, lesson.step + 1)
                      .some((step) => step.id === `matrix-cell-${i}-${j}`);
                return (
                  <article
                    key={id}
                    className={v.cursor === index ? styles.selectedTerm : ''}
                    data-anchor-id={`coordinate-${id}`}
                  >
                    <button
                      className={styles.inspect}
                      aria-label={`Inspect cell ${i + 1},${j + 1}`}
                      aria-pressed={v.cursor === index}
                      onClick={() => write({ cursor: index }, { selection: id })}
                    >
                      {v.mode !== 'watch' && problem.kind === 'determinant'
                        ? `e${j + 1}, coordinate ${i + 1}`
                        : `C[${i + 1},${j + 1}]`}
                    </button>
                    {v.mode === 'watch' ? (
                      <p>
                        {problem.kind === 'solve'
                          ? revealed
                            ? fractionText(value)
                            : '?'
                          : shown
                            ? fractionText(value)
                            : '?'}
                      </p>
                    ) : (
                      <>
                        <label>
                          Exact coordinate
                          <input
                            aria-label={`Cell ${i + 1},${j + 1}`}
                            maxLength={32}
                            value={v.build.cells[id] ?? ''}
                            disabled={v.mode === 'boss' && v.phase !== 1}
                            onChange={(e) =>
                              update({ cells: { ...v.build.cells, [id]: e.target.value } })
                            }
                          />
                        </label>
                        <label className={styles.include}>
                          <input
                            type="checkbox"
                            aria-label={`Include cell ${i + 1},${j + 1}`}
                            checked={v.build.included.includes(id)}
                            disabled={v.mode === 'boss' && v.phase !== 1}
                            onChange={() => toggle(id)}
                          />
                          Include ✓
                        </label>
                      </>
                    )}
                  </article>
                );
              }),
            )}
          </div>
          {v.mode !== 'watch' && (
            <>
              {(problem.kind === 'determinant' || v.mode === 'boss') && (
                <>
                  <label className={styles.answer}>
                    Signed scale claim
                    <input
                      aria-label="Determinant claim"
                      maxLength={32}
                      value={v.build.claim}
                      onChange={(e) => update({ claim: e.target.value })}
                    />
                  </label>
                  {(v.mode !== 'boss' || v.phase >= 1) && (
                    <p>
                      Your constructed basis has determinant{' '}
                      {fractionText(buildDeterminant(v.build, expected))}.
                    </p>
                  )}
                </>
              )}
              {problem.kind === 'solve' && (
                <label className={styles.answer}>
                  Solution set
                  <select
                    aria-label="System classification"
                    value={v.build.classification}
                    onChange={(e) => update({ classification: e.target.value })}
                  >
                    <option value="">Choose a classification</option>
                    <option value="unique">One solution</option>
                    <option value="infinite">Infinitely many solutions</option>
                    <option value="none">No solution</option>
                  </select>
                </label>
              )}
              {problem.kind === 'inverse' && (
                <p>
                  Your entered matrix is the reverse map. Compose it with A to return both basis
                  vectors.
                </p>
              )}
              {v.mode === 'boss' && v.phase >= 2 && (
                <fieldset className={styles.codeChoices}>
                  <legend>Connect the Python composition</legend>
                  {boss.codeOptions.map((code, i) => (
                    <label key={code}>
                      <input
                        type="radio"
                        name="matrix-code"
                        aria-label={`Loop option ${i + 1}`}
                        checked={v.build.code === code}
                        disabled={v.phase === 3}
                        onChange={() => update({ code })}
                      />
                      <code>{code}</code>
                    </label>
                  ))}
                </fieldset>
              )}
              <p className={styles.givens}>
                Including a coordinate changes the actual constructed matrix. Exact values and the
                complete construction must agree.
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
                <button onClick={next}>
                  {v.mode === 'boss' ? 'Restart Boss' : 'Next challenge'}
                </button>
              </div>
              {v.hint > 0 && <p className={styles.hint}>{active.hints[v.hint - 1]}</p>}
              {status && <p role="status">{status}</p>}
            </>
          )}
          {v.mode === 'watch' && problem.kind === 'multiply' && revealed && (
            <p>
              Every cell adds {problem.a.length} products. Result matrix:{' '}
              {lesson.step === solution.steps.length - 1
                ? matrixText(solution.result)
                : 'continue the row and column sweep'}
              .
            </p>
          )}
        </section>
      )}
      <section className={styles.bridges}>
        <h2>Bridges</h2>
        {definition.bridges.map((bridge) => (
          <details key={bridge.id}>
            <summary>{bridge.title}</summary>
            <p>{bridge.description}</p>
            {['fractions', 'summation', 'functions'].includes(bridge.labId) ? (
              <button
                onClick={() => {
                  useLesson
                    .getState()
                    .set({ labId: '', variant: undefined, step: 0, selection: null });
                  location.hash = bridge.labId;
                }}
              >
                Open{' '}
                {bridge.labId === 'summation'
                  ? 'the Hopper'
                  : bridge.labId === 'functions'
                    ? 'Functions and graphs'
                    : 'Fractions'}
              </button>
            ) : (
              <span className={styles.comingSoon}>Coming soon</span>
            )}
          </details>
        ))}
      </section>
    </div>
  );
}
