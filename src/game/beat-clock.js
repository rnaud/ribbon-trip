/**
 * Monotonic game clock, owned by the game loop.
 *
 * Gameplay never reads the wall clock directly: `time` advances by the frame
 * delta while the run is active, and freezes while paused. Sound is scheduled
 * against the AudioContext clock, and the audio layer keeps an explicit anchor
 * to this clock, so pausing audio (`ctx.suspend()`) and resuming it cannot make
 * the music drift away from the obstacles.
 */
export class BeatClock {
  constructor() {
    this.time = 0;
    this.running = false;
  }

  reset() {
    this.time = 0;
    this.running = true;
  }

  advance(dt) {
    if (this.running) this.time += dt;
    return this.time;
  }

  pause() {
    this.running = false;
  }

  resume() {
    this.running = true;
  }
}
