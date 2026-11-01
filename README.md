# Ribbon Trip

[Play the game](https://rnaud.github.io/ribbon-trip/) · [GitHub repository](https://github.com/rnaud/ribbon-trip)

An original Three.js rhythm-runner prototype inspired by Vib-Ribbon's timed moves and surreal, colorful platformer worlds. All scenery and characters are generated with geometry; the 112 BPM soundtrack uses Web Audio synthesis.

## Run

```sh
npm install
npm run dev
```

Open the URL printed by Vite. `npm run build` produces the static site in `dist/`; `npm run preview` serves that build.

## Play

- Enter: start or restart
- Space / Up: jump over orange bumps
- Down: duck beneath green gates
- Right: phase through purple walls
- Escape / P: pause or resume
- The three control cards also work as touch controls.

Trigger a move just before the obstacle reaches the traveler. Each move lasts 0.78 seconds. Successful moves build a score streak; five misses end a run. Obstacles arrive on the beat. Sound starts after pressing Play and can be muted with the header button. Switching tabs automatically pauses gameplay.

## Structure

- `src/main.js`: procedural world, renderer, input, obstacles, scoring, and audio
- `src/style.css`: responsive interface
- `index.html`: game shell and accessible controls

The prototype contains one endless meadow. Google Fonts is optional; local fallback fonts remain available offline.
