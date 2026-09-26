import { JetDriftGame } from './game.js?v=__BUILD_ID__';

const BUILD_ID = '__BUILD_ID__';
const $ = (id) => document.getElementById(id);
const canvas = $('gameCanvas');
const game = new JetDriftGame(canvas);

const titleScreen = $('titleScreen');
const hud = $('hud');
const pauseScreen = $('pauseScreen');
const controls = $('controls');
const stageNumber = $('stageNumber');
const stageName = $('stageName');
const stageHint = $('stageHint');
const fuelPanel = $('fuelPanel');
const fuelFill = $('fuelFill');
const fuelValue = $('fuelValue');
const timeValue = $('timeValue');
const timeCard = $('timeCard');
const speedValue = $('speedValue');
const scoreValue = $('scoreValue');
const playStageBadge = $('playStageBadge');
const specialStageOverlay = $('specialStageOverlay');
const specialStageTitle = $('specialStageTitle');
const specialStageSub = $('specialStageSub');
const toast = $('toast');
const stick = $('stick');
const stickKnob = $('stickKnob');
const jetButton = $('jetButton');
const soundButton = $('soundButton');
const pauseButton = $('pauseButton');
const bestReadout = $('bestReadout');
const warpModeButton = $('warpModeButton');
const manualScreen = $('manualScreen');
const manualProgress = $('manualProgress');
const manualCount = $('manualCount');
const manualGimmickList = $('manualGimmickList');
const manualEmpty = $('manualEmpty');
const manualCloseButton = $('manualCloseButton');
const manualBackButton = $('manualBackButton');
const titleManualButton = $('titleManualButton');
const pauseManualButton = $('pauseManualButton');

let toastTimer = 0;
let specialOverlayTimer = 0;
let soundEnabled = true;
let stickPointer = null;
let jetPointer = null;
let keyboardAim = { x: 0, y: 0 };
let manualSource = 'title';

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
  if (!(event.target instanceof Element)) return;
  if (event.target.closest('#manualScreen')) return;
  if (event.target.closest('#app') && event.cancelable) event.preventDefault();
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


const MANUAL_GIMMICKS = [
  { firstStage: 1, type: 'warp', name: 'WARP PORTAL', tag: 'GOAL', desc: 'シアンのリングが出口。機体がリングへ触れればステージクリア。高速で進入してもよい。' },
  { firstStage: 3, type: 'asteroid', name: 'ASTEROID', tag: 'HAZARD', desc: '固定障害物。接触すると爆発。慣性が強いほど早めの進路変更が必要。' },
  { firstStage: 4, type: 'fuel', name: 'FUEL CELL', tag: 'ITEM', desc: '緑の＋マーク。触れるとJET FUELを回復する。無理に取るよりライン維持が有利な場合もある。' },
  { firstStage: 6, type: 'velocity', name: 'VELOCITY ENTRY', tag: 'SPECIAL', desc: '初速付き高速SPECIAL。未入力でも自動進行しTIMEも開始する。長い直進区間のあと高速スラロームへ入る。' },
  { firstStage: 7, type: 'mine', name: 'MOVING MINE', tag: 'HAZARD', desc: '一定軸上を往復する地雷。リトライ時は同じ位置・同じ位相から動き始める。' },
  { firstStage: 7, type: 'wind', name: 'SOLAR WIND', tag: 'FIELD', desc: '青い流れの範囲内では一定方向へ加速される。JETを節約する無料の推進力として使える。' },
  { firstStage: 9, type: 'gravity', name: 'GRAVITY WELL', tag: 'FIELD', desc: '紫の重力井戸。近いほど強く引かれる。接線速度を作って外へ抜けるとスリングショット加速を狙える。' },
  { firstStage: 10, type: 'pulse', name: 'PULSE BEACON', tag: 'HAZARD', desc: '周期的に衝撃波を放つ。発光リングの周期を読み、波が弱い瞬間か安全な距離を通過する。' },
  { firstStage: 12, type: 'slingshot', name: 'SLINGSHOT ARC', tag: 'SPECIAL', desc: '燃料が少ないSPECIAL。重力井戸へ接近し、接線方向の速度を作って重力加速で出口を目指す。' },
  { firstStage: 13, type: 'laser', name: 'ROTATING LASER', tag: 'HAZARD', desc: '中心を軸に回転するレーザー。線へ触れると即FAIL。角度と回転周期を先読みする。' },
  { firstStage: 14, type: 'phase', name: 'PHASE GATE', tag: 'HAZARD', desc: '周期的に実体化するゲート。消えている時間帯を抜けるか、端を迂回する。' },
  { firstStage: 17, type: 'boost', name: 'BOOST RING', tag: 'FIELD', desc: '緑のリング。通過するとリング方向へ追加加速。JETを使わず速度を伸ばせる。' },
  { firstStage: 18, type: 'movingWarp', name: 'MOVING WARP', tag: 'SPECIAL', desc: '出口ワープが横方向へ周期移動するSPECIAL。現在位置ではなく到達時刻の位置を狙う。' },
  { firstStage: 21, type: 'drag', name: 'DRAG CLOUD', tag: 'FIELD', desc: '紫灰色の雲。内部では速度が落ちる。短く横切るか外周を回って慣性を守る。' },
  { firstStage: 24, type: 'corridor', name: 'LASER CORRIDOR', tag: 'SPECIAL', desc: '複数レーザーが作る高速回廊。安全角度が連続するタイミングを見つけ、一気に抜ける。' },
];

