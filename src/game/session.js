import { SECONDS_PER_BEAT, WINDOWS, GRADE_SCORE, MAX_ENERGY, COMBO_STEP, MAX_MULTIPLIER } from './config.js';

/**
 * Reads presses against the chart and owns all scoring rules.
 *
 * Judgment rules:
 *   - A press is measured against the nearest unjudged note that carries the
 *     same move. Distance is in beats, so the feel is identical at any tempo.
 *   - |Δ| <= perfect  => PERFECT, <= good => GOOD, <= ok => OK, else nothing.
 *   - Pressing outside every window is a "ghost": it breaks the combo and shows
 *     feedback, but costs no energy so exploratory players are not punished.
 *   - A note that passes its OK window untouched is a miss and costs one energy.
 */
export class Session {
  constructor(notes, onEvent) {
    this.notes = notes.map(note => ({ ...note, judged: false }));
    this.onEvent = onEvent;
    this.results = new Map();
    this.reset();
  }

  reset() {
    for (const note of this.notes) note.judged = false;
    this.results.clear();
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.multiplier = 1;
    this.energy = MAX_ENERGY;
    this.counts = { perfect: 0, good: 0, ok: 0, miss: 0 };
    this.ghosts = 0;
    this.judge = null;
    this.judgeAge = 0;
    this.healthPop = 0;
    this.grade = null;
    this.finished = false;
    this.lastEvent = null;
  }

  get totalNotes() {
    return this.notes.length;
  }

  get judgedCount() {
    const { perfect, good, ok, miss } = this.counts;
    return perfect + good + ok + miss;
  }

  /** Weighted accuracy: perfect counts double against an OK. */
  get accuracy() {
    const judged = this.judgedCount;
    if (!judged) return 1;
    const earned = this.counts.perfect + this.counts.good * 0.7 + this.counts.ok * 0.4;
    return earned / judged;
  }

  /** 0..1, how close the player is to losing the run. */
  get danger() {
    return 1 - this.energy / MAX_ENERGY;
  }

  timeOf(note) {
    return note.beat * SECONDS_PER_BEAT;
  }

  activeNotes(time) {
    const beat = time / SECONDS_PER_BEAT;
    return this.notes.filter(n => !n.judged && Math.abs(n.beat - beat) <= WINDOWS.ok);
  }

  /**
   * Handles one move press.
   * @returns {'hit'|'wrong'|'ghost'} what the press resolved to.
   */
  press(move, time) {
    if (this.finished) return 'ghost';
    const beat = time / SECONDS_PER_BEAT;
    const live = this.activeNotes(time);

    if (live.length === 0) {
      this.ghost(time, beat);
      return 'ghost';
    }

    const matching = live.filter(n => n.type === move);
    if (matching.length === 0) {
      // Right timing, wrong move: consume the note so it cannot be farmed.
      const note = this.nearest(live, beat);
      this.commit(note, 'miss', Math.abs(note.beat - beat), time, true);
      return 'wrong';
    }

    const note = this.nearest(matching, beat);
    const signed = beat - note.beat;
    const delta = Math.abs(signed);
    const grade = delta <= WINDOWS.perfect ? 'perfect' : delta <= WINDOWS.good ? 'good' : 'ok';
    this.commit(note, grade, delta, time, false, signed);
    return 'hit';
  }

  nearest(list, beat) {
    return list.reduce((best, n) => (Math.abs(n.beat - beat) < Math.abs(best.beat - beat) ? n : best), list[0]);
  }

  /** Records one judgment, applies score/energy rules, and notifies listeners. */
  commit(note, grade, delta, time, wrongMove = false, signed = 0) {
    note.judged = true;
    this.results.set(note.id, { grade, delta, signed, time, wrongMove, beat: note.beat });
    this.judge = grade;
    this.judgeAge = 0;
    this.grade = grade;
    this.healthPop = grade === 'miss' ? 1 : 0.35;
    this.lastEvent = { grade, note, time };

    if (grade === 'miss') {
      this.counts.miss++;
      this.combo = 0;
      this.multiplier = 1;
      this.energy = Math.max(0, this.energy - 1);
      this.emit(grade, note, time, signed);
      return;
    }

    this.counts[grade]++;
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.multiplier = Math.min(MAX_MULTIPLIER, 1 + Math.floor(this.combo / COMBO_STEP));
    this.score += Math.round(GRADE_SCORE[grade] * this.multiplier);
    this.emit(grade, note, time, signed);
  }

  ghost(time, beat) {
    this.ghosts++;
    this.combo = 0;
    this.multiplier = 1;
    this.judge = 'ghost';
    this.judgeAge = 0;
    this.healthPop = 0.2;
    this.lastEvent = { grade: 'ghost', note: null, time };
    this.onEvent?.({ kind: 'ghost', move: null, label: '', time, beat });
  }

  /** True once every charted note has been judged. */
  get complete() {
    return this.judgedCount >= this.notes.length;
  }

  /** Expires notes that have fallen out of their OK window. */
  update(dt, time) {
    this.judgeAge += dt;
    this.healthPop = Math.max(0, this.healthPop - dt * 3);
    if (this.finished) return;

    const beat = time / SECONDS_PER_BEAT;
    for (const note of this.notes) {
      if (note.judged) continue;
      if (beat - note.beat > WINDOWS.ok) {
        this.commit(note, 'miss', beat - note.beat, time);
      }
    }
  }

  emit(grade, note, time, signed = 0) {
    this.onEvent?.({
      kind: grade,
      move: note?.type ?? null,
      label: note?.label ?? '',
      time,
      signed,
      beat: note?.beat ?? time / SECONDS_PER_BEAT,
    });
  }

  get summary() {
    return {
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      multiplier: this.multiplier,
      energy: this.energy,
      accuracy: this.accuracy,
      counts: this.counts,
      ghosts: this.ghosts,
    };
  }
}
