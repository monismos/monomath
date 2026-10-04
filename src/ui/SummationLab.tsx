import { useEffect, useMemo, useState } from 'react';
import { useLesson, type LessonContext } from '../core/scene/store';
import { useGame } from '../core/gamification/store';
import { emitMascot } from '../core/mascots/events';
import type { MascotScript } from '../core/mascots/dialogue/lines';
import { sound } from '../core/audio/sounds';
import { fractionText } from '../core/solvers/fractions';
import {
  numericMatches,
  parseSummationInput,
  solveSummation,
  summationExpressionTex,
} from '../core/solvers/summation';
import {
  blankSummationBuild,
  createSummationBoss,
  createSummationChallenge,
  summationChallengeKinds,
  type SummationBuildState,
  type SummationChallengeKind,
} from '../labs/stats/summation/challenge';
import { createSummationDefinition } from '../labs/stats/summation/definition';
import {
  initialSummationVariant,
  readSummationVariant,
  type SummationMode,
  type SummationVariant,
} from '../labs/stats/summation/context';
import { summationScene } from '../labs/stats/summation/scene';
import { Explainer } from './Explainer';
import { ProblemBar } from './ProblemBar';
import styles from './SummationLab.module.css';

const definition = createSummationDefinition([]);
const mascotScript: MascotScript = {
  intro: definition.mascotScript.intro,
  'hint-1': definition.mascotScript.hint1,
  'hint-2': definition.mascotScript.hint2,
  'hint-3': definition.mascotScript.hint3,
  correct: definition.mascotScript.correct,
  wrong: definition.mascotScript.wrong,
  'idle-nudge': definition.mascotScript.idle,
};
const examples = definition.examples.map((example) => example.input);
const names: Record<SummationChallengeKind, string> = {
  linear: 'Linear terms',
  squares: 'Square terms',
  pairing: 'Gauss pairing',
  double: 'Double-sum grid',
  mean: 'Mean balance',
  variance: 'Deviation squares',
};
export default function SummationLab() {
  const lesson = useLesson(),
    events = useGame((game) => game.events);
  const variant = useMemo(
    () => readSummationVariant(lesson.labId === 'summation' ? lesson.variant : undefined),
    [lesson.labId, lesson.variant],
  );
  const [status, setStatus] = useState(''),
    [inputError, setInputError] = useState('');
  useEffect(() => {
    if (useLesson.getState().labId !== 'summation')
      useLesson.getState().set({
        labId: 'summation',
        problem: examples[0],
        variant: JSON.stringify(initialSummationVariant()),
        step: 0,
        selection: null,
      });
  }, []);
  const input = lesson.labId === 'summation' ? lesson.problem : examples[0];
  const parsed = useMemo(() => parseSummationInput(input), [input]);
  const fallback = useMemo(() => {
    const value = parseSummationInput(examples[0]);
    if (!value.ok) throw new Error(value.reason);
    return value.problem;
  }, []);
  const challenge = useMemo(
    () => createSummationChallenge(variant.kind, variant.seed),
    [variant.kind, variant.seed],
  );
  const boss = useMemo(() => createSummationBoss(variant.seed), [variant.seed]);
  const active = variant.mode === 'boss' ? boss : challenge;
  const problem =
    variant.mode === 'watch' ? (parsed.ok ? parsed.problem : fallback) : active.problem;
  const solution = useMemo(
    () => solveSummation(problem, variant.method),
    [problem, variant.method],
  );
  const write = (patch: Partial<SummationVariant>, context: Partial<LessonContext> = {}) => {
    useLesson.getState().set({
      labId: 'summation',
      problem: input,
      variant: JSON.stringify({ ...variant, ...patch }),
      ...context,
    });
    setStatus('');
  };
  const updateBuild = (patch: Partial<SummationBuildState>) =>
    write({ build: { ...variant.build, ...patch } });
  const changeMode = (mode: SummationMode) =>
    write(
      {
        mode,
        cursor: 0,
        phase: 0,
        hint: 0,
        guess: '',
        tryFirst: false,
        build: blankSummationBuild(),
        view: 'auto',
      },
      { step: 0, selection: null },
    );
  const toggle = (id: string) =>
    updateBuild({
      included: variant.build.included.includes(id)
        ? variant.build.included.filter((term) => term !== id)
        : [...variant.build.included, id],
    });
  const next = () => {
    const seed = (Math.imul(variant.seed, 1664525) + 1013904223) >>> 0;
    write(
      { seed, cursor: 0, phase: 0, hint: 0, build: blankSummationBuild() },
      { step: 0, selection: null },
    );
  };
  const view =
    variant.view === 'auto'
      ? solution.metrics
        ? variant.mode === 'watch'
          ? lesson.step >= 3
            ? 'structure'
            : 'machine'
          : variant.kind === 'variance'
            ? 'structure'
            : 'machine'
        : variant.method === 'structure'
          ? 'structure'
          : 'machine'
      : variant.view;
  const scene = useMemo(
    () =>
      summationScene(problem, solution, {
        view,
        cursor: variant.cursor,
        language: variant.language,
        ...(variant.mode === 'watch' ? {} : { build: variant.build, kind: variant.kind }),
      }),
    [
      problem,
      solution,
      view,
      variant.cursor,
      variant.language,
      variant.mode,
      variant.build,
      variant.kind,
    ],
  );
  const predicted = !!events[`checkpoint:${scene.id}:sum-predict`],
    revealed = variant.mode !== 'watch' || (lesson.step >= 2 && predicted);
  const ordered =
    problem.kind === 'double' && variant.method === 'structure'
      ? [...solution.terms].sort((a, b) => a.j! - b.j! || a.i - b.i)
      : solution.terms;
  const processed = Math.max(0, Math.min(ordered.length, lesson.step - 1));
  const check = () => {
    const correct =
      variant.mode === 'boss'
        ? boss.phases[Math.min(variant.phase, 2)].goal(variant.build)
        : challenge.goal(variant.build);
    if (!correct) {
      setStatus(
        'Keep exploring. Check the actual values, included contributions and exact claim. A hint can help.',
      );
      emitMascot('wrong');
      useGame.getState().queueChallengeEcho({
        skillId: 'summation',
        key: active.id,
        labId: 'summation',
        seed: variant.seed,
        prompt: active.prompt,
      });
      return;
    }
    emitMascot('correct');
    sound('success');
    if (variant.mode === 'boss' && variant.phase < 2) {
      write({ phase: variant.phase + 1 });
      setStatus('That connection holds. Continue to the next part.');
    } else if (variant.mode === 'boss' && !boss.goal(variant.build))
      setStatus('The complete Boss checks every connection. Restart to revisit the construction.');
    else {
      useGame
        .getState()
        .award(
          variant.mode === 'boss' ? 'boss' : 'prove',
          active.id,
          'summation',
          variant.hint > 0,
        );
      if (variant.mode === 'boss') write({ phase: 3 });
      setStatus(
        variant.mode === 'boss'
          ? 'Boss complete. All three connections are verified.'
          : 'Proof complete. Your actual contributions and claim agree.',
      );
    }
  };
  return (
    <div className={styles.lab} data-anchor-id="summation-lab">
      <header className={styles.heading}>
        <span>Statistics / The Hopper</span>
        <h1>One term. Then another.</h1>
        <p>Walk the indices, build the contributions, and see an average find its balance.</p>
      </header>
      <ProblemBar
        value={input}
        examples={examples}
        onSolve={(raw) => {
          const result = parseSummationInput(raw);
          if (!result.ok) {
            setInputError(result.reason);
            return false;
          }
          write(
            {
              mode: 'watch',
              expression: result.problem.expression,
              cursor: 0,
              phase: 0,
              hint: 0,
              guess: '',
              tryFirst: false,
              view: 'auto',
              build: blankSummationBuild(),
            },
            { problem: raw, step: 0, selection: null },
          );
          setInputError('');
          return true;
        }}
        placeholder="sum(i=1..5, 2i+1)"
        graphLink={false}
        historyKey="summation-problems"
        keypadKeys={['sum(', 'i=', 'j=', '..', ',', 'i', 'j', '^2', '+', '−', '(', ')', 'data(']}
        preview={(raw) => summationExpressionTex(raw) ?? '\\text{Check the finite sum syntax}'}
        unsupportedMessage="Use the displayed finite-sum or dataset syntax."
      />
      {inputError && <p role="status">{inputError}</p>}
      <details className={styles.scope}>
        <summary>Notation, units and input limits</summary>
        <p>
          sum(i=a..b, term) includes both bounds. A second j range makes an ordered grid. Use
          integer quadratic terms, up to twelve single terms or a 4×4 grid, and bounds from 0 to 12.
          The Hopper holds nonnegative terms up to 100 and a total up to 600.
        </p>
        <p>
          data(4,8,6,5,3) uses 2–10 integer observations from −20 to 20. Each observation has equal
          weight. We calculate population variance with divisor n. Square areas use squared units;
          the standard-deviation ring uses the original units and labels its approximate radius.
        </p>
        <p>
          Curated SQL expects non-NULL integer columns: data.x, indices.i, or i_indices.i and
          j_indices.j. The code is a study example; it does not run here.
        </p>
      </details>
      <div className={styles.toolbar}>
        <div aria-label="Learning mode">
          {(['watch', 'play', 'prove', 'boss'] as const).map((mode) => (
            <button
              key={mode}
              aria-pressed={variant.mode === mode}
              onClick={() => changeMode(mode)}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <label className={styles.selectLabel}>
          Code language
          <select
            aria-label="Summation code language"
            value={variant.language}
            onChange={(event) =>
              write({ language: event.target.value as SummationVariant['language'] })
            }
          >
            <option value="python">Python</option>
            <option value="r">R</option>
            <option value="sql">SQL</option>
          </select>
        </label>
      </div>
      <div className={styles.views} aria-label="Summation visual">
        <button aria-pressed={variant.view === 'auto'} onClick={() => write({ view: 'auto' })}>
          Follow lesson
        </button>
        <button
          aria-pressed={variant.view === 'machine'}
          onClick={() => write({ view: 'machine' })}
        >
          {solution.metrics ? 'Balance beam' : 'Hopper'}
        </button>
        <button
          aria-pressed={variant.view === 'structure'}
          onClick={() => write({ view: 'structure' })}
        >
          {solution.metrics
            ? 'Deviation squares'
            : problem.kind === 'double'
              ? 'Grid'
              : 'Paired terms'}
        </button>
      </div>
      {variant.mode === 'watch' && (
        <div className={styles.method}>
          <p>
            {variant.method === 'structure'
              ? solution.metrics
                ? 'Method: moments identity E[X²]−μ².'
                : problem.kind === 'double'
                  ? 'Method: fill by columns.'
                  : 'Method: pairing and power-sum identities.'
              : solution.metrics
                ? 'Method: balance, then square each distance.'
                : 'Method: walk and accumulate every term.'}
          </p>
          <button
            aria-pressed={variant.tryFirst}
            onClick={() => write({ tryFirst: !variant.tryFirst, guess: '' })}
          >
            Try first
          </button>
        </div>
      )}
      {variant.mode === 'watch' && variant.tryFirst ? (
        <section className={styles.proof} aria-label="Try first">
          <h2>Your prediction comes first</h2>
          <p>
            {solution.metrics
              ? 'Place the mean before opening the worked steps.'
              : 'Claim the total before opening the worked steps.'}
          </p>
          <label className={styles.answer}>
            Your exact prediction
            <input
              aria-label="Try-first prediction"
              value={variant.guess}
              maxLength={32}
              onChange={(event) => write({ guess: event.target.value })}
            />
          </label>
          <div className={styles.actions}>
            <button
              disabled={!variant.guess.trim()}
              onClick={() => {
                if (numericMatches(variant.guess, solution.metrics?.mean ?? solution.result)) {
                  useGame
                    .getState()
                    .award('predict', `try-first:${problem.expression}`, 'summation');
                  write({ tryFirst: false });
                } else {
                  emitMascot('wrong');
                  setStatus('Check the count and every included value, or open the worked steps.');
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
          domain="stats"
          echoSkillId="summation"
          mascotScript={mascotScript}
          caption={
            solution.metrics
              ? view === 'structure'
                ? 'Each tile’s area is a squared distance.'
                : 'Equal weights balance at their mean.'
              : 'The upper bound makes one final contribution.'
          }
          onMethod={
            variant.mode === 'watch'
              ? () =>
                  write({
                    method: variant.method === 'accumulate' ? 'structure' : 'accumulate',
                    view: 'auto',
                  })
              : undefined
          }
          onActivate={(id) => {
            if (/^term-\d+$/.test(id)) {
              if (variant.mode !== 'watch') toggle(id);
              else write({ cursor: Number(id.slice(5)) }, { selection: id });
            } else
              useLesson.getState().set({
                selection: scene.entities.find((entity) => entity.id === id)?.tether ?? id,
              });
          }}
        />
      )}
      {!(variant.mode === 'watch' && variant.tryFirst) && (
        <section className={styles.proof} aria-label="Contribution controls">
          <div className={styles.proofHeading}>
            <h2>
              {variant.mode === 'watch'
                ? 'Follow the contributions'
                : variant.mode === 'boss'
                  ? `Connection ${Math.min(3, variant.phase + 1)} of 3`
                  : 'Build the contributions'}
            </h2>
            <span>{solution.terms.length} contributions</span>
          </div>
          {variant.mode !== 'watch' && <p>{active.prompt}</p>}
          {variant.mode === 'boss' && <p>{boss.phases[Math.min(2, variant.phase)].prompt}</p>}
          {variant.mode !== 'watch' && variant.mode !== 'boss' && (
            <label className={styles.answer}>
              Challenge
              <select
                aria-label="Summation challenge"
                value={variant.kind}
                onChange={(event) =>
                  write(
                    {
                      kind: event.target.value as SummationChallengeKind,
                      cursor: 0,
                      phase: 0,
                      hint: 0,
                      view: 'auto',
                      build: blankSummationBuild(),
                    },
                    { step: 0, selection: null },
                  )
                }
              >
                {summationChallengeKinds.map((kind) => (
                  <option value={kind} key={kind}>
                    {names[kind]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {variant.mode === 'watch' && (
            <p aria-live="polite">
              {solution.metrics
                ? revealed
                  ? `Mean = ${fractionText(solution.metrics.mean)}${lesson.step >= 4 ? `; population variance = ${fractionText(solution.metrics.variance)}` : ''}${lesson.step >= 5 ? `; σ ≈ ${solution.metrics.sd.toFixed(3)}` : ''}.`
                  : 'The mean and spread wait for your prediction.'
                : revealed
                  ? `${processed} terms collected; total = ${ordered.slice(0, processed).reduce((total, term) => total + term.value, 0)}.`
                  : 'The running total waits for your prediction.'}
            </p>
          )}
          <div className={styles.terms}>
            {solution.terms.map((term, index) => {
              const built = variant.mode !== 'watch',
                square = built && problem.kind === 'data' && variant.kind === 'variance';
              const shown = solution.metrics
                ? !square || lesson.step >= 3
                : revealed && ordered.slice(0, processed).some((item) => item.id === term.id);
              return (
                <article
                  key={term.id}
                  data-anchor-id={`contribution-${term.id}`}
                  className={variant.cursor === index ? styles.selectedTerm : ''}
                >
                  <button
                    className={styles.inspect}
                    aria-label={`Inspect term ${index + 1}`}
                    aria-pressed={variant.cursor === index}
                    onClick={() => write({ cursor: index }, { selection: term.id })}
                  >
                    {solution.metrics
                      ? `x${index + 1} = ${term.value}`
                      : `i=${term.i}${term.j === undefined ? '' : `, j=${term.j}`}`}
                  </button>
                  {built ? (
                    <>
                      <label>
                        {square
                          ? 'Square area'
                          : solution.metrics
                            ? 'Equal weight at'
                            : 'Term value'}
                        <input
                          aria-label={`${square ? 'Square area' : 'Term value'} ${index + 1}`}
                          maxLength={32}
                          value={variant.build.values[term.id] ?? ''}
                          disabled={variant.mode === 'boss' && variant.phase !== 1}
                          onChange={(event) =>
                            updateBuild({
                              values: { ...variant.build.values, [term.id]: event.target.value },
                            })
                          }
                        />
                      </label>
                      <label className={styles.include}>
                        <input
                          type="checkbox"
                          aria-label={`Include term ${index + 1}`}
                          checked={variant.build.included.includes(term.id)}
                          disabled={variant.mode === 'boss' && variant.phase !== 1}
                          onChange={() => toggle(term.id)}
                        />
                        Include ✓
                      </label>
                    </>
                  ) : (
                    <p>
                      {solution.metrics
                        ? view === 'structure'
                          ? revealed && lesson.step >= 3
                            ? `Square area: ${fractionText(solution.metrics.deviationSquares[index])}`
                            : 'Square area: ?'
                          : 'One equal weight'
                        : `Term: ${shown ? term.value : '?'}`}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
          {variant.mode !== 'watch' && (
            <>
              {solution.metrics && (
                <label className={styles.answer}>
                  Mean pin coordinate
                  <input
                    aria-label="Mean pin coordinate"
                    value={variant.build.balance}
                    maxLength={32}
                    onChange={(event) => updateBuild({ balance: event.target.value })}
                  />
                </label>
              )}
              {(variant.mode !== 'boss' || variant.phase === 0) && (
                <label className={styles.answer}>
                  {variant.mode !== 'boss' && variant.kind === 'mean'
                    ? 'Mean claim'
                    : variant.mode !== 'boss' && variant.kind === 'variance'
                      ? 'Population variance claim'
                      : 'Total claim'}
                  <input
                    aria-label="Exact claim"
                    value={variant.build.claim}
                    maxLength={32}
                    onChange={(event) => updateBuild({ claim: event.target.value })}
                  />
                </label>
              )}
              <p className={styles.givens}>
                Use an integer, exact fraction, or exact terminating decimal. Including a term
                changes its actual contribution; editing a claim does not build the model.
              </p>
              {variant.mode === 'boss' && variant.phase >= 2 && (
                <fieldset className={styles.codeChoices}>
                  <legend>Connect the Python loop</legend>
                  {boss.codeOptions.map((code, index) => (
                    <label key={code}>
                      <input
                        type="radio"
                        name="summation-code"
                        aria-label={`Loop option ${index + 1}`}
                        checked={variant.build.code === code}
                        disabled={variant.phase === 3}
                        onChange={() => updateBuild({ code })}
                      />
                      <code>{code}</code>
                    </label>
                  ))}
                </fieldset>
              )}
              <div className={styles.actions}>
                <button disabled={variant.mode === 'boss' && variant.phase === 3} onClick={check}>
                  {variant.mode === 'boss' ? 'Check connection' : 'Check proof'}
                </button>
                <button
                  disabled={variant.hint >= 3}
                  onClick={() => {
                    const hint = Math.min(3, variant.hint + 1);
                    write({ hint });
                    emitMascot(`hint-${hint}` as 'hint-1' | 'hint-2' | 'hint-3');
                  }}
                >
                  Hint {Math.min(3, variant.hint + 1)}
                </button>
                <button onClick={next}>
                  {variant.mode === 'boss' ? 'Restart Boss' : 'Next challenge'}
                </button>
              </div>
              {variant.hint > 0 && <p className={styles.hint}>{active.hints[variant.hint - 1]}</p>}
              {status && <p role="status">{status}</p>}
            </>
          )}
        </section>
      )}
      <section className={styles.bridges}>
        <h2>Bridges</h2>
        {definition.bridges.map((bridge) => (
          <details key={bridge.id}>
            <summary>{bridge.title}</summary>
            <p>{bridge.description}</p>
            {['fractions', 'logic'].includes(bridge.labId) ? (
              <button
                onClick={() => {
                  useLesson
                    .getState()
                    .set({ labId: '', step: 0, selection: null, variant: undefined });
                  location.hash = bridge.labId;
                }}
              >
                Open {bridge.labId === 'logic' ? 'Truth Lanterns' : 'Fractions'}
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
