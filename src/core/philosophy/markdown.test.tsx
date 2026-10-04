import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { safeMarkdown } from './markdown';
describe('safe authored Markdown', () => {
  it('renders supported reading structure and keeps HTML, scripts and unsafe links literal', () => {
    const { container } = render(
      <article>
        {safeMarkdown(
          '# A question\n\n- First reason\n- Second reason\n\n1. Examine\n2. Reconsider\n\n> A thought\n\n<img src=x onerror=alert(1)>\n<script>alert(1)</script>\n[bad](javascript:alert(1))',
        )}
      </article>,
    );
    expect(screen.getByRole('heading', { name: 'A question' })).toBeInTheDocument();
    expect(screen.getAllByRole('list')).toHaveLength(2);
    expect(container.querySelector('blockquote')).toHaveTextContent('A thought');
    expect(container.querySelector('img, script, a')).toBeNull();
    expect(container).toHaveTextContent('<script>alert(1)</script>');
    expect(container).toHaveTextContent('[bad](javascript:alert(1))');
  });
});
