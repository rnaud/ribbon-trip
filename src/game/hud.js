const $ = id => document.getElementById(id);

const GRADE_TEXT = {
  perfect: 'PERFECT',
  good: 'GOOD',
  ok: 'OK',
  miss: 'MISS',
  ghost: 'NOTHING THERE',
};

/**
 * Every DOM write for the running game. Kept out of Game so the timing and
 * scoring rules stay testable without a browser.
 */
export class Hud {
  constructor() {
    this.el = {
      root: document.querySelector('.game'),
      score: $('score'),
      combo: $('combo'),
      mult: $('mult'),
      energy: $('energy'),
      accuracy: $('accuracy'),
      judge: $('judge'),
      judgeText: $('judge-text'),
      judgeDetail: $('judge-detail'),
      equalizer: document.querySelector('.equalizer'),
      countdown: $('countdown'),
      countdownNumber: $('countdown-number'),
      overlay: $('overlay'),
      overlayKicker: $('overlay-kicker'),
      overlayTitle: $('overlay-title'),
      overlayBody: $('overlay-body'),
      pauseButton: $('pause'),
      status: $('status'),
    };
    this.cache = {};
    this.judgeTimer = 0;
  }

  set(key, value) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    this.el[key].textContent = value;
  }

  update(view) {
    this.set('score', String(view.score).padStart(5, '0'));
    this.set('combo', String(view.combo));
    this.set('mult', `${view.multiplier}×`);
    this.set('accuracy', `${Math.round(view.accuracy * 100)}%`);
    this.set('energy', '● '.repeat(view.energy) + '○ '.repeat(view.maxEnergy - view.energy));

    const root = this.el.root;
    root.classList.toggle('hot', view.multiplier >= 4);
    root.classList.toggle('danger', view.energy === 1);
    root.classList.toggle('flowing', view.combo >= 10);
    root.classList.toggle('pulse', view.pulse > 0.65);
    root.classList.toggle('playing', view.state === 'playing' || view.state === 'countIn');
    document.body.classList.toggle('in-run', view.state !== 'idle');
    this.equaLize(view);

    if (view.state === 'countIn' && view.countIn > 0) {
      this.el.countdown.classList.remove('hidden');
      this.set('countdownNumber', String(view.countIn));
      this.el.countdown.classList.toggle('go', view.countIn <= 1);
      this.el.countdown.querySelector('small').textContent = view.countIn <= 1 ? 'GO' : 'READY';
    } else {
      this.el.countdown.classList.add('hidden');
    }

    if (view.state === 'paused') {
      this.el.pauseButton.textContent = '▶';
      this.el.pauseButton.setAttribute('aria-label', 'Resume game');
      this.set('status', 'PAUSED — TIME IS A CHOICE');
    } else {
      this.el.pauseButton.textContent = 'Ⅱ';
      this.el.pauseButton.setAttribute('aria-label', 'Pause game');
    }
    this.el.pauseButton.classList.toggle('hidden', view.state === 'idle' || view.state === 'over');
    if (view.state === 'idle') this.set('status', 'THE LINE IS WAITING');
    if (view.state === 'playing') this.set('status', 'FOLLOW THE FEELING');
    if (view.state === 'over') this.set('status', 'THAT WAS A TRIP');
  }

  judge(event) {
    if (event.kind === 'ghost') {
      this.flash('ghost', '');
      return;
    }
    let detail = 'OFF THE BEAT';
    if (event.kind !== 'miss') {
      const ms = Math.round(event.signed * 536);
      detail = `${ms > 0 ? '+' : ''}${ms} ms`;
    } else if (event.wrongMove) {
      detail = 'WRONG MOVE';
    }
    this.flash(event.kind, detail);
    if (event.kind === 'miss') {
      this.el.root.classList.remove('struck');
      void this.el.root.offsetWidth; // restart the shake even on rapid misses
      this.el.root.classList.add('struck');
    }
  }

  /** The radio bars are a live meter: combo raises them, danger flattens them. */
  equaLize(view) {
    if (!this.el.equalizer) return;
    const bars = this.el.equalizer.children;
    const energy = view.combo / 26 + (1 - view.danger) * 0.3;
    for (let i = 0; i < bars.length; i++) {
      const wave = 0.35 + Math.abs(Math.sin(view.beat * 1.6 + i * 0.9)) * 0.65;
      const height = 0.25 + Math.min(1, energy) * wave * (view.pulse * 0.6 + 0.4);
      bars[i].style.transform = `scaleY(${height.toFixed(3)})`;
    }
  }

  flash(kind, detail) {
    // #judge is the container (opacity/transform); #judge-text holds the word.
    this.el.judgeText.textContent = GRADE_TEXT[kind] ?? '';
    this.el.judgeDetail.textContent = detail;
    this.el.judge.className = `judge ${kind} show`;
    clearTimeout(this.judgeTimer);
    this.judgeTimer = setTimeout(() => {
      this.el.judge.className = 'judge';
      this.el.judgeDetail.textContent = '';
    }, 560);
  }

  /** Intro / pause / results panel. `html` is authored in this file only. */
  overlay({ kicker, title, body, data }) {
    this.el.overlay.classList.remove('hidden');
    if (data) this.el.root.dataset.mode = data;
    this.el.overlayKicker.textContent = kicker;
    this.el.overlayTitle.innerHTML = title;
    this.el.overlayBody.innerHTML = body;
  }

  hideOverlay() {
    this.el.overlay.classList.add('hidden');
    this.el.root.dataset.mode = '';
  }

  intro(best) {
    const bestLine = best.score
      ? `PERSONAL BEST <b>${best.score.toLocaleString()}</b> · ${Math.round(best.accuracy * 100)}% ACCURACY`
      : 'NO TRIPS YET. THE FIRST ONE IS ALWAYS STRANGE.';
    this.overlay({
      kicker: 'A RHYTHM RUNNER FOR YOUR INNER WEIRDO',
      title: 'Good trips.<br><i>Great timing.</i>',
      body: `
        <p>Hop the blocks. Duck the gates. Phase through the loops —<br>
        but every move must land on the beat.</p>
        <div class="result-note">${bestLine}</div>
      `,
      data: 'intro',
    });
  }

  paused() {
    this.overlay({
      kicker: 'HOLD THAT THOUGHT',
      title: 'Take a<br><i>breather.</i>',
      body: '<p>The line will wait. It has nowhere else to be.</p>',
      data: 'paused',
    });
  }

  results(summary, best, isBest) {
    const { score, accuracy, bestCombo, counts } = summary;
    const rows = [
      ['PERFECT', counts.perfect],
      ['GOOD', counts.good],
      ['OK', counts.ok],
      ['MISS', counts.miss],
    ];
    this.overlay({
      kicker: 'EVERY TRIP IS A LITTLE DIFFERENT',
      title: 'What a<br><i>trip.</i>',
      body: `
        <div class="result-score">
          <strong>${score.toLocaleString()}</strong><span>POINTS</span>
        </div>
        <div class="result-grid">
          <div><span>ACCURACY</span><strong>${Math.round(accuracy * 100)}%</strong></div>
          <div><span>BEST COMBO</span><strong>${bestCombo}</strong></div>
          <div><span>RATING</span><strong>${rating(accuracy)}</strong></div>
        </div>
        <div class="result-bars">
          ${rows.map(([label, n]) => `<div class="result-bar"><span>${label}</span><b>${n}</b></div>`).join('')}
        </div>
        <p class="result-note">${isBest ? 'NEW PERSONAL BEST' : `BEST ${best.score.toLocaleString()} · ${Math.round(best.accuracy * 100)}% ACCURACY`}</p>
      `,
      data: 'over',
    });
  }
}

function rating(accuracy) {
  if (accuracy >= 0.98) return 'S';
  if (accuracy >= 0.9) return 'A';
  if (accuracy >= 0.78) return 'B';
  if (accuracy >= 0.6) return 'C';
  return 'D';
}
