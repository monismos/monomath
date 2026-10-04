import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import CodeSnippet from './CodeSnippet';

afterEach(cleanup);
it('connects curated SQL identifiers to the same scene tethers as the symbols', () => {
  const select = vi.fn();
  const { rerender } = render(
    <CodeSnippet
      code="SELECT value FROM A UNION SELECT value FROM B;"
      selection="a"
      bindings={{ A: 'a', B: 'b' }}
      onSelect={select}
    />,
  );
  expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'B' })).toHaveClass('tk-b');
  fireEvent.click(screen.getByRole('button', { name: 'B' }));
  expect(select).toHaveBeenLastCalledWith('b');
  rerender(
    <CodeSnippet code="A + B" selection="b" bindings={{ A: 'a', B: 'b' }} onSelect={select} />,
  );
  expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.pointerEnter(screen.getByRole('button', { name: 'A' }));
  expect(select).toHaveBeenLastCalledWith('a');
  fireEvent.pointerLeave(screen.getByRole('button', { name: 'A' }));
  expect(select).toHaveBeenLastCalledWith(null);
});

it('keeps comments, strings and markup as literal text without linking their identifiers', () => {
  const { container } = render(
    <CodeSnippet
      code={'-- A is a table\nSELECT "A", \'B\', "<img src=x>";'}
      selection={null}
      bindings={{ A: 'a', B: 'b' }}
      onSelect={vi.fn()}
    />,
  );
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(container.querySelector('img')).toBeNull();
  expect(container.textContent).toContain('<img src=x>');
});
