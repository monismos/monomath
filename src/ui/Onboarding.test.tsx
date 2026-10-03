import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { Onboarding } from './Onboarding';
import { useSettings } from '../core/storage/settings';
import { useLesson } from '../core/scene/store';
afterEach(cleanup);
it('advances the dial lesson on learner action and can be skipped', () => {
  useSettings.setState({ tutorialComplete: false, tutorialStep: 1 });
  useLesson.setState({ dial: 0 });
  render(<Onboarding />);
  expect(screen.getByText('Let the symbols grow.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Explore on my own' }));
  expect(useSettings.getState().tutorialComplete).toBe(true);
});
it('recognises an existing symbol dial instead of claiming a timer completed it', () => {
  useSettings.setState({ tutorialComplete: false, tutorialStep: 1 });
  useLesson.setState({ dial: 2 });
  render(<Onboarding />);
  expect(useSettings.getState().tutorialStep).toBe(2);
});
