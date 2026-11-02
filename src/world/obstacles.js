import {
  BufferGeometry,
  Group,
  Line,
  LineBasicMaterial,
  LineLoop,
  Vector3,
} from 'three';

const TAU = Math.PI * 2;

/**
 * Three silhouettes, each readable at a glance:
 *   jump  — a low block you must clear
 *   duck  — a tall gate with a bar you must fit under
 *   phase — a membrane loop you walk through
 *
 * The game supplies x/depth for each note every frame, so what the player sees
 * is exactly the timing they are judged against.
 */
export class ObstacleField {
  constructor(scene) {
    this.scene = scene;
    this.live = new Map(); // noteId -> mounted obstacle
    this.exiting = new Set();

    this.templates = {
      jump: this.makeJump(),
      duck: this.makeDuck(),
      phase: this.makePhase(),
    };
    this.pool = { jump: [], duck: [], phase: [] };
  }

  // ------------------------------------------------------------- templates

  shape(type, specs) {
    const group = new Group();
    for (const [points, closed, role] of specs) {
      const geometry = new BufferGeometry().setFromPoints(
        points.map(([x, y]) => new Vector3(x, y, 0)),
      );
      const material = new LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: role === 'inner' ? 0.5 : 1,
      });
      material.userData.inner = role === 'inner';
      group.add(closed ? new LineLoop(geometry, material) : new Line(geometry, material));
    }
    return { type, group };
  }

  makeJump() {
    return this.shape('jump', [
      [[[-0.85, 0], [-0.85, 1.05], [0.85, 1.05], [0.85, 0]], false],
      [[[-0.34, 0.46], [0.34, 0.46]], false],
      [[[-0.34, 0.46], [0, 0.82], [0.34, 0.46]], false],
    ]);
  }

  makeDuck() {
    return this.shape('duck', [
      [[[-0.62, 0], [-0.62, 2.5], [0.62, 2.5], [0.62, 0]], false],
      [[[-0.62, 1.2], [0.62, 1.2]], false],
      [[[-0.26, 2.0], [0, 1.74], [0.26, 2.0]], false, 'inner'],
    ]);
  }

  makePhase() {
    const ring = Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * TAU;
      return [Math.cos(a) * 0.95, 1.45 + Math.sin(a) * 1.45];
    });
    return this.shape('phase', [
      [ring, true],
      [[[-0.55, 0.3], [0.55, 2.6]], false],
      [[[-0.55, 2.6], [-0.55, 0.3]], false, 'inner'],
    ]);
  }

  instantiate(type) {
    const template = this.templates[type];
    const group = new Group();
    const materials = [];
    for (const child of template.group.children) {
      const material = child.material.clone();
      material.userData.inner = child.material.userData.inner;
      const line = child.isLineLoop
        ? new LineLoop(child.geometry.clone(), material)
        : new Line(child.geometry.clone(), material);
      group.add(line);
      materials.push(material);
    }
    this.scene.add(group);
    return { group, materials, type, note: null, state: 'live', flash: 1, age: 0 };
  }

  acquire(type) {
    const obstacle = this.pool[type].pop() ?? this.instantiate(type);
    obstacle.note = null;
    obstacle.state = 'live';
    obstacle.flash = 1;
    obstacle.age = 0;
    obstacle.group.visible = true;
    obstacle.group.rotation.set(0, 0, 0);
    return obstacle;
  }

  recycle(obstacle) {
    obstacle.group.visible = false;
    obstacle.note = null;
    this.exiting.delete(obstacle);
    this.pool[obstacle.type].push(obstacle);
  }

  setOpacity(obstacle, value) {
    const clamped = Math.min(1, Math.max(0, value));
    for (const material of obstacle.materials) {
      material.opacity = clamped * (material.userData.inner ? 0.5 : 1);
    }
  }

  // ----------------------------------------------------------------- update

  /**
   * @param {Array} items  { note, x, depth, judged } for every note near the field
   * @param {number} dt
   * @param {object} ctx   { pulse, chaos, reduced }
   * @param {(x:number)=>number} groundY  ribbon height at x
   */
  update(items, dt, ctx, groundY) {
    const liveIds = new Set();

    for (const item of items) {
      const { note, x, depth, judged } = item;
      const id = note.id;
      liveIds.add(id);

      let obstacle = this.live.get(id);
      if (obstacle && judged) {
        obstacle.state = judged === 'miss' ? 'miss' : 'hit';
        obstacle.flash = judged === 'miss' ? 0.4 : 1;
        this.live.delete(id);
        this.exiting.add(obstacle);
        continue;
      }
      if (!obstacle) {
        if (judged) continue; // judged before it ever appeared
        obstacle = this.acquire(note.type);
        obstacle.note = note;
        this.live.set(id, obstacle);
      }
      this.place(obstacle, x, depth, ctx, groundY);
    }

    // Notes that dropped off the runway without ever being judged.
    for (const [id, obstacle] of this.live) {
      if (liveIds.has(id)) continue;
      this.live.delete(id);
      this.exiting.add(obstacle);
      obstacle.state = 'miss';
      obstacle.flash = 0.3;
    }

    for (const obstacle of this.exiting) {
      this.updateExit(obstacle, dt, ctx);
    }
  }

  place(obstacle, x, depth, ctx, groundY) {
    const g = obstacle.group;
    const near = Math.max(0, 1 - depth / 0.14); // closeness to the hit line
    const scale = (0.95 + (1 - depth) * 0.45) * (1 + near * 0.12 + ctx.pulse * 0.04);
    g.position.set(x, groundY(x) + (ctx.reduced ? 0 : ctx.pulse * 0.25), -1 - depth * 2.5);
    g.scale.setScalar(ctx.reduced ? 0.95 : scale);
    g.rotation.z = near > 0 ? Math.sin(ctx.pulse * 5) * 0.04 : 0;

    let opacity = 0.45 + (1 - depth) * 0.55;
    if (depth > 0.86) opacity *= Math.max(0, (1 - depth) / 0.14);
    this.setOpacity(obstacle, Math.min(1, opacity + near * 0.35));
  }

  updateExit(obstacle, dt, ctx) {
    obstacle.flash = Math.max(0, obstacle.flash - dt * (obstacle.state === 'hit' ? 4.5 : 3));
    const k = 1 - obstacle.flash;
    const g = obstacle.group;
    if (obstacle.state === 'hit') {
      g.scale.setScalar(g.scale.x + (1.6 - g.scale.x) * Math.min(1, dt * 9));
      g.rotation.z += dt * 1.8;
    } else {
      g.position.x += (Math.random() - 0.5) * dt * 2.4;
      g.position.y += Math.sin(k * 22) * 0.002;
    }
    this.setOpacity(obstacle, obstacle.flash);
    if (obstacle.flash <= 0) this.recycle(obstacle);
  }

  clear() {
    for (const obstacle of [...this.live.values()]) this.recycle(obstacle);
    for (const obstacle of [...this.exiting]) this.recycle(obstacle);
    this.live.clear();
    this.exiting.clear();
  }
}
