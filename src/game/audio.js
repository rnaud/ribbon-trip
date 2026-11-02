/**
 * Tiny synthesized soundtrack: kick, snare, hats, bass and a sparse lead,
 * composed live against the AudioContext clock so it never drifts from the
 * obstacles. Sound only exists after a user gesture.
 */
export class Soundtrack {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.anchorAudio = 0; // ctx.currentTime corresponding to game time 0
    this.scheduledThrough = 0; // absolute game beat already scheduled
    this.playing = false;
    this.bar = 0;
  }

  get ready() {
    return Boolean(this.ctx) && this.ctx.state === 'running' && !this.muted;
  }

  /** Must be called from a user gesture the first time. */
  async unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.noise = this.makeNoise();
    }
    if (this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch {
        return false;
      }
    }
    return true;
  }

  makeNoise() {
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.4, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.04 * white) / 1.04;
      data[i] = white * 0.4 + last * 2.2;
    }
    return buffer;
  }

  /** Re-anchor the music to the game clock (after unlocking or resuming). */
  sync(clock) {
    if (!this.ctx) return;
    this.anchorAudio = this.ctx.currentTime - clock.time;
    // Only schedule notes in the future; anything already played stays played.
    const beatNow = clock.time / (60 / 112);
    this.scheduledThrough = Math.floor(beatNow * 4) / 4 + 0.25;
  }

  /** Starts or stops the musical clock without tearing down the context. */
  setPlaying(playing) {
    this.playing = playing;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, now, 0.05);
    }
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  async resume(clock) {
    if (!this.ctx) return;
    try {
      await this.ctx.resume();
    } catch {
      return;
    }
    if (!this.playing) return;
    /*
     * ctx.currentTime froze while suspended, so the old anchor would schedule
     * the next notes in the past. Re-anchor to the resumed clock and skip any
     * steps that fall behind the current beat instead of firing them at once.
     */
    this.anchorAudio = this.ctx.currentTime - clock.time;
    const beat = clock.time / (60 / 112);
    this.scheduledThrough = Math.max(this.scheduledThrough, Math.floor(beat * 4) / 4);
  }

  /** Audio-clock time for a game time. */
  audioTime(gameTime) {
    return this.anchorAudio + gameTime;
  }

  /**
   * Schedules every 16th note up to `horizon` seconds ahead on the audio clock.
   * Returns the number of beats scheduled this call.
   */
  schedule(clock, horizon = 0.22) {
    if (!this.ready || !this.playing) return 0;
    const spb = 60 / 112;
    const beatAhead = (clock.time + horizon) / spb;
    let scheduled = 0;
    while (this.scheduledThrough < beatAhead) {
      this.playStep(this.scheduledThrough, this.audioTime(this.scheduledThrough * spb));
      this.scheduledThrough += 0.25;
      scheduled++;
      if (scheduled > 64) break; // guard against a long tab-suspend gap
    }
    return scheduled;
  }

  playStep(beat, when) {
    const inBar = beat % 4;
    const bar = Math.floor(beat / 4);
    const sixteenth = Math.round((beat % 1) * 4);

    if (inBar === 0) this.kick(when);
    if (inBar === 2) this.kick(when, 0.85);
    if (inBar === 1 || inBar === 3) this.snare(when);
    if (sixteenth % 2 === 0) this.hat(when, 0.05);
    else this.hat(when, 0.028);

    if (inBar === 0) {
      const root = [0, 3, 5, 3][bar % 4];
      this.bass(when, this.midi(36 + root), 0.5);
    }
    if (inBar === 2.5) this.bass(when, this.midi(43), 0.22);

    if (bar % 2 === 1 && (inBar === 0 || inBar === 2)) {
      const arp = [60, 63, 67, 70, 67, 63];
      this.lead(when, this.midi(arp[(bar + inBar / 2) % arp.length]), 0.28);
    }
  }

  midi(noteNumber) {
    return 440 * Math.pow(2, (noteNumber - 69) / 12);
  }

  kick(when, gain = 1) {
    const { ctx, master } = this;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(42, when + 0.14);
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(0.9 * gain, when + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
    osc.connect(env).connect(master);
    osc.start(when);
    osc.stop(when + 0.32);
  }

  snare(when) {
    const { ctx, master, noise } = this;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1400;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.22, when);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
    src.connect(filter).connect(env).connect(master);
    src.start(when);
    src.stop(when + 0.2);

    const body = ctx.createOscillator();
    const bodyEnv = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(190, when);
    bodyEnv.gain.setValueAtTime(0.1, when);
    bodyEnv.gain.exponentialRampToValueAtTime(0.0001, when + 0.09);
    body.connect(bodyEnv).connect(master);
    body.start(when);
    body.stop(when + 0.1);
  }

  hat(when, gain) {
    const { ctx, master, noise } = this;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7500;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, when);
    env.gain.exponentialRampToValueAtTime(0.0001, when + 0.045);
    src.connect(filter).connect(env).connect(master);
    src.start(when);
    src.stop(when + 0.06);
  }

  bass(when, freq, duration) {
    const { ctx, master } = this;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const env = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = freq / 2;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(420, when);
    filter.Q.value = 6;
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(0.16, when + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(filter).connect(env).connect(master);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  lead(when, freq, duration) {
    const { ctx, master } = this;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(0.05, when + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(env).connect(master);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  /** One-shot UI/move blip, independent of the scheduler. */
  blip(kind) {
    if (!this.ready || this.ctx.state !== 'running') return;
    const when = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    const spec = {
      perfect: [1318.5, 0.05],
      good: [1046.5, 0.05],
      ok: [880, 0.04],
      miss: [82, 0.16],
      jump: [660, 0.035],
      duck: [180, 0.035],
      phase: [988, 0.035],
    }[kind] ?? [660, 0.03];
    osc.type = kind === 'miss' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(spec[0], when);
    if (kind === 'miss') osc.frequency.exponentialRampToValueAtTime(48, when + 0.2);
    env.gain.setValueAtTime(spec[1], when);
    env.gain.exponentialRampToValueAtTime(0.0001, when + (kind === 'miss' ? 0.24 : 0.12));
    osc.connect(env).connect(this.master);
    osc.start(when);
    osc.stop(when + 0.3);
  }
}
