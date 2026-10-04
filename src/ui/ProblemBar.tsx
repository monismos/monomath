import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useLesson } from '../core/scene/store';
import { Icon } from './Icon';
import styles from './ProblemBar.module.css';
const MathText = lazy(() => import('./MathText'));
export function ProblemBar({
  value,
  examples,
  onSolve,
  placeholder = '3/4 + 1/6',
  unsupportedMessage = 'Try a supported fraction example, or study this equation in the graph workspace.',
  graphLink = true,
  historyKey = 'monomath-problems',
  keypadKeys,
  preview,
}: {
  value: string;
  examples: string[];
  onSolve: (input: string) => boolean;
  placeholder?: string;
  unsupportedMessage?: string;
  graphLink?: boolean;
  historyKey?: string;
  keypadKeys?: string[];
  preview?: (input: string) => string;
}) {
  const [input, setInput] = useState(value);
  const [error, setError] = useState('');
  const [keypad, setKeypad] = useState(matchMedia('(pointer: coarse)').matches);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(historyKey) ?? '[]')
        .filter((v: unknown) => typeof v === 'string' && v.length <= 512)
        .slice(0, 12);
    } catch {
      return [];
    }
  });
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => setInput(value), [value]);
  const solve = (problem = input) => {
    if (onSolve(problem)) {
      setInput(problem);
      setError('');
      const next = [problem, ...history.filter((p) => p !== problem)].slice(0, 12);
      setHistory(next);
      try {
        localStorage.setItem(historyKey, JSON.stringify(next));
      } catch {
        /* Existing lesson remains usable. */
      }
    } else setError(unsupportedMessage);
  };
  const insert = (token: string) => {
    const start = field.current?.selectionStart ?? input.length;
    const end = field.current?.selectionEnd ?? start;
    setInput(input.slice(0, start) + token + input.slice(end));
    field.current?.focus();
    setTimeout(
      () => field.current?.setSelectionRange(start + token.length, start + token.length),
      0,
    );
  };
  return (
    <section className={styles.problem} aria-label="Problem bar" data-anchor-id="problem-bar">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          solve();
        }}
      >
        <label htmlFor="problem-input">
          <Icon name="Pencil" size={16} />
          What shall we explore?
        </label>
        <div className={styles.inputRow}>
          <input
            id="problem-input"
            ref={field}
            value={input}
            maxLength={512}
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit">
            Show the steps
            <Icon name="ArrowRight" size={16} />
          </button>
          <button
            type="button"
            className={styles.keypadToggle}
            aria-label="Show math keypad"
            aria-expanded={keypad}
            onClick={() => setKeypad(!keypad)}
          >
            ⌨
          </button>
        </div>
      </form>
      <div className={styles.preview} aria-label="Equation preview">
        <Suspense fallback={input}>
          <MathText
            tex={
              preview
                ? preview(input)
                : input
                    .replace(/(-?\d+)\s*\/\s*(\d+)/g, '\\frac{$1}{$2}')
                    .replace(/×/g, '\\times ')
                    .replace(/÷/g, '\\div ')
            }
          />
        </Suspense>
      </div>
      {keypad && (
        <div className={styles.keypad} aria-label="Math keypad">
          {(
            keypadKeys ?? [
              '7',
              '8',
              '9',
              '/',
              '4',
              '5',
              '6',
              '+',
              '1',
              '2',
              '3',
              '−',
              '0',
              '(',
              ')',
              '×',
              '÷',
              '^',
              '√',
              'Σ',
              '∪',
              '∩',
              '∈',
              '⊂',
              '¬',
              '∧',
              '∨',
              '→',
              '↔',
              '[',
              ']',
            ]
          ).map((key) => (
            <button key={key} onClick={() => insert(key)}>
              {key}
            </button>
          ))}
        </div>
      )}
      <div className={styles.examples} aria-label="Worked examples">
        {examples.map((example) => (
          <button key={example} onClick={() => solve(example)}>
            {example}
          </button>
        ))}
        <button
          className={styles.surprise}
          disabled={examples.length === 0}
          onClick={() => solve(examples[Math.floor(Math.random() * examples.length)])}
        >
          <Icon name="Sparkles" size={13} />
          Surprise me
        </button>
      </div>
      <div className={styles.tools}>
        {graphLink && (
          <button
            onClick={() => {
              useLesson
                .getState()
                .set({ labId: 'equations', problem: input, step: 0, selection: null });
              location.hash = 'equations';
            }}
          >
            Study as a graph
            <Icon name="ArrowUpRight" size={13} />
          </button>
        )}
        {history.length > 0 && (
          <select aria-label="Problem history" value="" onChange={(e) => solve(e.target.value)}>
            <option value="">Recent problems</option>
            {history.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        )}
      </div>
      {error && (
        <p role="status">
          {error} Examples: {examples.slice(0, 3).join('; ')}.
        </p>
      )}
    </section>
  );
}
