const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hypot = (x, y) => Math.hypot(x, y);

function normalize(x, y, fx = 1, fy = 0) {
  const d = Math.hypot(x, y);
  if (d < 1e-6) return { x: fx, y: fy };
  return { x: x / d, y: y / d };
}

function seededRandom(seed) {
  let s = (Math.imul(seed + 1, 0x9e3779b1) ^ 0xa341316c) >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const den = abx * abx + aby * aby || 1;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / den, 0, 1);
  const qx = ax + abx * t;
  const qy = ay + aby * t;
  return Math.hypot(px - qx, py - qy);
}

function createStage(index) {
  const n = index + 1;
  const rnd = seededRandom(n * 7919);
  const angle = n === 1 ? 0 : rnd() * TAU;
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const perp = { x: -dir.y, y: dir.x };
  const distance = 500 + Math.min(360, n * 11);
  const portal = { x: dir.x * distance, y: dir.y * distance };
  const time = Math.max(6.5, 10.5 - Math.min(3.2, n * 0.08));
  const portalRadius = Math.max(27, 43 - Math.min(16, n * 0.55));
  const fuelStart = Math.max(58, 88 - Math.min(30, n * 1.15));

  const asteroids = [];
  const asteroidCount = n < 3 ? 0 : Math.min(10, 1 + Math.floor((n - 2) / 2));
  for (let i = 0; i < asteroidCount; i += 1) {
    const t = 0.20 + (i + 1) / (asteroidCount + 1) * 0.64;
    const side = i % 2 === 0 ? 1 : -1;
    const offsetBase = n < 7 ? 72 : 52;
    const offset = side * (offsetBase + rnd() * 46);
    asteroids.push({
      x: portal.x * t + perp.x * offset,
      y: portal.y * t + perp.y * offset,
      r: 23 + rnd() * Math.min(25, 10 + n * 0.8),
      spin: (rnd() - 0.5) * 1.2,
      phase: rnd() * TAU,
    });
  }

  const mines = [];
  const mineCount = n < 6 ? 0 : Math.min(5, 1 + Math.floor((n - 6) / 5));
  for (let i = 0; i < mineCount; i += 1) {
    const t = 0.30 + (i + 1) / (mineCount + 1) * 0.48;
    const side = i % 2 === 0 ? -1 : 1;
    mines.push({
      bx: portal.x * t + perp.x * side * (58 + rnd() * 34),
      by: portal.y * t + perp.y * side * (58 + rnd() * 34),
      amp: 34 + rnd() * 26,
      speed: 1.0 + rnd() * 0.8,
      phase: rnd() * TAU,
      axisX: dir.x * 0.35 + perp.x * 0.94,
      axisY: dir.y * 0.35 + perp.y * 0.94,
      r: 15 + rnd() * 5,
    });
  }

  const wells = [];
  const wellCount = n < 9 ? 0 : Math.min(3, 1 + Math.floor((n - 9) / 8));
  for (let i = 0; i < wellCount; i += 1) {
    const t = 0.34 + (i + 1) / (wellCount + 1) * 0.42;
    const side = i % 2 === 0 ? 1 : -1;
    wells.push({
      x: portal.x * t + perp.x * side * (118 + rnd() * 45),
      y: portal.y * t + perp.y * side * (118 + rnd() * 45),
      range: 150 + rnd() * 45,
      strength: 95 + Math.min(95, n * 3.0),
      r: 18,
    });
  }

  const lasers = [];
  const laserCount = n < 13 ? 0 : Math.min(3, 1 + Math.floor((n - 13) / 7));
  for (let i = 0; i < laserCount; i += 1) {
    const t = 0.42 + (i + 1) / (laserCount + 1) * 0.34;
    const side = i % 2 === 0 ? -1 : 1;
    lasers.push({
      x: portal.x * t + perp.x * side * (76 + rnd() * 34),
      y: portal.y * t + perp.y * side * (76 + rnd() * 34),
      len: 74 + rnd() * 35,
      angle: rnd() * TAU,
      speed: (rnd() > 0.5 ? 1 : -1) * (0.8 + rnd() * 0.8),
      width: 6,
    });
  }

  const fuels = [];
  const fuelCount = n < 4 ? 0 : (n < 15 ? 1 : 2);
  for (let i = 0; i < fuelCount; i += 1) {
    const t = 0.32 + (i + 1) / (fuelCount + 1) * 0.42;
    const side = i % 2 === 0 ? 1 : -1;
    fuels.push({
      x: portal.x * t + perp.x * side * (40 + rnd() * 54),
      y: portal.y * t + perp.y * side * (40 + rnd() * 54),
      r: 13,
      amount: 34,
      taken: false,
    });
  }

  const margin = 420;
  const minX = Math.min(0, portal.x) - margin;
  const maxX = Math.max(0, portal.x) + margin;
  const minY = Math.min(0, portal.y) - margin;
  const maxY = Math.max(0, portal.y) + margin;

  let title = 'DRIFT LINE';
  if (n >= 4) title = 'ASTEROID BELT';
  if (n >= 6) title = 'MOVING MINES';
  if (n >= 9) title = 'GRAVITY FIELD';
  if (n >= 13) title = 'LASER ORBIT';
  if (n >= 19) title = 'DEEP DRIFT';
  if (n >= 25) title = 'ENDLESS ' + String(n).padStart(3, '0');

  return {
    n,
    title,
    time,
    fuelStart,
    portal,
    portalRadius,
    bounds: { minX, maxX, minY, maxY },
    asteroids,
    mines,
    wells,
    lasers,
    fuels,
    startAim: { x: -dir.x, y: -dir.y },
    hint: n <= 2
      ? 'スティック方向にノズル。JETで反対方向へ加速'
      : n < 6
        ? '短く噴射して慣性を作り、ワープ口へ'
        : n < 13
          ? '動く障害物と重力を読み、燃料を節約'
          : '障害物の周期を見て一気に抜ける',
  };
}

