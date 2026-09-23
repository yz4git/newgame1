const TAU = Math.PI * 2;
const CORE_RADIUS = 24;
const ARENA_RADIUS = 150;
const TRAIL_LIFETIME = 3.05;
const FIXED_STEP = 1 / 60;

const WAVES = [
  {
    name: 'FIRST TRACE',
    hint: '軌跡に触れた敵をパルスで一掃',
    duration: 16,
    spawns: [
      { at: 1.45, type: 'seeker', angle: 0 },
      { at: 5.7, type: 'seeker', angle: 2.1 },
      { at: 10.3, type: 'seeker', angle: 4.2 },
      { at: 13.8, type: 'seeker', angle: 0.8 },
    ],
  },
  {
    name: 'CROSSING',
    hint: '異なる方角から来る敵をまとめてタグ付け',
    duration: 19,
    spawns: [
      { at: 1.1, type: 'seeker', angle: 3.1 },
      { at: 4.3, type: 'runner', angle: 0.25 },
      { at: 7.3, type: 'seeker', angle: 1.8 },
      { at: 10.8, type: 'seeker', angle: 4.7 },
      { at: 14.3, type: 'runner', angle: 3.7 },
      { at: 17, type: 'seeker', angle: 5.5 },
    ],
  },
  {
    name: 'READ THE CHARGE',
    hint: 'オレンジの予告線が出たら進路を読む',
    duration: 21,
    spawns: [
      { at: 1, type: 'runner', angle: 4.5 },
      { at: 3.9, type: 'seeker', angle: 0.4 },
      { at: 6.5, type: 'seeker', angle: 2.6 },
      { at: 9.1, type: 'runner', angle: 1.7 },
      { at: 12.5, type: 'seeker', angle: 5.1 },
      { at: 15.2, type: 'runner', angle: 3.8 },
      { at: 18.1, type: 'seeker', angle: 0.2 },
    ],
  },
  {
    name: 'THREE BEARINGS',
    hint: '複数の進路を一筆で横切る',
    duration: 23,
    spawns: [
      { at: 1, type: 'seeker', angle: 0.15 },
      { at: 2.5, type: 'seeker', angle: 2.2 },
      { at: 4.1, type: 'runner', angle: 4.3 },
      { at: 7.8, type: 'seeker', angle: 1.1 },
      { at: 10.1, type: 'runner', angle: 3.25 },
      { at: 13, type: 'seeker', angle: 5.3 },
      { at: 16.2, type: 'runner', angle: 0.1 },
      { at: 19.3, type: 'seeker', angle: 2.8 },
      { at: 21.5, type: 'seeker', angle: 4.8 },
    ],
  },
];

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const lerp = (a, b, t) => a + (b - a) * t;
const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq < 0.0001) return distance(px, py, ax, ay);
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
  return distance(px, py, ax + abx * t, ay + aby * t);
}

function loadRecords() {
  try {
    const value = JSON.parse(localStorage.getItem('afterwake-records') || '{}');
    return {
      bestScore: Number.isFinite(value.bestScore) ? value.bestScore : 0,
      bestChain: Number.isFinite(value.bestChain) ? value.bestChain : 0,
      cleared: Boolean(value.cleared),
    };
  } catch {
    return { bestScore: 0, bestChain: 0, cleared: false };
  }
}

function saveRecords(records) {
  try { localStorage.setItem('afterwake-records', JSON.stringify(records)); } catch { /* private browsing may block storage */ }
}

class GameAudio {
  constructor() {
    this.context = null;
    this.master = null;
    this.enabled = true;
    this.ambient = null;
    this.ambientGain = null;
  }

  resume() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      if (!this.context) {
        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.master.gain.value = this.enabled ? 0.52 : 0;
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') this.context.resume();
    } catch { this.context = null; }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(enabled ? 0.52 : 0, this.context.currentTime, 0.03);
    }
  }

  tone(frequency, duration = 0.12, wave = 'sine', volume = 0.16, endFrequency = null) {
    if (!this.enabled || !this.context || !this.master) return;
    try {
      const now = this.context.currentTime;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, now);
      if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.025);
    } catch { /* audio is optional */ }
  }

  pulse(hitCount) {
    this.tone(hitCount ? 210 : 125, 0.22, 'sine', hitCount ? 0.22 : 0.12, hitCount ? 720 : 90);
    if (hitCount) this.tone(520 + Math.min(hitCount, 4) * 75, 0.18, 'triangle', 0.105, 900);
  }

  tag() { this.tone(680, 0.09, 'triangle', 0.105, 940); }
  breach() { this.tone(105, 0.42, 'sawtooth', 0.16, 42); }
  charge() { this.tone(340, 0.18, 'sine', 0.085, 620); }
  clear() { this.tone(480, 0.28, 'triangle', 0.13, 760); setTimeout(() => this.tone(720, 0.34, 'sine', 0.13, 1080), 95); }
  hit() { this.tone(170, 0.22, 'triangle', 0.12, 85); }

  startAmbient() {
    this.resume();
    if (!this.enabled || !this.context || this.ambient) return;
    try {
      const now = this.context.currentTime;
      this.ambient = this.context.createOscillator();
      this.ambientGain = this.context.createGain();
      const lowpass = this.context.createBiquadFilter();
      this.ambient.type = 'triangle';
      this.ambient.frequency.value = 55;
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 145;
      this.ambientGain.gain.value = 0.0001;
      this.ambient.connect(lowpass);
      lowpass.connect(this.ambientGain);
      this.ambientGain.connect(this.master);
      this.ambient.start(now);
      this.ambientGain.gain.setTargetAtTime(0.045, now, 0.8);
    } catch { this.ambient = null; }
  }

  stopAmbient() {
    if (!this.ambient || !this.context) return;
    const now = this.context.currentTime;
    try {
      this.ambientGain.gain.setTargetAtTime(0.0001, now, 0.18);
      this.ambient.stop(now + 0.8);
    } catch { /* already stopped */ }
    this.ambient = null;
    this.ambientGain = null;
  }
}

