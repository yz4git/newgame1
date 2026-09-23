const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b, c, d) => Math.hypot(a - c, b - d);

const SPECIES = {
  drift: { name: 'DRIFTER', color: '#74e8ff', reveal: 1.35, points: 120, radius: 15, scans: 1 },
  skitter: { name: 'SKITTER', color: '#ffcc7a', reveal: 1.0, points: 170, radius: 14, scans: 1 },
  deep: { name: 'DEEP ECHO', color: '#cf9cff', reveal: 1.25, points: 240, radius: 17, scans: 2 },
};

const DIVES = [
  {
    name: 'SHALLOW LISTEN',
    hint: '暗い水をタップしてPING。浮かんだ輪郭を直接タップ',
    time: 42,
    target: 5,
    count: 7,
    species: ['drift'],
    speed: [9, 18],
    vents: 0,
  },
  {
    name: 'MOVING WATER',
    hint: '輪郭の短い軌跡から、次にいる場所を読む',
    time: 48,
    target: 6,
    count: 9,
    species: ['drift', 'skitter'],
    speed: [14, 27],
    vents: 0,
  },
  {
    name: 'THERMAL NOISE',
    hint: '熱水域は偽反響を増やす。PINGする場所を選ぶ',
    time: 52,
    target: 7,
    count: 11,
    species: ['drift', 'skitter'],
    speed: [16, 31],
    vents: 2,
  },
  {
    name: 'BLACK CHOIR',
    hint: '紫のDEEP ECHOは短時間に2回反響させてから記録',
    time: 58,
    target: 8,
    count: 13,
    species: ['drift', 'skitter', 'deep'],
    speed: [16, 34],
    vents: 2,
  },
];

