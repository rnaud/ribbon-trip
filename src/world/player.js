import {
  BufferGeometry,
  Group,
  Line,
  LineLoop,
  Vector3,
} from 'three';

const TAU = Math.PI * 2;

/**
 * The player: an angular paper creature built from white strokes.
 * It is the one object allowed to look fragile.
 */
export class Player {
  constructor(material) {
    this.group = new Group();
    this.torso = new Group();
    this.group.add(this.torso);

    this.line = (points, closed = false, parent = this.torso) => {
      const geometry = new BufferGeometry().setFromPoints(points.map(([x, y]) => new Vector3(x, y, 0)));
      const object = closed ? new LineLoop(geometry, material) : new Line(geometry, material);
      parent.add(object);
      return object;
    };

    // Head/body outline, then the two chaotic ears.
    this.line([[-0.4, 0.85], [-0.7, 1.7], [-0.4, 2.2], [0.4, 2.2], [0.7, 1.7], [0.4, 0.85]], true);
    this.earA = this.line([[-0.42, 2.1], [-0.72, 3.2], [-0.3, 2.98], [-0.1, 2.2]]);
    this.earB = this.line([[0.08, 2.2], [0.35, 3.28], [0.64, 3.45], [0.43, 2.15]]);
    // Closed, sleepy eyes.
    this.line([[-0.37, 1.92, 0.01], [-0.24, 1.92, 0.01]]);
    this.line([[0.16, 1.92, 0.01], [0.29, 1.92, 0.01]]);
    // Smile.
    this.line([[-0.13, 1.6, 0.01], [0.12, 1.5, 0.01], [0.35, 1.65, 0.01]]);
    this.line([[-0.4, 0.9], [0, 0.5], [0.4, 0.9]]);

    this.arms = [
      this.line([[-0.5, 1.4], [-0.95, 0.95], [-1.1, 1.25]]),
      this.line([[0.5, 1.4], [0.9, 1.05], [1.1, 1.5]]),
    ];

    this.feet = [new Group(), new Group()];
    this.feet.forEach((foot, i) => {
      this.group.add(foot);
      const side = i ? 1 : -1;
      this.line(
        [[side * 0.2, 0.65], [side * 0.35, 0.18], [side * 0.8, 0.05], [side * 0.2, 0.05]],
        false,
        foot,
      );
    });

    this.state = 'idle';
    this.stateTime = 0;
    this.squash = 0;
    this.stagger = 0;
    this.baseY = 0.02;
  }

  setState(next) {
    if (next === this.state) return;
    this.state = next;
    this.stateTime = 0;
    if (next === 'duck') this.squash = 1;
  }

  /**
   * @param {number} dt frame seconds
   * @param {{state:string, actionTime:number}} input current move + age
   */
  update(dt, { state, actionTime }, time, pulse, grade, gradeAge, reduced) {
    this.setState(state);
    this.stateTime += dt;
    const sway = reduced ? 0.25 : 1;

    // Jump: an arc, then a landing squash.
    let lift = 0;
    let crouch = 0;
    if (this.state === 'jump') {
      const k = Math.min(1, actionTime / 0.5);
      lift = Math.sin(k * Math.PI) * 2.35;
      crouch = Math.max(0, 1 - k * 3) * 0.5;
    }
    if (this.state === 'duck') {
      const k = Math.min(1, actionTime / 0.14);
      crouch = 0.75 * k;
    }
    this.squash += (crouch - this.squash) * Math.min(1, dt * 18);
    this.stagger = Math.max(0, this.stagger - dt * 3.2);

    const bounce = Math.sin(time * 7.4) * 0.035 * sway + pulse * 0.035;
    this.group.position.y = this.baseY + lift + bounce - (this.state === 'duck' ? 0.12 : 0);
    this.group.position.x += Math.sin(time * 3.1) * 0.004 * sway + (Math.random() - 0.5) * this.stagger * 0.22;

    const tall = 1 - this.squash * 0.52;
    const wide = 1 + this.squash * 0.3;
    this.group.scale.set(wide, tall, 1);

    // Lean into the run, flail on a miss, flicker while phasing.
    this.torso.rotation.z = Math.sin(time * 2.6) * 0.05 * sway + this.stagger * 0.3;
    this.group.rotation.z = this.state === 'phase' ? Math.sin(actionTime * 14) * 0.32 : 0;
    this.group.visible = this.state !== 'phase' || Math.floor(time * 14) % 3 !== 0;

    this.earA.rotation.z = Math.sin(time * 5.2) * 0.12 + this.stagger * 0.5;
    this.earB.rotation.z = -Math.sin(time * 4.4) * 0.1 - this.stagger * 0.4;
    this.arms[0].rotation.z = Math.sin(time * 3.6) * 0.08 + (this.state === 'jump' ? -0.5 : 0);
    this.arms[1].rotation.z = -Math.sin(time * 3.9) * 0.08 + (this.state === 'jump' ? 0.5 : 0);
    this.feet[0].rotation.z = Math.sin(time * 9) * 0.16;
    this.feet[1].rotation.z = -Math.sin(time * 9.6) * 0.16;
    // Feet tuck during a jump instead of running in mid-air.
    if (this.state === 'jump') {
      this.feet[0].rotation.z = 0.5;
      this.feet[1].rotation.z = -0.5;
    }

    if (grade === 'miss' && gradeAge < 0.3) this.stagger = Math.max(this.stagger, 0.8);
  }

  /** Used from main.js when the run starts. */
  reset() {
    this.state = 'idle';
    this.stateTime = 0;
    this.squash = 0;
    this.stagger = 0;
  }
}
