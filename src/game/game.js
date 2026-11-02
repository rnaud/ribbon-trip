import { BPM, SECONDS_PER_BEAT, MAX_ENERGY, STORAGE_KEY, MAPPING } from './config.js';
import { BeatClock } from './beat-clock.js';
import { Soundtrack } from './audio.js';
import { makeNotes } from './chart.js';
import { Session } from './session.js';

export const ACTION_TIME = {
  jump: 0.52,
  duck: 0.46,
  phase: 0.58,
};

/**
 * Owns the run: clock, chart progress, input, and the bridge to the world/HUD.
 * Anything visual lives in World/Hud; anything scoring lives in Session.
 */
export class Game {
  constructor({ world, hud }) {
    this.world = world;
    this.hud = hud;
    this.clock = new BeatClock();
    this.sound = new Soundtrack();
    this.notes = makeNotes();
    this.session = new Session(this.notes, event => this.onJudge(event));

    this.state = 'idle'; // idle | countIn | playing | paused | over
    this.events = [];
    this.action = null;
    this.actionTime = 0;
    this.pulse = 0;
    this.lastWholeBeat = -1;
    this.idleTime = 0;
    this.chaos = 0;
    this.best = this.readBest();
    this.newBest = false;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.onStateChange = () => {};
  }

  // ------------------------------------------------------------- persistence

