import { useNotes } from '../notelets/store';
import type { Notelet } from '../notelets/types';
import { useSettings } from '../storage/settings';
import { useGame, syncNoteEcho, removeNoteEcho } from '../gamification/store';
import { registerEchoProvider } from '../gamification/echoProviders';
import { emitMascot } from '../mascots/events';
import { sound } from '../audio/sounds';
import { levelForXP } from '../gamification/logic';
let reminded = false;
export function installProgressEvents() {
  let disposeFractions: (() => void) | undefined;
  let disposeSets: (() => void) | undefined;
  let disposeLogic: (() => void) | undefined;
  let disposeSummation: (() => void) | undefined;
  let active = true;
  import('../../labs/math/fractions/echo').then((module) => {
    if (active) disposeFractions = module.installFractionEchoes();
  });
  import('../../labs/math/sets/echo').then((module) => {
    if (active) disposeSets = module.installSetsEchoes();
  });
  import('../../labs/logic/echo').then((module) => {
    if (active) disposeLogic = module.installLogicEchoes();
  });
  import('../../labs/stats/summation/echo').then((module) => {
    if (active) disposeSummation = module.installSummationEchoes();
  });
  registerEchoProvider('demo-fraction', (seed) => {
    const denominator = 4 + (seed % 5);
    const numerator = 1 + (Math.floor(seed / 5) % (denominator - 1));
    return {
      prompt: `A whole has ${denominator} equal pieces. ${numerator} are selected. Write the fraction.`,
      check: (answer) => answer.replace(/\s/g, '') === `${numerator}/${denominator}`,
      hints: [
        'Count the selected parts first.',
        `The denominator is ${denominator}.`,
        `The fraction is ${numerator}/${denominator}.`,
      ],
      explanation: `${numerator} of ${denominator} equal parts is ${numerator}/${denominator}.`,
    };
  });
  const saved = (event: Event) => {
    const { note, isNew } = (event as CustomEvent<{ note: Notelet; isNew: boolean }>).detail;
    if (isNew) {
      useGame.getState().award('notelet', note.id, note.context.labId);
      useGame.getState().record('hold', note.id, note.context.labId);
      emitMascot('first-hold');
    }
    syncNoteEcho(note);
    sound('pop');
  };
  const bond = (event: Event) => {
    const guide = (event as CustomEvent<{ guide: string }>).detail.guide;
    useGame.getState().record('bond', `${guide}:${Date.now()}`);
  };
  const unsubscribe = useNotes.subscribe((state, previous) => {
    state.notes.forEach((note) => {
      const old = previous.notes.find((n) => n.id === note.id);
      if (note.starred || note.echo) syncNoteEcho(note);
      else if (old?.starred || old?.echo) removeNoteEcho(note.id);
    });
    previous.notes
      .filter((n) => !state.notes.some((note) => note.id === n.id))
      .forEach((note) => removeNoteEcho(note.id));
  });
  const settingsChanged = useSettings.subscribe((state, previous) => {
    if (state.theme !== previous.theme)
      useGame.getState().record('theme', `${state.theme}:${Date.now()}`);
    if (state.mascot === 'quiet' && previous.mascot !== 'quiet')
      useGame.getState().record('quiet', `quiet:${Date.now()}`);
  });
  const gameChanged = useGame.subscribe((state, previous) => {
    if (levelForXP(state.xp) > levelForXP(previous.xp)) {
      emitMascot('level-up');
      sound('success');
    } else if (state.rhythm.streak > previous.rhythm.streak) emitMascot('streak');
  });
  const reminder = setTimeout(() => {
    if (!reminded && !useNotes.getState().notes.length) {
      reminded = true;
      emitMascot('hold-reminder');
    }
  }, 180000);
  window.addEventListener('monomath:note-saved', saved);
  window.addEventListener('monomath:bond', bond);
  return () => {
    active = false;
    disposeFractions?.();
    disposeSets?.();
    disposeLogic?.();
    disposeSummation?.();
    unsubscribe();
    settingsChanged();
    gameChanged();
    clearTimeout(reminder);
    window.removeEventListener('monomath:note-saved', saved);
    window.removeEventListener('monomath:bond', bond);
  };
}
