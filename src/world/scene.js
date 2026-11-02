import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { MAPPING, VISIBLE_LEFT, VISIBLE_RIGHT } from '../game/config.js';
import { Player } from './player.js';
import { ObstacleField } from './obstacles.js';

const TAU = Math.PI * 2;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * The world: one ribbon that is ground, lane and instrument. Every line
 * answers the beat, the combo and the last judgment, so a good run looks loud
 * and a broken run looks broken. Nothing here touches game state.
 */
export class World {
  constructor(canvas) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new Scene();
    this.scene.background = new Color(0x050505);
    this.camera = new OrthographicCamera(-20, 20, 11, -11, 0.1, 100);
    this.camera.position.set(0, 1.35, 30);
    this.cameraY = 0;

    this.ink = new LineBasicMaterial({ color: 0xffffff });
    this.faint = new LineBasicMaterial({ color: 0x8a8a8a });
    this.dimmer = new LineBasicMaterial({ color: 0x3a3a3a });
    this.ghost = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
    this.scenery = new LineBasicMaterial({ color: 0x565656, transparent: true, opacity: 0.55 });

    this.time = 0;
    this.beat = 0;
    this.pulse = 0;
    this.chaos = 0;
    this.danger = 0;
    this.lastGrade = null;
    this.gradeAge = 99;
    this.shake = 0;
    this.glitch = 0;
    this.reduced = false;

    this.ripples = [];
    this.bursts = [];