  readBest() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? { score: 0, accuracy: 0, combo: 0 };
    } catch {
      return { score: 0, accuracy: 0, combo: 0 };
    }
  }

  saveBest() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.best));
    } catch {
      /* private mode; a best score is optional */
    }
  }

  // ------------------------------------------------------------------- state

  get beat() {
    return this.clock.time / SECONDS_PER_BEAT;
  }

  get energy() {
    return this.session.energy;
  }

  /** Countdown readout before the first note, or 0 when it is too early to show. */
  get countInRemaining() {
    if (this.state !== 'countIn') return 0;
    const beats = this.notes[0].beat - this.beat;
    return beats <= 4 ? Math.max(1, Math.ceil(beats)) : 0;
  }

  get summary() {
    return this.session.summary;
  }

  get maxEnergy() {
    return MAX_ENERGY;
  }

  get trackTitle() {
    return `${BPM} BPM · MINOR STATIC`;
  }

  async start() {
    await this.sound.unlock();
    this.clock.reset();
    this.sound.sync(this.clock);
    this.sound.scheduledThrough = 0;
    this.sound.setPlaying(true);

    this.session.reset();
    this.world.obstacles.clear();
    this.world.player.reset();
    this.world.launch();

    this.events = [];
    this.action = null;
    this.actionTime = 0;
    this.pulse = 0;
    this.lastWholeBeat = -1;
    this.chaos = 0;
    this.newBest = false;
    this.state = 'countIn';
    this.onStateChange(this.state);
  }

  /** Resume after a pause. Called from a click/keypress so audio can restart. */
  async resume() {
    if (this.state !== 'paused') return;
    this.clock.resume();
    this.sound.setPlaying(true);
    await this.sound.resume(this.clock);
    this.state = this.session.judgedCount === 0 ? 'countIn' : 'playing';
    this.hud?.update(this.view());
    this.onStateChange(this.state);
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'countIn') return;
    this.state = 'paused';
    this.clock.pause();
    this.sound.setPlaying(false);
    this.sound.suspend();
    this.hud?.update(this.view());
    this.onStateChange(this.state);
  }

  togglePause() {
    return this.state === 'paused' ? this.resume() : this.pause();
  }

  finish() {
    if (this.state === 'over') return;
    this.state = 'over';
    this.clock.pause();
    this.sound.setPlaying(false);
    this.sound.suspend();
    const summary = this.session.summary;
    this.newBest = summary.score > this.best.score;
    if (this.newBest) {
      this.best = { score: summary.score, accuracy: summary.accuracy, combo: summary.bestCombo };
      this.saveBest();
    }
    this.hud?.update(this.view());
    this.onStateChange(this.state, summary);
  }

  // ------------------------------------------------------------------- input

  /**
   * One press. The clock is sampled here rather than on the next animation
   * frame, so judgment resolution is not limited by render cadence.
   */
  press(move) {
    if (this.state !== 'playing') return 'ignored';
    this.action = move;
    this.actionTime = 0;
    this.sound.blip(move);
    return this.session.press(move, this.clock.time);
  }

  onJudge(event) {
    this.events.push({ ...event, strength: Math.min(1, 0.4 + this.session.multiplier * 0.12) });
    this.hud?.judge(event);
  }

  /** One place decides the run is over, whichever reason fired first. */
  checkEnd() {
    if (this.state !== 'playing') return;
    if (this.session.energy <= 0 || this.session.complete) this.finish();
  }

  // ------------------------------------------------------------------ update

  update(dt) {
    if (this.state === 'paused') return;

    if (this.state === 'idle' || this.state === 'over') {
      this.idleTime += dt;
      this.pulse = Math.max(0, this.pulse - dt * 1.8);
      this.world.update(this.frame(dt, this.idleTime, { items: [], events: [] }));
      this.hud?.update(this.view());
      return;
    }

    this.clock.advance(dt);
    this.sound.schedule(this.clock);

    const beat = this.beat;
    const whole = Math.floor(beat);
    if (whole !== this.lastWholeBeat) {
      this.lastWholeBeat = whole;
      this.pulse = 1;
    } else {
      this.pulse = Math.max(0, this.pulse - dt * 3.4);
    }

    if (this.state === 'countIn' && beat >= this.notes[0].beat - MAPPING.leadBeats) {
      // The first note is now visible on the runway: the run is on.
      this.state = 'playing';
      this.onStateChange(this.state);
    }

    this.actionTime = this.action ? this.actionTime + dt : 0;
    if (this.action && this.actionTime > ACTION_TIME[this.action]) this.action = null;

    if (this.state === 'playing') {
      this.session.update(dt, this.clock.time);
      this.checkEnd();
    }

    this.chaos = Math.min(1, this.session.combo / 32 + this.session.danger * 0.45);
    this.world.update(this.frame(dt, this.clock.time, { items: this.visibleNotes(), events: this.events }));
    this.events.length = 0;
    this.hud?.update(this.view());
  }

  /** Flat snapshot for the HUD, so the DOM layer never reaches into game guts. */
  view() {
    const s = this.session.summary;
    return {
      state: this.state,
      score: s.score,
      combo: s.combo,
      multiplier: s.multiplier,
      accuracy: s.accuracy,
      energy: s.energy,
      maxEnergy: MAX_ENERGY,
      countIn: this.countInRemaining,
      pulse: this.pulse,
      beat: this.beat,
      danger: this.session.danger,
      best: this.best,
      newBest: this.newBest,
    };
  }

  frame(dt, time, overrides) {
    return {
      dt,
      time,
      beat: time / SECONDS_PER_BEAT,
      pulse: this.pulse,
      chaos: this.chaos,
      danger: this.session.danger,
      player: { state: this.action ?? 'idle', actionTime: this.actionTime },
      events: overrides.events,
      items: overrides.items,
      reduced: this.reduced,
    };
  }

  /** Notes the world should draw, including ones mid-retirement. */
  visibleNotes() {
    const now = this.beat;
    const out = [];
    for (const note of this.session.notes) {
      const result = this.session.results.get(note.id);
      if (!result && note.beat - now > MAPPING.leadBeats + 1.6) continue; // not on runway yet
      if (!result && note.beat - now < -0.5) continue; // long gone
      if (result && this.clock.time - result.time > 0.7) continue; // retirement flash finished
      out.push({ note, judged: result?.grade ?? null, judgedAt: result?.time ?? null });
    }
    return out;
  }
}
