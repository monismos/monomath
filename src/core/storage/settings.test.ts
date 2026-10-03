import { describe, it, expect } from 'vitest';
import { useSettings } from './settings';
describe('persisted settings', () => {
  it('updates settings without changing other preferences', () => {
    useSettings.getState().set({ theme: 'blueprint' });
    expect(useSettings.getState().theme).toBe('blueprint');
    expect(useSettings.getState().holdDuration).toBe(500);
    expect(JSON.parse(localStorage.getItem('monomath-settings')!).state.theme).toBe('blueprint');
  });
});