    this.buildBackdrop();
    this.buildRibbon();
    this.buildPlayer();
    this.obstacles = new ObstacleField(this.scene);
    this.resize();
    this.suspendRendering = false;
  }

  resize() {
    const canvas = this.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.renderer.setSize(rect.width, rect.height, false);
    const aspect = rect.width / rect.height;
    /*
     * Height-driven camera: portrait screens need a tall view so the ribbon
     * band fills the frame instead of becoming a stripe with black above and
     * below. Desktop keeps a fixed 20-unit vertical window.
     */
    const tall = aspect < 1.05;
    const height = tall ? 15.6 : 12.4;
    const halfHeight = height / 2;
    const halfWidth = Math.max(halfHeight * aspect, 15.5);
    this.camera.left = -halfWidth;
    this.camera.right = halfWidth;
    this.camera.top = halfHeight;
    this.camera.bottom = -halfHeight;
    // Aim a little above the ground so the ribbon sits low in frame and the
    // traveler has sky to move through.
    this.cameraY = tall ? 3.1 : 1.35;
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- backdrop

  buildBackdrop() {
    this.backdrop = new Group();
    this.scene.add(this.backdrop);

    this.horizon = [];
    for (let i = 0; i < 5; i++) {
      const line = new Line(
        new BufferGeometry().setFromPoints([
          new Vector3(VISIBLE_LEFT - 8, 0, 0),
          new Vector3(VISIBLE_RIGHT + 8, 0, 0),
        ]),
        this.dimmer,
      );
      this.backdrop.add(line);
      this.horizon.push({ line, phase: i / 5 });
    }

    this.sky = this.poly(
      [[-24, 3.4], [-16, 3.9], [-9, 3.1], [-2, 4.3], [5, 3.5], [12, 4.5], [18, 3.7], [25, 4.7]],
      this.dimmer,
      false,
      -14,
    );

    this.mushrooms = new Group();
    this.backdrop.add(this.mushrooms);
    for (const [x, y, size, tilt, depth] of [
      [-14.5, 1.05, 1.15, -0.16, -8],
      [-2.5, 3.1, 0.8, 0.24, -12],
      [8.5, 2.0, 1.4, -0.2, -15],
      [15.5, 1.3, 0.95, 0.12, -10],
    ]) {
      this.mushroom(x, y, size, tilt, depth);
    }

    this.floaters = [];
    for (const [x, y, size, depth] of [[-18, 6.2, 0.42, -6], [-6, 7.0, 0.26, -4], [9, 6.5, 0.5, -7], [19, 5.1, 0.3, -5]]) {
      const g = new Group();
      g.position.set(x, y, depth);
      this.diamond(1, this.faint, g);
      g.scale.setScalar(size);
      this.backdrop.add(g);
      this.floaters.push({ g, speed: 0.4 + Math.random() * 0.5, size });
    }

    this.stairs = [
      this.poly([[5.6, 1.0], [6.6, 1.0], [6.6, 2.0], [7.6, 2.0], [7.6, 3.0], [8.6, 3.0], [8.6, 4.0], [9.6, 4.0]], this.scenery, false, -11),
      this.poly([[-20, 5.1], [-18.4, 5.1], [-17.4, 6.1], [-15.8, 6.1]], this.scenery, false, -13),
    ];

    // Free-floating threads: present at rest, unhinged during a combo.
    this.strings = [];
    for (let i = 0; i < 5; i++) {
      const g = new Group();
      g.position.set(this.rand(-20, 20), this.rand(-8, 9), -3);
      const points = [];
      const segments = 2 + Math.floor(this.rand(0, 3));
      for (let s = 0; s <= segments; s++) points.push([this.rand(-2.6, 2.6), this.rand(-1.5, 1.5), 0]);
      const line = this.poly(points, this.dimmer, false, 0, g);
      g.rotation.z = this.rand(0, TAU);
      this.scene.add(g);
      this.strings.push({ g, line, speed: this.rand(0.5, 1.8), dir: Math.random() < 0.5 ? -1 : 1, base: g.rotation.z });
    }
  }

  mushroom(x, y, size, tilt, depth) {
    const g = new Group();
    g.position.set(x, y, depth);
    g.scale.setScalar(size);
    g.rotation.z = tilt;
    g.userData.base = { x, y, size, tilt, depth };
    this.mushrooms.add(g);
    this.poly(
      [[-0.3, 0], [-0.18, 1.9], [-1.7, 1.9], [-2.35, 2.7], [-1.6, 3.3], [-0.7, 3.6], [0, 3.75], [0.7, 3.6], [1.6, 3.3], [2.35, 2.7], [1.7, 1.9], [0.18, 1.9], [0.3, 0]],
      this.scenery,
      true,
      0,
      g,
    );
    this.poly([[-1.7, 1.9], [0, 2.2], [1.7, 1.9]], this.scenery, false, 0, g);
    this.oval(-0.62, 2.66, 0.22, 0.13, this.scenery, g);
    this.oval(0.5, 2.96, 0.28, 0.14, this.scenery, g);
    return g;
  }

  // ------------------------------------------------------------------ ribbon

  buildRibbon() {
    this.ribbonCount = 360;
    this.ribbon = this.thread(this.ribbonCount, this.ink);
    this.reflection = this.thread(this.ribbonCount, this.dimmer);
    for (let i = 0; i < 4; i++) this.ripples.push(new Ripple(this.scene));
  }

  thread(count, material) {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    const line = new Line(geometry, material);
    this.scene.add(line);
    return line;
  }

  // ------------------------------------------------------------------ player

  buildPlayer() {
    this.player = new Player(this.ink);
    this.player.group.position.set(MAPPING.hitX, 0.02, 0);
    this.scene.add(this.player.group);

    this.hitMarker = this.oval(MAPPING.hitX, 0.05, 1.15, 0.26, this.ghost);
    this.scene.add(this.hitMarker);
    this.hitRing = this.oval(MAPPING.hitX, 0.1, 1.35, 0.34, this.ghost);
    this.hitRing.position.z = -1;
    this.hitRing.material = this.hitRing.material.clone();
    this.hitRing.material.opacity = 0.16;
    this.scene.add(this.hitRing);
  }

  // ------------------------------------------------------------------ events

  /** The world's answer to a judgment. */
  hit(kind, strength = 1) {
    this.lastGrade = kind;
    this.gradeAge = 0;
    if (kind === 'miss' || kind === 'ghost') {
      const heavy = kind === 'miss';
      this.shake = Math.max(this.shake, heavy ? 0.9 : 0.45);
      this.glitch = Math.max(this.glitch, heavy ? 1 : 0.6);
      this.ripple(MAPPING.hitX, heavy ? 1.9 : 1.3, heavy ? 1.5 : 0.9, 2.8);
    } else {
      this.shake = Math.max(this.shake, 0.22 * strength);
      this.ripple(MAPPING.hitX, 1.2 + strength * 0.7, 1 + strength * 0.5, 3.4);
      this.ripple(MAPPING.hitX, 0.6, 0.5, 2.1);
      this.burst();
    }
  }

  launch() {
    this.glitch = 0.8;
    this.ripple(MAPPING.hitX, 2.6, 1.6, 4.4);
    this.burst();
  }

  ripple(x, width, height, speed) {
    const free = this.ripples.find(r => r.free);
    if (free) free.reset(x, width, height, speed);
  }

  burst() {
    const g = new Group();
    g.position.set(MAPPING.hitX + 1.1, 1.5, -0.4);
    this.scene.add(g);
    const spokes = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + this.rand(-0.3, 0.3);
      spokes.push(this.poly([[0, 0, 0], [Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0]], this.ink, false, 0, g));
    }
    this.bursts.push({ g, spokes, age: 0, life: 0.42 });
    if (this.bursts.length > 8) {
      const old = this.bursts.shift();
      this.scene.remove(old.g);
    }
  }

  // ------------------------------------------------------------------ update

  /**
   * @param {object} frame
   * @param {number} frame.dt
   * @param {number} frame.time
   * @param {number} frame.beat
   * @param {number} frame.pulse 1 on the beat, decaying
   * @param {number} frame.chaos 0..1 from the combo
   * @param {number} frame.danger 0..1 from lost energy
   * @param {object} frame.player { state, actionTime }
   * @param {Array} frame.events judgments since the last frame
   * @param {Array} frame.items live notes with judged state
   * @param {boolean} frame.reduced
   */
  update(frame) {
    const { dt, time, beat, pulse, chaos, danger, player, events, items, reduced } = frame;
    this.time = time;
    this.beat = beat;
    this.pulse = pulse;
    this.chaos = chaos;
    this.danger = danger;
    this.reduced = reduced;
    this.gradeAge += dt;
    this.shake = Math.max(0, this.shake - dt * 3);
    this.glitch = Math.max(0, this.glitch - dt * 3.6);

    for (const event of events) this.hit(event.kind, event.strength ?? 1);

    this.animateBackdrop(dt);
    this.animateRibbon();
    this.player.update(dt, player, time, pulse, this.lastGrade, this.gradeAge, reduced);
    this.placeObstacles(items, dt, time, pulse, chaos, reduced);
    this.animateRipples(dt);
    this.animateBursts(dt);
    this.animateCamera();
    if (!this.suspendRendering) this.renderer.render(this.scene, this.camera);
  }

  placeObstacles(items, dt, time, pulse, chaos, reduced) {
    const spb = 60 / 112;
    const snapshot = [];
    for (const item of items) {
      const { note, judged, judgedAt } = item;
      // Judged notes stop being re-anchored and drift outward from the hit line.
      const at = judged ? Math.max(time, judgedAt ?? time) : time;
      let lead = note.beat - at / spb;
      if (judged) lead = Math.min(lead, 0);
      const x = MAPPING.hitX + lead * MAPPING.beatsToUnits;
      const depth = Math.max(0, Math.min(1, (note.beat - time / spb) / MAPPING.leadBeats));
      snapshot.push({ note, x, depth, judged });
    }
    this.obstacles.update(snapshot, dt, { pulse, chaos, reduced }, x => this.ribbonY(x));
  }

  animateBackdrop(dt) {
    const sway = this.reduced ? 0.2 : 1;
    this.sky.position.y = Math.sin(this.time * 0.45) * 0.3 + this.pulse * 0.16;
    this.sky.rotation.z = Math.sin(this.time * 0.2) * 0.016;

    for (let i = 0; i < this.horizon.length; i++) {
      const item = this.horizon[i];
      const t = (this.time * (0.05 + i * 0.01) * sway + item.phase) % 1;
      item.line.position.y = 3.0 + t * 4.2;
      item.line.position.z = -6 - t * 8;
      item.line.scale.x = 0.55 + t * 1.15;
      item.line.rotation.z = Math.sin(this.time * 0.3 + i) * 0.012;
    }

    for (const m of this.mushrooms.children) {
      const base = m.userData.base;
      m.position.y = base.y + Math.sin(this.time * 1.4 + base.x) * 0.06 + this.pulse * 0.04;
      m.rotation.z = base.tilt + Math.sin(this.time * (0.5 + Math.abs(base.x) * 0.01) + base.x) * 0.09 * sway;
      m.scale.setScalar(base.size * (1 + this.pulse * 0.03));
    }

    for (let i = 0; i < this.floaters.length; i++) {
      const f = this.floaters[i];
      f.g.rotation.z = this.time * f.speed * sway + i;
      f.g.scale.setScalar(f.size * (1 + this.pulse * 0.16));
      f.g.position.y = f.g.position.y + Math.sin(this.time * 0.7 + i) * 0.0015;
    }

    // Strings go from sparse at rest to fully unhinged at high combo.
    const boost = 1 + this.chaos * 2.6 + this.glitch * 0.8;
    for (let i = 0; i < this.strings.length; i++) {
      const s = this.strings[i];
      s.g.rotation.z = s.base + this.time * s.speed * 0.3 * s.dir * sway + Math.sin(this.time * 0.7 + i) * 0.24 * boost;
      s.g.scale.set(0.7 + this.chaos * 0.7, 0.4 + this.pulse * 0.5 * boost, 1);
      s.line.material = this.chaos > 0.55 ? this.faint : this.dimmer;
      s.line.visible = this.chaos > 0.4;
    }

    this.backdrop.position.x = Math.sin(this.time * 0.17) * 0.4 * sway;
  }

  /**
   * The ribbon's height. A slow travelling wave keeps it alive at rest; combo
   * and danger add shorter, faster harmonics; a miss adds a sharp ripple.
   * Amplitude is deliberately small near the hit line so timing stays readable.
   */
  ribbonY(x, time = this.time) {
    const calm = 1 - Math.min(1, Math.abs(x - MAPPING.hitX) / 7);
    const drift = Math.sin(x * 0.28 + time * 0.55) * 0.34;
    const wave = Math.sin(x * 0.9 - time * 1.9) * 0.2;
    const chop = Math.sin(x * 2.2 + time * 3.4) * 0.07;
    const hot = this.chaos * 0.9 + (this.glitch > 0.05 ? this.glitch : 0);
    const surge = Math.sin(x * 0.42 + time * 1.1) * hot * 1.1;
    const snap = Math.sin(x * 2.1 - time * 4.1) * hot * 0.16 + Math.sin(x * 4.7 + time * 7.4) * hot * 0.05;
    const dive = this.danger * Math.pow(Math.max(0, Math.sin(x * 0.4 + time * 0.8)), 4) * 1.15;
    return (drift + wave + chop) * (0.55 + calm * 0.45) + surge + snap + dive;
  }

  animateRibbon() {
    const positions = this.ribbon.geometry.attributes.position;
    const spread = VISIBLE_RIGHT - VISIBLE_LEFT;

    for (let i = 0; i < this.ribbonCount; i++) {
      const u = i / (this.ribbonCount - 1);
      const x = VISIBLE_LEFT + u * spread;
      let y = this.ribbonY(x);

      // Miss: shred the thread horizontally for a few frames.
      if (this.glitch > 0.01) {
        y += Math.sin(i * 0.7 + this.time * 38) * this.glitch * 0.3 * (0.5 + this.danger);
      }
      positions.setXYZ(i, x, y, 0);
    }
    positions.needsUpdate = true;

    const mirror = this.reflection.geometry.attributes.position;
    for (let i = 0; i < this.ribbonCount; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      mirror.setXYZ(i, x, -Math.abs(y) * 0.55 - 1.1 + Math.sin(x * 0.5 - this.time * 1.3) * 0.12, -0.4);
    }
    mirror.needsUpdate = true;

    this.hitMarker.scale.set(1 + this.pulse * 0.12, 1 + this.pulse * 0.06, 1);
    this.hitRing.scale.set(1 + this.pulse * 0.22, 1 + this.pulse * 0.14, 1);
    this.hitRing.rotation.z = Math.sin(this.time * 0.8) * 0.05;
  }

  animateRipples(dt) {
    for (const ripple of this.ripples) ripple.update(dt);
  }

  animateBursts(dt) {
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.age += dt;
      const k = b.age / b.life;
      b.g.scale.setScalar(0.4 + k * 3);
      b.g.rotation.z += dt * 2;
      if (k >= 1) {
        this.scene.remove(b.g);
        this.bursts.splice(i, 1);
      }
    }
  }

  animateCamera() {
    const intensity = this.reduced ? 0.2 : 1;
    const shake = this.shake * intensity;
    const kick = this.pulse * 0.18;
    const glitch = this.glitch * intensity;

    this.camera.position.x = (Math.random() - 0.5) * (shake * 1.2 + glitch * 0.8);
    this.camera.position.y = this.cameraY + (Math.random() - 0.5) * (shake * 0.6 + glitch * 0.4) + kick;
    this.camera.rotation.z = (Math.random() - 0.5) * shake * 0.07 + Math.sin(this.time * 0.3) * 0.006;
    this.camera.zoom = 1 + kick * 0.6 + this.chaos * 0.04;
    this.camera.updateProjectionMatrix();
  }

  // ----------------------------------------------------------------- helpers

  poly(points, material = this.ink, closed = false, z = 0, parent = this.scene) {
    const geometry = new BufferGeometry().setFromPoints(points.map(([x, y]) => new Vector3(x, y, 0)));
    const object = closed ? new LineLoop(geometry, material) : new Line(geometry, material);
    object.position.z = z;
    parent.add(object);
    return object;
  }

  oval(x, y, rx, ry, material = this.ink, parent = this.scene, segments = 20) {
    const points = Array.from({ length: segments }, (_, i) => {
      const a = (i / segments) * TAU;
      return [x + Math.cos(a) * rx, y + Math.sin(a) * ry];
    });
    return this.poly(points, material, true, 0, parent);
  }

  diamond(radius, material, parent) {
    return this.poly([[0, radius], [radius, 0], [0, -radius], [-radius, 0]], material, true, 0, parent);
  }

  rand(min, max) {
    return min + Math.random() * (max - min);
  }
}

