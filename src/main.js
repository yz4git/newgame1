import { JetDriftGame } from './game.js?v=__BUILD_ID__';

const BUILD_ID = '__BUILD_ID__';
const $ = (id) => document.getElementById(id);
const canvas = $('gameCanvas');
const game = new JetDriftGame(canvas);

const titleScreen = $('titleScreen');
const hud = $('hud');
const pauseScreen = $('pauseScreen');
const stageNumber = $('stageNumber');
const stageName = $('stageName');
const stageHint = $('stageHint');
const fuelFill = $('fuelFill');
const fuelValue = $('fuelValue');
const timeValue = $('timeValue');
const timeCard = $('timeCard');
const speedValue = $('speedValue');
const scoreValue = $('scoreValue');
const toast = $('toast');
const stick = $('stick');
const stickKnob = $('stickKnob');
const jetButton = $('jetButton');
const soundButton = $('soundButton');
const pauseButton = $('pauseButton');
const bestReadout = $('bestReadout');

let toastTimer = 0;
let soundEnabled = true;
let stickPointer = null;
let jetPointer = null;
let keyboardAim = { x: 0, y: 0 };

function preventGesture(event) {
  if (event.cancelable) event.preventDefault();
}

for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
  document.addEventListener(type, preventGesture, { passive: false });
}