class AudioBus {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.jetOsc = null;
    this.jetGain = null;
  }

  async unlock() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(v) {
    this.enabled = v;
    if (!v) this.stopJet();
    else this.unlock();
  }

  tone(freq, duration, type = 'sine', gain = 0.03, endFreq = null) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(25, endFreq), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.04);
  }

  startJet() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running' || this.jetOsc) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(78, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(0.018, now + 0.035);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(now);
    this.jetOsc = osc;
    this.jetGain = amp;
  }

  stopJet() {
    if (!this.jetOsc || !this.ctx) return;
    const osc = this.jetOsc;
    const amp = this.jetGain;
    const now = this.ctx.currentTime;
    try {
      amp.gain.cancelScheduledValues(now);
      amp.gain.setValueAtTime(Math.max(0.0001, amp.gain.value), now);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      osc.stop(now + 0.06);
    } catch {}
    this.jetOsc = null;
    this.jetGain = null;
  }

  pickup() {
    this.tone(520, 0.14, 'sine', 0.025, 880);
  }

  fail() {
    this.stopJet();
    this.tone(125, 0.16, 'square', 0.022, 58);
  }

  warp() {
    this.stopJet();
    this.tone(330, 0.20, 'sine', 0.025, 720);
    setTimeout(() => this.tone(660, 0.17, 'sine', 0.02, 980), 55);
  }
}

