import { buildChart, MOVE_LABEL } from './config.js';

/**
 * A chart entry becomes a live note with the wall-clock time it is due.
 * Notes are immutable once created; the session copies positions in.
 */
export function makeNotes() {
  const beatSheet = buildChart();
  return beatSheet.map(note => ({
    id: note.id,
    type: note.type,
    label: MOVE_LABEL[note.type],
    beat: note.beat,
    stage: note.stage,
  }));
}
