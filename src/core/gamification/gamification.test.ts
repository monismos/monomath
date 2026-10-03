import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { addLocalDays, emptyRhythm, localDay, visitDay, weekKey } from './calendar';
import { gameConfig } from './gameConfig';
import { awardEvent, dailyTasks, initialGame, levelForXP, recordEvent } from './logic';
import { dueItems, initialSchedule, scheduleReview } from './srs';
import { isMastered } from './types';
import { achievements, cosmeticUnlocked } from './achievements';
import { useGame, validGame, exportProgress } from './store';
import type { Notelet } from '../notelets/types';
const now = new Date(2026, 9, 5, 12, 30).getTime();
const note = (id = 'note-one'): Notelet => ({
  id,
  text: 'The denominator counts equal parts of one whole.',
  color: 'sun',
  createdAt: now,
  updatedAt: now,
  starred: true,
  context: {
    labId: 'demo',
    problem: '3/4',
    step: 1,
    dial: 1,
    selection: null,
    route: 'workshop',
    screen: 'scene',
    dimension: '2d',
    theme: 'bench',
  },
  anchor: { type: 'screen', nx: 0.5, ny: 0.5 },
});
describe('award ledger and local daily rhythm', () => {
  it('uses the configured values and never awards the same completion twice', () => {
    let data = initialGame();
    for (const kind of ['watch', 'predict', 'play', 'prove', 'boss', 'echo', 'notelet'] as const) {
      const result = awardEvent(data, kind, 'one', now, 'fractions');
      expect(result.xp).toBe(gameConfig.xp[kind]);
      data = result.data;
      expect(awardEvent(data, kind, 'one', now, 'fractions').data).toBe(data);
    }
    expect(awardEvent(data, 'predict', 'hinted', now, 'fractions', true).xp).toBe(5);
  });
  it('caps note XP at five each local day but retains the completion ledger', () => {
    let data = initialGame();
    for (let i = 0; i < 7; i++) data = awardEvent(data, 'notelet', `n${i}`, now).data;
    expect(data.xp).toBe(15);
    expect(Object.keys(data.ledger)).toHaveLength(7);
    data = awardEvent(data, 'notelet', 'tomorrow', addLocalDays(now, 1)).data;
    expect(data.xp).toBe(18);
  });
  it('uses cumulative exact thresholds without an unbounded search', () => {
    for (let level = 1; level < 50; level++) {
      const xp = gameConfig.levelThreshold(level);
      expect(levelForXP(xp - 1)).toBe(level - 1);
      expect(levelForXP(xp)).toBe(level);
    }
    expect(levelForXP(1e300)).toBeGreaterThan(0);
    expect(levelForXP(Infinity)).toBe(0);
  });
  it('requires all facets and successful Echoes on distinct local dates', () => {
    let data = initialGame();
    for (const kind of ['watch', 'play', 'prove'] as const)
      data = awardEvent(data, kind, kind, now, 'fractions').data;
    data = awardEvent(data, 'echo', 'first', now, 'fractions').data;
    data = awardEvent(data, 'echo', 'second-same-day', now, 'fractions').data;
    expect(isMastered(data.gems.fractions)).toBe(false);
    data = awardEvent(data, 'echo', 'next-day', addLocalDays(now, 1), 'fractions').data;
    expect(isMastered(data.gems.fractions)).toBe(true);
    expect(isMastered({ ...data.gems.fractions, prove: false })).toBe(false);
  });
  it('offers one missed-day freeze per week, then a kind new start', () => {
    let rhythm = visitDay(emptyRhythm(), now);
    rhythm = visitDay(rhythm, addLocalDays(now, 2));
    expect(rhythm.streak).toBe(2);
    expect(rhythm.frozenDays).toEqual([localDay(addLocalDays(now, 1))]);
    rhythm = visitDay(rhythm, addLocalDays(now, 4));
    expect(rhythm.streak).toBe(1);
    expect(rhythm.best).toBe(2);
    expect(visitDay(rhythm, addLocalDays(now, 4))).toBe(rhythm);
    rhythm = visitDay(rhythm, addLocalDays(now, 5));
    rhythm = visitDay(rhythm, addLocalDays(now, 7));
    expect(rhythm.streak).toBe(3);
    expect(rhythm.freezeWeek).toBe(weekKey(localDay(addLocalDays(now, 7))));
  });
  it('keeps daily tasks attainable again after midnight and requires two layers on one topic', () => {
    let data = recordEvent(initialGame(), 'dial', 'demo:thing', now, 'demo');
    data = recordEvent(data, 'dial', 'another:symbol', now, 'another');
    expect(dailyTasks(data, now)[1].done).toBe(false);
    data = recordEvent(data, 'dial', 'demo:symbol', now, 'demo');
    data = recordEvent(data, 'tether', 'tap', now, 'demo');
    data = awardEvent(data, 'notelet', 'thought', now, 'demo').data;
    expect(dailyTasks(data, now).every((t) => t.done)).toBe(true);
    const tomorrow = addLocalDays(now, 1);
    expect(dailyTasks(data, tomorrow).every((t) => !t.done)).toBe(true);
    data = recordEvent(data, 'dial', 'demo:thing', tomorrow, 'demo');
    data = recordEvent(data, 'dial', 'demo:symbol', tomorrow, 'demo');
    expect(dailyTasks(data, tomorrow)[1].done).toBe(true);
  });
  it('contains 24 honest achievements and only earns cosmetics from real events', () => {
    expect(achievements).toHaveLength(24);
    expect(achievements.every((a) => !a.earned(initialGame()))).toBe(true);
    const data = awardEvent(initialGame(), 'notelet', 'thought', now).data;
    expect(cosmeticUnlocked(data, 'sunhat')).toBe(true);
    expect(cosmeticUnlocked(data, 'starcap')).toBe(false);
  });
});
describe('injected-clock Leitner scheduling', () => {
  it('schedules 1/3/7/14 local days; Again resets and Good retains the last box', () => {
    let s = initialSchedule(now);
    expect(s.dueAt).toBe(addLocalDays(now, 1));
    for (const [box, days] of [
      [1, 3],
      [2, 7],
      [3, 14],
      [3, 14],
    ] as const) {
      s = scheduleReview(s, 'good', s.dueAt);
      expect(s.box).toBe(box);
      expect(s.dueAt).toBe(addLocalDays(s.reviewedAt!, days));
    }
    s = scheduleReview(s, 'again', s.dueAt);
    expect(s.box).toBe(0);
    expect(s.dueAt).toBe(addLocalDays(s.reviewedAt!, 1));
  });
  it('orders due cards stably and does not count two same-day successes twice', () => {
    const s = initialSchedule(now);
    const items = [
      { id: 'b', schedule: { ...s, dueAt: now } },
      { id: 'a', schedule: { ...s, dueAt: now } },
      { id: 'c', schedule: s },
    ];
    expect(dueItems(items, now).map((e) => e.id)).toEqual(['a', 'b']);
    const good = scheduleReview(scheduleReview(s, 'good', now), 'good', now + 1000);
    expect(good.successes).toEqual([localDay(now)]);
  });
});
describe('persistent progress and review integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    useGame.getState().reset();
  });
  afterEach(() => vi.useRealTimers());
  it('restores XP, facets and Echo schedules after hydration', async () => {
    const g = useGame.getState();
    g.award('watch', 'worked', 'demo');
    g.syncNoteEcho(note());
    const saved = exportProgress();
    useGame.setState({ ...initialGame() });
    localStorage.setItem('monomath-progress', JSON.stringify({ state: saved, version: 1 }));
    await useGame.persist.rehydrate();
    expect(useGame.getState().xp).toBe(5);
    expect(useGame.getState().gems.demo.observe).toBe(true);
    expect(useGame.getState().echoes[0].schedule.dueAt).toBe(addLocalDays(now, 1));
  });
  it('rates only due cards once, advances fresh challenge seeds and never rewards Again', () => {
    const g = useGame.getState();
    g.queueChallengeEcho({
      skillId: 'fraction-count',
      key: 'miss',
      labId: 'demo',
      seed: 17,
      prompt: 'Count equal parts',
    });
    const id = useGame.getState().echoes[0].id;
    expect(g.rateEcho(id, 'good')).toBe(false);
    vi.setSystemTime(addLocalDays(now, 1));
    expect(g.rateEcho(id, 'again')).toBe(true);
    expect(useGame.getState().xp).toBe(0);
    const changed = useGame.getState().echoes[0];
    expect(changed.kind === 'challenge' && changed.seed).not.toBe(17);
    expect(g.rateEcho(id, 'again')).toBe(false);
    vi.setSystemTime(changed.schedule.dueAt);
    expect(g.rateEcho(id, 'good')).toBe(true);
    expect(useGame.getState().xp).toBe(8);
    expect(g.rateEcho(id, 'good')).toBe(false);
  });
  it('syncs stars and explicit Echo choices without resetting an existing schedule', () => {
    const g = useGame.getState();
    g.syncNoteEcho(note());
    const due = useGame.getState().echoes[0].schedule.dueAt;
    vi.setSystemTime(addLocalDays(now, 1));
    g.syncNoteEcho({ ...note(), text: 'A changed thought' });
    expect(useGame.getState().echoes[0].schedule.dueAt).toBe(due);
    g.syncNoteEcho({ ...note(), starred: false });
    expect(useGame.getState().echoes).toHaveLength(0);
    g.syncNoteEcho({ ...note(), starred: false, echo: true });
    expect(useGame.getState().echoes).toHaveLength(1);
    g.removeNoteEcho(note().id);
    expect(useGame.getState().echoes).toHaveLength(0);
  });
  it('sanitizes imports and rejects corrupt schedules or calendar data', () => {
    const g = useGame.getState();
    expect(g.importProgress({ ...initialGame(), award: null })).toBe(true);
    expect(typeof useGame.getState().award).toBe('function');
    expect(validGame({ ...initialGame(), xp: 1e300 })).toBe(false);
    expect(validGame({ ...initialGame(), rhythm: { ...emptyRhythm(), lastDay: 4 } })).toBe(false);
    g.syncNoteEcho(note());
    const value = exportProgress();
    expect(
      validGame({
        ...value,
        echoes: [{ ...value.echoes[0], schedule: { ...value.echoes[0].schedule, dueAt: 1e300 } }],
      }),
    ).toBe(false);
    expect(validGame({ ...value, echoes: [value.echoes[0], value.echoes[0]] })).toBe(false);
  });
  it('remains usable when storage throws, without a recursive microtask loop', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    useGame.getState().award('watch', 'memory-only', 'demo');
    await vi.runAllTimersAsync();
    expect(useGame.getState().xp).toBe(5);
    expect(useGame.getState().unavailable).toBe(true);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(2);
    spy.mockRestore();
  });
});
