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



function drawManualPreview(canvas, type) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = 184;
  const height = 92;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = '100%';

  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = width * 0.5;
  const cy = height * 0.52;
  ctx.fillStyle = '#02050b';
  ctx.fillRect(0, 0, width, height);

  // Same dark-space vocabulary as the actual playfield.
  for (let i = 0; i < 23; i += 1) {
    const x = ((i * 47 + 13) % 181) + 1;
    const y = ((i * 31 + 7) % 87) + 2;
    ctx.globalAlpha = 0.25 + (i % 4) * 0.13;
    ctx.fillStyle = '#d8ecff';
    ctx.beginPath();
    ctx.arc(x, y, i % 5 === 0 ? 1.2 : 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const ring = (x, y, r, color, widthLine = 2) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = widthLine;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  };
  const plus = (x, y, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(x - 2, y - 9, 4, 18);
    ctx.fillRect(x - 9, y - 2, 18, 4);
  };
  const asteroid = (x, y, r = 20) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(27,39,53,.98)';
    ctx.strokeStyle = '#52677e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 9; i += 1) {
      const a = i / 9 * Math.PI * 2;
      const rr = r * (0.84 + 0.12 * Math.sin(i * 2.3 + 0.6));
      const px = Math.cos(a) * rr;
      const py = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(110,140,170,.18)';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.12, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  const portal = (x, y, r = 25) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = '#7fe9ff';
    ctx.shadowBlur = 14;
    for (let i = 0; i < 3; i += 1) {
      ctx.strokeStyle = i === 0 ? '#b5f8ff' : 'rgba(83,198,255,.55)';
      ctx.lineWidth = i === 0 ? 3 : 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r - i * 6, i * 0.7, Math.PI * 2 - i * 0.35);
      ctx.stroke();
      ctx.rotate(0.72);
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  };

  if (type === 'warp') {
    portal(cx, cy, 28);
  } else if (type === 'asteroid') {
    asteroid(cx, cy, 25);
  } else if (type === 'fuel') {
    ctx.shadowColor = '#68ffad'; ctx.shadowBlur = 13;
    ring(cx, cy, 18, '#8affbd', 2);
    ctx.shadowBlur = 0;
    plus(cx, cy, '#aaffc9');
  } else if (type === 'mine') {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = '#ff6d78';
    ctx.fillStyle = 'rgb(41,20,27)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
      const a = i / 8 * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 15);
      ctx.lineTo(Math.cos(a) * 25, Math.sin(a) * 25);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff7884'; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (type === 'wind') {
    const g = ctx.createRadialGradient(cx, cy, 3, cx, cy, 38);
    g.addColorStop(0, 'rgba(55,192,255,.18)'); g.addColorStop(1, 'rgba(55,192,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(115,224,255,.70)'; ctx.lineWidth = 1.4;
    for (let y = cy - 22; y <= cy + 22; y += 15) {
      ctx.beginPath(); ctx.moveTo(cx - 36, y); ctx.lineTo(cx + 29, y);
      ctx.lineTo(cx + 20, y - 5); ctx.moveTo(cx + 29, y); ctx.lineTo(cx + 20, y + 5); ctx.stroke();
    }
  } else if (type === 'gravity' || type === 'slingshot') {
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 38);
    g.addColorStop(0, 'rgba(152,92,255,.62)');
    g.addColorStop(0.15, 'rgba(72,42,120,.34)');
    g.addColorStop(1, 'rgba(72,42,120,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 38, 0, Math.PI * 2); ctx.fill();
    ring(cx, cy, 14, 'rgba(174,125,255,.70)', 1.4);
    if (type === 'slingshot') {
      ctx.strokeStyle = 'rgba(118,236,255,.95)'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(cx, cy, 28, -0.95, 0.95); ctx.stroke();
      ctx.strokeStyle = 'rgba(118,255,173,.70)';
      ctx.beginPath(); ctx.moveTo(cx + 31, cy + 4); ctx.lineTo(cx + 50, cy - 7); ctx.stroke();
    }
  } else if (type === 'pulse') {
    ctx.fillStyle = 'rgba(255,126,183,.15)'; ctx.strokeStyle = 'rgba(255,119,176,.82)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ring(cx, cy, 31, 'rgba(255,126,183,.62)', 2.3);
    ring(cx, cy, 43, 'rgba(255,126,183,.18)', 1.2);
  } else if (type === 'laser') {
    ctx.strokeStyle = 'rgba(255,76,99,.88)'; ctx.shadowColor = '#ff3f62'; ctx.shadowBlur = 12; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(cx - 61, cy + 23); ctx.lineTo(cx + 61, cy - 23); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ff8595'; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
  } else if (type === 'phase') {
    ctx.shadowColor = '#ff4269'; ctx.shadowBlur = 12; ctx.strokeStyle = 'rgba(255,82,118,.90)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(cx - 58, cy); ctx.lineTo(cx + 58, cy); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(104,220,255,.24)'; ctx.lineWidth = 2; ctx.setLineDash([7,7]);
    ctx.beginPath(); ctx.moveTo(cx - 58, cy + 18); ctx.lineTo(cx + 58, cy + 18); ctx.stroke(); ctx.setLineDash([]);
  } else if (type === 'boost') {
    ctx.shadowColor = '#65ffac'; ctx.shadowBlur = 12; ring(cx, cy, 24, '#76ffad', 3); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#76ffad'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx - 10, cy - 7); ctx.lineTo(cx + 11, cy); ctx.lineTo(cx - 10, cy + 7); ctx.stroke();
  } else if (type === 'drag') {
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 39);
    g.addColorStop(0, 'rgba(126,119,170,.30)'); g.addColorStop(0.65, 'rgba(73,72,112,.20)'); g.addColorStop(1, 'rgba(45,45,80,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 39, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(159,151,207,.34)'; ctx.lineWidth = 1;
    [15,24,33].forEach((r,i)=>{ctx.beginPath();ctx.arc(cx+(i-1)*7,cy+(1-i)*5,r,0,Math.PI*2);ctx.stroke();});
  } else if (type === 'movingWarp') {
    portal(cx + 16, cy, 23);
    ctx.strokeStyle = 'rgba(103,223,255,.50)'; ctx.lineWidth = 1.3; ctx.setLineDash([5,5]);
    ctx.beginPath(); ctx.moveTo(cx - 53, cy); ctx.lineTo(cx + 53, cy); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#77e9ff';
    ctx.beginPath(); ctx.moveTo(cx - 50,cy);ctx.lineTo(cx-41,cy-5);ctx.lineTo(cx-41,cy+5);ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + 50,cy);ctx.lineTo(cx+41,cy-5);ctx.lineTo(cx+41,cy+5);ctx.fill();
  } else if (type === 'velocity') {
    ctx.strokeStyle = 'rgba(116,226,255,.36)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 13; i += 1) {
      const y = 8 + i * 7;
      const x = 22 + (i % 4) * 13;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 52, y); ctx.stroke();
    }
    // Three alternating openings.
    const rows = [
      { y: 25, gapX: 125 }, { y: 49, gapX: 60 }, { y: 73, gapX: 125 },
    ];
    rows.forEach((row) => {
      for (let x = 24; x <= 160; x += 17) {
        if (Math.abs(x - row.gapX) < 22) continue;
        asteroid(x, row.y, 5.5);
      }
    });
    ctx.fillStyle = '#dfe9f1';
    ctx.beginPath(); ctx.moveTo(cx, 12); ctx.lineTo(cx-6,22); ctx.lineTo(cx+6,22); ctx.closePath(); ctx.fill();
  } else if (type === 'corridor') {
    ctx.strokeStyle = 'rgba(255,76,99,.82)'; ctx.shadowColor = '#ff3f62'; ctx.shadowBlur = 8; ctx.lineWidth = 4;
    for (const [x1,y1,x2,y2] of [[18,70,83,22],[45,82,120,12],[88,82,164,30]]) {
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    portal(153, 20, 13);
  }

  ctx.strokeStyle = 'rgba(111,179,219,.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
}

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

    const preview = document.createElement('canvas');
    preview.className = 'manual-gimmick-preview';
    preview.setAttribute('role', 'img');
    preview.setAttribute('aria-label', item.name + ' のゲーム内表示例');

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
    card.append(preview, body);
    manualGimmickList.append(card);
    drawManualPreview(preview, item.type);
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