import { useEffect, useMemo, useState } from 'react';
import { useLesson } from '../core/scene/store';
import type { LessonContext } from '../core/scene/store';
import { useGame } from '../core/gamification/store';
import { emitMascot } from '../core/mascots/events';
import type { MascotScript } from '../core/mascots/dialogue/lines';
import { sound } from '../core/audio/sounds';
import {
  logicExpressionTex,
  parseLogicInput,
  solveLogic,
  worldDescription,
  type LogicAnswer,
} from '../core/solvers/logic';
import {
  createLogicBoss,
  createLogicChallenge,
  logicChallengeKinds,
  type LogicBuildState,
  type LogicChallengeKind,
} from '../labs/logic/challenge';
import { createLogicDefinition } from '../labs/logic/definition';
import {
  initialLogicVariant,
  readLogicVariant,
  type LogicMode,
  type LogicVariant,
} from '../labs/logic/context';
import { logicBuildScene, logicScene } from '../labs/logic/scene';
import { ProblemBar } from './ProblemBar';
import { Explainer } from './Explainer';
import styles from './LogicLab.module.css';

const definition = createLogicDefinition([]);
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
export default function LogicLab() {
  const lesson = useLesson();
  const variant = useMemo(
    () => readLogicVariant(lesson.labId === 'logic' ? lesson.variant : undefined),
    [lesson.labId, lesson.variant],
  );
  const [status, setStatus] = useState('');
  const [inputError, setInputError] = useState('');
  const checkpointEvents = useGame((game) => game.events);
  useEffect(() => {
    if (useLesson.getState().labId !== 'logic')
      useLesson.getState().set({
        labId: 'logic',
        problem: examples[0],
        variant: JSON.stringify(initialLogicVariant()),
        step: 0,
        selection: null,
      });
  }, []);
  const input = lesson.labId === 'logic' ? lesson.problem : examples[0];
  const parsed = useMemo(() => parseLogicInput(input), [input]);
  const fallback = useMemo(() => {
    const result = parseLogicInput(examples[0]);
    if (!result.ok) throw new Error(result.reason);
    return result.problem;
  }, []);
  const challenge = useMemo(
    () => createLogicChallenge(variant.kind, variant.seed),
    [variant.kind, variant.seed],
  );
  const boss = useMemo(() => createLogicBoss(variant.seed), [variant.seed]);
  const active = variant.mode === 'boss' ? boss : challenge;
  const problem =
    variant.mode === 'watch' ? (parsed.ok ? parsed.problem : fallback) : active.problem;
  const solution = useMemo(() => solveLogic(problem, variant.method), [problem, variant.method]);
  const row = solution.rows.find((candidate) => candidate.id === variant.world) ?? solution.rows[0];
  const options: LogicAnswer[] = problem.argument
    ? ['valid', 'invalid']
    : ['tautology', 'contradiction', 'contingent'];
  const write = (patch: Partial<LogicVariant>, context: Partial<LessonContext> = {}) => {
    useLesson.getState().set({
      labId: 'logic',
      problem: input,
      variant: JSON.stringify({ ...variant, ...patch }),
      ...context,
    });
    setStatus('');
  };
  const updateBuild = (patch: Partial<LogicBuildState>) =>
    write({ build: { ...variant.build, ...patch } });
  const chooseWorld = (id: string) => {
    if (!solution.rows.some((candidate) => candidate.id === id)) return;
    if (variant.mode === 'watch') write({ world: id }, { selection: 'result' });
    else
      write(
        {
          world: id,
          build: {
            ...variant.build,
            selectedWorlds: variant.build.selectedWorlds.includes(id)
              ? variant.build.selectedWorlds.filter((world) => world !== id)
              : [...variant.build.selectedWorlds, id],
          },
        },
        { selection: 'result' },
      );
  };
  const changeMode = (mode: LogicMode) =>
    write(
      {
        mode,
        phase: 0,
        hint: 0,
        world: 'world-0',
        tryFirst: false,
        guess: undefined,
        build: mode === 'boss' ? boss.setup : challenge.setup,
      },
      { step: 0, selection: null },
    );
  const next = () => {
    const seed = (Math.imul(variant.seed, 1664525) + 1013904223) >>> 0;
    const nextChallenge = createLogicChallenge(variant.kind, seed);
    write(
      {
        seed,
        phase: 0,
        hint: 0,
        world: 'world-0',
        build: variant.mode === 'boss' ? createLogicBoss(seed).setup : nextChallenge.setup,
      },
      { step: 0, selection: null },
    );
  };
  const check = () => {
    const correct =
      variant.mode === 'boss'
        ? variant.phase < 3
          ? boss.phases[variant.phase].goal(variant.build)
          : boss.goal(variant.build)
        : challenge.goal(variant.build);
    if (!correct) {
      emitMascot('wrong');
      setStatus(
        'Keep exploring. Check the exact marked rows and the complete formula; a hint can help.',
      );
      useGame.getState().queueChallengeEcho({
        skillId: 'logic',
        key: active.id,
        labId: 'logic',
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
      setStatus(
        'All three connections must still hold. Restart the Boss to revisit your construction.',
      );
    else {
      useGame
        .getState()
        .award(variant.mode === 'boss' ? 'boss' : 'prove', active.id, 'logic', variant.hint > 0);
      if (variant.mode === 'boss') write({ phase: 3 });
      setStatus(
        variant.mode === 'boss'
          ? 'Boss complete. All three connections are verified.'
          : 'Proof complete. The actual marked worlds match your claim.',
      );
    }
  };
  const scene = useMemo(
    () =>
      variant.mode === 'watch'
        ? logicScene(problem, solution, variant.world, variant.method)
        : logicBuildScene(problem, solution, variant.build, variant.world, variant.method),
    [variant.mode, variant.method, variant.world, variant.build, problem, solution],
  );
  const predicted = !!checkpointEvents[`checkpoint:${scene.id}:logic-predict`];
  const revealed = variant.mode !== 'watch' || (lesson.step >= 2 && predicted);
  const goal =
    variant.mode === 'boss' ? boss.phases[Math.min(variant.phase, 2)].prompt : challenge.prompt;
  return (
    <div className={styles.lab} data-anchor-id="logic-lab">
      <header className={styles.heading}>
        <span>Logic · Truth Lanterns</span>
        <h1>Make every world visible.</h1>
        <p>Flip a switch. Follow its gates. Find the world that proves or breaks a claim.</p>
      </header>
      <ProblemBar
        value={input}
        examples={examples}
        placeholder="(p → q) ∧ ¬q"
        graphLink={false}
        historyKey="logic-problems"
        keypadKeys={['p', 'q', 'r', '¬', '∧', '∨', '→', '↔', '(', ')', '⊤', '⊥', ';', '⊢']}
        unsupportedMessage="Use the connectives shown on the keypad, or write premises separated by ; followed by ⊢ and a conclusion."
        preview={(raw) => logicExpressionTex(raw) ?? '\\text{Check the formula syntax}'}
        onSolve={(raw) => {
          const result = parseLogicInput(raw);
          if (!result.ok) {
            setInputError(result.reason);
            return false;
          }
          write(
            {
              mode: 'watch',
              expression: result.problem.expression,
              world: 'world-0',
              phase: 0,
              hint: 0,
              tryFirst: false,
              guess: undefined,
            },
            { problem: raw, step: 0, selection: null },
          );
          setInputError('');
          return true;
        }}
      />
      {inputError && <p role="status">{inputError}</p>}
      <details className={styles.scope}>
        <summary>Symbols and input limits</summary>
        <p>
          A proposition is a statement with one truth value. ¬ means NOT, ∧ means AND, ∨ means OR, →
          means “if…then”, and ↔ or ≡ means both sides agree. ⊢ separates an argument’s premises
          from its conclusion.
        </p>
        <p>
          Use p–z for variables and T/F or ⊤/⊥ for constants. Up to four variables and sixteen
          formula nodes keep every world and wire readable. ASCII aliases !, &amp;, |, -&gt;,
          &lt;-&gt; and |- also work. Uppercase T is a constant; lowercase t is a variable.
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
        <div aria-label="Logic visual">
          <button
            aria-pressed={variant.method === 'truth-table'}
            onClick={() => write({ method: 'truth-table' })}
          >
            Truth lanterns
          </button>
          <button
            aria-pressed={variant.method === 'gate-circuit'}
            onClick={() => write({ method: 'gate-circuit' })}
          >
            Gate circuit
          </button>
        </div>
      </div>
      {variant.mode === 'watch' && (
        <div className={styles.method}>
          <p>
            {revealed
              ? 'The table is open. Tap a row to light its circuit.'
              : 'Result is waiting for your prediction.'}
          </p>
          <button
            aria-pressed={variant.tryFirst}
            onClick={() => write({ tryFirst: !variant.tryFirst, guess: undefined })}
          >
            Try first
          </button>
        </div>
      )}
      {variant.mode === 'watch' && variant.tryFirst ? (
        <section className={styles.proof} aria-label="Try first">
          <h2>Your claim comes first</h2>
          <p>Classify {problem.expression} before opening the worked steps.</p>
          <label className={styles.answer}>
            Your claim{' '}
            <select
              aria-label="Try-first claim"
              value={variant.guess ?? ''}
              onChange={(event) => write({ guess: event.target.value as LogicAnswer })}
            >
              <option value="">Choose one</option>
              {options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className={styles.actions}>
            <button
              disabled={!variant.guess}
              onClick={() => {
                if (variant.guess === solution.answer) {
                  useGame.getState().award('predict', `try-first:${problem.expression}`, 'logic');
                  write({ tryFirst: false });
                } else {
                  emitMascot('wrong');
                  setStatus('Check one world at a time, or open the worked steps for help.');
                }
              }}
            >
              Check my claim
            </button>
            <button onClick={() => write({ tryFirst: false })}>Show the worked steps</button>
          </div>
          {status && <p role="status">{status}</p>}
        </section>
      ) : (
        <Explainer
          spec={scene}
          echoSkillId="logic"
          watchCredit={variant.mode === 'watch'}
          domain="logic"
          mascotScript={mascotScript}
          caption={variant.mode === 'watch' ? 'The same worlds become a truth set on Shape.' : goal}
          onActivate={(id) => {
            if (/^world-\d+$/.test(id)) chooseWorld(id);
            else
              useLesson.getState().set({
                selection: scene.entities.find((entity) => entity.id === id)?.tether ?? id,
              });
          }}
          onMethod={
            variant.mode === 'watch'
              ? () =>
                  write({
                    method: variant.method === 'truth-table' ? 'gate-circuit' : 'truth-table',
                  })
              : undefined
          }
        />
      )}
      {!(variant.mode === 'watch' && variant.tryFirst) && (
        <>
          <section className={styles.proof} aria-label="World switches">
            <h2>Inspect one world</h2>
            <p>
              {worldDescription(row)}.{' '}
              {revealed
                ? `The circuit output is ${row.result ? 'T ✓' : 'F ×'}.`
                : 'The output waits until your prediction.'}
            </p>
            <div className={styles.switches}>
              {problem.variables.map((name) => (
                <label key={name}>
                  <input
                    type="checkbox"
                    aria-label={`Switch ${name}`}
                    checked={row.values[name]}
                    onChange={() => {
                      const values = { ...row.values, [name]: !row.values[name] };
                      const match = solution.rows.find((candidate) =>
                        problem.variables.every(
                          (variable) => candidate.values[variable] === values[variable],
                        ),
                      );
                      if (match) write({ world: match.id });
                    }}
                  />
                  {name} = {row.values[name] ? 'T' : 'F'}
                </label>
              ))}
            </div>
            <p className={styles.givens}>
              The switches preview a row. Marking a row records your proof selection.
            </p>
          </section>
          <section className={styles.proof} aria-label="Truth table">
            <div className={styles.proofHeading}>
              <h2>
                {variant.mode === 'watch'
                  ? 'Truth table'
                  : variant.mode === 'boss'
                    ? `Connection ${Math.min(variant.phase + 1, 3)} of 3`
                    : 'Build the truth pattern'}
              </h2>
              <span>{solution.rows.length} complete worlds</span>
            </div>
            <p>
              {variant.mode === 'watch'
                ? 'Read each input row, then follow the gates. Shape groups worlds by their first two variables; additional switches remain in the row labels.'
                : active.prompt}
            </p>
            {variant.mode !== 'watch' && variant.mode !== 'boss' && (
              <label className={styles.answer}>
                Challenge{' '}
                <select
                  aria-label="Logic challenge"
                  value={variant.kind}
                  onChange={(event) => {
                    const kind = event.target.value as LogicChallengeKind;
                    write(
                      {
                        kind,
                        phase: 0,
                        hint: 0,
                        world: 'world-0',
                        build: createLogicChallenge(kind, variant.seed).setup,
                      },
                      { step: 0, selection: null },
                    );
                  }}
                >
                  {logicChallengeKinds.map((kind) => (
                    <option key={kind}>{kind}</option>
                  ))}
                </select>
              </label>
            )}
            {variant.mode === 'boss' && <p>{goal}</p>}
            {variant.mode !== 'watch' && (variant.mode !== 'boss' || variant.phase === 0) && (
              <label className={styles.answer}>
                Your classification{' '}
                <select
                  aria-label="Classification"
                  value={variant.build.classification ?? ''}
                  onChange={(event) =>
                    updateBuild({
                      classification: event.target.value
                        ? (event.target.value as LogicAnswer)
                        : undefined,
                    })
                  }
                >
                  <option value="">Choose one</option>
                  {options.map((option) => (
                    <option key={option} value={option}>
                      {option[0].toUpperCase() + option.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">World</th>
                    {problem.variables.map((name) => (
                      <th scope="col" key={name}>
                        {name}
                      </th>
                    ))}
                    {problem.argument && (
                      <>
                        <th scope="col">Premises</th>
                        <th scope="col">Conclusion</th>
                      </>
                    )}
                    <th scope="col">Formula</th>
                    {variant.mode !== 'watch' && <th scope="col">Mark</th>}
                  </tr>
                </thead>
                <tbody>
                  {solution.rows.map((world, index) => (
                    <tr key={world.id} aria-current={world.id === row.id ? 'true' : undefined}>
                      <th scope="row">
                        <button
                          aria-label={`Inspect world ${index}`}
                          onClick={() => write({ world: world.id })}
                        >
                          {index}
                        </button>
                      </th>
                      {problem.variables.map((name) => (
                        <td key={name}>{world.values[name] ? 'T' : 'F'}</td>
                      ))}
                      {problem.argument && (
                        <>
                          <td>{revealed ? (world.premises ? 'T' : 'F') : '?'}</td>
                          <td>{revealed ? (world.conclusion ? 'T' : 'F') : '?'}</td>
                        </>
                      )}
                      <td>{revealed ? (world.result ? 'T ✓' : 'F ×') : '?'}</td>
                      {variant.mode !== 'watch' && (
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`Mark ${world.id}`}
                            checked={variant.build.selectedWorlds.includes(world.id)}
                            disabled={variant.mode === 'boss' && variant.phase !== 1}
                            onChange={() => chooseWorld(world.id)}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {variant.mode === 'boss' && variant.phase === 2 && (
              <fieldset className={styles.codeChoices}>
                <legend>Choose the matching SQL predicate</legend>
                {boss.codeOptions.map((code) => (
                  <label key={code}>
                    <input
                      type="radio"
                      name="logic-code"
                      checked={variant.build.code === code}
                      onChange={() => updateBuild({ code })}
                    />
                    <code>{code}</code>
                  </label>
                ))}
              </fieldset>
            )}
            {variant.mode !== 'watch' && (
              <div className={styles.actions}>
                <button
                  disabled={variant.hint === 3}
                  onClick={() => {
                    const hint = Math.min(3, variant.hint + 1);
                    write({ hint });
                    emitMascot(hint === 1 ? 'hint-1' : hint === 2 ? 'hint-2' : 'hint-3');
                  }}
                >
                  Hint {variant.hint}/3
                </button>
                <button onClick={check}>Check this connection</button>
                <button onClick={next}>
                  {variant.mode === 'boss' ? 'Restart with a new Boss' : 'Next challenge'}
                </button>
              </div>
            )}
            {variant.hint > 0 && (
              <p className={styles.hint} role="status">
                {active.hints[variant.hint - 1]}
              </p>
            )}
            {status && <p role="status">{status}</p>}
          </section>
        </>
      )}
      <section className={styles.bridges} aria-label="Logic bridges">
        <h2>Bridges</h2>
        {definition.bridges.map((bridge) => (
          <details key={bridge.id}>
            <summary>{bridge.title}</summary>
            <p>{bridge.description}</p>
            {bridge.labId === 'sets' ? (
              <button
                onClick={() => {
                  location.hash = 'sets';
                }}
              >
                Open Sets
              </button>
            ) : bridge.labId === 'summation' ? (
              <button
                onClick={() => {
                  location.hash = 'summation';
                }}
              >
                Open the Hopper
              </button>
            ) : (
              <em className={styles.comingSoon}>Coming soon</em>
            )}
          </details>
        ))}
      </section>
    </div>
  );
}