function manualStageLimit(source) {
  if (source === 'pause' && game.state === 'playing') return game.getSnapshot().stageIndex + 1;
  const progress = game.getRecords().furthest || 1;
  return Math.max(1, progress);
}

function renderManual(maxStage) {
  manualProgress.textContent = 'STAGE ' + String(maxStage).padStart(maxStage >= 100 ? 3 : 2, '0') + ' までに確認した情報';
  const visible = MANUAL_GIMMICKS.filter((item) => item.firstStage <= maxStage);
  manualCount.textContent = visible.length + ' ENTRIES';
  manualGimmickList.replaceChildren();
  manualEmpty.hidden = visible.length > 0;

  for (const item of visible) {
    const card = document.createElement('article');
    card.className = 'manual-gimmick-card';
    card.dataset.type = item.type;

    const icon = document.createElement('div');
    icon.className = 'manual-gimmick-icon';
    icon.textContent = item.tag === 'SPECIAL' ? '◆' : item.name.slice(0, 1);

    const body = document.createElement('div');
    const meta = document.createElement('div');
    meta.className = 'manual-gimmick-meta';
    const stage = document.createElement('span');
    stage.textContent = 'STAGE ' + String(item.firstStage).padStart(2, '0');
    const tag = document.createElement('b');
    tag.textContent = item.tag;
    meta.append(stage, tag);

    const name = document.createElement('h3');
    name.textContent = item.name;
    const desc = document.createElement('p');
    desc.textContent = item.desc;
    body.append(meta, name, desc);
    card.append(icon, body);
    manualGimmickList.append(card);
  }
}

function openManual(source) {
  manualSource = source;
  const maxStage = manualStageLimit(source);
  renderManual(maxStage);
  manualScreen.hidden = false;
  if (source === 'title') titleScreen.hidden = true;
  if (source === 'pause') pauseScreen.hidden = true;
}

function closeManual() {
  manualScreen.hidden = true;
  if (manualSource === 'pause' && game.state === 'playing') {
    pauseScreen.hidden = false;
  } else {
    titleScreen.hidden = false;
  }
}

const SPECIAL_LABELS = {
  VELOCITY_ENTRY: ['VELOCITY ENTRY', 'HIGH VELOCITY CHALLENGE'],
  SLINGSHOT_ARC: ['SLINGSHOT ARC', 'GRAVITY ASSIST CHALLENGE'],
  MOVING_WARP: ['MOVING WARP', 'INTERCEPT THE EXIT'],
  LASER_CORRIDOR: ['LASER CORRIDOR', 'HIGH RISK TRANSIT'],
};

function showSpecialStage(snapshot) {
  if (!snapshot?.specialType) return;
  const label = SPECIAL_LABELS[snapshot.specialType] || [snapshot.stageName || 'SPECIAL', 'SPECIAL CHALLENGE'];
  specialStageTitle.textContent = label[0];
  specialStageSub.textContent = 'SECTOR ' + String(snapshot.sectorIndex || 1).padStart(2, '0') + ' · ' + label[1];
  specialStageOverlay.dataset.type = snapshot.specialType;
  specialStageOverlay.hidden = false;
  specialStageOverlay.classList.remove('show');
  void specialStageOverlay.offsetWidth;
  specialStageOverlay.classList.add('show');
  clearTimeout(specialOverlayTimer);
  specialOverlayTimer = setTimeout(() => {
    specialStageOverlay.classList.remove('show');
    setTimeout(() => { specialStageOverlay.hidden = true; }, 260);
  }, 1550);
}

