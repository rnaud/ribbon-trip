# Ribbon Trip

[Play the game](https://rnaud.github.io/ribbon-trip/) · [GitHub repository](https://github.com/rnaud/ribbon-trip)

A monochrome rhythm runner in the spirit of Vib-Ribbon: one ribbon, three moves, and a 112 BPM fever dream. Every obstacle is locked to the beat, and every move is judged by how close to that beat you pressed. All scenery is generated geometry; the soundtrack is synthesized live with Web Audio.

## Run

```sh
npm install
npm run dev
```

Open the URL Vite prints. `npm run build` writes the static site to `dist/`, and `npm run preview` serves that build.

Add `?debug=1` to the URL to expose `window.__game` (and a deterministic `window.__step`) for automated testing.

## Play

- **Enter** — start, then start again after a run
- **Space / ↑** — hop a block
- **↓** — duck a gate
- **→** — phase through a loop
- **Esc / P** — pause and resume
- The three control cards are the touch controls on phones.

Press the matching move as the obstacle crosses the traveler. Timing is scored in beats against the music:

| Grade | Window | Points |
| --- | --- | --- |
| Perfect | ±0.12 beat (~64 ms) | 300 |
| Good | ±0.20 beat (~107 ms) | 200 |
| OK | ±0.32 beat (~171 ms) | 100 |

Any press outside those windows is a ghost: it breaks the combo but costs no energy. A missed obstacle costs one of five energy points, and the run ends at zero. Combo raises a multiplier every ten hits (to 8×), which raises the score and the amount of chaos in the world.

## How it works

- `src/game/config.js` — tempo, judgment windows, stage patterns, playfield mapping
- `src/game/game.js` — run state machine, input, and the per-frame loop
- `src/game/session.js` — scoring, grading, combo, energy, accuracy
- `src/game/beat-clock.js` — game time that only advances during play
- `src/game/audio.js` — a look-ahead Web Audio synthesizer (kick, snare, hats, bass, lead)
- `src/game/hud.js` — every DOM update for the HUD and panels
- `src/world/scene.js` — the ribbon, scenery, camera shake, ripples, and glitch
- `src/world/player.js` — the traveler's rig and animations
- `src/world/obstacles.js` — obstacle silhouettes and their per-frame placement
- `src/style.css` — the single monochrome theme, including the phone-first playing state

### Timing model

The game clock is owned by the loop and only advances while a run is active, so pausing cannot drift the music. Sound is scheduled ahead on the `AudioContext` clock with an explicit anchor, and the anchor is rebuilt after a pause. Judgment samples the clock on the key event itself, not on the next animation frame.

### Accessibility

Keyboard play works throughout, the HUD announces judgments through a live region, `prefers-reduced-motion` dampens the camera shake and line movement, and every control is a real button with a visible focus ring.
