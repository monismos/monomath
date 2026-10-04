import type { Notelet } from './types';
import { useLesson } from '../scene/store';
import { useSettings } from '../storage/settings';
import { useNotes } from './store';
import { restoreGraphContext } from '../graphing/workspaceStore';
export function restoreNoteContext(note: Notelet) {
  if (note.context.graph) restoreGraphContext(note.context.graph);
  useLesson.getState().set({
    step: note.context.step,
    dial: note.context.dial,
    selection: note.context.selection,
    problem: note.context.problem,
    labId: note.context.labId,
    variant: note.context.variant,
  });
  useSettings.getState().set({ dimension: note.context.dimension, theme: note.context.theme });
  location.hash = note.context.route;
  useNotes.getState().set({ summary: false });
  window.dispatchEvent(
    new CustomEvent('monomath:context', { detail: { screen: note.context.screen } }),
  );
  setTimeout(
    () =>
      document
        .querySelector(`[data-note-id="${CSS.escape(note.id)}"]`)
        ?.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }],
          { duration: 1200 },
        ),
    300,
  );
}
