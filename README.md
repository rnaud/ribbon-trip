# A Little Line

[Play](https://rnaud.github.io/ribbon-trip/) · [Repository](https://github.com/rnaud/ribbon-trip)

An interactive cartoon inspired by Osvaldo Cavandoli’s **La Linea**. He walks by himself. You help the artist draw what is missing. Keep him waiting and he turns toward you to complain.

The wider camera shows more of the blue field and white contour. Five encounters interrupt the walk: a bridge, stairs, a slope down, a lift, and a final door. He stops safely at unfinished ink, uses drawings while they are being traced, walks up the stairs and down the slope, and waits for the lift to line up. There are no jumps, falls, lives, or directional movement controls.

## Controls

- Click **Help him**, tap the scene, or press E / Space: draw the nearby missing object
- Enter: begin or replay
- Escape / P: pause and resume
- R: restart
- Sound is optional and starts muted

## Development

```sh
npm install
npm run dev
npm test
npm run build
npm run render:frames
```

GitHub Actions builds and publishes `main` to GitHub Pages. Tests cover a complete autonomous journey with only five help requests, safe stopping, partial drawings, lift alignment, escalating impatience, pause/restart, fixed foot contacts, and interrupted pose blending. Drawing-code snapshots are written to `/tmp/linea-review`.

## Rendering and acting

A procedural Three.js bone rig articulates the hand-authored contour before orthographic projection. The canvas texture is displayed by Three.js. Opaque foreground hands hide head and facial lines behind them. Arms, mouth, head, and torso blend through critically damped channels rather than switching outlines. Foot spacing stays fixed while stationary. Waiting progresses from curiosity to asking to two-handed complaints aimed at the viewer; helping him brings relief.

- `src/main.js`: autonomous scene state, help input, camera, sound, renderer
- `src/platformer/physics.js`: automatic contour-following and safe stopping
- `src/platformer/puzzles.js`: progressive drawings and lift timing
- `src/platformer/acting.js`, `poses.js`, `rig.js`: acting, pose blending, and projected skeleton
- `src/platformer/drawing.js`: scenery, opaque contour layers, artist pencil

## References

The proportions and line art were studied from [RAI’s reference frame](https://www.rainews.it/tgr/lombardia/articoli/2022/08/lom-carlo-bonomi-la-linea-d56027d8-6e7a-4da8-8837-20360253e501.html). [Animaphix’s retrospective](https://www.animaphix.com/la-linea-omaggio-a-osvaldo-cavandoli/) describes the character and his relationship with the artist. All shipped contours are authored in code; reference frames are not included.