export class AfterwakeGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) || canvas.getContext('2d');
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.scale = 1;
    this.centerX = 0;
    this.centerY = 0;
    this.state = 'title';
    this.globalTime = 0;
    this.accumulator = 0;
    this.lastFrame = 0;
    this.frameHandle = 0;
    this.onChange = () => {};
    this.onToast = () => {};
    this.records = loadRecords();
    this.audio = new GameAudio();
    this.input = { x: 0, y: 0 };
    this.playerPointer = null;
    this.pointerOrigin = null;
    this.pointerCurrent = null;
    this.keyboard = new Set();
    this.joystickElement = null;
    this.joystickKnob = null;
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    this.stars = this.makeStars(90);
    this.screenShake = 0;
    this.screenFlash = 0;
    this.toastTimer = 0;
    this.spawnFlash = 0;
    this.activePulse = null;
    this.previousChargeReady = false;
    this.resize();
    this.resetRunState();
  }

  makeStars(count) {
    let seed = 0x5eeda11;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    return Array.from({ length: count }, () => ({
      x: random(), y: random(), r: 0.35 + random() * 1.1,
      alpha: 0.12 + random() * 0.48, phase: random() * TAU,
      drift: 1 + random() * 4,
    }));
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.scale = Math.min((this.width / 2 - 16) / (ARENA_RADIUS + 20), (this.height / 2 - 35) / (ARENA_RADIUS + 12));
    this.scale = clamp(this.scale, 0.5, 3.5);
    this.centerX = this.width * 0.5;
    this.centerY = this.height * 0.5;
    this.clampPlayerToArena();
  }

  resetRunState() {
    this.elapsed = 0;
    this.waveIndex = 0;
    this.waveTime = 0;
    this.score = 0;
    this.core = 3;
    this.chain = 0;
    this.bestChainThisRun = 0;
    this.charge = 100;
    this.chargeWasReady = true;
    this.enemies = [];
    this.trail = [];
    this.particles = [];
    this.floaters = [];
    this.shockwaves = [];
    this.spawnIndex = 0;
    this.enemySerial = 0;
    this.intermission = 0;
    this.runEnded = false;
    this.boss = null;
    this.bossAddsTimer = 4.2;
    this.bossWaveTimer = 3.0;
    this.player = { x: 128, y: 0, vx: 0, vy: 0, angle: Math.PI, r: 8.5, stun: 0, trailCarry: 0 };
    this.trail.push({ x: this.player.x, y: this.player.y, t: this.globalTime });
    this.activePulse = null;
    this.screenShake = 0;
    this.screenFlash = 0;
    this.previousChargeReady = true;
  }

  start() {
    this.audio.resume();
    this.audio.startAmbient();
    this.resetRunState();
    this.state = 'playing';
    this.startWave(0, false);
    this.onChange('start');
    this.showToast('MOVE TO DRAW YOUR WAKE', '数秒後、最初の敵が軌跡へ近づく');
  }

  startWave(index, notify = true) {
    this.waveIndex = index;
    this.waveTime = 0;
    this.spawnIndex = 0;
    this.intermission = 0;
    this.enemies = [];
    this.shockwaves = [];
    this.boss = null;
    this.bossAddsTimer = 4.5;
    this.bossWaveTimer = 2.8;
    if (index === 4) {
      this.spawnBoss();
      if (notify) this.showToast('FINAL SIGNAL', '開いたコアへ軌跡を通せ');
    } else if (notify) {
      const wave = WAVES[index];
      this.showToast(`SECTOR 0${index + 1}`, wave.hint);
    }
    this.onChange('wave');
  }

  setPaused(paused) {
    if (paused && this.state === 'playing') {
      this.state = 'paused';
      this.input.x = 0;
      this.input.y = 0;
      this.keyboard.clear();
      this.clearJoystick();
      this.audio.stopAmbient();
    } else if (!paused && this.state === 'paused') {
      this.state = 'playing';
      this.audio.resume();
      this.audio.startAmbient();
      this.lastFrame = 0;
      this.accumulator = 0;
    } else return;
    this.onChange(paused ? 'pause' : 'resume');
  }

  restart() {
    this.state = 'title';
    this.audio.stopAmbient();
    this.resetRunState();
    this.onChange('title');
  }

  startAgain() { this.start(); }

  setOnChange(callback) { this.onChange = callback; }
  setToastCallback(callback) { this.onToast = callback; }

  showToast(title, subtitle = '') {
    this.onToast(title, subtitle);
    this.toastTimer = 2.4;
  }

  startLoop() {
    if (this.frameHandle) return;
    const frame = (time) => {
      this.frameHandle = requestAnimationFrame(frame);
      if (!this.lastFrame) this.lastFrame = time;
      const dt = Math.min((time - this.lastFrame) / 1000, 0.05);
      this.lastFrame = time;
      this.accumulator += dt;
      while (this.accumulator >= FIXED_STEP) {
        this.update(FIXED_STEP);
        this.accumulator -= FIXED_STEP;
      }
      this.draw();
    };
    this.frameHandle = requestAnimationFrame(frame);
  }

  stopLoop() {
    if (this.frameHandle) cancelAnimationFrame(this.frameHandle);
    this.frameHandle = 0;
    this.lastFrame = 0;
  }

  setJoystick(element) {
    this.joystickElement = element;
    this.joystickKnob = element?.querySelector('b') || null;
  }

  pointerDown(event) {
    if (this.state !== 'playing' || event.button > 0) return false;
    const x = event.clientX;
    const y = event.clientY;
    if (x > this.width * 0.58) return false;
    this.playerPointer = event.pointerId;
    this.pointerOrigin = { x, y };
    this.pointerCurrent = { x, y };
    this.setMoveVector(0, 0);
    if (this.joystickElement) {
      this.joystickElement.style.left = `${x}px`;
      this.joystickElement.style.top = `${y}px`;
      this.joystickElement.classList.add('active');
      if (this.joystickKnob) this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    }
    return true;
  }

  pointerMove(event) {
    if (this.playerPointer !== event.pointerId || !this.pointerOrigin) return;
    this.pointerCurrent = { x: event.clientX, y: event.clientY };
    const dx = (event.clientX - this.pointerOrigin.x) / (this.scale || 1);
    const dy = (event.clientY - this.pointerOrigin.y) / (this.scale || 1);
    const magnitude = Math.hypot(dx, dy);
    const dead = 10;
    const range = 58;
    if (magnitude <= dead) this.setMoveVector(0, 0);
    else {
      const normalized = clamp((magnitude - dead) / (range - dead), 0, 1);
      this.setMoveVector((dx / magnitude) * normalized, (dy / magnitude) * normalized);
    }
    if (this.joystickKnob) {
      const max = 28;
      const len = Math.hypot(event.clientX - this.pointerOrigin.x, event.clientY - this.pointerOrigin.y);
      const factor = len > max ? max / len : 1;
      this.joystickKnob.style.transform = `translate(calc(-50% + ${(event.clientX - this.pointerOrigin.x) * factor}px), calc(-50% + ${(event.clientY - this.pointerOrigin.y) * factor}px))`;
    }
  }

  pointerUp(event) {
    if (this.playerPointer !== event.pointerId) return;
    this.clearJoystick();
  }

  clearJoystick() {
    this.playerPointer = null;
    this.pointerOrigin = null;
    this.pointerCurrent = null;
    this.setMoveVector(0, 0);
    if (this.joystickElement) this.joystickElement.classList.remove('active');
  }

  setMoveVector(x, y) {
    this.input.x = x;
    this.input.y = y;
  }

  keyDown(event) {
    const key = event.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) event.preventDefault();
    this.keyboard.add(key);
    if (key === ' ' || key === 'shift') this.pulse();
    if ((key === 'escape' || key === 'p') && this.state === 'playing') this.setPaused(true);
    else if ((key === 'escape' || key === 'p') && this.state === 'paused') this.setPaused(false);
  }

  keyUp(event) { this.keyboard.delete(event.key.toLowerCase()); }

  keyboardVector() {
    let x = this.input.x;
    let y = this.input.y;
    const left = this.keyboard.has('arrowleft') || this.keyboard.has('a');
    const right = this.keyboard.has('arrowright') || this.keyboard.has('d');
    const up = this.keyboard.has('arrowup') || this.keyboard.has('w');
    const down = this.keyboard.has('arrowdown') || this.keyboard.has('s');
    x += Number(right) - Number(left);
    y += Number(down) - Number(up);
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    return { x, y };
  }

  pulse() {
    if (this.state !== 'playing') return false;
    this.audio.resume();
    if (this.charge < 99.5) {
      this.audio.tone(160, 0.08, 'sine', 0.05, 120);
      return false;
    }

    const now = this.globalTime;
    const targets = this.enemies.filter((enemy) => enemy.markedUntil > now && !enemy.breached);
    const snapshot = this.trail.map((point) => ({ x: point.x, y: point.y, t: point.t }));
    this.activePulse = { points: snapshot, age: 0, hit: targets.length > 0 };
    this.screenFlash = Math.max(this.screenFlash, targets.length ? 0.12 : 0.045);
    if (targets.length === 0) {
      this.charge = 42;
      this.showToast('NO TAGS', '敵が軌跡を横切るまで待とう');
      this.audio.pulse(0);
      return true;
    }

    let ordinaryKills = 0;
    let bossHit = false;
    let coreBonus = 0;
    const removeIds = new Set();
    for (const enemy of targets) {
      if (enemy.type === 'boss') {
        if (enemy.openAtMark) {
          enemy.hp -= 1;
          bossHit = true;
          enemy.markedUntil = 0;
          enemy.hitFlash = 0.38;
          this.spawnBurst(enemy.x, enemy.y, '#9afaff', 21, 95);
          this.floaters.push({ x: enemy.x, y: enemy.y - 25, text: 'CORE HIT', color: '#b8ffff', life: 1.0, max: 1.0 });
          this.score += 420;
          if (enemy.hp <= 0) removeIds.add(enemy.id);
        }
      } else {
        ordinaryKills += 1;
        removeIds.add(enemy.id);
        const nearCore = Math.hypot(enemy.x, enemy.y) < 82;
        if (nearCore) coreBonus += 1;
        this.score += 100 + (nearCore ? 60 : 0);
        this.spawnBurst(enemy.x, enemy.y, enemy.type === 'runner' ? '#ffbf76' : '#74f3fa', 13, 62);
        this.floaters.push({ x: enemy.x, y: enemy.y - 12, text: nearCore ? 'SAVE +160' : 'TAG +100', color: nearCore ? '#ffe3a1' : '#9afaff', life: 0.82, max: 0.82 });
      }
    }

    const totalHits = ordinaryKills + Number(bossHit);
    this.chain = totalHits;
    this.bestChainThisRun = Math.max(this.bestChainThisRun, totalHits);
    if (totalHits > 1) this.score += (totalHits - 1) * 55;
    if (coreBonus > 1) this.score += (coreBonus - 1) * 35;
    this.enemies = this.enemies.filter((enemy) => !removeIds.has(enemy.id));
    this.charge = 0;
    this.trail = [{ x: this.player.x, y: this.player.y, t: now }];
    this.audio.pulse(totalHits);
    this.vibrate(totalHits > 1 ? 20 : 12);
    this.screenShake = Math.max(this.screenShake, totalHits > 1 ? 0.22 : 0.12);
    this.showToast(totalHits > 1 ? `CHAIN ×${totalHits}` : 'SIGNAL CLEARED', totalHits > 1 ? '一本の軌跡で複数を捕捉' : '次の軌跡を描こう');
    this.onChange('score');

    if (this.waveIndex === 4 && this.enemies.every((enemy) => enemy.type !== 'boss')) {
      this.finishRun(true);
    }
    return true;
  }

  vibrate(duration) {
    if (this.reduceMotion) return;
    try { navigator.vibrate?.(duration); } catch { /* optional */ }
  }

  spawnEnemy(type, angle, boss = false) {
    const x = Math.cos(angle) * (ARENA_RADIUS + 30);
    const y = Math.sin(angle) * (ARENA_RADIUS + 30);
    const enemy = {
      id: `signal-${this.enemySerial++}`,
      type,
      x,
      y,
      angle,
      r: type === 'runner' ? 9 : 8,
      speed: type === 'runner' ? 21 : 27,
      phase: type === 'runner' ? 'windup' : 'approach',
      phaseTime: type === 'runner' ? 0.88 : 0,
      dashTime: 0,
      markedUntil: 0,
      openAtMark: false,
      markPulse: 0,
      nearAwarded: false,
      breached: false,
      boss,
    };
    this.enemies.push(enemy);
    this.spawnFlash = 0.32;
    this.spawnBurst(x, y, type === 'runner' ? '#ffc276' : '#75f6fa', 9, 42);
    this.audio.tone(type === 'runner' ? 235 : 300, 0.16, 'sine', 0.08, type === 'runner' ? 160 : 460);
    return enemy;
  }

  spawnBoss() {
    const enemy = {
      id: 'null-orbit', type: 'boss', x: 0, y: -62, r: 25, hp: 4,
      angle: -Math.PI / 2, orbit: -Math.PI / 2, speed: 0,
      markedUntil: 0, openAtMark: false, markPulse: 0,
      hitFlash: 0, open: true, nearAwarded: false,
    };
    this.enemies.push(enemy);
    this.boss = enemy;
    this.spawnBurst(0, 0, '#a678ff', 28, 75);
    this.screenFlash = 0.14;
    this.audio.tone(82, 0.7, 'sawtooth', 0.12, 48);
  }

  spawnShockwave() {
    if (!this.boss) return;
    const gapAngle = Math.atan2(this.player.y, this.player.x) + (this.waveTime % 7 > 3.5 ? Math.PI : 0.75);
    this.shockwaves.push({ radius: 28, speed: 82, gapAngle, gapHalf: 0.63, hit: false, life: 3.3 });
    this.audio.tone(160, 0.32, 'sine', 0.08, 95);
  }

  spawnBurst(x, y, color, count, speed) {
    const max = this.reduceMotion ? Math.min(count, 8) : count;
    for (let i = 0; i < max; i += 1) {
      const angle = (i / max) * TAU + (this.globalTime * 2.31 % TAU);
      const velocity = speed * (0.35 + ((i * 17) % 11) / 16);
      this.particles.push({
        x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity,
        life: 0.3 + ((i * 7) % 10) / 20, maxLife: 0.8,
        r: 0.8 + ((i * 5) % 8) / 5, color,
      });
    }
  }

  update(dt) {
    this.globalTime += dt;
    if (this.state !== 'playing') return;
    this.elapsed += dt;
    this.toastTimer = Math.max(0, this.toastTimer - dt);
    this.screenShake = Math.max(0, this.screenShake - dt);
    this.screenFlash = Math.max(0, this.screenFlash - dt * 0.8);
    this.spawnFlash = Math.max(0, this.spawnFlash - dt);
    if (this.activePulse) {
      this.activePulse.age += dt;
      if (this.activePulse.age > 0.5) this.activePulse = null;
    }

    this.updatePlayer(dt);
    this.updateTrail(dt);
    this.updateWave(dt);
    this.updateEnemies(dt);
    this.updateShockwaves(dt);
    this.updateParticles(dt);
    this.updateFloaters(dt);
    this.checkChargeReady();
  }

  updatePlayer(dt) {
    const move = this.keyboardVector();
    const maxSpeed = 142;
    const targetVX = move.x * maxSpeed;
    const targetVY = move.y * maxSpeed;
    const response = move.x || move.y ? 12 : 7.5;
    this.player.vx = lerp(this.player.vx, targetVX, Math.min(1, dt * response));
    this.player.vy = lerp(this.player.vy, targetVY, Math.min(1, dt * response));
    if (this.player.stun > 0) {
      this.player.stun = Math.max(0, this.player.stun - dt);
      this.player.vx *= Math.max(0, 1 - dt * 2.5);
      this.player.vy *= Math.max(0, 1 - dt * 2.5);
    }
    const oldX = this.player.x;
    const oldY = this.player.y;
    this.player.x += this.player.vx * dt;
    this.player.y += this.player.vy * dt;
    const maxRadius = ARENA_RADIUS - this.player.r - 7;
    const r = Math.hypot(this.player.x, this.player.y);
    if (r > maxRadius) {
      const nx = this.player.x / r;
      const ny = this.player.y / r;
      this.player.x = nx * maxRadius;
      this.player.y = ny * maxRadius;
      const radialVelocity = this.player.vx * nx + this.player.vy * ny;
      if (radialVelocity > 0) {
        this.player.vx -= radialVelocity * nx;
        this.player.vy -= radialVelocity * ny;
      }
    }
    const moved = distance(oldX, oldY, this.player.x, this.player.y);
    if (moved > 0.1) {
      this.player.angle = Math.atan2(this.player.vy, this.player.vx);
      this.charge = clamp(this.charge + moved * 0.28, 0, 100);
      this.player.trailCarry += moved;
    }
  }

  updateTrail() {
    const now = this.globalTime;
    const last = this.trail[this.trail.length - 1];
    if (!last) {
      this.trail.push({ x: this.player.x, y: this.player.y, t: now });
    } else {
      const d = distance(last.x, last.y, this.player.x, this.player.y);
      if (d > 4.5) {
        const steps = Math.min(8, Math.ceil(d / 7));
        for (let i = 1; i <= steps; i += 1) {
          const t = i / steps;
          this.trail.push({ x: lerp(last.x, this.player.x, t), y: lerp(last.y, this.player.y, t), t: now });
        }
      }
    }
    while (this.trail.length > 1 && now - this.trail[0].t > TRAIL_LIFETIME) this.trail.shift();
    if (this.trail.length > 210) this.trail.splice(0, this.trail.length - 210);
  }

  updateWave(dt) {
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) {
        if (this.waveIndex >= 3) this.startWave(4, true);
        else this.startWave(this.waveIndex + 1, true);
      }
      return;
    }
    this.waveTime += dt;
    if (this.waveIndex === 4) {
      this.bossWaveTimer -= dt;
      if (this.bossWaveTimer <= 0) {
        this.spawnShockwave();
        this.bossWaveTimer = 3.7;
      }
      this.bossAddsTimer -= dt;
      if (this.bossAddsTimer <= 0) {
        const smallCount = this.enemies.filter((enemy) => enemy.type !== 'boss').length;
        if (smallCount < 2) {
          const angle = (this.waveTime * 1.17 + 1.9) % TAU;
          this.spawnEnemy(this.waveTime > 13 && this.waveTime % 9 > 4.5 ? 'runner' : 'seeker', angle);
        }
        this.bossAddsTimer = 5.6;
      }
      return;
    }

    const wave = WAVES[this.waveIndex];
    while (this.spawnIndex < wave.spawns.length && this.waveTime >= wave.spawns[this.spawnIndex].at) {
      const entry = wave.spawns[this.spawnIndex];
      this.spawnEnemy(entry.type, entry.angle);
      this.spawnIndex += 1;
    }
    if (this.waveTime >= wave.duration && this.spawnIndex >= wave.spawns.length && this.enemies.length === 0) {
      this.completeWave();
    }
  }

  updateEnemies(dt) {
    const now = this.globalTime;
    const remaining = [];
    for (const enemy of this.enemies) {
      if (enemy.type === 'boss') {
        enemy.orbit += dt * 0.18;
        enemy.x = Math.cos(enemy.orbit) * 47;
        enemy.y = Math.sin(enemy.orbit) * 47;
        const cycle = (this.waveTime + 0.22) % 5.4;
        enemy.open = cycle < 2.0;
        enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
        enemy.markPulse += dt;
        this.checkTrailTag(enemy, now);
        remaining.push(enemy);
        continue;
      }

      enemy.markPulse += dt;
      if (enemy.type === 'runner') {
        enemy.phaseTime -= dt;
        if (enemy.phase === 'windup' && enemy.phaseTime <= 0) {
          enemy.phase = 'dash';
          enemy.phaseTime = 0.72;
          this.audio.tone(560, 0.16, 'triangle', 0.06, 840);
        } else if (enemy.phase === 'dash' && enemy.phaseTime <= 0) {
          enemy.phase = 'approach';
          enemy.phaseTime = 2.3;
        } else if (enemy.phase === 'approach' && enemy.phaseTime <= 0) {
          enemy.phase = 'windup';
          enemy.phaseTime = 0.76;
        }
      }
      const dx = -enemy.x;
      const dy = -enemy.y;
      const len = Math.max(0.01, Math.hypot(dx, dy));
      const speed = enemy.type === 'runner' && enemy.phase === 'dash' ? 92 : enemy.speed + this.waveIndex * 1.7;
      enemy.x += (dx / len) * speed * dt;
      enemy.y += (dy / len) * speed * dt;
      this.checkTrailTag(enemy, now);
      this.checkPlayerContact(enemy);

      if (Math.hypot(enemy.x, enemy.y) <= CORE_RADIUS + enemy.r) {
        this.core -= 1;
        enemy.breached = true;
        this.spawnBurst(0, 0, '#ff8c83', 18, 78);
        this.floaters.push({ x: 0, y: -34, text: 'CORE BREACH', color: '#ff9d91', life: 1.1, max: 1.1 });
        this.screenShake = Math.max(this.screenShake, 0.35);
        this.screenFlash = 0.22;
        this.audio.breach();
        this.vibrate(32);
        this.showToast('CORE BREACH', `残り ${this.core} / 3`);
        this.onChange('core');
        if (this.core <= 0) {
          this.finishRun(false);
          return;
        }
      } else remaining.push(enemy);
    }
    this.enemies = remaining;
  }

  checkTrailTag(enemy, now) {
    if (enemy.type === 'boss' && !enemy.open) return;
    if (this.trail.length === 0) return;
    let closest = Infinity;
    if (this.trail.length === 1) {
      const p = this.trail[0];
      if (now - p.t <= TRAIL_LIFETIME) closest = distance(enemy.x, enemy.y, p.x, p.y);
    } else {
      for (let i = 1; i < this.trail.length; i += 1) {
        const a = this.trail[i - 1];
        const b = this.trail[i];
        if (now - b.t > TRAIL_LIFETIME || now - a.t > TRAIL_LIFETIME) continue;
        const d = pointSegmentDistance(enemy.x, enemy.y, a.x, a.y, b.x, b.y);
        if (d < closest) closest = d;
      }
    }
    if (closest < enemy.r + 11 && enemy.markedUntil <= now) {
      enemy.markedUntil = now + (enemy.type === 'boss' ? 1.75 : 2.15);
      enemy.openAtMark = enemy.type === 'boss' && enemy.open;
      this.audio.tag();
      this.spawnBurst(enemy.x, enemy.y, enemy.type === 'runner' ? '#ffd18b' : '#a9ffff', 5, 26);
      this.showToast(enemy.type === 'boss' ? 'CORE EXPOSED' : 'TAGGED', enemy.type === 'boss' ? '今すぐパルスを重ねる' : 'PULSEでタグを起爆');
    }
  }

  checkPlayerContact(enemy) {
    const d = distance(this.player.x, this.player.y, enemy.x, enemy.y);
    if (d >= this.player.r + enemy.r || enemy.nearAwarded) return;
    enemy.nearAwarded = true;
    const dx = this.player.x - enemy.x;
    const dy = this.player.y - enemy.y;
    const len = Math.max(0.01, Math.hypot(dx, dy));
    this.player.vx += (dx / len) * 82;
    this.player.vy += (dy / len) * 82;
    this.player.stun = Math.max(this.player.stun, 0.17);
    this.spawnBurst(enemy.x, enemy.y, '#ffad80', 8, 38);
    this.audio.hit();
    this.screenShake = Math.max(this.screenShake, 0.16);
    this.showToast('CLOSE CONTACT', '距離を取って軌跡を描こう');
  }

  updateShockwaves(dt) {
    if (this.shockwaves.length === 0) return;
    const radiusNow = Math.hypot(this.player.x, this.player.y);
    const playerAngle = Math.atan2(this.player.y, this.player.x);
    const active = [];
    for (const wave of this.shockwaves) {
      const previous = wave.radius;
      wave.radius += wave.speed * dt;
      wave.life -= dt;
      const crossed = previous <= radiusNow + 5 && wave.radius >= radiusNow - 5;
      if (crossed && !wave.hit && Math.abs(angleDelta(playerAngle, wave.gapAngle)) > wave.gapHalf) {
        wave.hit = true;
        this.player.stun = Math.max(this.player.stun, 0.34);
        this.player.vx += Math.cos(playerAngle) * 42;
        this.player.vy += Math.sin(playerAngle) * 42;
        this.charge = Math.max(0, this.charge - 18);
        this.audio.hit();
        this.screenShake = Math.max(this.screenShake, 0.19);
        this.showToast('SHOCKWAVE', '青い切れ目が安全地帯');
      }
      if (wave.life > 0 && wave.radius < ARENA_RADIUS + 30) active.push(wave);
    }
    this.shockwaves = active;
  }

  updateParticles(dt) {
    const alive = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.max(0, 1 - dt * 1.8);
      p.vy *= Math.max(0, 1 - dt * 1.8);
      alive.push(p);
    }
    this.particles = alive;
  }

  updateFloaters(dt) {
    const alive = [];
    for (const f of this.floaters) {
      f.life -= dt;
      if (f.life <= 0) continue;
      f.y -= dt * 18;
      alive.push(f);
    }
    this.floaters = alive;
  }

  checkChargeReady() {
    const ready = this.charge >= 99.5;
    if (ready && !this.previousChargeReady) {
      this.audio.charge();
      this.showToast('PULSE READY', 'タグ付けした敵を起爆できる');
    }
    this.previousChargeReady = ready;
  }

  completeWave() {
    this.core = Math.min(3, this.core + 1);
    this.charge = Math.max(this.charge, 65);
    this.trail = [{ x: this.player.x, y: this.player.y, t: this.globalTime }];
    this.intermission = 2.3;
    this.audio.clear();
    this.spawnBurst(0, 0, '#80f4fa', 17, 62);
    this.floaters.push({ x: 0, y: -12, text: 'SECTOR CLEAR', color: '#abfcff', life: 1.25, max: 1.25 });
    this.onChange('core');
  }

  finishRun(victory) {
    if (this.runEnded) return;
    this.runEnded = true;
    this.state = victory ? 'victory' : 'gameover';
    this.audio.stopAmbient();
    if (victory) this.audio.clear();
    const isRecord = this.score > this.records.bestScore;
    this.records.bestScore = Math.max(this.records.bestScore, this.score);
    this.records.bestChain = Math.max(this.records.bestChain, this.bestChainThisRun);
    if (victory) this.records.cleared = true;
    saveRecords(this.records);
    this.onChange(victory ? 'victory' : 'gameover', { isRecord });
  }

  clampPlayerToArena() {
    if (!this.player) return;
    const maxRadius = ARENA_RADIUS - this.player.r - 7;
    const r = Math.hypot(this.player.x, this.player.y);
    if (r > maxRadius) {
      this.player.x *= maxRadius / r;
      this.player.y *= maxRadius / r;
    }
  }

  setAudioEnabled(enabled) { this.audio.setEnabled(enabled); }
  getRecords() { return { ...this.records }; }
  getSnapshot() {
    const wave = this.waveIndex < 4 ? WAVES[this.waveIndex] : null;
    const boss = this.enemies.find((enemy) => enemy.type === 'boss');
    return {
      state: this.state,
      score: this.score,
      core: this.core,
      chain: this.chain,
      charge: this.charge,
      waveIndex: this.waveIndex,
      waveCount: 5,
      waveName: this.waveIndex === 4 ? 'NULL ORBIT' : wave?.name || 'FIRST TRACE',
      waveHint: this.waveIndex === 4 ? (boss?.open ? 'コアが開いている — 軌跡を通せ' : '衝撃波の青い切れ目へ移動') : wave?.hint || '',
      bossHp: boss?.hp ?? null,
      elapsed: this.elapsed,
    };
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#080d1b');
    bg.addColorStop(0.52, '#060913');
    bg.addColorStop(1, '#0a1020');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    this.drawStars(ctx);
    this.drawScreenVignette(ctx);
    if (this.state === 'title') this.drawTitleArt(ctx);
    else this.drawWorld(ctx);
    if (this.screenFlash > 0) {
      ctx.fillStyle = `rgba(163, 250, 255, ${this.screenFlash * 0.35})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawStars(ctx) {
    for (const star of this.stars) {
      const twinkle = 0.72 + Math.sin(this.globalTime * star.drift + star.phase) * 0.28;
      const x = (star.x * this.width + Math.sin(this.globalTime * 0.04 + star.phase) * 9 + this.width) % this.width;
      const y = (star.y * this.height + Math.cos(this.globalTime * 0.035 + star.phase) * 6 + this.height) % this.height;
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = '#b9e2ff';
      ctx.beginPath();
      ctx.arc(x, y, star.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawScreenVignette(ctx) {
    const gradient = ctx.createRadialGradient(this.width * 0.52, this.height * 0.48, this.height * 0.1, this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height) * 0.74);
    gradient.addColorStop(0, 'rgba(15, 33, 58, 0.10)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.54)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = '#28415f';
    ctx.lineWidth = 1;
    const step = 48;
    for (let x = (this.globalTime * 2) % step; x < this.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
    }
    for (let y = (this.globalTime * 1.2) % step; y < this.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawTitleArt(ctx) {
    const isPortrait = this.height > this.width;
    const cx = isPortrait ? this.centerX : this.width * 0.77;
    const cy = this.centerY + (isPortrait ? 16 : 0);
    const scale = Math.min((this.width / 2 - 18) / (ARENA_RADIUS + 15), (this.height / 2 - 35) / (ARENA_RADIUS + 12));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(clamp(scale, 0.45, 3.4), clamp(scale, 0.45, 3.4));
    this.drawArenaShell(ctx, true);
    ctx.globalAlpha = 0.5;
    this.drawTrail(ctx, this.titleTrail());
    ctx.globalAlpha = 1;
    this.drawCore(ctx, 3, true);
    this.drawPlayerShape(ctx, -78, 76, -0.35, 1, true);
    const enemies = [
      { type: 'seeker', x: 84, y: -60, r: 8, markedUntil: 1, markPulse: 2 },
      { type: 'runner', x: -8, y: -121, r: 9, markedUntil: 0, phase: 'windup', angle: 1.2 },
      { type: 'seeker', x: 102, y: 58, r: 8, markedUntil: 0, markPulse: 0 },
      { type: 'seeker', x: -112, y: -14, r: 8, markedUntil: 0, markPulse: 1 },
    ];
    enemies.forEach((enemy, i) => this.drawEnemy(ctx, enemy, this.globalTime + i * 0.22));
    ctx.restore();
  }

  titleTrail() {
    const points = [];
    for (let i = 0; i <= 44; i += 1) {
      const t = i / 44;
      const angle = t * TAU * 0.78 + this.globalTime * 0.17;
      const radius = 78 + Math.sin(t * TAU * 1.4 + this.globalTime) * 22;
      points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, t: this.globalTime - (1 - t) * 1.8 });
    }
    return points;
  }

  drawWorld(ctx) {
    const shake = this.screenShake > 0 && !this.reduceMotion ? (Math.sin(this.globalTime * 74) * this.screenShake * 6) : 0;
    ctx.save();
    ctx.translate(this.centerX + shake, this.centerY + shake * 0.4);
    ctx.scale(this.scale, this.scale);
    this.drawArenaShell(ctx, false);
    this.drawSpawnWarnings(ctx);
    this.drawShockwaves(ctx);
    this.drawTrail(ctx, this.trail);
    this.drawCore(ctx, this.core, false);
    this.drawEnemies(ctx, this.enemies);
    this.drawParticles(ctx);
    this.drawPulseEffect(ctx);
    this.drawPlayerShape(ctx, this.player.x, this.player.y, this.player.angle, this.player.stun > 0 ? 0.6 : 1, false);
    this.drawFloaters(ctx);
    ctx.restore();
  }

  drawArenaShell(ctx, title = false) {
    const pulse = 0.5 + 0.5 * Math.sin(this.globalTime * 1.7);
    const fill = ctx.createRadialGradient(0, 0, 8, 0, 0, ARENA_RADIUS);
    fill.addColorStop(0, 'rgba(18, 31, 53, 0.96)');
    fill.addColorStop(0.72, 'rgba(9, 18, 34, 0.88)');
    fill.addColorStop(1, 'rgba(8, 16, 30, 0.54)');
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(0, 0, ARENA_RADIUS, 0, TAU); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, ARENA_RADIUS - 2, 0, TAU); ctx.clip();
    ctx.strokeStyle = 'rgba(85, 138, 174, 0.075)';
    ctx.lineWidth = 1;
    for (let x = -ARENA_RADIUS; x <= ARENA_RADIUS; x += 25) {
      ctx.beginPath(); ctx.moveTo(x, -ARENA_RADIUS); ctx.lineTo(x, ARENA_RADIUS); ctx.stroke();
    }
    for (let y = -ARENA_RADIUS; y <= ARENA_RADIUS; y += 25) {
      ctx.beginPath(); ctx.moveTo(-ARENA_RADIUS, y); ctx.lineTo(ARENA_RADIUS, y); ctx.stroke();
    }
    ctx.restore();

    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(93, 164, 199, ${0.24 + pulse * 0.07})`;
    ctx.beginPath(); ctx.arc(0, 0, ARENA_RADIUS, 0, TAU); ctx.stroke();
    ctx.setLineDash([2, 9]);
    ctx.strokeStyle = 'rgba(120, 206, 221, 0.34)';
    ctx.beginPath(); ctx.arc(0, 0, ARENA_RADIUS - 7, this.globalTime * 0.07, this.globalTime * 0.07 + TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(91, 131, 165, 0.16)';
    ctx.beginPath(); ctx.arc(0, 0, 92, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 48, 0, TAU); ctx.stroke();

    for (let i = 0; i < 32; i += 1) {
      const angle = (i / 32) * TAU;
      const inner = i % 4 === 0 ? ARENA_RADIUS - 12 : ARENA_RADIUS - 5;
      ctx.strokeStyle = i % 4 === 0 ? 'rgba(132, 213, 224, .46)' : 'rgba(122, 167, 193, .18)';
      ctx.lineWidth = i % 4 === 0 ? 1.2 : 0.65;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle) * (ARENA_RADIUS + (i % 4 === 0 ? 1 : -1)), Math.sin(angle) * (ARENA_RADIUS + (i % 4 === 0 ? 1 : -1)));
      ctx.stroke();
    }
    const halo = ctx.createRadialGradient(0, 0, 32, 0, 0, ARENA_RADIUS * 1.16);
    halo.addColorStop(0, 'rgba(65, 180, 203, 0)');
    halo.addColorStop(0.72, 'rgba(38, 117, 161, 0.015)');
    halo.addColorStop(1, `rgba(54, 192, 219, ${0.025 + pulse * 0.02})`);
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(0, 0, ARENA_RADIUS * 1.16, 0, TAU); ctx.fill();
    if (title) {
      ctx.strokeStyle = `rgba(123, 240, 244, ${0.08 + pulse * 0.08})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 65 + pulse * 4, 0, TAU); ctx.stroke();
    }
  }

  drawSpawnWarnings(ctx) {
    if (this.waveIndex >= 4 || this.intermission > 0) return;
    const wave = WAVES[this.waveIndex];
    for (let i = this.spawnIndex; i < wave.spawns.length; i += 1) {
      const entry = wave.spawns[i];
      const until = entry.at - this.waveTime;
      if (until > 1.15) break;
      if (until < 0) continue;
      const alpha = 0.16 + (1 - until / 1.15) * 0.62;
      const x = Math.cos(entry.angle) * (ARENA_RADIUS + 2);
      const y = Math.sin(entry.angle) * (ARENA_RADIUS + 2);
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = entry.type === 'runner' ? '#ffc279' : '#77eff5';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(0, 0); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, y, 6 + (1 - until / 1.15) * 5, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawTrail(ctx, points) {
    if (!points || points.length < 2) return;
    const now = this.globalTime;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1];
      const b = points[i];
      const age = Math.max(0, now - b.t);
      const alpha = clamp(1 - age / TRAIL_LIFETIME, 0, 1) * 0.78;
      if (alpha <= 0.015) continue;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = alpha * 0.23;
      ctx.strokeStyle = '#62f2f4';
      ctx.lineWidth = 14 * (1 - age / TRAIL_LIFETIME * 0.38);
      ctx.shadowColor = '#51e6f0';
      ctx.shadowBlur = 17;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = alpha * 0.92;
      ctx.strokeStyle = '#8afcff';
      ctx.lineWidth = 2.6 * (1 - age / TRAIL_LIFETIME * 0.35);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';
  }

  drawEnemies(ctx, enemies) { enemies.forEach((enemy) => this.drawEnemy(ctx, enemy, this.globalTime)); }

  drawEnemy(ctx, enemy, now) {
    const isBoss = enemy.type === 'boss';
    const marked = enemy.markedUntil > now;
    const pulse = 0.55 + 0.45 * Math.sin((now + (enemy.markPulse || 0)) * (marked ? 11 : 3));
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (isBoss) {
      const open = enemy.open;
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = open ? '#8cf8fa' : '#a071f4';
      ctx.lineWidth = 2;
      ctx.setLineDash(open ? [] : [5, 4]);
      ctx.beginPath(); ctx.arc(0, 0, enemy.r + 9 + pulse * 2, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.shadowColor = open ? '#6efff7' : '#a56cff';
      ctx.shadowBlur = open ? 20 : 12;
      ctx.rotate(now * 0.22);
      ctx.fillStyle = open ? '#a1ffff' : '#9065df';
      ctx.beginPath();
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * TAU;
        const r = i % 2 === 0 ? enemy.r : enemy.r * 0.72;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = open ? '#f0ffff' : '#422a6d';
      ctx.beginPath(); ctx.arc(0, 0, enemy.r * 0.37, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(11, 17, 38, .85)'; ctx.lineWidth = 3;
      for (let i = 0; i < Math.max(0, enemy.hp); i += 1) {
        const a = -Math.PI / 2 + i * (TAU / 4);
        ctx.beginPath(); ctx.arc(Math.cos(a) * (enemy.r + 13), Math.sin(a) * (enemy.r + 13), 2.6, 0, TAU); ctx.stroke();
        ctx.strokeStyle = '#bd9bff'; ctx.beginPath(); ctx.arc(Math.cos(a) * (enemy.r + 13), Math.sin(a) * (enemy.r + 13), 2.4, 0, TAU); ctx.stroke();
      }
    } else {
      if (enemy.type === 'runner' && enemy.phase === 'windup') {
        ctx.globalAlpha = 0.24 + pulse * 0.26;
        ctx.strokeStyle = '#ffc178';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-enemy.x * 2.2, -enemy.y * 2.2); ctx.stroke();
        ctx.setLineDash([]);
      }
      const color = enemy.type === 'runner' ? '#ffb96d' : '#69eaf0';
      ctx.shadowColor = marked ? '#c1ffff' : color;
      ctx.shadowBlur = marked ? 19 : 12;
      if (enemy.type === 'runner') {
        const facing = Math.atan2(-enemy.y, -enemy.x);
        ctx.rotate(facing);
        ctx.fillStyle = enemy.phase === 'dash' ? '#fff0ce' : color;
        ctx.beginPath(); ctx.moveTo(enemy.r + 3, 0); ctx.lineTo(-enemy.r * 0.78, -enemy.r * 0.68); ctx.lineTo(-enemy.r * 0.45, 0); ctx.lineTo(-enemy.r * 0.78, enemy.r * 0.68); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff4db'; ctx.fillRect(-2, -1.4, 7, 2.8);
      } else {
        ctx.rotate(Math.PI / 4 + Math.sin(now * 2.4) * 0.08);
        ctx.fillStyle = marked ? '#e5ffff' : '#69eaf0';
        ctx.beginPath(); ctx.roundRect(-enemy.r * 0.7, -enemy.r * 0.7, enemy.r * 1.4, enemy.r * 1.4, 2); ctx.fill();
        ctx.fillStyle = '#102636'; ctx.beginPath(); ctx.arc(0, 0, enemy.r * 0.27, 0, TAU); ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    if (marked) {
      ctx.globalAlpha = 0.58 + pulse * 0.34;
      ctx.strokeStyle = enemy.type === 'boss' ? '#eaffff' : '#f3ffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, enemy.r + 5 + pulse * 1.8, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f4ffff';
      ctx.font = '500 7px "DM Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.type === 'boss' ? 'OPEN' : 'TAG', 0, -enemy.r - 11);
    }
    if (isBoss) {
      ctx.textAlign = 'center';
      ctx.fillStyle = enemy.open ? '#b6ffff' : '#c0a7f3';
      ctx.font = '500 8px "DM Mono", monospace';
      ctx.fillText(enemy.open ? 'EXPOSED' : 'SHIELDED', 0, enemy.r + 24);
    }
    ctx.restore();
  }

  drawCore(ctx, integrity, title = false) {
    const p = 0.5 + 0.5 * Math.sin(this.globalTime * (title ? 1.2 : 2.2));
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 43 + p * 5);
    glow.addColorStop(0, `rgba(135, 252, 255, ${0.2 + p * 0.12})`);
    glow.addColorStop(0.35, 'rgba(70, 195, 220, .09)');
    glow.addColorStop(1, 'rgba(53, 169, 206, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(0, 0, 48, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(128, 224, 238, .45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, CORE_RADIUS + 4, 0, TAU); ctx.stroke();
    ctx.strokeStyle = 'rgba(146, 230, 239, .23)';
    ctx.beginPath(); ctx.arc(0, 0, CORE_RADIUS + 10, this.globalTime * 0.45, this.globalTime * 0.45 + TAU * 0.82); ctx.stroke();
    const coreFill = ctx.createRadialGradient(-7, -8, 1, 0, 0, CORE_RADIUS);
    coreFill.addColorStop(0, '#d7ffff');
    coreFill.addColorStop(0.22, '#74eaf4');
    coreFill.addColorStop(0.56, '#216b91');
    coreFill.addColorStop(1, '#102b4a');
    ctx.fillStyle = coreFill;
    ctx.beginPath(); ctx.arc(0, 0, CORE_RADIUS, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(207, 255, 255, .68)'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(0, 0, CORE_RADIUS, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(11, 25, 42, .8)';
    ctx.beginPath(); ctx.arc(0, 0, CORE_RADIUS * 0.57, 0, TAU); ctx.fill();
    ctx.fillStyle = '#dcffff';
    ctx.beginPath(); ctx.arc(0, 0, 3.4 + p * 1.4, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(223,255,255,.55)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-42, 0); ctx.lineTo(-31, 0); ctx.moveTo(31, 0); ctx.lineTo(42, 0); ctx.moveTo(0,-42); ctx.lineTo(0,-31); ctx.moveTo(0,31); ctx.lineTo(0,42); ctx.stroke();
    if (!title) {
      for (let i = 0; i < 3; i += 1) {
        const angle = -Math.PI / 2 + (i / 3) * TAU;
        ctx.fillStyle = i < integrity ? '#8cfaff' : 'rgba(134, 150, 171, .22)';
        ctx.beginPath(); ctx.arc(Math.cos(angle) * 17, Math.sin(angle) * 17, 2.2, 0, TAU); ctx.fill();
      }
    }
  }

  drawPlayerShape(ctx, x, y, angle, alpha = 1, title = false) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = alpha;
    const trailGlow = ctx.createRadialGradient(-2, 0, 1, 0, 0, 24);
    trailGlow.addColorStop(0, 'rgba(115, 255, 253, .42)');
    trailGlow.addColorStop(1, 'rgba(61, 217, 230, 0)');
    ctx.fillStyle = trailGlow;
    ctx.beginPath(); ctx.arc(0, 0, 24, 0, TAU); ctx.fill();
    ctx.shadowColor = '#6effff'; ctx.shadowBlur = title ? 17 : 13;
    ctx.fillStyle = '#d8ffff';
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-7, -7); ctx.lineTo(-4, 0); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#208ca1';
    ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-5, -3.4); ctx.lineTo(-3, 0); ctx.lineTo(-5, 3.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(199, 255, 255, .9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(-10, -11); ctx.moveTo(-6, 7); ctx.lineTo(-10, 11); ctx.stroke();
    if (!title && (this.input.x || this.input.y)) {
      ctx.globalAlpha *= 0.45;
      ctx.strokeStyle = '#b3ffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 17 + Math.sin(this.globalTime * 12) * 2, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }

  drawShockwaves(ctx) {
    for (const wave of this.shockwaves) {
      const alpha = clamp(wave.life / 1.0, 0, 1) * 0.82;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#ff766d';
      const start = wave.gapAngle + wave.gapHalf;
      const end = wave.gapAngle + TAU - wave.gapHalf;
      ctx.beginPath(); ctx.arc(0, 0, wave.radius, start, end); ctx.stroke();
      ctx.strokeStyle = '#a4ffff'; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(0, 0, wave.radius, wave.gapAngle - wave.gapHalf, wave.gapAngle + wave.gapHalf); ctx.stroke();
      for (const side of [-1, 1]) {
        const a = wave.gapAngle + side * wave.gapHalf;
        ctx.strokeStyle = '#fff4c8'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * (wave.radius - 5), Math.sin(a) * (wave.radius - 5)); ctx.lineTo(Math.cos(a) * (wave.radius + 5), Math.sin(a) * (wave.radius + 5)); ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 7;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.55 + alpha * 0.45), 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  drawPulseEffect(ctx) {
    if (!this.activePulse) return;
    const f = 1 - this.activePulse.age / 0.5;
    this.drawTrail(ctx, this.activePulse.points);
    if (this.activePulse.points.length) {
      const p = this.activePulse.points[this.activePulse.points.length - 1];
      ctx.globalAlpha = f * 0.65;
      ctx.strokeStyle = this.activePulse.hit ? '#ecffff' : '#9ffaff';
      ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.arc(p.x, p.y, 18 + (1 - f) * 55, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawFloaters(ctx) {
    for (const f of this.floaters) {
      const alpha = clamp(f.life / f.max, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = f.color;
      ctx.font = '600 8px "DM Mono", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#07101b'; ctx.shadowBlur = 5;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
