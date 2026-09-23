import { MidnightJunctionGame } from './game.js?v=__BUILD_ID__';

const BUILD_ID = '__BUILD_ID__';
const $ = (id) => document.getElementById(id);
const canvas = $('gameCanvas');
const game = new MidnightJunctionGame(canvas);

const titleScreen = $('titleScreen');
const hud = $('hud');
const pauseScreen = $('pauseScreen');
const resultScreen = $('resultScreen');
const shiftNumber = $('shiftNumber');
const shiftName = $('shiftName');
const shiftHint = $('shiftHint');
const scoreValue = $('scoreValue');
const streakValue = $('streakValue');
const servicePips = $('servicePips');
const progressFill = $('progressFill');
const nextQueue = $('nextQueue');
const toast = $('toast');
const soundButton = $('soundButton');
const bestReadout = $('bestReadout');

let soundEnabled = true;
let toastTimer = 0;
let lastState = 'title';

const preventGesture = (event) => {
  if (event.cancelable) event.preventDefault();
};

for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
  document.addEventListener(type, preventGesture, { passive: false });
}
document.addEventListener('touchmove', (event) => {
  if (event.target instanceof Element && event.target.closest('#app')) preventGesture(event);
}, { passive: false });
let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  if (event.changedTouches.length === 1) {
    const now = performance.now();
    if (now - lastTouchEnd < 360) preventGesture(event);
    lastTouchEnd = now;
  }
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

function renderService(count) {
  if (servicePips.children.length !== 3) {
    servicePips.replaceChildren(...Array.from({ length: 3 }, () => {
      const pip = document.createElement('i');
      pip.className = 'service-pip';
      return pip;
    }));
  }
  [...servicePips.children].forEach((pip, index) => pip.classList.toggle('lost', index >= count));
}

function renderQueue(upcoming) {
  nextQueue.replaceChildren();
  if (!upcoming.length) {
    const done = document.createElement('span');
    done.className = 'queue-empty';
    done.textContent = 'END OF BOARD';
    nextQueue.append(done);
    return;
  }
  for (const item of upcoming) {
    const chip = document.createElement('div');
    chip.className = `queue-chip lane-${item.target}${item.express ? ' express' : ''}`;
    chip.setAttribute('aria-label', `次の列車 入線${item.source + 1} 目的地${String.fromCharCode(65 + item.target)}${item.express ? ' エクスプレス' : ''}`);
    const source = document.createElement('small');
    source.textContent = `IN ${item.source + 1}`;
    const arrow = document.createElement('b');
    arrow.textContent = '→';
    const target = document.createElement('strong');
    target.textContent = String.fromCharCode(65 + item.target);
    chip.append(source, arrow, target);
    if (item.express) {
      const exp = document.createElement('em');
      exp.textContent = 'EXP';
      chip.append(exp);
    }
    nextQueue.append(chip);
  }
}

function syncHud(snapshot = game.getSnapshot()) {
  shiftNumber.textContent = `SHIFT ${String(snapshot.shiftIndex + 1).padStart(2, '0')} / 05`;
  shiftName.textContent = snapshot.shiftName;
  shiftHint.textContent = snapshot.shiftHint;
  scoreValue.textContent = String(snapshot.score).padStart(6, '0');
  streakValue.textContent = snapshot.streak > 1 ? `STREAK ×${snapshot.streak}` : 'STREAK ×1';
  streakValue.classList.toggle('hot', snapshot.streak >= 3);
  renderService(snapshot.service);
  const total = Math.max(1, snapshot.total);
  progressFill.style.width = `${Math.min(100, ((snapshot.resolved || 0) / total) * 100)}%`;
  renderQueue(snapshot.upcoming);
}

function setState(state, detail = {}) {
  lastState = state;
  if (state === 'start') {
    titleScreen.hidden = true;
    resultScreen.hidden = true;
    pauseScreen.hidden = true;
    hud.hidden = false;
    syncHud();
    return;
  }
  if (state === 'shift' || state === 'score') {
    if (!hud.hidden) syncHud(detail?.shiftIndex == null ? game.getSnapshot() : detail);
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
  if (state === 'victory' || state === 'gameover') {
    hud.hidden = true;
    pauseScreen.hidden = true;
    titleScreen.hidden = true;
    resultScreen.hidden = false;
    const victory = state === 'victory';
    $('resultEyebrow').textContent = victory ? 'DAWN SERVICE COMPLETE' : `BOARD CLOSED · SHIFT ${String(game.shiftIndex + 1).padStart(2, '0')}`;
    $('resultTitle').textContent = victory ? 'ALL LINES HOME' : 'SERVICE SUSPENDED';
    $('resultSubtitle').textContent = victory
      ? 'すべての列車を夜明けまでつないだ。次は、より少ない迷いで。'
      : '誤配が3回に達した。分岐器は列車が来る前に組み替える。';
    $('resultScore').textContent = String(game.score).padStart(6, '0');
    $('resultStreak').textContent = `×${game.bestStreakThisRun}`;
    $('resultShift').textContent = victory ? '5 / 5' : `${game.shiftIndex + 1} / 5`;
    const record = detail.isScoreRecord || detail.isStreakRecord;
    $('recordNotice').hidden = !record;
    $('recordNotice').textContent = detail.isScoreRecord ? 'NEW BEST SCORE' : 'NEW BEST STREAK';
    const records = game.getRecords();
    bestReadout.textContent = records.bestScore > 0 ? `BEST ${String(records.bestScore).padStart(6, '0')}` : 'BEST —';
    return;
  }
  if (state === 'title') {
    hud.hidden = true;
    pauseScreen.hidden = true;
    resultScreen.hidden = true;
    titleScreen.hidden = false;
  }
}

game.setOnChange(setState);
game.setQueueCallback((queue) => renderQueue(queue));
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
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 1900);
});

game.setFxCallback((type) => {
  if (type === 'switch' && navigator.vibrate) navigator.vibrate(8);
  if (type === 'miss' && navigator.vibrate) navigator.vibrate([18, 30, 18]);
});

const records = game.getRecords();
bestReadout.textContent = records.bestScore > 0 ? `BEST ${String(records.bestScore).padStart(6, '0')}` : 'BEST —';

$('startButton').addEventListener('click', () => game.start());
$('againButton').addEventListener('click', () => game.startAgain());
$('titleButton').addEventListener('click', () => game.returnToTitle());
$('pauseButton').addEventListener('click', () => game.setPaused(true));
$('resumeButton').addEventListener('click', () => game.setPaused(false));
$('restartButton').addEventListener('click', () => game.startAgain());

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  game.setAudioEnabled(soundEnabled);
  soundButton.textContent = soundEnabled ? '♪' : '×';
  soundButton.classList.toggle('muted', !soundEnabled);
  soundButton.setAttribute('aria-label', soundEnabled ? 'サウンドをオフにする' : 'サウンドをオンにする');
});

canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  if (game.handlePointer(event.clientX, event.clientY)) event.preventDefault();
}, { passive: false });

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (lastState === 'pause') game.setPaused(false);
    else if (game.state === 'playing') game.setPaused(true);
    event.preventDefault();
    return;
  }
  if (game.keyboard(event.code)) event.preventDefault();
});

// Do not auto-pause on blur/visibility changes. On mobile, browser chrome and
// system gestures can transiently change focus; pausing remains an explicit action.

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`./sw.js?v=${BUILD_ID}`).catch(() => {});
  }, { once: true });
}