document.addEventListener('touchstart', (event) => {
  if (event.touches.length > 1 && event.cancelable) event.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (event) => {
  if (event.target instanceof Element && event.target.closest('#app') && event.cancelable) event.preventDefault();
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  if (event.changedTouches.length !== 1) return;
  const now = performance.now();
  if (lastTouchEnd && now - lastTouchEnd < 360 && event.cancelable) event.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

document.addEventListener('contextmenu', (event) => {
  if (event.target instanceof Element && event.target.closest('#app')) event.preventDefault();
});

function keepViewportPinned() {
  if (window.scrollX !== 0 || window.scrollY !== 0) window.scrollTo(0, 0);
}
window.addEventListener('scroll', keepViewportPinned, { passive: true });
window.visualViewport?.addEventListener('scroll', keepViewportPinned, { passive: true });
window.visualViewport?.addEventListener('resize', () => {
  keepViewportPinned();
  game.resize();
}, { passive: true });

function syncHud(snapshot = game.getSnapshot()) {
  const no = String(snapshot.stageIndex + 1).padStart(snapshot.stageIndex >= 24 ? 3 : 2, '0');
  stageNumber.textContent = snapshot.endless ? 'STAGE ' + no + ' / ∞' : 'STAGE ' + no + ' / 24';
  stageName.textContent = snapshot.stageName;
  stageHint.textContent = snapshot.stageHint;
  fuelValue.textContent = Math.round(snapshot.fuel) + '%';
  fuelFill.style.width = clamp(snapshot.fuel, 0, 100) + '%';
  fuelFill.classList.toggle('danger', snapshot.fuel < 24);
  timeValue.textContent = Math.max(0, snapshot.timeLeft).toFixed(1);
  const warning = snapshot.timeLeft <= 4 && snapshot.timeLeft > 2.5;
  const critical = snapshot.timeLeft <= 2.5;
  timeValue.classList.toggle('danger', critical);
  timeCard.classList.toggle('warning', warning);
  timeCard.classList.toggle('critical', critical);
  speedValue.textContent = String(Math.round(snapshot.speed)).padStart(3, '0');
  scoreValue.textContent = String(snapshot.score).padStart(6, '0');
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function setState(state, detail = {}) {
  if (state === 'start') {
    titleScreen.hidden = true;
    pauseScreen.hidden = true;
    hud.hidden = false;
    syncHud(detail?.stageIndex == null ? game.getSnapshot() : detail);
    return;
  }
  if (state === 'stage' || state === 'hud') {
    if (!hud.hidden) syncHud(detail?.stageIndex == null ? game.getSnapshot() : detail);
    return;
  }
  if (state === 'pause') {
    pauseScreen.hidden = false;
    return;
  }
  if (state === 'resume') {
    pauseScreen.hidden = true;
    hud.hidden = false;
    syncHud();
    return;
  }
  if (state === 'title') {
    hud.hidden = true;
    pauseScreen.hidden = true;
    titleScreen.hidden = false;
    resetControls();
  }
}

game.setOnChange(setState);

game.setToastCallback((title, subtitle = '') => {
  toast.replaceChildren();
  const strong = document.createElement('strong');
  strong.textContent = title;
  toast.append(strong);
  if (subtitle) {
    const span = document.createElement('span');
    span.textContent = subtitle;
    toast.append(span);
  }
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1200);
});

game.setFxCallback((type) => {
  if (!navigator.vibrate) return;
  if (type === 'fail') navigator.vibrate([14, 20, 24]);
  else if (type === 'clear') navigator.vibrate([8, 20, 10, 28, 16]);
  else if (type === 'pickup') navigator.vibrate(8);
});

const records = game.getRecords();
bestReadout.textContent = records.furthest > 1
  ? 'FURTHEST ' + String(records.furthest).padStart(records.furthest >= 100 ? 3 : 2, '0')
  : 'FURTHEST —';

function updateStick(clientX, clientY) {
  const rect = stick.getBoundingClientRect();
  const cx = rect.left + rect.width * 0.5;
  const cy = rect.top + rect.height * 0.5;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const max = rect.width * 0.34;
  const len = Math.hypot(dx, dy);
  if (len > max) {
    dx = dx / len * max;
    dy = dy / len * max;
  }
  stickKnob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  if (Math.hypot(dx, dy) > 4) game.setNozzle(dx, dy);
}

function resetStick() {
  stickKnob.style.transform = 'translate(0px,0px)';
}

function resetControls() {
  stickPointer = null;
  jetPointer = null;
  resetStick();
  jetButton.classList.remove('pressed');
  game.setThrusting(false);
}

stick.addEventListener('pointerdown', (event) => {
  if (stickPointer !== null) return;
  game.unlockAudio();
  stickPointer = event.pointerId;
  try { stick.setPointerCapture(event.pointerId); } catch {}
  updateStick(event.clientX, event.clientY);
  event.preventDefault();
}, { passive: false });

stick.addEventListener('pointermove', (event) => {
  if (event.pointerId !== stickPointer) return;
  updateStick(event.clientX, event.clientY);
  event.preventDefault();
}, { passive: false });

function endStick(event) {
  if (event.pointerId !== stickPointer) return;
  try { stick.releasePointerCapture(event.pointerId); } catch {}
  stickPointer = null;
  resetStick();
}
stick.addEventListener('pointerup', endStick);
stick.addEventListener('pointercancel', endStick);

jetButton.addEventListener('pointerdown', (event) => {
  if (jetPointer !== null) return;
  game.unlockAudio();
  jetPointer = event.pointerId;
  try { jetButton.setPointerCapture(event.pointerId); } catch {}
  jetButton.classList.add('pressed');
  game.setThrusting(true);
  if (navigator.vibrate) navigator.vibrate(5);
  event.preventDefault();
}, { passive: false });

function endJet(event) {
  if (event.pointerId !== jetPointer) return;
  try { jetButton.releasePointerCapture(event.pointerId); } catch {}
  jetPointer = null;
  jetButton.classList.remove('pressed');
  game.setThrusting(false);
}
jetButton.addEventListener('pointerup', endJet);
jetButton.addEventListener('pointercancel', endJet);

$('startButton').addEventListener('click', () => game.start());
$('resumeButton').addEventListener('click', () => game.setPaused(false));
$('restartButton').addEventListener('click', () => game.startAgain());
$('titleButton').addEventListener('click', () => game.returnToTitle());
pauseButton.addEventListener('click', () => {
  game.setPaused(true);
  resetControls();
});

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  game.setAudioEnabled(soundEnabled);
  soundButton.textContent = soundEnabled ? '♪' : '×';
  soundButton.classList.toggle('muted', !soundEnabled);
});

const keys = new Set();
function syncKeyboardAim() {
  let x = 0;
  let y = 0;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
  if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
  keyboardAim = { x, y };
  if (x || y) game.setNozzle(x, y);
}

window.addEventListener('keydown', (event) => {
  keys.add(event.code);
  syncKeyboardAim();
  if (event.code === 'Space') {
    game.unlockAudio();
    game.setThrusting(true);
    event.preventDefault();
  }
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (!pauseScreen.hidden) game.setPaused(false);
    else if (game.state === 'playing') game.setPaused(true);
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  keys.delete(event.code);
  syncKeyboardAim();
  if (event.code === 'Space') {
    game.setThrusting(false);
    event.preventDefault();
  }
});

window.addEventListener('blur', () => {
  keys.clear();
  resetControls();
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=' + BUILD_ID).catch(() => {});
  }, { once: true });
}