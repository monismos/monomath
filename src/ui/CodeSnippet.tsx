import styles from './CodeSnippet.module.css';
// Curated snippets only: tokenisation colours text; it never executes it.
export default function CodeSnippet({
  code,
  selection,
  onSelect,
  bindings = { left: 'left', right: 'right', result: 'result' },
  colors,
}: {
  code: string;
  selection: string | null;
  onSelect: (id: string | null) => void;
  bindings?: Record<string, string>;
  colors?: Record<string, string>;
}) {
  return (
    <code>
      {code.split('\n').map((line, index) => (
        <span className={styles.line} key={index}>
          <span className={styles.number}>{index + 1}</span>
          {line
            .split(/(#[^\n]*|--[^\n]*|"[^"]*"|'[^']*'|\b[A-Za-z_][A-Za-z0-9_]*\b|\b\d+\b)/g)
            .map((part, i) =>
              Object.hasOwn(bindings, part) ? (
                <button
                  key={i}
                  className={`tk-${bindings[part]} ${styles.token}`}
                  style={
                    colors?.[bindings[part]]
                      ? { borderBottom: `2px solid ${colors[bindings[part]]}` }
                      : undefined
                  }
                  aria-pressed={selection === bindings[part]}
                  onPointerEnter={() => onSelect(bindings[part])}
                  onPointerLeave={() => onSelect(null)}
                  onClick={() => onSelect(bindings[part])}
                >
                  {part}
                </button>
              ) : (
                <span
                  key={i}
                  className={
                    part.startsWith('#') || part.startsWith('--')
                      ? styles.comment
                      : /^\d+$/.test(part)
                        ? styles.numeric
                        : /^(from|import|print|return|for|in|if|else|def|select|distinct|union|intersect|except|cross|join|where|as|order|by|group|sum|and|or|not|true|false)$/.test(
                              part.toLowerCase(),
                            )
                          ? styles.keyword
                          : undefined
                  }
                >
                  {part}
                </span>
              ),
            )}
        </span>
      ))}
    </code>
  );
}
