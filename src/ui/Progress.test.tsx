import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Progress from './Progress';
import Echoes from './Echoes';
import TrophyShelf from './TrophyShelf';
import { useGame } from '../core/gamification/store';
import { useNotes } from '../core/notelets/store';
import { useSettings } from '../core/storage/settings';
import { initialGame } from '../core/gamification/logic';
import { registerEchoProvider } from '../core/gamification/echoProviders';
import type { Notelet } from '../core/notelets/types';
const now = new Date(2026, 9, 5, 12).getTime();
const note: Notelet = {
  id: 'recall-note',
  text: 'The denominator counts equal parts, not shaded parts.',
  color: 'sun',
  createdAt: now,
  updatedAt: now,
  starred: true,
  context: {
    labId: 'demo',
    problem: '3/4',
    step: 1,
    dial: 2,
    selection: null,
    route: 'workshop',
    screen: 'scene',
    dimension: '2d',
    theme: 'bench',
  },
  anchor: { type: 'screen', nx: 0.5, ny: 0.5 },
};
describe('visible motivation controls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    useGame.setState({ ...initialGame(), unavailable: false });
    useNotes.setState({ notes: [note] });
    useSettings.getState().set({ dimension: '2d' });
  });
  afterEach(() => vi.useRealTimers());
  it('offers three real daily actions and never awards progress by rendering', () => {
    const task = vi.fn();
    render(<Progress onTask={task} />);
    fireEvent.click(screen.getByRole('button', { name: /follow one symbol/i }));
    expect(task).toHaveBeenCalledWith('tether');
    expect(screen.getByRole('button', { name: /try two layers/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save one thought/i })).toBeInTheDocument();
    expect(useGame.getState().xp).toBe(0);
  });
  it('requires Reveal before a notelet recall can be rated', () => {
    useGame.getState().syncNoteEcho(note);
    vi.setSystemTime(useGame.getState().echoes[0].schedule.dueAt);
    render(<Echoes />);
    expect(screen.queryByRole('button', { name: /Good/ })).not.toBeInTheDocument();
    expect(screen.queryByText(note.text)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal your note' }));
    expect(screen.getByText(note.text)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Good/ }));
    expect(useGame.getState().xp).toBe(8);
    expect(screen.getByText('Room to let things settle')).toBeInTheDocument();
  });
  it('requires a correct fresh skill answer before Good and provides an actual hint ladder', () => {
    const unregister = registerEchoProvider('parts', (seed) => ({
      prompt: `How many equal parts? (${seed})`,
      check: (answer) => answer === '4',
      hints: [
        'Count every part.',
        'Shaded and plain parts both count.',
        'There are four equal parts.',
      ],
      explanation: 'Four equal parts make one whole.',
    }));
    useGame
      .getState()
      .queueChallengeEcho({
        skillId: 'parts',
        key: 'miss',
        labId: 'demo',
        seed: 3,
        prompt: 'Count equal parts',
      });
    vi.setSystemTime(useGame.getState().echoes[0].schedule.dueAt);
    render(<Echoes />);
    fireEvent.change(screen.getByLabelText('Your prediction'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.queryByRole('button', { name: /Good/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'A small hint' }));
    expect(screen.getByText('Count every part.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your prediction'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Check prediction' }));
    expect(screen.getByText('Four equal parts make one whole.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Good/ }));
    expect(useGame.getState().xp).toBe(8);
    act(unregister);
  });
  it('shows locked achievements honestly and only applies an earned guide item', () => {
    useGame.getState().award('notelet', 'first', 'demo');
    render(<TrophyShelf />);
    expect(screen.getByRole('button', { name: /Star cap/ })).toBeDisabled();
    const sunhat = screen.getByRole('button', { name: /Sun hat/ });
    expect(sunhat).toBeEnabled();
    fireEvent.click(sunhat);
    expect(useGame.getState().cosmetics.selected).toBe('sunhat');
    expect(
      screen.getByText('1 of 24 earned. Every locked trophy tells you its condition.'),
    ).toBeInTheDocument();
  });
});
