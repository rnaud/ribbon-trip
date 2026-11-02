import { World } from './world/scene.js';
import { Game } from './game/game.js';
import { Hud } from './game/hud.js';

const $ = id => document.getElementById(id);

const world = new World($('world'));
const hud = new Hud();
const game = new Game({ world, hud });
const soundButton = $('sound');
const playButton = $('play');
const pauseButton = $('pause');
const moveButtons = [...document.querySelectorAll('.move')];

// --------------------------------------------------------------------- sound

let muted = false;
function syncSoundButton() {
  soundButton.classList.toggle('on', !muted);
  soundButton.setAttribute('aria-pressed', String(!muted));
  soundButton.querySelector('.pill-label').textContent = muted ? 'SOUND OFF' : 'SOUND ON';
}

soundButton.addEventListener('click', async () => {
  if (muted) {
    muted = false;
    await game.sound.unlock();
    game.sound.setMuted(false);
    game.sound.sync(game.clock);
    if (game.state === 'playing' || game.state === 'countIn') {
      game.sound.setPlaying(true);
      game.sound.schedule(game.clock, 0);
    }
  } else {
    muted = true;
    game.sound.setMuted(true);
  }
  syncSoundButton();
});

// ----------------------------------------------------------------- screens

/**
 * One button, three jobs: start, resume, replay. Keeping it a single element
 * means the keyboard focus ring never lands on a hidden control.
 */
function setPrimaryAction(label) {
  playButton.innerHTML = `${label} <span aria-hidden="true">↗</span>`;
}

let primary = () => startRun();

function showIntro() {
  hud.intro(game.best);
  primary = () => startRun();
  setPrimaryAction('LET’S TRIP');
}

function syncState(state, summary) {
  document.body.dataset.state = state;
  if (state === 'idle') {
    showIntro();
    pauseButton.classList.add('hidden');
  } else if (state === 'countIn' || state === 'playing') {
    hud.hideOverlay();
    pauseButton.classList.remove('hidden');
  } else if (state === 'paused') {
    hud.paused();
    primary = () => game.resume();
    setPrimaryAction('KEEP GOING');
    pauseButton.classList.remove('hidden');
  } else if (state === 'over') {
    hud.results(summary, game.best, game.newBest);
    primary = () => startRun();
    setPrimaryAction('ONE MORE TRIP');
    pauseButton.classList.add('hidden');
  }
}
game.onStateChange = syncState;

async function startRun() {
  hud.hideOverlay();
  await game.start();
}

playButton.addEventListener('click', () => primary());
pauseButton.addEventListener('click', () => game.togglePause());

for (const button of moveButtons) {
  const fire = event => {
    event.preventDefault();
    const move = button.dataset.move;
    game.press(move);
    pulseMove(button);
  };
  button.addEventListener('pointerdown', fire);
  button.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') fire(event);
  });
}

let moveFlash = null;
function pulseMove(button) {
  button.classList.add('down');
  clearTimeout(moveFlash);
  moveFlash = setTimeout(() => button.classList.remove('down'), 140);
}

// ------------------------------------------------------------------- keyboard

const KEYS = {
  Space: 'jump',
  ArrowUp: 'jump',
  ArrowDown: 'duck',
  ArrowRight: 'phase',
  KeyW: 'jump',
  KeyS: 'duck',
  KeyD: 'phase',
};

window.addEventListener('keydown', event => {
  if (event.repeat) return;
  const tag = event.target?.tagName;

  if (event.code === 'Escape' || event.code === 'KeyP') {
    event.preventDefault();
    game.togglePause();
    return;
  }
  if (event.code === 'Enter') {
    event.preventDefault();
    if (game.state === 'idle' || game.state === 'over') startRun();
    else if (game.state === 'paused') game.resume();
    return;
  }
  const move = KEYS[event.code];
  if (!move) return;
  // Space would otherwise scroll the page or re-activate the focused button.
  event.preventDefault();
  if (tag === 'BUTTON' && (event.code === 'Space' || event.code === 'Enter')) event.stopPropagation();
  game.press(move);
  const button = moveButtons.find(b => b.dataset.move === move);
  if (button) pulseMove(button);
});

// ---------------------------------------------------------------- lifecycle

document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.pause();
});

// Pause when the whole window loses focus, but not when a button inside it does.
window.addEventListener('blur', () => {
  if (!document.hasFocus()) game.pause();
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
reducedMotion.addEventListener('change', event => {
  game.reduced = event.matches;
});

let resizeTimer = 0;
const observer = new ResizeObserver(() => {
  cancelAnimationFrame(resizeTimer);
  resizeTimer = requestAnimationFrame(() => world.resize());
});
observer.observe($('world'));

// ------------------------------------------------------------------- the loop

let last = performance.now();
function tick(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  game.update(dt);
  requestAnimationFrame(tick);
}
requestAnimationFrame(time => {
  last = time;
  tick(time);
});

/*
 * Test hooks. A real browser runs the rAF loop at display speed, but automated
 * checks need to advance the simulation deterministically, so they are opt-in
 * via ?debug=1 rather than always-on globals.
 */
if (new URLSearchParams(location.search).has('debug')) {
  window.__game = game;
  window.__step = (seconds, dt = 1 / 60) => {
    const frames = Math.max(1, Math.round(seconds / dt));
    for (let i = 0; i < frames; i++) game.update(dt);
    return { state: game.state, beat: +game.beat.toFixed(3), time: +game.clock.time.toFixed(3) };
  };
  window.__press = move => game.press(move);
}

syncSoundButton();
showIntro();
document.body.dataset.state = game.state;