/** An expanding ring on the ribbon: the default visual answer to a judgment. */
class Ripple {
  constructor(scene) {
    const count = 22;
    const positions = new Float32Array(count * 3);
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    this.material = new LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
    this.line = new LineLoop(geometry, this.material);
    this.line.visible = false;
    scene.add(this.line);
    this.count = count;
    this.age = 0;
    this.life = 0.55;
    this.x = 0;
    this.width = 1;
    this.height = 1;
    this.speed = 1;
    this.free = true;
  }

  reset(x, width, height, speed) {
    this.free = false;
    this.age = 0;
    this.x = x;
    this.width = width;
    this.height = height;
    this.speed = speed;
    this.line.visible = true;
    this.material.opacity = 1;
  }

  update(dt) {
    if (this.free) return;
    this.age += dt;
    const k = clamp(this.age / this.life, 0, 1);
    const radius = 0.35 + k * this.speed;
    const attr = this.line.geometry.attributes.position;
    for (let i = 0; i < this.count; i++) {
      const a = (i / this.count) * TAU;
      attr.setXYZ(i, this.x + Math.cos(a) * radius * this.width, 0.15 + Math.sin(a) * radius * this.height, 0.06);
    }
    attr.needsUpdate = true;
    this.material.opacity = (1 - k) * 0.9;
    if (k >= 1) {
      this.free = true;
      this.line.visible = false;
    }
  }
}