class AudioBus {
  constructor() {
    this.enabled = true;
    this.ctx = null;
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

  setEnabled(value) {
    this.enabled = value;
    if (value) this.unlock();
    else this.ctx?.suspend?.().catch(() => {});
  }

  tone(freq, duration = 0.08, type = 'sine', gain = 0.025, endFreq = null, delay = 0) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(25, endFreq), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  ping(charge) {
    this.tone(300 + charge * 28, 0.19, 'sine', 0.026, 690 + charge * 40);
  }

  echo(species, distance01) {
    const base = species === 'deep' ? 390 : species === 'skitter' ? 520 : 660;
    this.tone(base - distance01 * 110, 0.085, 'triangle', 0.018);
  }

  capture(species, streak) {
    const base = species === 'deep' ? 560 : species === 'skitter' ? 650 : 740;
    this.tone(base, 0.12, 'sine', 0.03, base * 1.28);
    if (streak >= 3) this.tone(base * 1.55, 0.11, 'triangle', 0.016, null, 0.055);
  }

  empty() {
    this.tone(125, 0.09, 'square', 0.014);
  }

  clear() {
    [440, 554, 659].forEach((freq, i) => this.tone(freq, 0.16, 'sine', 0.02, null, i * 0.065));
  }
}

export class AbyssalEchoGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.audio = new AudioBus();
    this.state = 'title';
    this.paused = false;
    this.dpr = 1;
    this.width = 1;
    this.height = 1;
    this.step = 1 / 60;
    this.accumulator = 0;
    this.lastFrame = performance.now();
    this.globalTime = 0;
    this.diveIndex = 0;
    this.timeLeft = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreakThisRun = 0;
    this.lastCaptureTime = -99;
    this.captured = 0;
    this.pingsUsed = 0;
    this.charge = 3;
    this.maxCharge = 3;
    this.rechargeTimer = 0;
    this.clearTimer = 0;
    this.organisms = [];
    this.pings = [];
    this.vents = [];
    this.fakeEchoes = [];
    this.particles = [];
    this.tutorialStep = 0;
    this.records = this.loadRecords();
    this.onChange = () => {};
    this.onToast = () => {};
    this.onFx = () => {};
    this.resize();
    this.frame = this.frame.bind(this);
    window.addEventListener('resize', () => this.resize(), { passive: true });
    requestAnimationFrame(this.frame);
  }

  setOnChange(callback) { this.onChange = callback || (() => {}); }
  setToastCallback(callback) { this.onToast = callback || (() => {}); }
  setFxCallback(callback) { this.onFx = callback || (() => {}); }
  setAudioEnabled(value) { this.audio.setEnabled(value); }
  getRecords() { return { ...this.records }; }
  get config() { return DIVES[this.diveIndex]; }

  loadRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem('abyssalEchoRecordsV1') || '{}');
      return {
        bestScore: Number(parsed.bestScore) || 0,
        bestStreak: Number(parsed.bestStreak) || 0,
        clears: Number(parsed.clears) || 0,
      };
    } catch {
      return { bestScore: 0, bestStreak: 0, clears: 0 };
    }
  }

  saveRecords() {
    try { localStorage.setItem('abyssalEchoRecordsV1', JSON.stringify(this.records)); } catch { /* optional */ }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.8);
    this.width = Math.max(1, rect.width);
    this.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
  }

  playRect() {
    const landscape = this.width / this.height > 1.15;
    const x = landscape ? Math.max(38, this.width * 0.055) : Math.max(22, this.width * 0.055);
    const top = landscape ? Math.max(90, this.height * 0.18) : Math.max(112, this.height * 0.17);
    const bottom = landscape ? Math.max(78, this.height * 0.16) : Math.max(92, this.height * 0.14);
    return { x, y: top, w: this.width - x * 2, h: Math.max(160, this.height - top - bottom) };
  }

  start() {
    this.audio.unlock();
    this.state = 'playing';
    this.paused = false;
    this.score = 0;
    this.streak = 0;
    this.bestStreakThisRun = 0;
    this.lastCaptureTime = -99;
    this.pingsUsed = 0;
    this.tutorialStep = 0;
    this.startDive(0, true);
    this.onChange('start', this.getSnapshot());
  }

  startAgain() { this.start(); }

  returnToTitle() {
    this.state = 'title';
    this.paused = false;
    this.organisms.length = 0;
    this.pings.length = 0;
    this.onChange('title');
  }

  setPaused(value) {
    if (this.state !== 'playing') return;
    this.paused = value;
    this.onChange(value ? 'pause' : 'resume', this.getSnapshot());
  }

  startDive(index, first = false) {
    this.diveIndex = index;
    this.timeLeft = this.config.time;
    this.captured = 0;
    this.clearTimer = 0;
    this.charge = this.maxCharge;
    this.rechargeTimer = 0;
    this.pings.length = 0;
    this.fakeEchoes.length = 0;
    this.particles.length = 0;
    this.createVents();
    this.createOrganisms();
    if (!first) this.onToast(`DIVE ${index + 1} · ${this.config.name}`, this.config.hint);
    this.onChange('dive', this.getSnapshot());
  }

  createVents() {
    this.vents = [];
    const b = this.playRect();
    const presets = [
      { x: 0.36, y: 0.39, r: 0.115 },
      { x: 0.69, y: 0.68, r: 0.13 },
    ];
    for (let i = 0; i < this.config.vents; i++) {
      const p = presets[i];
      this.vents.push({ x: b.x + b.w * p.x, y: b.y + b.h * p.y, r: Math.min(b.w, b.h) * p.r, phase: i * 1.7 });
    }
  }

  createOrganisms() {
    this.organisms = [];
    const b = this.playRect();
    const seed = (this.diveIndex + 1) * 9187 + 137;
    const rand = this.makeRng(seed);
    for (let i = 0; i < this.config.count; i++) {
      const species = this.config.species[Math.floor(rand() * this.config.species.length)];
      const def = SPECIES[species];
      const angle = rand() * TAU;
      const speed = lerp(this.config.speed[0], this.config.speed[1], rand()) * (species === 'skitter' ? 1.08 : species === 'deep' ? 0.78 : 1);
      let x = b.x + b.w * lerp(0.12, 0.88, rand());
      let y = b.y + b.h * lerp(0.12, 0.88, rand());
      for (let tries = 0; tries < 8 && this.vents.some(v => dist(x, y, v.x, v.y) < v.r * 0.85); tries++) {
        x = b.x + b.w * lerp(0.12, 0.88, rand());
        y = b.y + b.h * lerp(0.12, 0.88, rand());
      }
      this.organisms.push({
        id: i,
        species,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: def.radius,
        revealed: 0,
        echo: 0,
        scans: 0,
        scanMemory: 0,
        alive: true,
        phase: rand() * TAU,
        trail: [],
        justPinged: 0,
      });
    }
  }

  makeRng(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  getSnapshot() {
    return {
      state: this.state,
      paused: this.paused,
      diveIndex: this.diveIndex,
      diveName: this.config?.name || '',
      diveHint: this.config?.hint || '',
      timeLeft: this.timeLeft,
      score: this.score,
      streak: this.streak,
      bestStreak: this.bestStreakThisRun,
      captured: this.captured,
      target: this.config?.target || 0,
      charge: this.charge,
      maxCharge: this.maxCharge,
      pingsUsed: this.pingsUsed,
    };
  }

  handlePointer(clientX, clientY) {
    if (this.state !== 'playing' || this.paused || this.clearTimer > 0) return false;
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const b = this.playRect();
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return false;

    let best = null;
    for (const organism of this.organisms) {
      if (!organism.alive || organism.revealed <= 0) continue;
      const def = SPECIES[organism.species];
      if (organism.scans < def.scans) continue;
      const hitRadius = Math.max(30, def.radius + 17);
      const d = dist(x, y, organism.x, organism.y);
      if (d <= hitRadius && (!best || d < best.d)) best = { organism, d };
    }
    if (best) {
      this.captureOrganism(best.organism);
      return true;
    }
    return this.firePing(x, y);
  }

  firePing(x, y) {
    if (this.charge < 1) {
      this.audio.empty();
      this.onToast('SONAR CHARGING', '少し待つとPINGが戻る');
      this.onFx('empty');
      return false;
    }
    this.charge -= 1;
    this.pingsUsed += 1;
    this.rechargeTimer = Math.max(this.rechargeTimer, 0.28);
    const maxR = Math.min(Math.max(this.width, this.height) * 0.58, 560);
    this.pings.push({ x, y, r: 3, prevR: 0, speed: 330, maxR, life: 0, alpha: 1 });
    this.audio.ping(this.charge);
    this.onFx('ping');
    if (this.tutorialStep === 0) {
      this.tutorialStep = 1;
      this.onToast('PING SENT', '波が輪郭に触れる瞬間を見る');
    }
    this.onChange('hud', this.getSnapshot());
    return true;
  }

  captureOrganism(organism) {
    if (!organism.alive || organism.revealed <= 0) return;
    const def = SPECIES[organism.species];
    if (organism.scans < def.scans) return;
    organism.alive = false;
    this.captured += 1;
    if (this.globalTime - this.lastCaptureTime > 4.5) this.streak = 0;
    this.streak += 1;
    this.lastCaptureTime = this.globalTime;
    this.bestStreakThisRun = Math.max(this.bestStreakThisRun, this.streak);
    const timeBonus = Math.floor(Math.max(0, this.timeLeft) * 1.4);
    const streakBonus = Math.min(220, (this.streak - 1) * 22);
    const efficiency = Math.round(this.charge * 18);
    const points = def.points + streakBonus + efficiency + Math.min(90, timeBonus);
    this.score += points;
    this.audio.capture(organism.species, this.streak);
    this.onFx('capture');
    this.onToast(this.streak >= 3 ? `SPECIMEN LOGGED · ×${this.streak}` : 'SPECIMEN LOGGED', `${def.name} +${points}`);
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * TAU + organism.phase;
      this.particles.push({ x: organism.x, y: organism.y, vx: Math.cos(angle) * (28 + i * 2.1), vy: Math.sin(angle) * (28 + i * 2.1), t: 0, color: def.color });
    }
    if (this.tutorialStep === 1) {
      this.tutorialStep = 2;
      this.onToast('DIRECT TAG', '見えている間は輪郭を直接タップして記録');
    }
    if (this.captured >= this.config.target) this.beginDiveClear();
    this.onChange('hud', this.getSnapshot());
  }

  beginDiveClear() {
    if (this.clearTimer > 0 || this.state !== 'playing') return;
    this.clearTimer = 1.5;
    const bonus = Math.round(Math.max(0, this.timeLeft) * 18 + this.charge * 90);
    this.score += bonus;
    this.audio.clear();
    this.onToast('SURVEY COMPLETE', `残り時間・SONAR BONUS +${bonus}`);
    this.onChange('hud', this.getSnapshot());
  }

  advanceDive() {
    if (this.diveIndex >= DIVES.length - 1) this.finish(true);
    else this.startDive(this.diveIndex + 1);
  }

  finish(victory) {
    this.state = victory ? 'victory' : 'gameover';
    this.paused = false;
    const oldScore = this.records.bestScore;
    const oldStreak = this.records.bestStreak;
    this.records.bestScore = Math.max(this.records.bestScore, this.score);
    this.records.bestStreak = Math.max(this.records.bestStreak, this.bestStreakThisRun);
    if (victory) this.records.clears += 1;
    this.saveRecords();
    this.onChange(this.state, {
      victory,
      isScoreRecord: this.score > oldScore,
      isStreakRecord: this.bestStreakThisRun > oldStreak,
    });
  }

  update(dt) {
    if (this.state !== 'playing' || this.paused) return;
    this.globalTime += dt;

    if (this.clearTimer > 0) {
      this.clearTimer -= dt;
      this.updateEffects(dt);
      if (this.clearTimer <= 0) this.advanceDive();
      return;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.finish(false);
      return;
    }

    if (this.charge < this.maxCharge) {
      this.rechargeTimer += dt;
      if (this.rechargeTimer >= 1.85) {
        this.rechargeTimer -= 1.85;
        this.charge = Math.min(this.maxCharge, this.charge + 1);
        this.onChange('hud', this.getSnapshot());
      }
    } else {
      this.rechargeTimer = 0;
    }

    const b = this.playRect();
    for (const o of this.organisms) {
      if (!o.alive) continue;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      const pad = 20;
      if (o.x < b.x + pad && o.vx < 0) o.vx *= -1;
      if (o.x > b.x + b.w - pad && o.vx > 0) o.vx *= -1;
      if (o.y < b.y + pad && o.vy < 0) o.vy *= -1;
      if (o.y > b.y + b.h - pad && o.vy > 0) o.vy *= -1;
      o.revealed = Math.max(0, o.revealed - dt);
      o.echo = Math.max(0, o.echo - dt * 1.8);
      o.justPinged = Math.max(0, o.justPinged - dt);
      o.scanMemory = Math.max(0, o.scanMemory - dt);
      if (o.scanMemory <= 0 && SPECIES[o.species].scans > 1) o.scans = 0;
      o.trail.unshift({ x: o.x, y: o.y });
      if (o.trail.length > 7) o.trail.length = 7;
    }

    for (const ping of this.pings) {
      ping.life += dt;
      ping.prevR = ping.r;
      ping.r += ping.speed * dt;
      ping.alpha = clamp(1 - ping.r / ping.maxR, 0, 1);
      for (const o of this.organisms) {
        if (!o.alive || o.justPinged > 0) continue;
        const d = dist(ping.x, ping.y, o.x, o.y);
        const crossed = d >= ping.prevR - o.radius && d <= ping.r + o.radius;
        if (!crossed) continue;
        this.revealOrganism(o, ping, d / ping.maxR);
      }
      for (const vent of this.vents) {
        const d = dist(ping.x, ping.y, vent.x, vent.y);
        if (!vent.lastPulse || this.globalTime - vent.lastPulse > 0.4) {
          if (d >= ping.prevR - vent.r * 0.35 && d <= ping.r + vent.r * 0.35) {
            vent.lastPulse = this.globalTime;
            this.spawnFalseEchoes(vent);
          }
        }
      }
    }
    this.pings = this.pings.filter(p => p.r < p.maxR);
    this.fakeEchoes.forEach(e => e.t += dt);
    this.fakeEchoes = this.fakeEchoes.filter(e => e.t < 0.85);
    this.updateEffects(dt);
  }

  findLeader(t) {
    return t;
  }

  revealOrganism(o, ping, distance01) {
    const def = SPECIES[o.species];
    o.justPinged = 0.22;
    o.echo = 1;
    if (def.scans > 1) {
      o.scans += 1;
      o.scanMemory = 3.1;
      if (o.scans >= def.scans) o.revealed = def.reveal;
      else o.revealed = Math.max(o.revealed, 0.42);
    } else {
      o.revealed = def.reveal;
    }
    if (o.species === 'skitter') {
      const dx = o.x - ping.x;
      const dy = o.y - ping.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const burst = 38;
      o.vx = clamp(o.vx + (dx / length) * burst, -56, 56);
      o.vy = clamp(o.vy + (dy / length) * burst, -56, 56);
    }
    this.audio.echo(o.species, clamp(distance01, 0, 1));
    this.onFx('echo');
    if (o.species === 'deep' && o.scans === 1) this.onToast('FAINT DOUBLE ECHO', '紫の輪郭は3秒以内にもう一度PING');
  }

  spawnFalseEchoes(vent) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      const angle = vent.phase + i * (TAU / count) + this.globalTime * 0.3;
      const radius = vent.r * (0.35 + i * 0.17);
      this.fakeEchoes.push({ x: vent.x + Math.cos(angle) * radius, y: vent.y + Math.sin(angle) * radius, t: 0, phase: angle });
    }
  }

  updateEffects(dt) {
    for (const p of this.particles) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.975;
      p.vy *= 0.975;
    }
    this.particles = this.particles.filter(p => p.t < 0.65);
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

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground(ctx);
    this.drawWaterField(ctx);
    if (this.state === 'title') this.drawTitleDemo(ctx);
    else {
      this.drawVents(ctx);
      this.drawPings(ctx);
      this.drawFakeEchoes(ctx);
      this.drawOrganisms(ctx);
      this.drawParticles(ctx);
      this.drawTutorial(ctx);
    }
  }

  drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, '#071827');
    g.addColorStop(0.48, '#04101d');
    g.addColorStop(1, '#02070d');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);
    const glow = ctx.createRadialGradient(this.width * 0.52, this.height * 0.36, 20, this.width * 0.52, this.height * 0.36, Math.max(this.width, this.height) * 0.72);
    glow.addColorStop(0, 'rgba(31,111,145,.13)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawWaterField(ctx) {
    const b = this.playRect();
    ctx.save();
    ctx.strokeStyle = 'rgba(98,181,213,.055)';
    ctx.lineWidth = 1;
    const spacing = 42;
    const drift = (this.globalTime * 4) % spacing;
    for (let y = b.y + drift; y < b.y + b.h; y += spacing) {
      ctx.beginPath();
      for (let x = b.x; x <= b.x + b.w; x += 18) {
        const yy = y + Math.sin(x * 0.018 + this.globalTime * 0.7) * 3;
        if (x === b.x) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      const x = b.x + ((i * 91.7 + this.globalTime * (2 + (i % 3))) % b.w);
      const y = b.y + ((i * 67.3 + i * i * 13) % b.h);
      ctx.fillStyle = `rgba(115,204,230,${0.025 + (i % 4) * 0.012})`;
      ctx.beginPath();
      ctx.arc(x, y, 1 + (i % 3) * 0.55, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(96,185,216,.14)';
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.restore();
  }

  drawVents(ctx) {
    for (const vent of this.vents) {
      const pulse = 0.5 + Math.sin(this.globalTime * 1.4 + vent.phase) * 0.12;
      const g = ctx.createRadialGradient(vent.x, vent.y, 2, vent.x, vent.y, vent.r);
      g.addColorStop(0, `rgba(255,117,91,${0.13 + pulse * 0.05})`);
      g.addColorStop(0.55, 'rgba(146,71,87,.07)');
      g.addColorStop(1, 'rgba(60,20,40,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(vent.x, vent.y, vent.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,146,118,.22)';
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(vent.x, vent.y, vent.r * 0.72, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(255,164,134,.45)';
      ctx.font = '700 8px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('THERMAL NOISE', vent.x, vent.y + 3);
    }
  }

  drawPings(ctx) {
    for (const ping of this.pings) {
      ctx.save();
      ctx.globalAlpha = ping.alpha;
      ctx.strokeStyle = '#7cecff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#69dffa';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(ping.x, ping.y, ping.r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha *= 0.28;
      ctx.beginPath();
      ctx.arc(ping.x, ping.y, Math.max(0, ping.r - 9), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawFakeEchoes(ctx) {
    for (const echo of this.fakeEchoes) {
      const p = clamp(echo.t / 0.85, 0, 1);
      ctx.save();
      ctx.globalAlpha = (1 - p) * 0.42;
      ctx.strokeStyle = '#ff9e87';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.ellipse(echo.x, echo.y, 11 + p * 8, 5 + p * 4, echo.phase, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawOrganisms(ctx) {
    for (const o of this.organisms) {
      if (!o.alive || o.revealed <= 0) continue;
      const def = SPECIES[o.species];
      const strength = clamp(o.revealed / def.reveal, 0, 1);
      const enoughScans = o.scans >= def.scans;
      ctx.save();
      for (let i = Math.min(o.trail.length - 1, 5); i >= 1; i--) {
        const t = o.trail[i];
        ctx.globalAlpha = strength * (0.04 + (5 - i) * 0.025);
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = enoughScans ? 0.32 + strength * 0.68 : 0.3;
      ctx.translate(o.x, o.y);
      const angle = Math.atan2(o.vy, o.vx);
      ctx.rotate(angle);
      ctx.strokeStyle = def.color;
      ctx.fillStyle = enoughScans ? `${def.color}22` : 'rgba(210,178,255,.03)';
      ctx.lineWidth = enoughScans ? 2 : 1.4;
      ctx.shadowColor = def.color;
      ctx.shadowBlur = enoughScans ? 14 : 7;
      ctx.setLineDash(enoughScans ? [] : [4, 4]);
      ctx.beginPath();
      ctx.ellipse(0, 0, def.radius * 1.45, def.radius * 0.72, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(-def.radius * 1.2, 0);
      ctx.lineTo(-def.radius * 2.0, -def.radius * 0.62);
      ctx.lineTo(-def.radius * 1.78, 0);
      ctx.lineTo(-def.radius * 2.0, def.radius * 0.62);
      ctx.closePath();
      ctx.stroke();
      if (o.species === 'skitter') {
        ctx.beginPath();
        ctx.moveTo(-2, -def.radius * 0.72);
        ctx.lineTo(4, -def.radius * 1.24);
        ctx.moveTo(-2, def.radius * 0.72);
        ctx.lineTo(4, def.radius * 1.24);
        ctx.stroke();
      }
      if (o.species === 'deep') {
        ctx.fillStyle = def.color;
        ctx.globalAlpha *= 0.7;
        ctx.beginPath();
        ctx.arc(def.radius * 0.45, 0, 2.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      if (!enoughScans) {
        ctx.fillStyle = 'rgba(218,190,255,.76)';
        ctx.font = '700 8px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('1 / 2 ECHO', o.x, o.y - 25);
      }
    }
  }

  drawParticles(ctx) {
    for (const p of this.particles) {
      const alpha = clamp(1 - p.t / 0.65, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.8 + alpha * 1.6, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawTutorial(ctx) {
    if (this.diveIndex !== 0 || this.captured > 0) return;
    const b = this.playRect();
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(207,244,255,.9)';
    ctx.font = '800 12px system-ui, sans-serif';
    const y = b.y + b.h * 0.18;
    const bob = Math.sin(this.globalTime * 4) * 4;
    ctx.fillText(this.tutorialStep === 0 ? '暗い水をタップ → PING' : '光った輪郭を直接タップ', b.x + b.w * 0.5, y + bob);
    ctx.restore();
  }

  drawTitleDemo(ctx) {
    const b = this.playRect();
    const centerX = b.x + b.w * 0.58;
    const centerY = b.y + b.h * 0.53;
    const r = 35 + ((this.globalTime * 120) % Math.min(220, b.w * 0.28));
    ctx.save();
    ctx.globalAlpha = clamp(1 - r / 250, 0.08, 0.65);
    ctx.strokeStyle = '#71e9ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(centerX, centerY, r, 0, TAU);
    ctx.stroke();
    const demo = [
      { x: centerX + 86, y: centerY - 30, species: 'drift', a: 0.75 },
      { x: centerX - 38, y: centerY + 58, species: 'skitter', a: 0.48 },
      { x: centerX + 146, y: centerY + 72, species: 'deep', a: 0.58 },
    ];
    for (const d of demo) {
      const def = SPECIES[d.species];
      ctx.globalAlpha = d.a;
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, def.radius * 1.4, def.radius * 0.7, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
}
