# A Little Line

[Play](https://rnaud.github.io/ribbon-trip/) · [Repository](https://github.com/rnaud/ribbon-trip)

A short side-scrolling platformer inspired by Osvaldo Cavandoli’s **La Linea**. A flat blue field, rounded white contour, expressive large-nosed figure, and a ground line that becomes the world. The character’s silhouette joins the ground when standing; jumping temporarily separates it for platforming.

Walk across four sections of steps and gaps, ask the artist to draw the missing bridge, and reach the door. Falling returns you to the latest checkpoint; there is no life limit. The old three-button rhythm game has been replaced by movement and platform collision.

## Controls

- Left / Right or A / D: walk
- Space / Up / W: jump (hold for a higher jump)
- E: ask the artist; near the unfinished gap, a pencil draws a bridge
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
- `src/platformer/drawing.js`: continuous contours, poses, scenery, artist pencil
- `tests/platformer.test.js`: collision and traversal checks
- `tests/runtime.test.js`: state/input integration using a stub renderer
- `npm run render:frames`: drawing-code snapshots in `/tmp/linea-review`

The physics and runtime tests do not replace live browser/WebGL testing. The current redesign was verified by production build, eight automated checks, and offline drawing frames; browser automation was unavailable during this update.

## Visual references

The proportions, white stroke, and flat background were studied from [RAI’s reference frame](https://www.rainews.it/tgr/lombardia/articoli/2022/08/lom-carlo-bonomi-la-linea-d56027d8-6e7a-4da8-8837-20360253e501.html) and [this profile frame](https://www.telegraf.rs/pop-i-kultura/film-tv/3353081-legendarni-crtani-film-la-linea-svi-volimo-a-evo-kako-je-nastao). [Animaphix’s retrospective](https://www.animaphix.com/la-linea-omaggio-a-osvaldo-cavandoli/) documents the character’s relationship with the line and the artist. All in-game contours are authored in code; reference frames are not included in the shipped game.
