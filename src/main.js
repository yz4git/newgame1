import { AbyssalEchoGame } from './game.js?v=__BUILD_ID__';

const BUILD_ID = '__BUILD_ID__';
const $ = (id) => document.getElementById(id);
const canvas = $('gameCanvas');
const game = new AbyssalEchoGame(canvas);

const hud = $('hud');
const titleScreen = $('titleScreen');
const pauseScreen = $('pauseScreen');
const resultScreen = $('resultScreen');
const diveNumber = $('diveNumber');
const diveName = $('diveName');
const diveHint = $('diveHint');
const specimenValue = $('specimenValue');
const specimenTarget = $('specimenTarget');
const scoreValue = $('scoreValue');
const streakValue = $('streakValue');
const timeValue = $('timeValue');
const sonarPips = $('sonarPips');
const toast = $('toast');
const soundButton = $('soundButton');
const bestReadout = $('bestReadout');

let audioEnabled = true;
let toastTimer = 0;
let lastUiState = 'title';

const cancelBrowserGesture = (event) => {
  if (event.cancelable) event.preventDefault();
};

for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
  document.addEventListener(type, cancelBrowserGesture, { passive: false });
}

document.addEventListener('touchstart', (event) => {
  if (event.touches.length > 1 && event.cancelable) event.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  if ((event.touches.length > 1 || target?.closest('#app')) && event.cancelable) event.preventDefault();
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (event) => {
  if (event.touches.length !== 0 || event.changedTouches.length !== 1) {
    lastTouchEnd = 0;
    return;
  }
  const now = performance.now();
  if (lastTouchEnd && now - lastTouchEnd < 360 && event.cancelable) event.preventDefault();
  lastTouchEnd = now;
}, { passive: false });

document.addEventListener('touchcancel', () => { lastTouchEnd = 0; }, { passive: true });
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

function renderSonar(charge, maxCharge) {
  if (sonarPips.children.length !== maxCharge) {
    sonarPips.replaceChildren(...Array.from({ length: maxCharge }, () => {
      const pip = document.createElement('i');
      pip.className = 'sonar-pip';
      return pip;
    }));
  }
  [...sonarPips.children].forEach((pip, index) => pip.classList.toggle('empty', index >= charge));
}

function syncHud(snapshot = game.getSnapshot()) {
  diveNumber.textContent = `DIVE ${String(snapshot.diveIndex + 1).padStart(2, '0')} / 04`;
  diveName.textContent = snapshot.diveName;
  diveHint.textContent = snapshot.diveHint;
  specimenValue.textContent = String(snapshot.captured).padStart(2, '0');
  specimenTarget.textContent = `/ ${String(snapshot.target).padStart(2, '0')}`;
  scoreValue.textContent = String(snapshot.score).padStart(6, '0');
  streakValue.textContent = snapshot.streak > 1 ? `CHAIN ×${snapshot.streak}` : 'CHAIN ×1';
  streakValue.classList.toggle('hot', snapshot.streak >= 3);
  timeValue.textContent = Math.ceil(snapshot.timeLeft).toString().padStart(2, '0');
  timeValue.classList.toggle('danger', snapshot.timeLeft <= 10);
  renderSonar(snapshot.charge, snapshot.maxCharge);
}

function setState(state, detail = {}) {
  lastUiState = state;
  if (state === 'start') {
    titleScreen.hidden = true;
    pauseScreen.hidden = true;
    resultScreen.hidden = true;
    hud.hidden = false;
    syncHud(detail?.diveIndex == null ? game.getSnapshot() : detail);
    return;
  }
  if (state === 'dive' || state === 'hud') {
    if (!hud.hidden) syncHud(detail?.diveIndex == null ? game.getSnapshot() : detail);
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
    $('resultEyebrow').textContent = victory ? 'SURVEY COMPLETE' : `SIGNAL LOST · DIVE ${String(game.diveIndex + 1).padStart(2, '0')}`;
    $('resultTitle').textContent = victory ? 'THE DEEP ANSWERED' : 'OXYGEN WINDOW CLOSED';
    $('resultSubtitle').textContent = victory
      ? '見えない海の動きを読み切った。次は、より少ないPINGで。'
      : '必要な標本数に届かなかった。波を広く打つより、未来位置へ置く。';
    $('resultScore').textContent = String(game.score).padStart(6, '0');
    $('resultStreak').textContent = `×${game.bestStreakThisRun}`;
    $('resultPings').textContent = String(game.pingsUsed);
    const record = detail.isScoreRecord || detail.isStreakRecord;
    $('recordNotice').hidden = !record;
    $('recordNotice').textContent = detail.isScoreRecord ? 'NEW BEST SCORE' : 'NEW BEST CHAIN';
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
  if (!navigator.vibrate) return;
  if (type === 'capture') navigator.vibrate(12);
  if (type === 'empty') navigator.vibrate(6);
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
  audioEnabled = !audioEnabled;
  game.setAudioEnabled(audioEnabled);
  soundButton.textContent = audioEnabled ? '♪' : '×';
  soundButton.classList.toggle('muted', !audioEnabled);
  soundButton.setAttribute('aria-label', audioEnabled ? 'サウンドをオフにする' : 'サウンドをオンにする');
});

canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  if (game.handlePointer(event.clientX, event.clientY)) event.preventDefault();
}, { passive: false });

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (lastUiState === 'pause') game.setPaused(false);
    else if (game.state === 'playing') game.setPaused(true);
    event.preventDefault();
    return;
  }
  if (event.code === 'Space' && game.state === 'playing' && !game.paused) {
    const rect = canvas.getBoundingClientRect();
    game.handlePointer(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5);
    event.preventDefault();
  }
});

// Do not auto-pause on blur/visibility changes. Mobile browser chrome can
// transiently change focus; pausing is an explicit player action only.

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`./sw.js?v=${BUILD_ID}`).catch(() => {});
  }, { once: true });
}
