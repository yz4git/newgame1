import { AfterwakeGame } from './game.js?v=__BUILD_ID__';

const BUILD_ID = '__BUILD_ID__';

const $ = (id) => document.getElementById(id);
const canvas = $('gameCanvas');
const game = new AfterwakeGame(canvas);

const hud = $('hud');
const titleScreen = $('titleScreen');
const pauseScreen = $('pauseScreen');
const resultScreen = $('resultScreen');
const corePips = $('corePips');
const sectorCount = $('sectorCount');
const sectorName = $('sectorName');
const sectorHint = $('sectorHint');
const scoreValue = $('scoreValue');
const chainValue = $('chainValue');
const pulseButton = $('pulseButton');
const pulseState = $('pulseState');
const chargeFill = $('chargeFill');
const toast = $('toast');
const soundButton = $('soundButton');
const bestReadout = $('bestReadout');
const moveHint = $('moveHint');

let toastHideTimer = 0;
let audioEnabled = true;
let lastUiState = '';

game.setJoystick($('joystick'));

const records = game.getRecords();
bestReadout.textContent = records.bestScore > 0 ? `BEST ${String(records.bestScore).padStart(6, '0')}` : 'BEST —';

function setScreenState(state, detail = {}) {
  lastUiState = state;
  if (state === 'start') {
    titleScreen.hidden = true;
    pauseScreen.hidden = true;
    resultScreen.hidden = true;
    hud.hidden = false;
    moveHint.textContent = isTouchDevice() ? '左側をドラッグして移動' : 'WASD / 矢印キーで移動';
    syncHud();
    return;
  }
  if (state === 'wave' || state === 'score' || state === 'core') {
    if (!hud.hidden) syncHud();
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
    $('resultEyebrow').textContent = victory ? 'RUN COMPLETE' : `SIGNAL LOST · SECTOR 0${game.waveIndex + 1}`;
    $('resultTitle').textContent = victory ? 'CORE PRESERVED' : 'SIGNAL COLLAPSED';
    $('resultSubtitle').textContent = victory ? '軌跡を読めば、次はもっと深く届く。' : '失敗地点は保存されない。すぐに再挑戦できる。';
    $('resultScore').textContent = String(game.score).padStart(6, '0');
    $('resultChain').textContent = `×${game.bestChainThisRun}`;
    $('resultCore').textContent = `${Math.max(0, game.core)} / 3`;
    $('recordNotice').hidden = !detail.isRecord;
    bestReadout.textContent = game.records.bestScore > 0 ? `BEST ${String(game.records.bestScore).padStart(6, '0')}` : 'BEST —';
    return;
  }
  if (state === 'title') {
    hud.hidden = true;
    pauseScreen.hidden = true;
    resultScreen.hidden = true;
    titleScreen.hidden = false;
  }
}

function isTouchDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function syncHud() {
  const data = game.getSnapshot();
  if (data.state === 'title') return;
  sectorCount.textContent = `SECTOR 0${data.waveIndex + 1} / 05`;
  sectorName.textContent = data.waveIndex === 4 ? 'NULL ORBIT' : data.waveName;
  sectorHint.textContent = data.waveHint;
  scoreValue.textContent = String(data.score).padStart(6, '0');
  chainValue.textContent = data.chain > 1 ? `CHAIN ×${data.chain}` : 'CHAIN ×1';
  chainValue.classList.toggle('chain-hot', data.chain > 1);
  chargeFill.style.width = `${Math.max(0, Math.min(100, data.charge))}%`;
  const ready = data.charge >= 99.5;
  pulseButton.disabled = !ready;
  pulseButton.classList.toggle('ready', ready);
  pulseState.textContent = ready ? (game.enemies.some((enemy) => enemy.markedUntil > game.globalTime) ? 'TAGGED · FIRE' : 'READY · FIND A TAG') : `MOVE TO CHARGE ${Math.floor(data.charge)}%`;
  pulseButton.setAttribute('aria-label', ready ? 'パルスを発動' : `移動してチャージ ${Math.floor(data.charge)}パーセント`);
  if (corePips.children.length !== 3) {
    corePips.replaceChildren(...Array.from({ length: 3 }, () => {
      const pip = document.createElement('i');
      pip.className = 'core-pip';
      return pip;
    }));
  }
  [...corePips.children].forEach((pip, index) => pip.classList.toggle('lost', index >= data.core));
}

