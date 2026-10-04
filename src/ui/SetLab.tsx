import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useLesson } from '../core/scene/store';
import { useGame } from '../core/gamification/store';
import { emitMascot } from '../core/mascots/events';
import type { MascotScript } from '../core/mascots/dialogue/lines';
import { sound } from '../core/audio/sounds';
import { parseSetsInput, setsSolver } from '../core/solvers/sets';
import type { SetsConfig } from '../core/solvers/sets';
import {
  createSetsBoss,
  createSetsChallenge,
  setsChallengeKinds,
} from '../labs/math/sets/challenge';
import type { SetsBuildState, SetsChallengeKind } from '../labs/math/sets/challenge';
import { createSetsDefinition } from '../labs/math/sets/definition';
import {
  canRenderSetsScene,
  setScene,
  setBuildScene,
  setTokenId,
  setTokenValue,
} from '../labs/math/sets/scene';
import {
  cloneSetBuild,
  cloneSetConfig,
  initialSetVariant,
  parseSetMembers,
  readSetVariant,
  setEquals,
  setMembership,
  setPowerSubsets,
  setPreview,
  validSetConfig,
} from '../labs/math/sets/context';
import type { SetMode, SetVariant, SetView } from '../labs/math/sets/context';
import { Explainer } from './Explainer';
import { ProblemBar } from './ProblemBar';
import { Icon } from './Icon';
import styles from './SetLab.module.css';
const definition = createSetsDefinition([]);
const examples = definition.examples.map((example) => example.input);
const showSet = (values: number[]) =>
  values.length ? `{${[...values].sort((a, b) => a - b).join(', ')}}` : '∅';
