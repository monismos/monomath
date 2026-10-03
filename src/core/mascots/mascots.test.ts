import { describe, it, expect, vi } from 'vitest';
import { cast, resolveGuide } from './config';
import { dialogue, dialogueCooldown, DialogueQueue, facts, tips } from './dialogue/lines';
import { blinkAt, eventExpression, targetLook } from './pose';
import { emitMascot, subscribeMascot } from './events';
import { addBondMinute, getBond } from './bond';
describe('one-eyed guide contract', () => {
  it('resolves explicit, per-domain, quiet and off settings', () => {
    expect(resolveGuide('auto', 'logic')?.id).toBe('lumi');
    expect(resolveGuide('quiet', 'code')?.id).toBe('bit');
    expect(resolveGuide('moni', 'physics')?.id).toBe('moni');
    expect(resolveGuide('off', 'math')).toBeNull();
    expect(Object.keys(cast)).toHaveLength(5);
  });
  it('has at least three brief variants per event and domain fact', () => {
    Object.values(dialogue).forEach((lines) => {
      expect(lines.length).toBeGreaterThanOrEqual(3);
      lines.forEach((line) => expect(line.trim().split(/\s+/).length).toBeLessThanOrEqual(12));
    });
    [...Object.values(facts).flat(), ...tips].forEach((line) =>
      expect(line.trim().split(/\s+/).length).toBeLessThanOrEqual(12),
    );
  });
  it('enforces eight seconds globally while rotating event variants', () => {
    const queue = new DialogueQueue();
    expect(queue.next('correct', 0)).toBe(dialogue.correct[0]);
    expect(queue.next('wrong', 7999)).toBeNull();
    expect(queue.next('correct', dialogueCooldown)).toBe(dialogue.correct[1]);
    expect(queue.claim(dialogueCooldown + 100)).toBe(false);
    expect(queue.next('correct', dialogueCooldown * 2)).toBe(dialogue.correct[2]);
  });
  it('uses bounded screen coordinates and semantic reactions', () => {
    expect(targetLook({ x: 0, y: 0 }, { x: 999, y: -999 })).toEqual({ x: 1, y: -1 });
    expect(targetLook({ x: 10, y: 10 }, { x: 10, y: 10 })).toEqual({ x: 0, y: 0 });
    expect(blinkAt(70)).toBeCloseTo(0.07);
    expect(blinkAt(300)).toBe(1);
    expect(eventExpression('wrong')).toBe('encourage');
    expect(eventExpression('correct')).toBe('celebrate');
  });
  it('unsubscribes reactions and persists actual together minutes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeMascot(listener);
    emitMascot('correct');
    unsubscribe();
    emitMascot('wrong');
    expect(listener).toHaveBeenCalledExactlyOnceWith('correct');
    localStorage.removeItem('monomath-guide-bond');
    expect(getBond('moni')).toBe(0);
    for (let minute = 0; minute < 20; minute++) addBondMinute('moni');
    expect(getBond('moni')).toBe(20);
    expect(getBond('lumi')).toBe(0);
  });
});
