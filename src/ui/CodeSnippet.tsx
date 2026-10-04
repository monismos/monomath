import styles from './CodeSnippet.module.css';
// Curated snippets only: tokenisation colours text; it never executes it.
export default function CodeSnippet({
  code,
  selection,
  onSelect,
}: {
  code: string;
  selection: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <code>
      {code.split('\n').map((line, index) => (
        <span className={styles.line} key={index}>
          <span className={styles.number}>{index + 1}</span>
          {line
            .split(
              /(#[^\n]*|\b(?:from|import|print|return|for|in|if|else|def)\b|\b\d+\b|\b(?:left|right|result)\b)/g,
            )
            .map((part, i) =>
              ['left', 'right', 'result'].includes(part) ? (
                <button
                  key={i}
                  className={`tk-${part} ${styles.token}`}
                  aria-pressed={selection === part}
                  onPointerEnter={() => onSelect(part)}
                  onPointerLeave={() => onSelect(null)}
                  onClick={() => onSelect(part)}
                >
                  {part}
                </button>
              ) : (
                <span
                  key={i}
                  className={
                    part.startsWith('#')
                      ? styles.comment
                      : /^\d+$/.test(part)
                        ? styles.numeric
                        : /^(from|import|print|return|for|in|if|else|def)$/.test(part)
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