game.setOnChange(setScreenState);
game.setToastCallback((title, subtitle) => {
  toast.replaceChildren();
  const strong = document.createElement('strong');
  strong.textContent = title;
  toast.append(strong);
  if (subtitle) {
    const text = document.createElement('span');
    text.textContent = `  ·  ${subtitle}`;
    toast.append(text);
  }
  toast.classList.add('visible');
  window.clearTimeout(toastHideTimer);
  toastHideTimer = window.setTimeout(() => toast.classList.remove('visible'), 2300);
});

$('startButton').addEventListener('click', () => game.start());
$('resumeButton').addEventListener('click', () => game.setPaused(false));
$('restartButton').addEventListener('click', () => {
  game.restart();
  game.startAgain();
});
$('againButton').addEventListener('click', () => game.startAgain());
$('titleButton').addEventListener('click', () => game.restart());
$('pauseButton').addEventListener('click', () => game.setPaused(true));
pulseButton.addEventListener('click', () => game.pulse());

soundButton.addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  game.setAudioEnabled(audioEnabled);
  soundButton.textContent = audioEnabled ? '♪' : '×';
  soundButton.setAttribute('aria-label', audioEnabled ? 'サウンドをオフにする' : 'サウンドをオンにする');
  soundButton.classList.toggle('muted', !audioEnabled);
});

canvas.addEventListener('pointerdown', (event) => {
  if (game.pointerDown(event)) {
    event.preventDefault();
    try { canvas.setPointerCapture(event.pointerId); } catch { /* capture is optional */ }
  }
}, { passive: false });
canvas.addEventListener('pointermove', (event) => {
  game.pointerMove(event);
  if (game.playerPointer === event.pointerId) event.preventDefault();
}, { passive: false });
canvas.addEventListener('pointerup', (event) => game.pointerUp(event));
canvas.addEventListener('pointercancel', (event) => game.pointerUp(event));
canvas.addEventListener('lostpointercapture', (event) => game.pointerUp(event));

window.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && game.state === 'title') {
    event.preventDefault();
    game.start();
    return;
  }
  if (event.key === 'Enter' && (game.state === 'victory' || game.state === 'gameover')) {
    event.preventDefault();
    game.startAgain();
    return;
  }
  game.keyDown(event);
});
window.addEventListener('keyup', (event) => game.keyUp(event));
window.addEventListener('blur', () => {
  if (game.state === 'playing') game.setPaused(true);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') game.setPaused(true);
});
window.addEventListener('resize', () => game.resize(), { passive: true });
window.addEventListener('orientationchange', () => window.setTimeout(() => game.resize(), 140), { passive: true });
document.addEventListener('contextmenu', (event) => event.preventDefault());

window.setInterval(() => {
  if (game.state === 'playing' || game.state === 'paused') syncHud();
}, 100);

game.startLoop();

async function prepareOfflineSupport() {
  if (!('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;

  // Check the deployed build without consulting Safari's HTTP cache. An update
  // installs in the background; a running session is never reloaded.
  fetch('./version.json?check=' + encodeURIComponent(BUILD_ID), { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : null)
    .then((version) => {
      if (version?.buildId && version.buildId !== BUILD_ID) {
        document.documentElement.dataset.buildUpdateAvailable = version.buildId;
      }
    })
    .catch(() => {});

  try {
    const registration = await navigator.serviceWorker.register('./sw.js?v=' + BUILD_ID, { updateViaCache: 'none' });
    registration.update().catch(() => {});
  } catch {
    // The game remains playable if offline storage is unavailable.
  }
}

window.addEventListener('load', () => {
  prepareOfflineSupport();
}, { once: true });