const views: { id: SetView; title: string }[] = [
  { id: 'venn', title: 'Venn' },
  { id: 'euler', title: 'Euler' },
  { id: 'sieve', title: 'Sieve' },
  { id: 'power', title: 'Power set' },
  { id: 'product', title: 'Product' },
  { id: 'relation', title: 'Relation' },
];
const mascotScript: MascotScript = {
  intro: definition.mascotScript.intro,
  'hint-1': definition.mascotScript.hint1,
  'hint-2': definition.mascotScript.hint2,
  'hint-3': definition.mascotScript.hint3,
  correct: definition.mascotScript.correct,
  wrong: definition.mascotScript.wrong,
  'idle-nudge': definition.mascotScript.idle,
};
const pairEquals = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];
function viewFor(kind: string): SetView {
  return kind === 'power'
    ? 'power'
    : kind === 'product'
      ? 'product'
      : kind === 'function' || kind === 'relation'
        ? 'relation'
        : kind === 'builder' || kind === 'sieve'
          ? 'sieve'
          : kind === 'subset'
            ? 'euler'
            : 'venn';
}
export default function SetLab() {
  const lesson = useLesson();
  const v = useMemo(
    () => readSetVariant(lesson.labId === 'sets' ? lesson.variant : undefined),
    [lesson.labId, lesson.variant],
  );
  const input = lesson.labId === 'sets' ? lesson.problem : examples[0];
  useEffect(() => {
    if (useLesson.getState().labId !== 'sets')
      useLesson.getState().set({
        labId: 'sets',
        problem: examples[0],
        variant: JSON.stringify(initialSetVariant()),
        step: 0,
        selection: null,
      });
  }, []);
  const parsed = useMemo(() => parseSetsInput(input, v.sets), [input, v.sets]);
  const problem = parsed.ok ? parsed.problem : parseSetsInput(examples[0], v.sets);
  const p = 'expression' in problem ? problem : problem.ok ? problem.problem : null;
  if (!p) throw new Error('The authored set example must parse.');
  const methods = setsSolver.methods(p);
  const solved = useMemo(() => setsSolver.solve(p, v.method), [p, v.method]);
  const challenge = useMemo(() => createSetsChallenge(v.kind, v.seed), [v.kind, v.seed]);
  const boss = useMemo(() => createSetsBoss(v.seed), [v.seed]);
  const givens = v.mode === 'boss' ? boss.givens : challenge.givens;
  const [status, setStatus] = useState('');
  const [inputError, setInputError] = useState('');
  const [tryFirst, setTryFirst] = useState(false);
  const [guess, setGuess] = useState('');
  const write = (
    patch: Partial<SetVariant>,
    context: { problem?: string; step?: number; selection?: string | null } = {},
  ) => {
    useLesson.getState().set({
      labId: 'sets',
      problem: input,
      variant: JSON.stringify({ ...v, ...patch }),
      ...context,
    });
    setStatus('');
  };
  const updateBuild = (patch: Partial<SetsBuildState>) =>
    write({ build: { ...v.build, ...patch } });
  const changeMode = (mode: SetMode) =>
    write(
      {
        mode,
        phase: 0,
        hint: 0,
        build: cloneSetBuild(mode === 'boss' ? boss.setup : challenge.setup),
        view: mode === 'watch' ? 'venn' : viewFor(v.kind),
      },
      { step: 0, selection: null },
    );
  const changeKind = (kind: SetsChallengeKind) =>
    write(
      {
        kind,
        phase: 0,
        hint: 0,
        view: viewFor(kind),
        build: cloneSetBuild(createSetsChallenge(kind, v.seed).setup),
      },
      { step: 0, selection: null },
    );
  const next = () => {
    const seed = (Math.imul(v.seed, 1664525) + 1013904223) >>> 0;
    write(
      {
        seed,
        phase: 0,
        hint: 0,
        build: cloneSetBuild(
          v.mode === 'boss' ? createSetsBoss(seed).setup : createSetsChallenge(v.kind, seed).setup,
        ),
      },
      { step: 0, selection: null },
    );
  };
  const selectValue = (value: number) =>
    updateBuild({
      selected: v.build.selected.includes(value)
        ? v.build.selected.filter((item) => item !== value)
        : [...v.build.selected, value].sort((a, b) => a - b),
    });
  const toggleSubset = (subset: number[]) =>
    updateBuild({
      subsets: (v.build.subsets ?? []).some((item) => setEquals(item, subset))
        ? v.build.subsets!.filter((item) => !setEquals(item, subset))
        : [...(v.build.subsets ?? []), [...subset]],
    });
  const togglePair = (pair: [number, number]) =>
    updateBuild({
      pairs: (v.build.pairs ?? []).some((item) => pairEquals(item, pair))
        ? v.build.pairs!.filter((item) => !pairEquals(item, pair))
        : [...(v.build.pairs ?? []), pair],
    });
  // Keep the exact answer out of the membership table until the learner has
  // passed the Explainer's read and prediction checkpoints.
  const watchRevealed = v.mode === 'watch' && lesson.step >= 3;
  const boardState: SetsBuildState =
    v.mode === 'watch'
      ? {
          universe: v.sets.U,
          a: v.sets.A,
          b: v.sets.B,
          selected: watchRevealed ? solved.result : [],
        }
      : v.build;
  const move = (value: number, where: 'a' | 'b' | 'both' | 'neither') => {
    const build = setMembership(boardState, value, where);
    if (v.mode !== 'watch' && build.subsets && build.a.length > 3) {
      setStatus(
        'The power-set cube holds at most three A elements. Move an A element out before adding another.',
      );
      return;
    }
    if (v.mode === 'watch') write({ sets: { ...v.sets, A: build.a, B: build.b } }, { step: 0 });
    else write({ build });
    setStatus(
      `Element ${value} is now ${where === 'a' ? 'in A only' : where === 'b' ? 'in B only' : where === 'both' ? 'in both A and B' : 'outside A and B'}.`,
    );
  };
  const activate = (id: string) => {
    const value = setTokenValue(id);
    if (value !== null && value !== undefined && boardState.universe.includes(value)) {
      if (v.mode === 'watch') {
        const where = boardState.a.includes(value)
          ? boardState.b.includes(value)
            ? 'b'
            : 'both'
          : boardState.b.includes(value)
            ? 'neither'
            : 'a';
        move(value, where);
      } else selectValue(value);
    } else if (/^subset-\d+$/.test(id)) {
      const subset = setPowerSubsets(givens.A)[Number(id.slice(7))];
      if (subset && v.mode !== 'watch') toggleSubset(subset);
    } else if (/^cell-\d+$/.test(id) && givens.A.length && v.mode !== 'watch') {
      const index = Number(id.slice(5)),
        a = givens.A[index % givens.A.length],
        b = givens.B[Math.floor(index / givens.A.length)];
      if (a !== undefined && b !== undefined) togglePair([a, b]);
    }
  };
  const check = () => {
    const correct =
      v.mode === 'boss' ? boss.phases[Math.min(v.phase, 2)].goal(v.build) : challenge.goal(v.build);
    if (!correct) {
      emitMascot('wrong');
      setStatus(
        'Your arrangement is useful evidence. Compare its memberships and selections with the goal, then try again.',
      );
      useGame.getState().queueChallengeEcho({
        skillId: 'sets',
        key: v.mode === 'boss' ? boss.id : challenge.id,
        labId: 'sets',
        seed: v.seed,
        prompt: v.mode === 'boss' ? boss.prompt : challenge.prompt,
      });
      return;
    }
    emitMascot('correct');
    sound('success');
    if (v.mode === 'boss' && v.phase < 2) {
      write({ phase: v.phase + 1 });
      setStatus('That connection holds. Continue to the next one.');
      return;
    }
    if (v.mode === 'boss' && !boss.goal(v.build)) {
      setStatus('All three connections must still hold. Return to your input and arrangement.');
      return;
    }
    useGame
      .getState()
      .award(
        v.mode === 'boss' ? 'boss' : v.mode === 'play' ? 'play' : 'prove',
        v.mode === 'boss' ? boss.id : challenge.id,
        'sets',
        v.hint > 0,
      );
    if (v.mode === 'boss') write({ phase: 3 });
    setStatus(
      v.mode === 'boss'
        ? 'All three connections verified. Boss complete!'
        : 'Your actual arrangement meets the goal. Proof complete!',
    );
  };
  const watch = useMemo(() => {
    let scene;
    try {
      scene = canRenderSetsScene(p, v.view)
        ? setScene(p, solved, v.view, v.method)
        : setBuildScene(
            { universe: p.sets.U, a: p.sets.A, b: p.sets.B, selected: solved.result },
            'sieve',
            p.sets,
          );
    } catch {
      scene = setBuildScene(
        { universe: p.sets.U, a: p.sets.A, b: p.sets.B, selected: solved.result },
        'sieve',
        p.sets,
      );
    }
    return v.codeLanguage === 'sql'
      ? {
          ...scene,
          code: solved.code.sql,
          codeLanguage: 'SQL' as const,
          codeBindings: { A: 'a', B: 'b', result: 'result' },
        }
      : scene;
  }, [p, solved, v.view, v.method, v.codeLanguage]);
  const built = useMemo(() => {
    try {
      return canRenderSetsScene(
        { expression: 'A', sets: { ...givens, A: v.build.a, B: v.build.b, U: v.build.universe } },
        v.view,
      )
        ? setBuildScene(v.build, v.view, givens)
        : setBuildScene(v.build, 'sieve', givens);
    } catch {
      return setBuildScene(v.build, 'sieve', givens);
    }
  }, [v.build, v.view, givens]);
  const power = v.mode !== 'watch' && (v.kind === 'power' || v.view === 'power');
  const grid =
    v.mode !== 'watch' &&
    (['product', 'function', 'relation'].includes(v.kind) ||
      ['product', 'relation'].includes(v.view));
  const target = v.mode === 'boss' ? boss.phases[Math.min(v.phase, 2)].prompt : challenge.prompt;
  return (
    <div className={styles.lab} data-anchor-id="sets-lab">
      <header className={styles.heading}>
        <span>
          <Icon name="Layers" size={17} /> Elements, with a place to belong
        </span>
        <h1>Sets</h1>
        <p>A membership can change while the element stays itself.</p>
      </header>
      <ProblemBar
        value={input}
        examples={examples}
        placeholder="A ∪ B"
        unsupportedMessage="Try one of the finite-set examples. Use A, B, C and U with union, intersection, difference or complement."
        graphLink={false}
        historyKey="monomath-set-problems"
        keypadKeys={[
          'A',
          'B',
          'C',
          'U',
          '∪',
          '∩',
          '\\',
          'ᶜ',
          'Δ',
          '(',
          ')',
          '{',
          '}',
          'x',
          '|',
          'even',
          '<',
          '10',
        ]}
        preview={setPreview}
        onSolve={(raw) => {
          const parsed = parseSetsInput(raw, v.sets);
          if (!parsed.ok) {
            setInputError(parsed.reason);
            return false;
          }
          write(
            { mode: 'watch', phase: 0, hint: 0, method: 'membership' },
            { problem: raw, step: 0, selection: null },
          );
          setInputError('');
          setTryFirst(false);
          return true;
        }}
      />
      {inputError && (
        <p role="alert" className={styles.hint}>
          {inputError}
        </p>
      )}
      <div className={styles.toolbar}>
        <div aria-label="Learning mode">
          {(['watch', 'play', 'prove', 'boss'] as const).map((mode) => (
            <button key={mode} aria-pressed={v.mode === mode} onClick={() => changeMode(mode)}>
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        <div aria-label="Set picture">
          {views.map((view) => (
            <button
              key={view.id}
              aria-pressed={v.view === view.id}
              onClick={() => write({ view: view.id })}
            >
              {view.title}
            </button>
          ))}
        </div>
      </div>
      {v.mode === 'watch' && (
        <>
          <ScopeEditor
            sets={v.sets}
            onApply={(sets) => write({ sets }, { step: 0, selection: null })}
          />
          <div className={styles.method}>
            <label>
              Method{' '}
              <select
                value={v.method}
                onChange={(event) =>
                  write({ method: event.target.value as SetVariant['method'] }, { step: 0 })
                }
              >
                {methods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              aria-pressed={tryFirst}
              onClick={() => {
                setTryFirst(!tryFirst);
                setGuess('');
              }}
            >
              Try first
            </button>
          </div>
        </>
      )}
      {v.mode === 'watch' && tryFirst ? (
        <section className={styles.proof}>
          <h2>Your turn</h2>
          <p>
            Which elements belong to {input}? Enter the set, for example {'{1, 3}'}, or ∅.
          </p>
          <label>
            Your resulting set{' '}
            <input
              value={guess}
              maxLength={180}
              onChange={(event) => setGuess(event.target.value)}
            />
          </label>
          <div className={styles.actions}>
            <button
              onClick={() => {
                const answer = parseSetMembers(guess);
                if (answer && setEquals(answer, solved.result)) {
                  useGame
                    .getState()
                    .award('predict', `sets:try:${input}:${JSON.stringify(v.sets)}`, 'sets');
                  setTryFirst(false);
                } else
                  setStatus(
                    'Compare each element with the expression. You can open the worked steps whenever you need.',
                  );
              }}
            >
              Check my set
            </button>
            <button onClick={() => setTryFirst(false)}>Show the worked steps</button>
          </div>
          <p role="status">{status}</p>
        </section>
      ) : (
        <Explainer
          spec={v.mode === 'watch' ? watch : built}
          domain="logic"
          echoSkillId="sets"
          mascotScript={mascotScript}
          onActivate={activate}
          caption={v.mode === 'watch' ? 'One element. Several memberships.' : target}
          onMethod={
            v.mode === 'watch'
              ? () =>
                  write(
                    { method: v.method === 'membership' ? 'algebra' : 'membership' },
                    { step: 0 },
                  )
              : undefined
          }
        />
      )}
      <section
        className={styles.proof}
        data-anchor-id="set-memberships"
        aria-label="Element memberships"
      >
        <h2>Give each element a place</h2>
        <p>
          Drag a token into a region to change its membership. The checkboxes make the same move
          with a tap or keyboard.
        </p>
        <MembershipBoard
          state={boardState}
          onMove={move}
          onFocus={(value) =>
            useLesson.getState().set({
              selection: boardState.a.includes(value)
                ? 'a'
                : boardState.b.includes(value)
                  ? 'b'
                  : 'u',
            })
          }
        />
        <div className={styles.tableWrap}>
          <table>
            <caption>
              Actual memberships
              {v.mode === 'watch'
                ? watchRevealed
                  ? ' and the evaluated result'
                  : ' — result appears after your prediction'
                : ' and your selected result'}
            </caption>
            <thead>
              <tr>
                <th scope="col">Element</th>
                <th scope="col">In A</th>
                <th scope="col">In B</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {boardState.universe.map((value) => (
                <tr key={value}>
                  <th scope="row">{value}</th>
                  {(['a', 'b'] as const).map((name) => (
                    <td key={name}>
                      <input
                        type="checkbox"
                        aria-label={`Element ${value} in ${name.toUpperCase()}`}
                        checked={boardState[name].includes(value)}
                        onChange={(event) => {
                          const a =
                              name === 'a' ? event.target.checked : boardState.a.includes(value),
                            b = name === 'b' ? event.target.checked : boardState.b.includes(value);
                          move(value, a ? (b ? 'both' : 'a') : b ? 'b' : 'neither');
                        }}
                      />
                    </td>
                  ))}
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Element ${value} selected in result`}
                      checked={boardState.selected.includes(value)}
                      disabled={v.mode === 'watch' || power || grid}
                      onChange={() => selectValue(value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={styles.actual}>
          A = {showSet(boardState.a)} · B = {showSet(boardState.b)}
          {v.mode === 'watch' && ` · C = ${showSet(v.sets.C)}`}
          <br />
          {v.mode === 'watch'
            ? watchRevealed
              ? `Evaluated result = ${showSet(boardState.selected)}`
              : 'Result is waiting for your prediction.'
            : `Selected result = ${showSet(boardState.selected)}`}
        </p>
      </section>
      {v.mode !== 'watch' && (
        <section className={styles.proof} aria-label="Set proof" data-anchor-id="set-proof">
          <div className={styles.proofHeading}>
            <h2>
              {v.mode === 'boss'
                ? `Connection ${Math.min(v.phase + 1, 3)} of 3`
                : v.mode === 'play'
                  ? 'A bench for experiments'
                  : 'Prove it with elements'}
            </h2>
            <label>
              Challenge{' '}
              <select
                value={v.kind}
                disabled={v.mode === 'boss'}
                onChange={(event) => changeKind(event.target.value as SetsChallengeKind)}
              >
                {setsChallengeKinds.map((kind) => (
                  <option key={kind}>{kind}</option>
                ))}
              </select>
            </label>
          </div>
          <p>{v.mode === 'boss' ? boss.prompt : challenge.prompt}</p>
          <p className={styles.givens}>
            Requested inputs: U = {showSet(givens.U)}; A = {showSet(givens.A)}; B ={' '}
            {showSet(givens.B)}.
          </p>
          {v.mode === 'boss' && v.phase === 0 && (
            <label>
              Boss resulting set{' '}
              <input
                aria-label="Boss set answer"
                value={v.build.symbolAnswer ?? ''}
                maxLength={180}
                onChange={(event) => updateBuild({ symbolAnswer: event.target.value })}
              />
            </label>
          )}
          {v.mode === 'boss' && v.phase === 2 && (
            <fieldset>
              <legend>Which SQL query describes the same selection?</legend>
              {boss.codeOptions.map((code) => (
                <label key={code}>
                  <input
                    type="radio"
                    name="sets-boss-code"
                    checked={v.build.code === code}
                    onChange={() => updateBuild({ code })}
                  />
                  <code>{code}</code>
                </label>
              ))}
            </fieldset>
          )}
          {power && (
            <fieldset className={styles.subsets}>
              <legend>Choose subsets of A = {showSet(givens.A)}</legend>
              {setPowerSubsets(givens.A).map((subset, mask) => (
                <button
                  key={mask}
                  aria-pressed={(v.build.subsets ?? []).some((item) => setEquals(item, subset))}
                  onClick={() => toggleSubset(subset)}
                >
                  {showSet(subset)}{' '}
                  <span>
                    {(v.build.subsets ?? []).some((item) => setEquals(item, subset))
                      ? 'selected'
                      : 'unselected'}
                  </span>
                </button>
              ))}
            </fieldset>
          )}
          {grid && (
            <div className={styles.tableWrap}>
              <table className={styles.pairGrid}>
                <caption>
                  {v.kind === 'function'
                    ? 'Choose one point in each A column to make a function.'
                    : 'Select actual ordered pairs (A column, B row).'}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">B ↓ / A →</th>
                    {givens.A.map((a) => (
                      <th key={a} scope="col">
                        {a}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {givens.B.map((b) => (
                    <tr key={b}>
                      <th scope="row">{b}</th>
                      {givens.A.map((a) => (
                        <td key={a}>
                          <button
                            aria-label={`Pair (${a}, ${b})`}
                            aria-pressed={(v.build.pairs ?? []).some((pair) =>
                              pairEquals(pair, [a, b]),
                            )}
                            onClick={() => togglePair([a, b])}
                          >
                            {(v.build.pairs ?? []).some((pair) => pairEquals(pair, [a, b]))
                              ? '● selected'
                              : '○ unselected'}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className={styles.actions}>
            <button onClick={check}>
              {v.mode === 'boss'
                ? v.phase < 2
                  ? 'Check this connection'
                  : 'Check all connections'
                : v.mode === 'play'
                  ? 'Check this arrangement'
                  : 'Check my proof'}
            </button>
            <button onClick={next}>New variation</button>
            <button
              onClick={() => {
                write(
                  {
                    build: cloneSetBuild(v.mode === 'boss' ? boss.setup : challenge.setup),
                    phase: 0,
                  },
                  { step: 0, selection: null },
                );
              }}
            >
              Reset my arrangement
            </button>
            <button
              disabled={v.hint === 3}
              onClick={() => {
                const hint = Math.min(3, v.hint + 1);
                write({ hint });
                emitMascot(`hint-${hint}` as 'hint-1' | 'hint-2' | 'hint-3');
              }}
            >
              A small hint ({v.hint}/3)
            </button>
          </div>
          {v.hint > 0 && (
            <p className={styles.hint}>
              {(v.mode === 'boss' ? boss.hints : challenge.hints)[v.hint - 1]}
            </p>
          )}
          <p role="status">{status}</p>
        </section>
      )}
      <section className={styles.bridges} data-anchor-id="set-bridges">
        <h2>Follow the same structure</h2>
        {definition.bridges.map((bridge) => (
          <details key={bridge.id}>
            <summary>{bridge.title}</summary>
            <p>{bridge.description}</p>
            {bridge.labId === 'fractions' ? (
              <button
                onClick={() => {
                  useLesson.getState().set({
                    labId: 'fractions',
                    problem: '3/4 + 1/6',
                    variant: undefined,
                    step: 0,
                    selection: null,
                  });
                  location.hash = 'fractions';
                }}
              >
                Open Fractions <Icon name="ArrowUpRight" size={14} />
              </button>
            ) : bridge.labId === 'logic' ? (
              <button
                onClick={() => {
                  location.hash = 'logic';
                }}
              >
                Open Truth Lanterns <Icon name="ArrowUpRight" size={14} />
              </button>
            ) : (
              <span className={styles.comingSoon}>Coming soon on the Monomap</span>
            )}
          </details>
        ))}
        <details>
          <summary>Read the same result in Python and SQL</summary>
          <pre>
            <code>{solved.code.python}</code>
          </pre>
          <pre>
            <code>{solved.code.sql}</code>
          </pre>
          <p>Both snippets are curated descriptions of this exact selection.</p>
        </details>
      </section>
    </div>
  );
}
function ScopeEditor({ sets, onApply }: { sets: SetsConfig; onApply: (sets: SetsConfig) => void }) {
  const [fields, setFields] = useState(() => ({
    U: sets.U.join(', '),
    A: sets.A.join(', '),
    B: sets.B.join(', '),
    C: sets.C.join(', '),
  }));
  const [error, setError] = useState('');
  useEffect(
    () =>
      setFields({
        U: sets.U.join(', '),
        A: sets.A.join(', '),
        B: sets.B.join(', '),
        C: sets.C.join(', '),
      }),
    [sets],
  );
  return (
    <details className={styles.scope} data-anchor-id="set-inputs">
      <summary>Choose the universe and input sets</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const parsed = Object.fromEntries(
            (['U', 'A', 'B', 'C'] as const).map((name) => [name, parseSetMembers(fields[name])]),
          );
          if (!validSetConfig(parsed)) {
            setError(
              'Use at most 24 distinct integers. Every A, B and C element must belong to U.',
            );
            return;
          }
          onApply(cloneSetConfig(parsed));
          setError('');
        }}
      >
        <div>
          {(['U', 'A', 'B', 'C'] as const).map((name) => (
            <label key={name}>
              {name === 'U' ? 'Universe U' : `Set ${name}`}
              <input
                value={fields[name]}
                maxLength={250}
                onChange={(event) => setFields({ ...fields, [name]: event.target.value })}
              />
            </label>
          ))}
        </div>
        <button type="submit">Apply these inputs</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
  );
}
const regions = [
  { id: 'a', name: 'A only' },
  { id: 'both', name: 'A and B' },
  { id: 'b', name: 'B only' },
  { id: 'neither', name: 'Outside A and B' },
] as const;
function MembershipBoard({
  state,
  onMove,
  onFocus,
}: {
  state: SetsBuildState;
  onMove: (value: number, where: 'a' | 'b' | 'both' | 'neither') => void;
  onFocus: (value: number) => void;
}) {
  const board = useRef<HTMLDivElement>(null),
    ghostRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ value: number; x: number; y: number; moved: boolean } | null>(null);
  const drop = useRef<HTMLElement | null>(null);
  const suppressClick = useRef(false);
  const [ghost, setGhost] = useState<{ value: number; x: number; y: number } | null>(null);
  const finish = () => {
    drop.current?.removeAttribute('data-drag-over');
    drop.current = null;
    drag.current = null;
    setGhost(null);
  };
  useEffect(() => () => drop.current?.removeAttribute('data-drag-over'), []);
  const down = (event: ReactPointerEvent<HTMLButtonElement>, value: number) => {
    if (!event.isPrimary || event.button !== 0) return;
    suppressClick.current = false;
    drag.current = { value, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moving = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const current = drag.current;
    if (!current) return;
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) < 12)
      return;
    if (!current.moved) {
      current.moved = true;
      setGhost({ value: current.value, x: event.clientX, y: event.clientY });
    }
    if (ghostRef.current) {
      ghostRef.current.style.left = `${event.clientX}px`;
      ghostRef.current.style.top = `${event.clientY}px`;
    }
    const hovered =
      document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-set-drop]') ?? null;
    if (drop.current !== hovered) {
      drop.current?.removeAttribute('data-drag-over');
      drop.current = hovered && board.current?.contains(hovered) ? hovered : null;
      drop.current?.setAttribute('data-drag-over', 'true');
    }
  };
  return (
    <div ref={board} className={styles.board} aria-label="Drag elements between membership regions">
      {regions.map((region) => (
        <section
          key={region.id}
          data-set-drop={region.id}
          data-anchor-id={`set-drop-${region.id}`}
          aria-label={region.name}
        >
          <h3>{region.name}</h3>
          <div>
            {state.universe
              .filter((value) => {
                const a = state.a.includes(value),
                  b = state.b.includes(value);
                return region.id === (a ? (b ? 'both' : 'a') : b ? 'b' : 'neither');
              })
              .map((value) => (
                <button
                  className={styles.token}
                  key={value}
                  data-set-token={value}
                  data-anchor-id={`set-token-control-${setTokenId(value)}`}
                  aria-label={`Element ${value}, ${region.name}. Drag to change membership.`}
                  onPointerDown={(event) => down(event, value)}
                  onPointerMove={moving}
                  onPointerUp={() => {
                    const current = drag.current;
                    if (current?.moved) {
                      suppressClick.current = true;
                      const where = drop.current?.dataset.setDrop;
                      if (where && ['a', 'b', 'both', 'neither'].includes(where))
                        onMove(current.value, where as 'a' | 'b' | 'both' | 'neither');
                    }
                    finish();
                  }}
                  onPointerCancel={finish}
                  onClick={(event) => {
                    if (event.detail > 0 && suppressClick.current) {
                      suppressClick.current = false;
                      return;
                    }
                    onFocus(value);
                  }}
                >
                  {value}
                </button>
              ))}
          </div>
        </section>
      ))}
      {ghost && (
        <div
          ref={ghostRef}
          className={styles.dragGhost}
          style={{ left: ghost.x, top: ghost.y }}
          aria-hidden="true"
        >
          {ghost.value}
        </div>
      )}
    </div>
  );
}
