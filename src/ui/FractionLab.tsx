import { useEffect, useMemo, useState } from 'react';
import { useLesson } from '../core/scene/store';
import { useGame } from '../core/gamification/store';
import { emitMascot } from '../core/mascots/events';
import type { MascotScript } from '../core/mascots/dialogue/lines';
import { sound } from '../core/audio/sounds';
import {
  parseFractionInput,
  fractionsSolver,
  fractionText,
  isEquivalentAnswer,
} from '../core/solvers/fractions';
import {
  createFractionChallenge,
  createFractionBoss,
  fractionChallengeKinds,
} from '../labs/math/fractions/challenge';
import type { FractionBuildState, FractionChallengeKind } from '../labs/math/fractions/challenge';
import { fractionScene, buildScene, canRenderFractionScene } from '../labs/math/fractions/scene';
import {
  initialFractionVariant,
  readFractionVariant,
  recutBuild,
} from '../labs/math/fractions/context';
import type {
  FractionMode as Mode,
  FractionVariant as Variant,
} from '../labs/math/fractions/context';
import { createFractionsDefinition } from '../labs/math/fractions/definition';
import { ProblemBar } from './ProblemBar';
import { Explainer } from './Explainer';
import { Icon } from './Icon';
import styles from './FractionLab.module.css';
const definition = createFractionsDefinition([]);
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
const ids = (n: number) => Array.from({ length: n }, (_, i) => i);
export default function FractionLab() {
  const lesson = useLesson();
  const v = useMemo(
    () => readFractionVariant(lesson.labId === 'fractions' ? lesson.variant : undefined),
    [lesson.labId, lesson.variant],
  );
  useEffect(() => {
    if (useLesson.getState().labId !== 'fractions')
      useLesson.getState().set({
        labId: 'fractions',
        problem: '3/4 + 1/6',
        variant: JSON.stringify(initialFractionVariant()),
        step: 0,
        selection: null,
      });
  }, []);
  const input = lesson.labId === 'fractions' ? lesson.problem : '3/4 + 1/6';
  const parsed = useMemo(() => parseFractionInput(input), [input]);
  const problem = parsed.ok ? parsed.problem : parseFractionInput(examples[0]);
  const p = 'kind' in problem ? problem : problem.ok ? problem.problem : null;
  if (!p) throw new Error('The built-in fraction example must parse.');
  const methods = fractionsSolver.methods(p);
  const method = methods.some((m) => m.id === v.method) ? v.method : methods[0].id;
  const solved = useMemo(() => {
    try {
      return fractionsSolver.solve(p, method);
    } catch {
      return null;
    }
  }, [p, method]);
  const challenge = useMemo(() => createFractionChallenge(v.kind, v.seed), [v.kind, v.seed]);
  const boss = useMemo(() => createFractionBoss(v.seed), [v.seed]);
  const [status, setStatus] = useState('');
  const [inputError, setInputError] = useState('');
  const [tryFirst, setTryFirst] = useState(false);
  const [guess, setGuess] = useState('');
  const write = (patch: Partial<Variant>, lessonPatch: Partial<typeof lesson> = {}) => {
    useLesson.getState().set({
      labId: 'fractions',
      problem: input,
      variant: JSON.stringify({ ...v, ...patch }),
      ...lessonPatch,
    });
    setStatus('');
  };
  const mode = (next: Mode) =>
    write(
      { mode: next, phase: 0, hint: 0, build: next === 'boss' ? boss.setup : challenge.setup },
      { step: 0, selection: null },
    );
  const updateBuild = (patch: Partial<FractionBuildState>) =>
    write({ build: { ...v.build, ...patch } });
  const toggle = (id: string) => {
    if (!/^result-piece(?:-\d+)?$/.test(id)) return;
    const index = id === 'result-piece' ? 0 : Number(id.split('-').at(-1));
    if (index >= v.build.denominator * (v.build.units ?? 1)) return;
    if (v.kind === 'subtract' && v.mode !== 'boss') {
      if (index >= challenge.givens.a.n) return;
      const selected = v.build.selected.includes(index)
        ? v.build.selected.filter((i) => i !== index)
        : [...v.build.selected, index];
      updateBuild({
        selected,
        removed: ids(challenge.givens.a.n).filter((i) => !selected.includes(i)),
      });
    } else {
      const selected = v.build.selected.includes(index)
        ? v.build.selected.filter((i) => i !== index)
        : [...v.build.selected, index];
      updateBuild({ selected, ...(v.kind === 'divide' ? { fits: selected.length } : {}) });
    }
  };
  const axis = (which: 'horizontalSelected' | 'verticalSelected', index: number) => {
    const current = v.build[which] ?? [];
    const next = current.includes(index) ? current.filter((i) => i !== index) : [...current, index];
    const columns = v.build.columns!,
      rows = v.build.rows!;
    const horizontal = which === 'horizontalSelected' ? next : (v.build.horizontalSelected ?? []),
      vertical = which === 'verticalSelected' ? next : (v.build.verticalSelected ?? []);
    updateBuild({
      [which]: next,
      selected: ids(columns * rows).filter(
        (i) => horizontal.includes(i % columns) && vertical.includes(Math.floor(i / columns)),
      ),
    });
  };
  const next = () => {
    const seed = (Math.imul(v.seed, 1664525) + 1013904223) >>> 0;
    write(
      {
        seed,
        phase: 0,
        hint: 0,
        build:
          v.mode === 'boss'
            ? createFractionBoss(seed).setup
            : createFractionChallenge(v.kind, seed).setup,
      },
      { step: 0, selection: null },
    );
  };
  const check = () => {
    const correct =
      v.mode === 'boss'
        ? v.phase < 3
          ? boss.phases[v.phase].goal(v.build)
          : boss.goal(v.build)
        : challenge.goal(v.build);
    if (correct) {
      emitMascot('correct');
      sound('success');
      if (v.mode === 'boss' && v.phase < 2) {
        write({ phase: v.phase + 1 });
        setStatus('That connection holds. Continue to the next part.');
      } else if (v.mode === 'boss' && !boss.goal(v.build)) {
        setStatus('Return to your build: all three connections must still hold.');
      } else {
        useGame
          .getState()
          .award(
            v.mode === 'boss' ? 'boss' : 'prove',
            v.mode === 'boss' ? boss.id : challenge.id,
            'fractions',
            v.hint > 0,
          );
        if (v.mode === 'boss') write({ phase: 3 });
        setStatus(
          `Verified against your pieces. ${v.mode === 'boss' ? 'Boss complete!' : 'Proof complete!'}`,
        );
      }
    } else {
      emitMascot('wrong');
      setStatus('Keep exploring. Check the cuts, selected pieces and the goal; a hint can help.');
      useGame.getState().queueChallengeEcho({
        skillId: 'fractions',
        key: v.mode === 'boss' ? boss.id : challenge.id,
        labId: 'fractions',
        seed: v.seed,
        prompt: challenge.prompt,
      });
    }
  };
  const watch = useMemo(
    () =>
      parsed.ok && solved?.visualSupported && canRenderFractionScene(p, solved.result, method!)
        ? fractionScene(p, solved.result, solved.steps, v.shape, method!)
        : null,
    [parsed, p, solved, v.shape, method],
  );
  const built = useMemo(
    () => buildScene(v.build, v.shape, v.mode === 'boss' ? boss.givens : challenge.givens),
    [v.build, v.shape, v.mode, boss, challenge],
  );
  const goal = v.mode === 'boss' ? boss.phases[Math.min(v.phase, 2)].prompt : challenge.prompt;
  const fixedCuts =
    v.mode !== 'boss' && ['subtract', 'multiply', 'divide', 'mixed', 'simplify'].includes(v.kind);
  const cut = (value: number) => {
    if (fixedCuts) return;
    const recut = recutBuild(v.build, value);
    if (recut) write({ build: recut });
    else
      setStatus('Those cuts cannot preserve every selected part. Choose a compatible subdivision.');
  };
  const recutOperand = (name: 'leftCuts' | 'rightCuts', value: number) => {
    const given = (v.mode === 'boss' ? boss.givens : challenge.givens)[
      name === 'leftCuts' ? 'a' : 'b'
    ];
    if (
      given &&
      Number.isInteger(value) &&
      value >= given.d &&
      value <= 24 &&
      value % given.d === 0
    )
      updateBuild({ [name]: value });
    else
      setStatus(
        `Recut this operand using whole subdivisions of its ${given?.d ?? 1} original parts.`,
      );
  };
  const regroup = (value: number) => {
    const given = challenge.givens.a;
    if (
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 24 &&
      given.n % value === 0 &&
      given.d % value === 0
    )
      updateBuild({ groups: value, denominator: given.d / value, selected: ids(given.n / value) });
    else
      setStatus('A group must contain complete old cuts in both the selected part and the whole.');
  };
  return (
    <div className={styles.lab} data-anchor-id="fractions-lab">
      <ProblemBar
        value={input}
        examples={examples}
        onSolve={(raw) => {
          const parsed = parseFractionInput(raw);
          if (!parsed.ok) {
            setInputError(parsed.reason);
            return false;
          }
          try {
            fractionsSolver.solve(parsed.problem);
          } catch {
            setInputError(
              'These numbers exceed the exact workspace limit. Use smaller integer components.',
            );
            return false;
          }
          write(
            { mode: 'watch', method: undefined, phase: 0, hint: 0 },
            { problem: raw, step: 0, selection: null },
          );
          setInputError('');
          setTryFirst(false);
          return true;
        }}
      />
      {inputError && <p role="status">{inputError}</p>}
      <div className={styles.toolbar}>
        <div aria-label="Learning mode">
          {(['watch', 'play', 'prove', 'boss'] as const).map((m) => (
            <button key={m} aria-pressed={v.mode === m} onClick={() => mode(m)}>
              {m[0].toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
        <div aria-label="Fraction shape">
          {(['pie', 'bar', 'stack'] as const).map((shape) => (
            <button key={shape} aria-pressed={v.shape === shape} onClick={() => write({ shape })}>
              {shape[0].toUpperCase() + shape.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {v.mode === 'watch' && (
        <div className={styles.method}>
          <label>
            Method{' '}
            <select value={method} onChange={(e) => write({ method: e.target.value }, { step: 0 })}>
              {methods.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-pressed={tryFirst}
            disabled={!parsed.ok || !solved}
            onClick={() => {
              setTryFirst(!tryFirst);
              setGuess('');
            }}
          >
            Try first
          </button>
        </div>
      )}
      {v.mode === 'watch' && tryFirst && solved ? (
        <section className={styles.proof}>
          <h2>Your turn</h2>
          <p>Find the exact result of {input}. Equivalent fractions are accepted.</p>
          <label>
            Your expression{' '}
            <input value={guess} onChange={(e) => setGuess(e.target.value)} maxLength={160} />
          </label>
          <button
            onClick={() => {
              if (isEquivalentAnswer(guess, solved.result)) {
                useGame.getState().award('predict', `try-first:${input}`, 'fractions');
                setTryFirst(false);
                return;
              }
              setStatus('The value differs. Try another representation, or open the worked steps.');
            }}
          >
            Check equivalence
          </button>
          <button onClick={() => setTryFirst(false)}>Show the worked steps</button>
          <p role="status">{status}</p>
        </section>
      ) : v.mode === 'watch' && !watch ? (
        <section className={styles.proof}>
          <h2>
            {parsed.ok && solved
              ? `Exact result: ${solved.answer}`
              : 'This expression needs a correction'}
          </h2>
          <p>
            {!parsed.ok
              ? parsed.reason
              : !solved
                ? 'These numbers exceed the exact workspace limit. Use smaller integer components.'
                : 'This model exceeds the budget of 24 cuts per whole, four unit areas, or 96 scene parts. The exact arithmetic still works; use a smaller example for manipulatives, or study the expression as a graph.'}
          </p>
          {parsed.ok &&
            solved?.steps.map((s) => (
              <article key={s.id}>
                <h3>{s.title}</h3>
                <p>{s.say.standard}</p>
                <details>
                  <summary>Why?</summary>
                  {s.say.deep}
                </details>
              </article>
            ))}
        </section>
      ) : (
        <Explainer
          spec={v.mode === 'watch' ? watch! : built}
          echoSkillId="fractions"
          watchCredit={v.mode === 'watch'}
          mascotScript={mascotScript}
          onActivate={v.mode === 'watch' ? undefined : toggle}
          caption={
            v.mode === 'watch'
              ? p.kind === 'multiply'
                ? 'Two directions. One overlap.'
                : p.kind === 'divide'
                  ? 'Count measuring units.'
                  : 'One whole. Equal parts.'
              : goal
          }
          onMethod={
            v.mode === 'watch'
              ? () =>
                  write(
                    {
                      method:
                        methods[(methods.findIndex((m) => m.id === method) + 1) % methods.length]
                          .id,
                    },
                    { step: 0 },
                  )
              : undefined
          }
        />
      )}
      {v.mode !== 'watch' && (
        <section
          className={styles.proof}
          aria-label="Fraction proof"
          data-anchor-id="fraction-proof"
        >
          <div className={styles.proofHeading}>
            <h2>
              {v.mode === 'play'
                ? 'A bench for experiments'
                : v.mode === 'boss'
                  ? `Connection ${Math.min(v.phase + 1, 3)} of 3`
                  : 'Prove it with pieces'}
            </h2>
            <label>
              Challenge{' '}
              <select
                value={v.kind}
                disabled={v.mode === 'boss'}
                onChange={(e) => {
                  const kind = e.target.value as FractionChallengeKind;
                  write({ kind, hint: 0, build: createFractionChallenge(kind, v.seed).setup });
                }}
              >
                {fractionChallengeKinds.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
          </div>
          <p>{v.mode === 'boss' ? boss.prompt : challenge.prompt}</p>
          {v.mode === 'boss' && v.phase === 0 && (
            <label>
              Predict the sum of {fractionText(boss.givens.a)} + {fractionText(boss.givens.b)}{' '}
              <input
                aria-label="Boss symbolic answer"
                value={v.build.symbolAnswer ?? ''}
                maxLength={80}
                onChange={(e) => updateBuild({ symbolAnswer: e.target.value })}
              />
            </label>
          )}
          {v.mode === 'boss' && v.phase === 2 && (
            <fieldset>
              <legend>Which Python computation preserves this sum?</legend>
              {boss.codeOptions.map((code) => (
                <label key={code}>
                  <input
                    type="radio"
                    name="boss-code"
                    checked={v.build.code === code}
                    onChange={() => updateBuild({ code })}
                  />
                  <code>{code}</code>
                </label>
              ))}
            </fieldset>
          )}
          {(v.mode !== 'boss' || v.phase === 1) && (
            <>
              <div className={styles.controls}>
                <label>
                  Equal cuts per whole: {v.build.denominator}
                  <input
                    aria-label="Equal cuts per whole"
                    type="range"
                    min="1"
                    max="24"
                    value={v.build.denominator}
                    disabled={fixedCuts}
                    onChange={(e) => cut(Number(e.target.value))}
                  />
                </label>
                {(v.kind === 'add' || v.mode === 'boss') && (
                  <>
                    <label>
                      Left recut{' '}
                      <input
                        aria-label="Left recut"
                        type="number"
                        min="1"
                        max="24"
                        value={v.build.leftCuts ?? 1}
                        onChange={(e) => recutOperand('leftCuts', Number(e.target.value))}
                      />
                    </label>
                    <label>
                      Right recut{' '}
                      <input
                        aria-label="Right recut"
                        type="number"
                        min="1"
                        max="24"
                        value={v.build.rightCuts ?? 1}
                        onChange={(e) => recutOperand('rightCuts', Number(e.target.value))}
                      />
                    </label>
                  </>
                )}
                {v.kind === 'simplify' && v.mode !== 'boss' && (
                  <label>
                    Old cuts per new group{' '}
                    <input
                      aria-label="Old cuts per group"
                      type="number"
                      min="1"
                      max="24"
                      value={v.build.groups ?? 1}
                      onChange={(e) => regroup(Number(e.target.value))}
                    />
                  </label>
                )}
              </div>
              {fixedCuts && (
                <p>
                  {v.kind === 'simplify'
                    ? 'The grouping control changes the result cuts while preserving the original area.'
                    : 'These cuts define the original unit for this challenge.'}
                </p>
              )}
              {v.build.columns && v.build.rows && (
                <div className={styles.axes}>
                  <fieldset>
                    <legend>Select columns</legend>
                    {ids(v.build.columns).map((i) => (
                      <button
                        aria-pressed={v.build.horizontalSelected?.includes(i)}
                        key={i}
                        onClick={() => axis('horizontalSelected', i)}
                      >
                        Column {i + 1}
                      </button>
                    ))}
                  </fieldset>
                  <fieldset>
                    <legend>Select rows</legend>
                    {ids(v.build.rows).map((i) => (
                      <button
                        aria-pressed={v.build.verticalSelected?.includes(i)}
                        key={i}
                        onClick={() => axis('verticalSelected', i)}
                      >
                        Row {i + 1}
                      </button>
                    ))}
                  </fieldset>
                </div>
              )}
              <div className={styles.pieces} aria-label="Piece controls">
                {ids(v.build.denominator * (v.build.units ?? 1)).map((i) => (
                  <button
                    key={i}
                    aria-pressed={v.build.selected.includes(i)}
                    onClick={() => toggle(i === 0 ? 'result-piece' : `result-piece-${i}`)}
                  >
                    Piece {i + 1}
                    {v.build.selected.includes(i) ? ' · selected' : ''}
                  </button>
                ))}
              </div>
              <p>
                {v.build.selected.length} selected; {v.build.denominator} equal parts per whole.
                {v.kind === 'divide' ? ` ${v.build.fits ?? 0} measuring bars placed.` : ''}
                {v.kind === 'subtract' ? ` ${v.build.removed?.length ?? 0} removed.` : ''}
              </p>
            </>
          )}
          {v.hint > 0 && (
            <p className={styles.hint}>
              {(v.mode === 'boss' ? boss.hints : challenge.hints)[v.hint - 1]}
            </p>
          )}
          <div className={styles.actions}>
            {v.mode !== 'play' && v.phase < 3 && (
              <button onClick={check}>
                <Icon name="Check" size={16} />
                {v.mode === 'boss' ? 'Check this connection' : 'Check my pieces'}
              </button>
            )}
            <button
              disabled={v.hint === 3}
              onClick={() => {
                write({ hint: Math.min(3, v.hint + 1) });
                emitMascot(v.hint === 0 ? 'hint-1' : v.hint === 1 ? 'hint-2' : 'hint-3');
              }}
            >
              Hint {v.hint + 1}
            </button>
            <button onClick={next}>New {v.mode === 'boss' ? 'boss' : 'challenge'}</button>
            <button
              onClick={() =>
                write({
                  build: v.mode === 'boss' ? boss.setup : challenge.setup,
                  phase: 0,
                  hint: 0,
                })
              }
            >
              Reset pieces
            </button>
          </div>
          <p role="status">{status}</p>
        </section>
      )}
      <details className={styles.bridges}>
        <summary>Follow a connection</summary>
        <p>{definition.bridges.find((bridge) => bridge.labId === 'equations')!.description}</p>
        <button
          disabled={!parsed.ok || !solved}
          onClick={() => {
            if (!solved) return;
            useLesson.getState().set({
              labId: 'equations',
              problem: `y = ${solved.result.n}/${solved.result.d}`,
              step: 0,
              selection: null,
              variant: undefined,
            });
            location.hash = 'equations';
            useGame.getState().record('bridge', `fractions-equations:${Date.now()}`, 'fractions');
          }}
        >
          Open the graph workspace <Icon name="ArrowUpRight" size={14} />
        </button>
        <p>
          Related gems on the Monomap:{' '}
          {definition.bridges
            .filter((bridge) => bridge.labId !== 'equations')
            .map((bridge) => bridge.title)
            .join(', ')}
          .
        </p>
      </details>
    </div>
  );
}
