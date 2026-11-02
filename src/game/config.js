// Every tunable number for Ribbon Trip lives here.
// The game is one 112 BPM loop; everything else is expressed in beats or seconds.

export const BPM = 112;
export const SECONDS_PER_BEAT = 60 / BPM;
export const BEATS_PER_BAR = 4;

// Judgment windows, in beats. 112 BPM => one beat is 536 ms.
export const WINDOWS = {
  perfect: 0.12, // ~64 ms
  good: 0.2, // ~107 ms
  ok: 0.32, // ~171 ms
};

export const GRADE_SCORE = {
  perfect: 300,
  good: 200,
  ok: 100,
};

// The traveler stands still; the world is carried toward them on the ribbon.
export const HIT_X = -7;
export const VISIBLE_LEFT = -15;
export const VISIBLE_RIGHT = 16;
export const TRAVEL_TIME = 2.4; // seconds from spawn to the hit line
export const APPROACH = (VISIBLE_RIGHT - HIT_X) + 6;
export const TRAVEL_SPEED = APPROACH / TRAVEL_TIME;

// Chart shape: a count-in, then increasingly dense two-bar patterns.
export const COUNT_IN_BARS = 2;
export const BARS_PER_STAGE = 8;
export const MAX_STAGE = 6;
export const MAX_ENERGY = 5;
export const COMBO_STEP = 10;
export const MAX_MULTIPLIER = 8;

export const STORAGE_KEY = 'ribbon-trip/best';

export const MOVE_TYPES = ['jump', 'duck', 'phase'];
export const MOVE_LABEL = {
  jump: 'HOP IT',
  duck: 'GET LOW',
  phase: 'GO BEYOND',
};

// A pattern is a list of notes per bar: each note is [beatOffset, moveType].
// Offsets are in beats from the bar line, so every obstacle is locked to the grid.
const STAGES = [
  [
    [[0, 'jump'], [2, 'duck']],
    [[0, 'jump'], [2, 'phase']],
    [[0, 'duck'], [2, 'jump']],
    [[0, 'phase'], [2, 'duck']],
  ],
  [
    [[0, 'jump'], [1.5, 'duck'], [3, 'jump']],
    [[0, 'phase'], [2, 'duck'], [3.5, 'phase']],
    [[0, 'duck'], [1, 'jump'], [2.5, 'duck']],
    [[0, 'jump'], [2, 'phase'], [3, 'duck']],
  ],
  [
    [[0, 'jump'], [1, 'duck'], [2, 'jump'], [3, 'phase']],
    [[0, 'phase'], [1.5, 'jump'], [2.5, 'duck'], [3.5, 'jump']],
    [[0, 'duck'], [1, 'phase'], [2, 'duck'], [3, 'jump']],
    [[0, 'jump'], [1.5, 'phase'], [2.5, 'jump'], [3, 'phase']],
  ],
  [
    [[0, 'duck'], [0.5, 'jump'], [1.5, 'phase'], [2.5, 'duck'], [3, 'jump']],
    [[0, 'jump'], [1, 'duck'], [1.5, 'phase'], [2.5, 'jump'], [3.5, 'duck']],
    [[0, 'phase'], [0.5, 'duck'], [1.5, 'jump'], [2, 'phase'], [3, 'duck']],
    [[0, 'jump'], [0.5, 'phase'], [1.5, 'duck'], [2.5, 'phase'], [3.5, 'jump']],
  ],
  [
    [[0, 'jump'], [0.5, 'duck'], [1, 'phase'], [2, 'jump'], [2.5, 'duck'], [3, 'phase']],
    [[0, 'duck'], [0.5, 'phase'], [1, 'jump'], [1.5, 'duck'], [2.5, 'jump'], [3.5, 'phase']],
    [[0, 'phase'], [1, 'jump'], [1.5, 'duck'], [2, 'phase'], [3, 'jump'], [3.5, 'duck']],
    [[0, 'jump'], [0.5, 'jump'], [1.5, 'duck'], [2, 'phase'], [2.5, 'duck'], [3.5, 'jump']],
  ],
  [
    [[0, 'jump'], [0.5, 'duck'], [1, 'jump'], [1.5, 'phase'], [2, 'duck'], [2.5, 'jump'], [3, 'phase'], [3.5, 'duck']],
    [[0, 'duck'], [0.5, 'jump'], [1, 'phase'], [1.5, 'jump'], [2, 'duck'], [2.5, 'phase'], [3, 'jump'], [3.5, 'duck']],
    [[0, 'phase'], [0.5, 'jump'], [1, 'duck'], [1.5, 'phase'], [2, 'jump'], [2.5, 'duck'], [3, 'phase'], [3.5, 'jump']],
    [[0, 'jump'], [0.5, 'phase'], [1, 'duck'], [1.5, 'jump'], [2, 'phase'], [2.5, 'duck'], [3, 'jump'], [3.5, 'phase']],
  ],
];

/**
 * Builds the whole chart up front. Deterministic per seed so a run can be
 * replayed from a URL hash later without extra bookkeeping.
 */
export function buildChart(stageCount = MAX_STAGE + 1, seed = 112) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  const notes = [];
  for (let stage = 0; stage < stageCount; stage++) {
    const patterns = STAGES[Math.min(stage, STAGES.length - 1)];
    for (let bar = 0; bar < BARS_PER_STAGE; bar++) {
      // Start each stage with a 4-beat rest so the change of pace is audible.
      if (bar === 0 && stage > 0) continue;
      const pattern = patterns[Math.floor(rand() * patterns.length)];
      const barBeat = COUNT_IN_BARS * BEATS_PER_BAR + stage * BARS_PER_STAGE * BEATS_PER_BAR + bar * BEATS_PER_BAR;
      for (const [offset, type] of pattern) {
        notes.push({
          id: `${stage}-${bar}-${offset}`,
          beat: barBeat + offset,
          type,
          stage,
        });
      }
    }
  }
  return notes;
}


// Screen-space mapping of the playfield. One beat of lead time equals
// SECONDS_PER_BEAT * TRAVEL_SPEED world units of approach.
export const MAPPING = {
  hitX: HIT_X,
  left: VISIBLE_LEFT,
  right: VISIBLE_RIGHT,
  speed: TRAVEL_SPEED,
  leadBeats: TRAVEL_TIME / SECONDS_PER_BEAT, // how many beats of runway are visible
  beatsToUnits: TRAVEL_SPEED * SECONDS_PER_BEAT,
};
