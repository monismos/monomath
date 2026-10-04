import type { ReactNode } from 'react';
/** Deliberately small Markdown subset. Raw HTML and link syntax remain literal text. */
export function safeMarkdown(body: string): ReactNode[] {
  const lines = body.replace(/\r\n?/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      const Tag = heading[1].length === 1 ? 'h2' : heading[1].length === 2 ? 'h3' : 'h4';
      nodes.push(<Tag key={i}>{heading[2]}</Tag>);
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const start = i,
        quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]))
        quote.push(lines[i++].replace(/^>\s?/, ''));
      nodes.push(<blockquote key={start}>{quote.join('\n')}</blockquote>);
      continue;
    }
    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const ordered = /^\d+\.\s+/.test(line),
        pattern = ordered ? /^\d+\.\s+/ : /^[-*]\s+/,
        start = i,
        items: ReactNode[] = [];
      while (i < lines.length && pattern.test(lines[i])) {
        items.push(<li key={i}>{lines[i].replace(pattern, '')}</li>);
        i++;
      }
      nodes.push(ordered ? <ol key={start}>{items}</ol> : <ul key={start}>{items}</ul>);
      continue;
    }
    const start = i,
      paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      (i === start || !/^(#{1,3}\s|>\s?|[-*]\s|\d+\.\s)/.test(lines[i]))
    )
      paragraph.push(lines[i++]);
    nodes.push(<p key={start}>{paragraph.join('\n')}</p>);
  }
  return nodes;
}
