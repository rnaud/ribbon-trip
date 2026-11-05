# A Little Line

[Play](https://rnaud.github.io/ribbon-trip/) · [Repository](https://github.com/rnaud/ribbon-trip)

A short side-scrolling platformer inspired by Osvaldo Cavandoli’s **La Linea**. A flat blue field, rounded white contour, expressive large-nosed figure, and a ground line that becomes the world. The character’s silhouette joins the ground when standing; jumping temporarily separates it for platforming.

Walk across seven sections of steps and gaps, with a route almost twice as long as the first platformer. Ask the artist to draw a bridge, stairs, a spring, a moving lift, and the final door. Each drawing changes traversal: jump from the spring to reach the high ledge, and ride the lift before jumping to its upper landing. Falling returns you to the latest checkpoint; there is no life limit. The old three-button rhythm game has been replaced by movement and platform collision.

## Controls

- Left / Right or A / D: walk
- Space / Up / W: jump (hold for a higher jump)
- E: ask the artist; near a missing object, a pencil draws it into the world
- Esc / P: pause and resume
- R: restart; Enter: begin, resume, or replay
- Touch controls appear on touch devices
- Sound is optional and starts muted. Short synthesized gestures accompany movement and complaints.

## Development

```sh
npm install
npm run dev
npm test
npm run build
```

GitHub Actions builds and publishes `main` to GitHub Pages. The repository URL remains unchanged.

## Rendering and structure

Smooth Bézier outlines are drawn into a canvas texture and displayed by Three.js. The same drawing function can render still frames without a browser. Simulation uses a fixed 120 Hz step; rendering happens once per animation frame.

- `src/main.js`: input, state, camera, audio, Three.js rendering
- `src/platformer/physics.js`: collision, movement, checkpoints, level surfaces
- `src/platformer/puzzles.js`: five progressive drawing interactions and lift timing
- `src/platformer/drawing.js`: continuous contours, poses, scenery, artist pencil
- `tests/platformer.test.js`: collision and traversal checks
- `tests/runtime.test.js`: state/input integration using a stub renderer
- `npm run render:frames`: drawing-code snapshots in `/tmp/linea-review`

The physics and runtime tests do not replace live browser/WebGL testing. The current redesign was verified by production build, thirteen automated checks, and offline drawing frames; browser automation was unavailable during this update.

## Visual references

The proportions, white stroke, and flat background were studied from [RAI’s reference frame](https://www.rainews.it/tgr/lombardia/articoli/2022/08/lom-carlo-bonomi-la-linea-d56027d8-6e7a-4da8-8837-20360253e501.html) and [this profile frame](https://www.telegraf.rs/pop-i-kultura/film-tv/3353081-legendarni-crtani-film-la-linea-svi-volimo-a-evo-kako-je-nastao). [Animaphix’s retrospective](https://www.animaphix.com/la-linea-omaggio-a-osvaldo-cavandoli/) documents the character’s relationship with the line and the artist. All in-game contours are authored in code; reference frames are not included in the shipped game.

## Character animation

The walk deforms the body contour and shifts the feet and arms. Jump anticipation, landing squash, and vertical camera tracking give actions weight. Idle behavior cycles through foot tapping, looking around, impatience, and shrugging. Unsolved puzzles prompt curiosity; active drawings prompt watching; repeated requests trigger impatience. Completion brings delight, falling brings alarm, and respawning brings embarrassment. Mouth and hand motion vary with the reaction. The controls remain responsive during the reactions.
