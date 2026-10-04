import { useEffect, useRef } from 'react';
import 'katex/dist/katex.min.css';
export default function MathText({
  tex,
  selection,
  onSelect,
  colors,
}: {
  tex: string;
  selection?: string | null;
  onSelect?: (id: string | null) => void;
  colors?: Record<string, string>;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let alive = true;
    import('katex').then((katex) => {
      if (!alive || !ref.current) return;
      katex.default.render(tex, ref.current, {
        throwOnError: false,
        output: 'htmlAndMathml',
        trust: (context) => context.command === '\\htmlClass' || context.command === '\\htmlData',
        strict: 'ignore',
      });
      ref.current.querySelectorAll<HTMLElement>('[class*=tk-]').forEach((node) => {
        const id = [...node.classList].find((name) => name.startsWith('tk-'))?.slice(3);
        node.style.borderBottom = id && colors?.[id] ? `2px solid ${colors[id]}` : '';
        node.style.borderRadius = '4px';
        node.style.backgroundColor = id && id === selection ? '#FFE06660' : '';
      });
    });
    return () => {
      alive = false;
    };
  }, [tex, colors, selection]);
  useEffect(() => {
    ref.current?.querySelectorAll<HTMLElement>('[class*=tk-]').forEach((node) => {
      node.style.borderRadius = '4px';
      node.style.backgroundColor =
        selection && node.classList.contains(`tk-${selection}`) ? '#FFE06660' : '';
    });
  }, [selection]);
  return (
    <span
      ref={ref}
      onPointerOver={(event) => {
        const target = (event.target as HTMLElement).closest('[class*=tk-]');
        const id = target?.className
          .split(' ')
          .find((c) => c.startsWith('tk-'))
          ?.slice(3);
        if (id) onSelect?.(id);
      }}
      onPointerLeave={() => onSelect?.(null)}
      onClick={(event) => {
        const target = (event.target as HTMLElement).closest('[class*=tk-]');
        const id = target?.className
          .split(' ')
          .find((c) => c.startsWith('tk-'))
          ?.slice(3);
        if (id) onSelect?.(id);
      }}
    >
      {tex}
    </span>
  );
}