export class JetDriftGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.audio = new AudioBus();
    this.state = 'title';
    this.paused = false;
    this.stageIndex = 0;
    this.stage = createStage(0);
    this.player = { x: 0, y: 0, vx: 0, vy: 0, r: 12, angle: 0 };
    this.aimX = -1;
    this.aimY = 0;
    this.thrusting = false;
    this.fuel = 100;
    this.timeLeft = 10;
    this.score = 0;
    this.attempts = 0;
    this.failTimer = 0;
    this.clearTimer = 0;
    this.strandedTimer = 0;
    this.globalTime = 0;
    this.hudTimer = 0;
    this.dpr = 1;
    this.width = 1;
    this.height = 1;
    this.step = 1 / 60;
    this.accumulator = 0;
    this.lastFrame = performance.now();
    this.onChange = () => {};
    this.onToast = () => {};
    this.onFx = () => {};
    this.records = this.loadRecords();
    this.frame = this.frame.bind(this);
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    requestAnimationFrame(this.frame);
  }

  setOnChange(fn) { this.onChange = fn || (() => {}); }
  setToastCallback(fn) { this.onToast = fn || (() => {}); }
  setFxCallback(fn) { this.onFx = fn || (() => {}); }
  setAudioEnabled(v) { this.audio.setEnabled(v); }
  unlockAudio() { this.audio.unlock(); }

  loadRecords() {
    try {
      const raw = JSON.parse(localStorage.getItem('jetDriftRecordsV1') || '{}');
      return {
        furthest: Number(raw.furthest) || 1,
        bestScore: Number(raw.bestScore) || 0,
      };
    } catch {
      return { furthest: 1, bestScore: 0 };
    }
  }

  saveRecords() {
    try { localStorage.setItem('jetDriftRecordsV1', JSON.stringify(this.records)); } catch {}
  }

  getRecords() {
    return { ...this.records };
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.8);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  start() {
    this.audio.unlock();
    this.state = 'playing';
    this.paused = false;
    this.score = 0;
    this.attempts = 0;
    this.startStage(0, true);
    this.onChange('start', this.getSnapshot());
  }

  startAgain() {
    this.start();
  }

  returnToTitle() {
    this.audio.stopJet();
    this.state = 'title';
    this.paused = false;
    this.thrusting = false;
    this.onChange('title', this.getSnapshot());
  }

  setPaused(v) {
    if (this.state !== 'playing') return;
    this.paused = Boolean(v);
    if (this.paused) {
      this.thrusting = false;
      this.audio.stopJet();
    }
    this.onChange(this.paused ? 'pause' : 'resume', this.getSnapshot());
  }

  startStage(index, silent = false) {
    this.stageIndex = index;
    this.stage = createStage(index);
    this.player.x = 0;
    this.player.y = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.angle = 0;
    this.aimX = this.stage.startAim.x;
    this.aimY = this.stage.startAim.y;
    this.fuel = this.stage.fuelStart;
    this.timeLeft = this.stage.time;
    this.failTimer = 0;
    this.clearTimer = 0;
    this.strandedTimer = 0;
    this.thrusting = false;
    this.audio.stopJet();
    if (!silent) {
      this.onToast('STAGE ' + String(index + 1).padStart(index >= 24 ? 3 : 2, '0') + ' · ' + this.stage.title, this.stage.hint);
    }
    this.onChange('stage', this.getSnapshot());
  }

  setNozzle(x, y) {
    const n = normalize(x, y, this.aimX, this.aimY);
    this.aimX = n.x;
    this.aimY = n.y;
  }

  setThrusting(v) {
    const next = Boolean(v) && this.state === 'playing' && !this.paused && this.failTimer <= 0 && this.clearTimer <= 0;
    if (next === this.thrusting) return;
    this.thrusting = next;
    if (next) {
      this.audio.unlock();
      this.audio.startJet();
    } else {
      this.audio.stopJet();
    }
  }

  getSnapshot() {
    return {
      state: this.state,
      stageIndex: this.stageIndex,
      stageName: this.stage.title,
      stageHint: this.stage.hint,
      timeLeft: this.timeLeft,
      fuel: this.fuel,
      score: this.score,
      speed: Math.hypot(this.player.vx, this.player.vy),
      attempts: this.attempts,
      endless: this.stageIndex >= 24,
    };
  }

  triggerFail(reason) {
    if (this.state !== 'playing' || this.failTimer > 0 || this.clearTimer > 0) return;
    this.failTimer = 0.50;
    this.thrusting = false;
    this.audio.fail();
    this.onFx('fail');
    this.attempts += 1;
    this.score = Math.max(0, this.score - 40);
    this.player.vx = 0;
    this.player.vy = 0;
    this.onToast('FAIL · ' + reason, 'AUTO RETRY');
    this.onChange('hud', this.getSnapshot());
  }

  clearStage() {
    if (this.clearTimer > 0 || this.failTimer > 0) return;
    const bonus = Math.round(700 + this.timeLeft * 95 + this.fuel * 6);
    this.score += bonus;
    this.clearTimer = 1.00;
    this.thrusting = false;
    this.audio.warp();
    this.onFx('clear');
    this.records.furthest = Math.max(this.records.furthest, this.stageIndex + 2);
    this.records.bestScore = Math.max(this.records.bestScore, this.score);
    this.saveRecords();
    this.onToast('WARP DRIVE', '+' + bonus + ' · FUEL ' + Math.round(this.fuel) + '%');
    this.onChange('hud', this.getSnapshot());
  }

  minePosition(mine) {
    const s = Math.sin(this.globalTime * mine.speed + mine.phase) * mine.amp;
    return {
      x: mine.bx + mine.axisX * s,
      y: mine.by + mine.axisY * s,
    };
  }

  laserSegment(laser) {
    const a = laser.angle + this.globalTime * laser.speed;
    const dx = Math.cos(a) * laser.len;
    const dy = Math.sin(a) * laser.len;
    return {
      ax: laser.x - dx,
      ay: laser.y - dy,
      bx: laser.x + dx,
      by: laser.y + dy,
    };
  }

  update(dt) {
    if (this.state !== 'playing' || this.paused) return;
    this.globalTime += dt;
    this.hudTimer += dt;

    if (this.clearTimer > 0) {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0) this.startStage(this.stageIndex + 1);
      return;
    }

    if (this.failTimer > 0) {
      this.failTimer -= dt;
      if (this.failTimer <= 0) this.startStage(this.stageIndex, true);
      return;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.triggerFail('TIME OUT');
      return;
    }

    const p = this.player;
    let ax = 0;
    let ay = 0;

    for (const well of this.stage.wells) {
      const dx = well.x - p.x;
      const dy = well.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d < well.range && d > 2) {
        const pull = (1 - d / well.range) * well.strength;
        ax += dx / d * pull;
        ay += dy / d * pull;
      }
    }

    if (this.thrusting && this.fuel > 0) {
      const power = 285;
      ax += -this.aimX * power;
      ay += -this.aimY * power;
      this.fuel = Math.max(0, this.fuel - 22 * dt);
      if (this.fuel <= 0) {
        this.thrusting = false;
        this.audio.stopJet();
      }
    }

    p.vx += ax * dt;
    p.vy += ay * dt;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 420) {
      p.vx = p.vx / speed * 420;
      p.vy = p.vy / speed * 420;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    if (speed > 8) p.angle = Math.atan2(p.vy, p.vx);

    for (const pickup of this.stage.fuels) {
      if (pickup.taken) continue;
      if (Math.hypot(p.x - pickup.x, p.y - pickup.y) <= p.r + pickup.r) {
        pickup.taken = true;
        this.fuel = Math.min(100, this.fuel + pickup.amount);
        this.audio.pickup();
        this.onFx('pickup');
        this.onToast('FUEL + ' + pickup.amount, Math.round(this.fuel) + '%');
      }
    }

    const portalDistance = Math.hypot(p.x - this.stage.portal.x, p.y - this.stage.portal.y);
    if (portalDistance <= this.stage.portalRadius - p.r * 0.25) {
      this.clearStage();
      return;
    }

    const b = this.stage.bounds;
    if (p.x < b.minX || p.x > b.maxX || p.y < b.minY || p.y > b.maxY) {
      this.triggerFail('LOST IN SPACE');
      return;
    }

    for (const a of this.stage.asteroids) {
      if (Math.hypot(p.x - a.x, p.y - a.y) <= p.r + a.r) {
        this.triggerFail('ASTEROID');
        return;
      }
    }

    for (const mine of this.stage.mines) {
      const m = this.minePosition(mine);
      if (Math.hypot(p.x - m.x, p.y - m.y) <= p.r + mine.r) {
        this.triggerFail('MINE');
        return;
      }
    }

    for (const laser of this.stage.lasers) {
      const s = this.laserSegment(laser);
      if (pointSegmentDistance(p.x, p.y, s.ax, s.ay, s.bx, s.by) <= p.r + laser.width * 0.5) {
        this.triggerFail('LASER');
        return;
      }
    }

    if (this.fuel <= 0 && Math.hypot(p.vx, p.vy) < 18) {
      this.strandedTimer += dt;
      if (this.strandedTimer > 0.65) {
        this.triggerFail('OUT OF FUEL');
        return;
      }
    } else {
      this.strandedTimer = 0;
    }

    if (this.hudTimer >= 0.1) {
      this.hudTimer = 0;
      this.onChange('hud', this.getSnapshot());
    }
  }

  worldToScreen(x, y) {
    return {
      x: this.width * 0.5 + (x - this.player.x),
      y: this.height * 0.5 + (y - this.player.y),
    };
  }

  isVisible(x, y, pad = 80) {
    const s = this.worldToScreen(x, y);
    return s.x > -pad && s.x < this.width + pad && s.y > -pad && s.y < this.height + pad;
  }

  drawStarfield(ctx) {
    ctx.fillStyle = '#02050b';
    ctx.fillRect(0, 0, this.width, this.height);
    const cell = 120;
    const halfW = this.width * 0.5 + 120;
    const halfH = this.height * 0.5 + 120;
    const minCX = Math.floor((this.player.x - halfW) / cell);
    const maxCX = Math.ceil((this.player.x + halfW) / cell);
    const minCY = Math.floor((this.player.y - halfH) / cell);
    const maxCY = Math.ceil((this.player.y + halfH) / cell);
    for (let cy = minCY; cy <= maxCY; cy += 1) {
      for (let cx = minCX; cx <= maxCX; cx += 1) {
        let h = (Math.imul(cx, 73856093) ^ Math.imul(cy, 19349663)) >>> 0;
        for (let i = 0; i < 3; i += 1) {
          h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
          const rx = (h & 1023) / 1023;
          h = Math.imul(h ^ (h >>> 11), 2246822519) >>> 0;
          const ry = (h & 1023) / 1023;
          const wx = cx * cell + rx * cell;
          const wy = cy * cell + ry * cell;
          const s = this.worldToScreen(wx, wy);
          const alpha = 0.28 + ((h >>> 12) & 255) / 255 * 0.55;
          const r = ((h >>> 20) & 3) === 0 ? 1.4 : 0.75;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = '#d8ecff';
          ctx.beginPath();
          ctx.arc(s.x, s.y, r, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    const glow = ctx.createRadialGradient(this.width * 0.56, this.height * 0.46, 0, this.width * 0.56, this.height * 0.46, Math.max(this.width, this.height) * 0.75);
    glow.addColorStop(0, 'rgba(38,82,140,.10)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawPortal(ctx) {
    const p = this.worldToScreen(this.stage.portal.x, this.stage.portal.y);
    const r = this.stage.portalRadius;
    if (p.x < -r * 2 || p.x > this.width + r * 2 || p.y < -r * 2 || p.y > this.height + r * 2) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.globalTime * 0.7);
    ctx.shadowColor = '#7fe9ff';
    ctx.shadowBlur = 22;
    for (let i = 0; i < 3; i += 1) {
      ctx.strokeStyle = i === 0 ? '#b5f8ff' : 'rgba(83,198,255,.55)';
      ctx.lineWidth = i === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, r - i * 8, i * 0.8, TAU - i * 0.4);
      ctx.stroke();
      ctx.rotate(0.8);
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(60,195,255,.10)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawAsteroid(ctx, a) {
    if (!this.isVisible(a.x, a.y, a.r + 40)) return;
    const p = this.worldToScreen(a.x, a.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(this.globalTime * a.spin + a.phase);
    ctx.fillStyle = '#1b2735';
    ctx.strokeStyle = '#52677e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const points = 9;
    for (let i = 0; i < points; i += 1) {
      const ang = i / points * TAU;
      const rr = a.r * (0.82 + 0.16 * Math.sin(i * 2.3 + a.phase));
      const x = Math.cos(ang) * rr;
      const y = Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(110,140,170,.16)';
    ctx.beginPath();
    ctx.arc(-a.r * 0.24, -a.r * 0.12, a.r * 0.18, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawMine(ctx, mine) {
    const m = this.minePosition(mine);
    if (!this.isVisible(m.x, m.y, 60)) return;
    const p = this.worldToScreen(m.x, m.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(-this.globalTime * 1.4);
    ctx.strokeStyle = '#ff6d78';
    ctx.fillStyle = '#29141b';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 1) {
      const a = i / 8 * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * mine.r, Math.sin(a) * mine.r);
      ctx.lineTo(Math.cos(a) * (mine.r + 9), Math.sin(a) * (mine.r + 9));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, mine.r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff7884';
    ctx.beginPath();
    ctx.arc(0, 0, 4 + Math.sin(this.globalTime * 5) * 1.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawWell(ctx, well) {
    if (!this.isVisible(well.x, well.y, well.range)) return;
    const p = this.worldToScreen(well.x, well.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, well.range);
    g.addColorStop(0, 'rgba(152,92,255,.55)');
    g.addColorStop(0.14, 'rgba(72,42,120,.32)');
    g.addColorStop(1, 'rgba(72,42,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, well.range, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(174,125,255,.55)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, 20 + Math.sin(this.globalTime * 2.2) * 3, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawLaser(ctx, laser) {
    const s = this.laserSegment(laser);
    const a = this.worldToScreen(s.ax, s.ay);
    const b = this.worldToScreen(s.bx, s.by);
    const c = this.worldToScreen(laser.x, laser.y);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,76,99,.82)';
    ctx.shadowColor = '#ff3f62';
    ctx.shadowBlur = 12;
    ctx.lineWidth = laser.width;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff8595';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawFuel(ctx, pickup) {
    if (pickup.taken || !this.isVisible(pickup.x, pickup.y, 40)) return;
    const p = this.worldToScreen(pickup.x, pickup.y);
    const pulse = 1 + Math.sin(this.globalTime * 5 + pickup.x) * 0.08;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#8affbd';
    ctx.fillStyle = 'rgba(80,255,160,.16)';
    ctx.shadowColor = '#68ffad';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, pickup.r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#aaffc9';
    ctx.fillRect(-2, -7, 4, 14);
    ctx.fillRect(-7, -2, 14, 4);
    ctx.restore();
  }

  drawPlayer(ctx) {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const p = this.player;
    const nozzleAngle = Math.atan2(this.aimY, this.aimX);
    ctx.save();
    ctx.translate(cx, cy);

    if (this.thrusting && this.fuel > 0 && this.failTimer <= 0) {
      ctx.save();
      ctx.rotate(nozzleAngle);
      const flame = 22 + Math.sin(this.globalTime * 34) * 5;
      const grad = ctx.createLinearGradient(12, 0, 12 + flame, 0);
      grad.addColorStop(0, 'rgba(210,248,255,.95)');
      grad.addColorStop(0.35, 'rgba(74,196,255,.9)');
      grad.addColorStop(1, 'rgba(74,196,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(12, -6);
      ctx.lineTo(12 + flame, 0);
      ctx.lineTo(12, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.rotate(p.angle);
    ctx.fillStyle = '#dfe9f1';
    ctx.strokeStyle = '#6f91ad';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(-9, -9);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-9, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#74d6ff';
    ctx.beginPath();
    ctx.arc(2, 0, 4, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(nozzleAngle);
    ctx.fillStyle = '#182531';
    ctx.strokeStyle = '#96cde8';
    ctx.lineWidth = 2;
    ctx.fillRect(8, -7, 8, 14);
    ctx.strokeRect(8, -7, 8, 14);
    ctx.restore();

    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 10) {
      const dx = p.vx / speed;
      const dy = p.vy / speed;
      ctx.strokeStyle = 'rgba(118,213,255,.45)';
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(dx * clamp(speed * 0.18, 20, 70), dy * clamp(speed * 0.18, 20, 70));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }

  drawDirectionCue(ctx) {
    const portal = this.worldToScreen(this.stage.portal.x, this.stage.portal.y);
    if (portal.x >= 30 && portal.x <= this.width - 30 && portal.y >= 30 && portal.y <= this.height - 30) return;
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const dx = portal.x - cx;
    const dy = portal.y - cy;
    const n = normalize(dx, dy);
    const margin = 58;
    const tx = cx + n.x * (Math.min(this.width, this.height) * 0.42 - margin * 0.15);
    const ty = cy + n.y * (Math.min(this.width, this.height) * 0.42 - margin * 0.15);
    ctx.save();
    ctx.translate(clamp(tx, margin, this.width - margin), clamp(ty, margin, this.height - margin));
    ctx.rotate(Math.atan2(n.y, n.x));
    ctx.fillStyle = 'rgba(127,233,255,.9)';
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -7);
    ctx.lineTo(-8, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawMinimap(ctx) {
    if (this.state !== 'playing') return;
    const w = Math.min(158, this.width * 0.23);
    const h = Math.min(104, this.height * 0.25);
    const edge = this.width / this.height > 1.35 ? 54 : 20;
    const x = this.width - w - edge;
    const y = 16;
    const b = this.stage.bounds;
    const sx = w / Math.max(1, b.maxX - b.minX);
    const sy = h / Math.max(1, b.maxY - b.minY);
    const toMini = (wx, wy) => ({
      x: x + (wx - b.minX) * sx,
      y: y + (wy - b.minY) * sy,
    });

    ctx.save();
    ctx.fillStyle = 'rgba(3,9,16,.80)';
    ctx.strokeStyle = 'rgba(111,179,219,.35)';
    ctx.lineWidth = 1;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    for (const a of this.stage.asteroids) {
      const p = toMini(a.x, a.y);
      ctx.fillStyle = 'rgba(130,151,170,.55)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, TAU);
      ctx.fill();
    }
    for (const mine of this.stage.mines) {
      const m = this.minePosition(mine);
      const p = toMini(m.x, m.y);
      ctx.fillStyle = '#ff6877';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.3, 0, TAU);
      ctx.fill();
    }
    for (const well of this.stage.wells) {
      const p = toMini(well.x, well.y);
      ctx.strokeStyle = 'rgba(172,118,255,.7)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, TAU);
      ctx.stroke();
    }
    for (const fuel of this.stage.fuels) {
      if (fuel.taken) continue;
      const p = toMini(fuel.x, fuel.y);
      ctx.fillStyle = '#76ffad';
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }

    const portal = toMini(this.stage.portal.x, this.stage.portal.y);
    ctx.strokeStyle = '#77e9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, 4, 0, TAU);
    ctx.stroke();

    const me = toMini(this.player.x, this.player.y);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(me.x, me.y, 3, 0, TAU);
    ctx.fill();

    ctx.fillStyle = 'rgba(180,218,238,.68)';
    ctx.font = '700 7px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('MINIMAP', x + 6, y + 10);
    ctx.restore();
  }

  drawWorld(ctx) {
    for (const well of this.stage.wells) this.drawWell(ctx, well);
    this.drawPortal(ctx);
    for (const fuel of this.stage.fuels) this.drawFuel(ctx, fuel);
    for (const a of this.stage.asteroids) this.drawAsteroid(ctx, a);
    for (const mine of this.stage.mines) this.drawMine(ctx, mine);
    for (const laser of this.stage.lasers) this.drawLaser(ctx, laser);
  }

  drawTitleDemo(ctx) {
    const cx = this.width * 0.66;
    const cy = this.height * 0.48;
    const r = Math.min(this.width, this.height) * 0.12;
    ctx.save();
    ctx.strokeStyle = 'rgba(100,225,255,.55)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#5fe2ff';
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.arc(cx + r * 2.2, cy - r * 0.6, r * 0.72, 0, TAU);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.translate(cx, cy);
    const a = -0.25 + Math.sin(this.globalTime * 0.7) * 0.15;
    ctx.rotate(a);
    ctx.fillStyle = '#dfe9f1';
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-5, 0);
    ctx.lineTo(-10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.rotate(Math.PI);
    const flame = 30 + Math.sin(this.globalTime * 24) * 6;
    const g = ctx.createLinearGradient(12, 0, 12 + flame, 0);
    g.addColorStop(0, '#c9f4ff');
    g.addColorStop(0.4, '#4ac7ff');
    g.addColorStop(1, 'rgba(74,199,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.lineTo(10 + flame, 0);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawWarpEffect(ctx) {
    if (this.clearTimer <= 0) return;
    const duration = 1.0;
    const t = clamp(1 - this.clearTimer / duration, 0, 1);
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const maxR = Math.hypot(this.width, this.height) * 0.62;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const tunnel = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
    tunnel.addColorStop(0, `rgba(220,252,255,${0.38 + t * 0.36})`);
    tunnel.addColorStop(0.10 + t * 0.12, `rgba(79,215,255,${0.32 + t * 0.20})`);
    tunnel.addColorStop(0.48, 'rgba(31,116,202,.08)');
    tunnel.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tunnel;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < 5; i += 1) {
      const phase = (t * 1.7 + i / 5) % 1;
      const r = 16 + phase * maxR;
      ctx.strokeStyle = `rgba(128,235,255,${(1 - phase) * 0.72})`;
      ctx.lineWidth = 2 + (1 - phase) * 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.stroke();
    }

    const streakCount = 26;
    for (let i = 0; i < streakCount; i += 1) {
      const a = i / streakCount * TAU + i * 0.37;
      const inner = 28 + (i % 4) * 8;
      const len = 70 + t * 190 + (i % 5) * 13;
      const alpha = 0.20 + 0.42 * t;
      ctx.strokeStyle = `rgba(178,243,255,${alpha})`;
      ctx.lineWidth = 1 + (i % 3) * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * (inner + len), cy + Math.sin(a) * (inner + len));
      ctx.stroke();
    }

    const white = clamp((t - 0.72) / 0.28, 0, 1);
    if (white > 0) {
      ctx.fillStyle = `rgba(225,252,255,${white * 0.82})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    ctx.restore();
  }

  drawExplosionEffect(ctx) {
    if (this.failTimer <= 0) return;
    const duration = 0.50;
    const t = clamp(1 - this.failTimer / duration, 0, 1);
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const ease = 1 - Math.pow(1 - t, 3);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const flashAlpha = Math.max(0, 1 - t * 2.2);
    ctx.fillStyle = `rgba(255,235,198,${flashAlpha * 0.58})`;
    ctx.fillRect(0, 0, this.width, this.height);

    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 105 * ease + 8);
    g.addColorStop(0, `rgba(255,248,218,${1 - t * 0.45})`);
    g.addColorStop(0.18, `rgba(255,174,72,${0.95 - t * 0.45})`);
    g.addColorStop(0.52, `rgba(255,72,62,${0.72 - t * 0.55})`);
    g.addColorStop(1, 'rgba(255,36,58,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, 108 * ease + 8, 0, TAU);
    ctx.fill();

    for (let i = 0; i < 22; i += 1) {
      const a = i / 22 * TAU + (i % 3) * 0.19;
      const dist = ease * (48 + (i % 6) * 13);
      const len = 12 + (i % 5) * 4;
      ctx.strokeStyle = `rgba(255,${120 + (i % 3) * 45},72,${1 - t})`;
      ctx.lineWidth = 1.5 + (i % 3);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist);
      ctx.lineTo(cx + Math.cos(a) * (dist + len), cy + Math.sin(a) * (dist + len));
      ctx.stroke();
    }

    ctx.strokeStyle = `rgba(255,173,98,${1 - t})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 22 + ease * 98, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawStarfield(ctx);

    if (this.state === 'title') {
      this.drawTitleDemo(ctx);
      return;
    }

    this.drawWorld(ctx);

    if (this.failTimer <= 0) {
      if (this.clearTimer > 0) {
        const t = clamp(1 - this.clearTimer / 1.0, 0, 1);
        ctx.save();
        ctx.globalAlpha = clamp(1 - t * 1.25, 0, 1);
        const s = 1 - t * 0.72;
        ctx.translate(this.width * 0.5, this.height * 0.5);
        ctx.scale(s, s);
        ctx.translate(-this.width * 0.5, -this.height * 0.5);
        this.drawPlayer(ctx);
        ctx.restore();
      } else {
        this.drawPlayer(ctx);
      }
    }

    this.drawDirectionCue(ctx);
    this.drawMinimap(ctx);
    this.drawExplosionEffect(ctx);
    this.drawWarpEffect(ctx);
  }

  frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.accumulator += dt;
    while (this.accumulator >= this.step) {
      this.update(this.step);
      this.accumulator -= this.step;
    }
    this.render();
    requestAnimationFrame(this.frame);
  }
}