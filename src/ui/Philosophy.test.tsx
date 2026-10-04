import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { PhilosophyRepository as Repository } from '../core/philosophy/repository';
import { PhilosophyRepository } from '../core/philosophy/repository';
import type { Lesson } from '../core/philosophy/types';
import { useLesson } from '../core/scene/store';
import Philosophy from './Philosophy';
const holder = vi.hoisted(() => ({ current: null as Repository | null }));
vi.mock('../core/philosophy/repository', async (original) => {
  const actual = await original<typeof import('../core/philosophy/repository')>();
  const proxy = new Proxy(
    {},
    {
      get: (_target, key) => {
        if (!holder.current) throw new Error('A test repository must be installed.');
        return Reflect.get(holder.current, key);
      },
    },
  );
  return { ...actual, philosophy: proxy };
});
const authored: Lesson = {
  id: 'my-first-question',
  title: 'Whose reason is it?',
  question: 'Can a reason be borrowed?',
  body: 'A first paragraph.',
  author: 'Airator',
  tags: ['reason'],
  references: [],
  createdAt: 100,
  updatedAt: 100,
};
const memoryAdapter = () => {
  let data: unknown;
  return {
    load: async () => structuredClone(data),
    save: async (_key: string, value: unknown) => {
      data = structuredClone(value);
      return true;
    },
  };
};
describe('Philosophy author and reader controls', () => {
  beforeEach(() => {
    localStorage.clear();
    holder.current = new PhilosophyRepository(memoryAdapter(), [], false);
    useLesson
      .getState()
      .set({ labId: 'demo', problem: '3/4', selection: null, step: 0, variant: undefined });
  });
  it('creates, edits, resumes a draft, saves a private reflection, searches, and undoes a deletion', async () => {
    render(<Philosophy />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add a lesson' }));
    const title = await screen.findByLabelText('Lesson title');
    fireEvent.change(title, { target: { value: 'What do I owe a stranger?' } });
    fireEvent.change(screen.getByLabelText(/^Lesson body/), {
      target: { value: '# Begin by noticing\nA question worth keeping.' },
    });
    fireEvent.change(screen.getByLabelText(/^Tags, separated by commas/), {
      target: { value: 'care, ethics' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save lesson' }));
    await screen.findByRole('button', { name: 'Edit lesson' });
    expect(holder.current?.getSnapshot().data.lessons[0].author).toBe('Airator');
    expect(screen.getByRole('heading', { name: 'Begin by noticing' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your private reflection'), {
      target: { value: 'I changed my mind about distance.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save reflection' }));
    await screen.findByText('Private reflection saved locally.');
    fireEvent.click(screen.getByRole('button', { name: 'Edit lesson' }));
    fireEvent.change(await screen.findByLabelText('Lesson title'), {
      target: { value: 'Care across distance' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Keep draft and close' }));
    const resume = await screen.findByRole('button', { name: /Resume Care across distance/ });
    fireEvent.click(resume);
    expect(await screen.findByLabelText('Lesson title')).toHaveValue('Care across distance');
    fireEvent.click(screen.getByRole('button', { name: 'Save lesson' }));
    await screen.findByRole('button', { name: 'Edit lesson' });
    expect(holder.current?.getSnapshot().data.drafts).toEqual([]);
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search Philosophy lessons' }), {
      target: { value: 'no-match' },
    });
    expect(screen.getByText('No lessons match yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search and filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete lesson Care across distance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete lesson' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Undo delete' }));
    await screen.findByRole('button', { name: 'Edit lesson' });
    expect(holder.current?.getSnapshot().data.lessons[0].title).toBe('Care across distance');
    expect(screen.getByLabelText('Your private reflection')).toHaveValue(
      'I changed my mind about distance.',
    );
  });
  it('restores an incoming lesson context after loading and reacts to another Jump', async () => {
    const second = { ...authored, id: 'second-question', title: 'What changes a belief?' };
    holder.current = new PhilosophyRepository(memoryAdapter(), [authored, second], false);
    useLesson.getState().set({ labId: 'philosophy', problem: second.id });
    render(<Philosophy />);
    await screen.findByRole('button', { name: 'Edit lesson' });
    const reader = document.querySelector(
      `[data-anchor-id="philosophy-lesson-${second.id}"]`,
    ) as HTMLElement;
    expect(
      within(reader).getByRole('heading', { level: 2, name: second.title }),
    ).toBeInTheDocument();
    act(() => useLesson.getState().set({ labId: 'philosophy', problem: authored.id }));
    await waitFor(() =>
      expect(
        document.querySelector(`[data-anchor-id="philosophy-lesson-${authored.id}"]`),
      ).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Your private reflection')).toHaveValue('');
  });
  it('reports a session-only save when storage stops accepting writes', async () => {
    let durable = true;
    holder.current = new PhilosophyRepository(
      { load: async () => undefined, save: async () => durable },
      [],
      false,
    );
    render(<Philosophy />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add a lesson' }));
    fireEvent.change(await screen.findByLabelText('Lesson title'), {
      target: { value: 'A kept question' },
    });
    fireEvent.change(screen.getByLabelText(/^Lesson body/), {
      target: { value: 'I can still export this lesson.' },
    });
    durable = false;
    fireEvent.click(screen.getByRole('button', { name: 'Save lesson' }));
    await screen.findByText('Lesson ready for this session. Export a backup before leaving.');
    expect(screen.getByRole('alert')).toHaveTextContent('Browser storage is unavailable.');
    expect(screen.getByRole('button', { name: 'Export JSON' })).toBeEnabled();
  });
});
