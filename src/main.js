import { VectorCutGame } from './game.js?v=__BUILD_ID__';

const BUILD_ID = '__BUILD_ID__';
const $ = (id) => document.getElementById(id);
const canvas = $('gameCanvas');
const game = new VectorCutGame(canvas);

const titleScreen = $('titleScreen');
const hud = $('hud');
const pauseScreen = $('pauseScreen');
const resultScreen = $('resultScreen');
const chamberNumber = $('chamberNumber');
const chamberName = $('chamberName');
const chamberHint = $('chamberHint');
const massValue = $('massValue');
const cutsValue = $('cutsValue');
const scoreValue = $('scoreValue');
const objectiveValue = $('objectiveValue');
const timeValue = $('timeValue');
const speedValue = $('speedValue');
const spinValue = $('spinValue');
const toast = $('toast');
const soundButton = $('soundButton');
const bestReadout = $('bestReadout');

let soundEnabled = true;
let toastTimer = 0;
let lastUiState = 'title';

const preventGesture = (event) => {
  if (event.cancelable) event.preventDefault();
};

for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'dblclick']) {
  document.addEventListener(type, preventGesture, { passive: false });
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

function syncHud(snapshot = game.getSnapshot()) {
  chamberNumber.textContent = `CHAMBER ${String(snapshot.stageIndex + 1).padStart(2, '0')} / ${String(snapshot.stageCount).padStart(2, '0')}`;
  chamberName.textContent = snapshot.stageName;
  chamberHint.textContent = snapshot.stageHint;
  massValue.textContent = `${Math.round(snapshot.massRatio * 100)}%`;
  massValue.classList.toggle('danger', snapshot.massRatio < 0.4);
  cutsValue.textContent = String(snapshot.totalCuts).padStart(2, '0');
  scoreValue.textContent = String(snapshot.score).padStart(6, '0');
  objectiveValue.textContent = snapshot.objective || 'LESS MASS LOST · FEWER CUTS';
  timeValue.textContent = Math.ceil(snapshot.timeLeft).toString().padStart(2, '0');
  timeValue.classList.toggle('danger', snapshot.timeLeft <= 10);
  speedValue.textContent = Math.round(snapshot.speed).toString().padStart(3, '0');
  spinValue.textContent = `${snapshot.angular >= 0 ? '+' : ''}${snapshot.angular.toFixed(2)}`;
}

function setState(state, detail = {}) {
  lastUiState = state;
  if (state === 'start') {
    titleScreen.hidden = true;
    pauseScreen.hidden = true;
    resultScreen.hidden = true;
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
  if (state === 'victory' || state === 'gameover') {
    hud.hidden = true;
    pauseScreen.hidden = true;
    titleScreen.hidden = true;
    resultScreen.hidden = false;
    const victory = state === 'victory';
    $('resultEyebrow').textContent = victory ? 'FABRICATION RUN COMPLETE' : `VECTOR LOST · CHAMBER ${String(game.stageIndex + 1).padStart(2, '0')}`;
    $('resultTitle').textContent = victory ? 'CORE RUSH COMPLETE' : (detail.reason === 'NO_CUTS' ? 'NO CUTS LEFT' : 'WINDOW EXPIRED');
    $('resultSubtitle').textContent = victory
      ? 'コアをGOALへ送り込み続け、24 CHAMBERSを突破した。'
      : detail.reason === 'NO_CUTS'
        ? '切れる船体が残っていない。次は少ないCUTでコアを直接GOALへ送る。'
        : '時間切れ。軌道プレビューを使い、より少ないCUTでGOALへ向かう。';
    $('resultScore').textContent = String(game.score).padStart(6, '0');
    $('resultCuts').textContent = String(game.totalCuts);
    $('resultMass').textContent = `${Math.round(game.massRatio * 100)}%`;
    const record = detail.isScoreRecord || detail.isCutsRecord || detail.isMassRecord;
    $('recordNotice').hidden = !record;
    $('recordNotice').textContent = detail.isScoreRecord ? 'NEW BEST SCORE' : detail.isCutsRecord ? 'NEW FEWEST CUTS' : 'NEW MASS RECORD';
    const records = game.getRecords();
    bestReadout.textContent = records.bestScore > 0
      ? `BEST ${String(records.bestScore).padStart(6, '0')} · ${records.fewestCuts || '—'} CUTS`
      : 'BEST —';
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
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1900);
});

game.setFxCallback((type) => {
  if (!navigator.vibrate) return;
  if (type === 'cut') navigator.vibrate(10);
  else if (type === 'dock') navigator.vibrate([10, 35, 18]);
  else if (type === 'contact') navigator.vibrate(7);
  else if (type === 'switch') navigator.vibrate([8, 24, 12]);
});

const records = game.getRecords();
bestReadout.textContent = records.bestScore > 0
  ? `BEST ${String(records.bestScore).padStart(6, '0')} · ${records.fewestCuts || '—'} CUTS`
  : 'BEST —';

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
  if (game.pointerDown(event.clientX, event.clientY, event.pointerId)) {
    try { canvas.setPointerCapture(event.pointerId); } catch {}
    event.preventDefault();
  }
}, { passive: false });

canvas.addEventListener('pointermove', (event) => {
  if (game.pointerMove(event.clientX, event.clientY, event.pointerId)) event.preventDefault();
}, { passive: false });

canvas.addEventListener('pointerup', (event) => {
  if (game.pointerUp(event.clientX, event.clientY, event.pointerId)) event.preventDefault();
  try { canvas.releasePointerCapture(event.pointerId); } catch {}
}, { passive: false });

canvas.addEventListener('pointercancel', (event) => {
  game.cancelPointer(event.pointerId);
}, { passive: true });

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape' || event.code === 'KeyP') {
    if (lastUiState === 'pause') game.setPaused(false);
    else if (game.state === 'playing') game.setPaused(true);
    event.preventDefault();
  }
});

// Browser chrome and app switching can transiently change focus on iPhone.
// Pause is therefore an explicit player action only; no blur/visibility auto-pause.

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`./sw.js?v=${BUILD_ID}`).catch(() => {});
  }, { once: true });
}