function syncHud(snapshot = game.getSnapshot()) {
  const no = String(snapshot.stageIndex + 1).padStart(snapshot.stageIndex >= 24 ? 3 : 2, '0');
  const sectorNo = String(snapshot.sectorIndex || 1).padStart(2, '0');
  const sectorStage = snapshot.sectorStage || 1;
  const sectorLength = snapshot.sectorLength || 6;
  stageNumber.textContent = 'SECTOR ' + sectorNo + ' · ' + sectorStage + '/' + sectorLength + ' · STAGE ' + no;
  stageName.textContent = (snapshot.specialType ? '◆ ' : '') + (snapshot.sectorName || '') + ' · ' + snapshot.stageName;
  stageHint.textContent = snapshot.stageHint;
  playStageBadge.textContent = (snapshot.specialType ? 'SPECIAL · ' : '') + 'STAGE ' + no;
  playStageBadge.classList.toggle('special', Boolean(snapshot.specialType));
  playStageBadge.dataset.type = snapshot.specialType || '';
  hud.classList.toggle('special-stage', Boolean(snapshot.specialType));
  hud.dataset.specialType = snapshot.specialType || '';
  fuelValue.textContent = Math.round(snapshot.fuel) + '%';
  fuelFill.style.width = clamp(snapshot.fuel, 0, 100) + '%';
  const fuelWarning = snapshot.fuel <= 25 && snapshot.fuel > 12;
  const fuelCritical = snapshot.fuel <= 12;
  fuelFill.classList.toggle('danger', fuelWarning || fuelCritical);
  fuelPanel.classList.toggle('warning', fuelWarning);
  fuelPanel.classList.toggle('critical', fuelCritical);
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

function syncWarpModeButton() {
  const enabled = game.getWireframeWarpEnabled();
  warpModeButton.textContent = '3D WIREFRAME WARP · ' + (enabled ? 'ON' : 'OFF');
  warpModeButton.classList.toggle('off', !enabled);
  warpModeButton.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

function setState(state, detail = {}) {
  if (state === 'start') {
    titleScreen.hidden = true;
    pauseScreen.hidden = true;
    controls.hidden = false;
    hud.hidden = false;
    syncHud(detail?.stageIndex == null ? game.getSnapshot() : detail);
    return;
  }
  if (state === 'stage' || state === 'hud') {
    const snapshot = detail?.stageIndex == null ? game.getSnapshot() : detail;
    if (!hud.hidden) syncHud(snapshot);
    if (state === 'stage' && snapshot.specialType) showSpecialStage(snapshot);
    return;
  }
  if (state === 'settings') {
    syncWarpModeButton();
    return;
  }
  if (state === 'pause') {
    controls.hidden = true;
    pauseScreen.hidden = false;
    return;
  }
  if (state === 'resume') {
    pauseScreen.hidden = true;
    controls.hidden = false;
    hud.hidden = false;
    hud.classList.remove('cinematic');
    syncHud();
    return;
  }
  if (state === 'title') {
    manualScreen.hidden = true;
    specialStageOverlay.hidden = true;
    specialStageOverlay.classList.remove('show');
    hud.hidden = true;
    controls.hidden = true;
    pauseScreen.hidden = true;
    titleScreen.hidden = false;
    hud.classList.remove('cinematic');
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
  if (type === 'warp3dIn' || type === 'warp3dOut') {
    controls.hidden = true;
    hud.classList.add('cinematic');
  } else if (type === 'warp3dEnd') {
    if (game.state === 'playing' && pauseScreen.hidden) controls.hidden = false;
    hud.classList.remove('cinematic');
  }

  if (!navigator.vibrate) return;
  if (type === 'fail') navigator.vibrate([14, 20, 24]);
  else if (type === 'clear') navigator.vibrate([8, 20, 10, 28, 16]);
  else if (type === 'pickup') navigator.vibrate(8);
  else if (type === 'warning') navigator.vibrate(7);
  else if (type === 'warningCritical') navigator.vibrate([7, 26, 10]);
});

syncWarpModeButton();

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
titleManualButton.addEventListener('click', () => openManual('title'));
pauseManualButton.addEventListener('click', () => openManual('pause'));
manualCloseButton.addEventListener('click', closeManual);
manualBackButton.addEventListener('click', closeManual);
$('resumeButton').addEventListener('click', () => game.setPaused(false));
$('restartButton').addEventListener('click', () => game.startAgain());
$('titleButton').addEventListener('click', () => game.returnToTitle());
warpModeButton.addEventListener('click', () => {
  game.setWireframeWarpEnabled(!game.getWireframeWarpEnabled());
  syncWarpModeButton();
});
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
    if (!manualScreen.hidden) closeManual();
    else if (!pauseScreen.hidden) game.setPaused(false);
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