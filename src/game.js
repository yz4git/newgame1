const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const hypot = (x, y) => Math.hypot(x, y);
const cross = (ax, ay, bx, by) => ax * by - ay * bx;

const STAGES = Array.from({ length: 24 }, (_, i) => {
  const n = i + 1;
  const tier = Math.floor(i / 4);
  const slot = i % 4;
  const flip = i % 2 === 1;
  const startY = [0.50, 0.36, 0.66, 0.47][slot];
  const goalY = [0.50, 0.66, 0.32, 0.55][slot];
  const speed = Math.max(0, (n - 3) * 4.2);
  const goalRadius = Math.max(50, 96 - i * 2.0);
  const time = Math.max(16, 26 - Math.floor(i / 5));
  const gateFrom = n >= 7;
  const switchFrom = n >= 15 && slot >= 2;
  const denseFrom = n >= 11;
  const gateGap = Math.max(88, 154 - (n - 7) * 4.2);
  const name = n <= 4 ? ['ONE CUT', 'DRIFT', 'CROSS LINE', 'QUICK TURN'][slot]
    : n <= 8 ? ['FAST LANE', 'BRAKE LINE', 'NARROW PASS', 'EDGE SHOT'][slot]
    : n <= 12 ? ['SPIN RUSH', 'GATE RUN', 'HEAVY CUT', 'DENSE VECTOR'][slot]
    : n <= 16 ? ['TIGHT WINDOW', 'MASS SHIFT', 'SCRAP ENTRY', 'SWITCH LINE'][slot]
    : n <= 20 ? ['HOT GATE', 'DOUBLE READ', 'SCRAP LOCK', 'PRECISION CUT'][slot]
    : ['FINAL DRIFT', 'HARD VECTOR', 'LOCK BREAK', 'CORE RUSH'][slot];

  const stage = {
    name,
    hint: n <= 4
      ? 'コアを緑のGOALへ入れれば即クリア。最短のCUTを狙う'
      : n <= 8
        ? '速くなっても条件は同じ。コアをGOALへ直接送り込む'
        : n <= 14
          ? '狭いゲートと回転を読み、コアの軌道を先に作る'
          : n <= 20
            ? 'SCRAPと高密度材を使い、最短ルートを作る'
            : '小さいGOAL・高速・狭いゲート。1本ごとの精度が重要',
    time,
    start: [flip ? 0.76 : 0.24, startY],
    goal: [flip ? 0.24 : 0.76, goalY],
    velocity: [
      flip ? -speed : speed,
      ((slot - 1.5) * 5.2) + (tier >= 4 ? (flip ? -8 : 8) : 0),
    ],
    angular: n < 5 ? 0 : (flip ? -1 : 1) * Math.min(0.92, 0.08 + (n - 4) * 0.045),
    goalRadius,
    maxSpeed: 999,
    targetAngle: null,
    gate: gateFrom
      ? {
          x: 0.50 + (slot === 1 ? -0.04 : slot === 2 ? 0.04 : 0),
          gapY: clamp((startY + goalY) * 0.5 + (slot === 3 ? -0.05 : 0), 0.28, 0.72),
          gap: gateGap,
          requiresSwitch: switchFrom,
        }
      : null,
    core: [
      (slot === 1 ? 5 : slot === 2 ? -6 : 0) + (tier >= 4 ? (flip ? -4 : 4) : 0),
      slot === 3 ? 6 : slot === 1 ? -4 : 0,
    ],
  };

  if (denseFrom) {
    stage.massNodes = [
      { x: flip ? 0.44 : -0.44, y: slot % 2 ? -0.20 : 0.18, weight: 0.10 + tier * 0.012 },
    ];
    if (n >= 19) stage.massNodes.push({ x: flip ? -0.30 : 0.30, y: -0.34, weight: 0.08 });
  }

  if (switchFrom) {
    stage.switches = [{
      x: flip ? 0.86 : 0.14,
      y: clamp(startY + (slot === 3 ? -0.12 : 0.10), 0.20, 0.80),
      r: Math.max(15, 21 - tier),
    }];
  }

  return stage;
});

function rotatePoint(p, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

function inverseRotatePoint(p, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c + p.y * s, y: -p.x * s + p.y * c };
}

function polygonArea(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) * 0.5;
}

function polygonCentroid(poly) {
  let twiceArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const f = a.x * b.y - b.x * a.y;
    twiceArea += f;
    cx += (a.x + b.x) * f;
    cy += (a.y + b.y) * f;
  }
  if (Math.abs(twiceArea) < 1e-6) {
    const avg = poly.reduce((o, p) => ({ x: o.x + p.x, y: o.y + p.y }), { x: 0, y: 0 });
    return { x: avg.x / poly.length, y: avg.y / poly.length };
  }
  return { x: cx / (3 * twiceArea), y: cy / (3 * twiceArea) };
}

function lineSide(p, a, b) {
  return cross(b.x - a.x, b.y - a.y, p.x - a.x, p.y - a.y);
}

function clipHalfPlane(poly, a, b, positive) {
  const out = [];
  const inside = (v) => positive ? v >= -1e-6 : v <= 1e-6;
  for (let i = 0; i < poly.length; i += 1) {
    const s = poly[i];
    const e = poly[(i + 1) % poly.length];
    const ds = lineSide(s, a, b);
    const de = lineSide(e, a, b);
    const sin = inside(ds);
    const ein = inside(de);
    if (sin && ein) {
      out.push({ ...e });
    } else if (sin && !ein) {
      const t = ds / (ds - de);
      out.push({ x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t });
    } else if (!sin && ein) {
      const t = ds / (ds - de);
      out.push({ x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t });
      out.push({ ...e });
    }
  }
  return out;
}

function segmentIntersection(a, b, c, d) {
  const rx = b.x - a.x;
  const ry = b.y - a.y;
  const sx = d.x - c.x;
  const sy = d.y - c.y;
  const den = cross(rx, ry, sx, sy);
  if (Math.abs(den) < 1e-7) return null;
  const qpx = c.x - a.x;
  const qpy = c.y - a.y;
  const t = cross(qpx, qpy, sx, sy) / den;
  const u = cross(qpx, qpy, rx, ry) / den;
  if (t < -1e-5 || t > 1 + 1e-5 || u < -1e-5 || u > 1 + 1e-5) return null;
  return { x: a.x + rx * t, y: a.y + ry * t, t };
}

function angleDelta(a, b) {
  let d = (a - b + Math.PI) % TAU;
  if (d < 0) d += TAU;
  return d - Math.PI;
}

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

  tone(freq, duration = 0.08, type = 'sine', gain = 0.022, endFreq = null, delay = 0) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(amp).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  cut(size) {
    this.tone(720 + size * 260, 0.11, 'sawtooth', 0.014, 180);
    this.tone(150, 0.12, 'triangle', 0.018, 80, 0.025);
  }

  invalid() {
    this.tone(120, 0.07, 'square', 0.012, 92);
  }

  contact() {
    this.tone(95, 0.11, 'triangle', 0.024, 58);
  }

  switchHit() {
    this.tone(290, 0.11, 'square', 0.015, 430);
    this.tone(580, 0.16, 'sine', 0.018, 760, 0.055);
  }

  dock() {
    [392, 523.25, 659.25].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.019, f * 1.02, i * 0.07));
  }
}

export class VectorCutGame {
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
    this.hudTimer = 0;
    this.stageIndex = 0;
    this.timeLeft = 0;
    this.score = 0;
    this.totalCuts = 0;
    this.stageCuts = 0;
    this.collisions = 0;
    this.totalCollisions = 0;
    this.massRatio = 1;
    this.initialArea = 1;
    this.initialMass = 1;
    this.dockTimer = 0;
    this.clearTimer = 0;
    this.collisionCooldown = 0;
    this.body = null;
    this.goal = null;
    this.gate = null;
    this.switches = [];
    this.fragments = [];
    this.sparks = [];
    this.drag = null;
    this.preview = null;
    this.records = this.loadRecords();
    this.onChange = () => {};
    this.onToast = () => {};
    this.onFx = () => {};
    this.resize();
    this.frame = this.frame.bind(this);
    window.addEventListener('resize', () => this.resize(), { passive: true });
    requestAnimationFrame(this.frame);
  }

  get config() { return STAGES[this.stageIndex]; }
  setOnChange(fn) { this.onChange = fn || (() => {}); }
  setToastCallback(fn) { this.onToast = fn || (() => {}); }
  setFxCallback(fn) { this.onFx = fn || (() => {}); }
  setAudioEnabled(v) { this.audio.setEnabled(v); }
  getRecords() { return { ...this.records }; }

  loadRecords() {
    try {
      const v = JSON.parse(localStorage.getItem('vectorCutRecordsV1') || '{}');
      return {
        bestScore: Number(v.bestScore) || 0,
        fewestCuts: Number(v.fewestCuts) || 0,
        bestMass: Number(v.bestMass) || 0,
        clears: Number(v.clears) || 0,
      };
    } catch {
      return { bestScore: 0, fewestCuts: 0, bestMass: 0, clears: 0 };
    }
  }

  saveRecords() {
    try { localStorage.setItem('vectorCutRecordsV1', JSON.stringify(this.records)); } catch { /* optional */ }
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.8);
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    if (this.state === 'playing' && this.body) {
      const b = this.playRect();
      this.body.x = clamp(this.body.x, b.x + 40, b.x + b.w - 40);
      this.body.y = clamp(this.body.y, b.y + 40, b.y + b.h - 40);
      this.placeStageGeometry(false);
    }
  }

  playRect() {
    const landscape = this.width / this.height > 1.08;
    const marginX = landscape ? Math.max(36, this.width * 0.045) : Math.max(20, this.width * 0.05);
    const top = landscape ? Math.max(84, this.height * 0.16) : Math.max(112, this.height * 0.15);
    const bottom = landscape ? Math.max(70, this.height * 0.14) : Math.max(92, this.height * 0.12);
    return { x: marginX, y: top, w: this.width - marginX * 2, h: Math.max(180, this.height - top - bottom) };
  }

  scaleFactor() {
    const b = this.playRect();
    return clamp(Math.min(b.w, b.h) / 430, 0.72, 1.08);
  }

  start() {
    this.audio.unlock();
    this.state = 'playing';
    this.paused = false;
    this.score = 0;
    this.totalCuts = 0;
    this.totalCollisions = 0;
    this.totalScrapLinks = 0;
    this.startStage(0, true);
    this.onChange('start', this.getSnapshot());
  }

  startAgain() { this.start(); }

  returnToTitle() {
    this.state = 'title';
    this.paused = false;
    this.drag = null;
    this.preview = null;
    this.onChange('title');
  }

  setPaused(v) {
    if (this.state !== 'playing') return;
    this.paused = v;
    this.drag = null;
    this.preview = null;
    this.onChange(v ? 'pause' : 'resume', this.getSnapshot());
  }

  startStage(index, first = false) {
    this.stageIndex = index;
    this.timeLeft = this.config.time;
    this.stageCuts = 0;
    this.collisions = 0;
    this.stageScrapLinks = 0;
    this.dockTimer = 0;
    this.clearTimer = 0;
    this.collisionCooldown = 0;
    this.fragments = [];
    this.sparks = [];
    this.drag = null;
    this.preview = null;
    this.makeBody();
    this.placeStageGeometry(true);
    if (!first) this.onToast(`CHAMBER ${String(index + 1).padStart(2, '0')} · ${this.config.name}`, this.config.hint);
    this.onChange('stage', this.getSnapshot());
  }

  makeBody() {
    const s = this.scaleFactor();
    const r = 67 * s;
    const radii = [1.02, 0.92, 1.07, 0.94, 1.03, 0.91, 1.05, 0.96, 1.00, 0.93];
    const poly = radii.map((m, i) => {
      const a = (i / radii.length) * TAU + 0.08;
      return { x: Math.cos(a) * r * m, y: Math.sin(a) * r * m };
    });
    const centroid = polygonCentroid(poly);
    const core = {
      x: this.config.core[0] * s - centroid.x,
      y: this.config.core[1] * s - centroid.y,
    };
    const centered = poly.map(p => ({ x: p.x - centroid.x, y: p.y - centroid.y }));
    this.initialArea = polygonArea(centered);
    const massNodes = (this.config.massNodes || []).map((node, index) => ({
      id: index,
      x: node.x * r,
      y: node.y * r,
      weight: this.initialArea * node.weight,
    }));
    this.initialMass = this.initialArea + massNodes.reduce((sum, node) => sum + node.weight, 0);
    this.massRatio = 1;
    this.body = {
      poly: centered,
      core,
      massNodes,
      x: 0,
      y: 0,
      vx: this.config.velocity[0] * s,
      vy: this.config.velocity[1] * s,
      angle: 0,
      av: this.config.angular,
      radius: this.computeRadius(centered),
    };
  }

  placeStageGeometry(resetBody) {
    const b = this.playRect();
    const s = this.scaleFactor();
    if (resetBody) {
      this.body.x = b.x + b.w * this.config.start[0];
      this.body.y = b.y + b.h * this.config.start[1];
    }
    this.goal = {
      x: b.x + b.w * this.config.goal[0],
      y: b.y + b.h * this.config.goal[1],
      r: this.config.goalRadius * s,
      maxSpeed: this.config.maxSpeed * s,
      targetAngle: this.config.targetAngle,
      angleTolerance: this.config.angleTolerance ?? 0,
    };
    if (this.config.gate) {
      this.gate = {
        x: b.x + b.w * this.config.gate.x,
        gapY: b.y + b.h * this.config.gate.gapY,
        gap: this.config.gate.gap * s,
        width: Math.max(9, 12 * s),
        requiresSwitch: Boolean(this.config.gate.requiresSwitch),
      };
    } else {
      this.gate = null;
    }
    const previousSwitchState = resetBody ? [] : this.switches.map(sw => ({ active: sw.active, pulse: sw.pulse }));
    this.switches = (this.config.switches || []).map((sw, index) => ({
      id: index,
      x: b.x + b.w * sw.x,
      y: b.y + b.h * sw.y,
      r: sw.r * s,
      active: previousSwitchState[index]?.active || false,
      pulse: previousSwitchState[index]?.pulse || 0,
    }));
  }

  allSwitchesActive() {
    return this.switches.length === 0 || this.switches.every(sw => sw.active);
  }

  objectiveText() {
    if (this.gate?.requiresSwitch && !this.allSwitchesActive()) return 'SCRAP SWITCH → GATE → GOAL';
    if (this.gate) return 'PASS GATE → CORE TO GOAL';
    return 'CORE TO GOAL · FAST CLEAR';
  }

  computeRadius(poly = this.body.poly) {
    return poly.reduce((m, p) => Math.max(m, hypot(p.x, p.y)), 0);
  }

  worldToLocal(x, y) {
    return inverseRotatePoint({ x: x - this.body.x, y: y - this.body.y }, this.body.angle);
  }

  localToWorld(p) {
    const q = rotatePoint(p, this.body.angle);
    return { x: this.body.x + q.x, y: this.body.y + q.y };
  }

  worldVertices() {
    return this.body.poly.map(p => this.localToWorld(p));
  }

  coreWorld() {
    return this.localToWorld(this.body.core);
  }

  getSnapshot() {
    return {
      state: this.state,
      stageIndex: this.stageIndex,
      stageCount: STAGES.length,
      stageName: this.config?.name || '',
      stageHint: this.config?.hint || '',
      timeLeft: this.timeLeft,
      score: this.score,
      totalCuts: this.totalCuts,
      stageCuts: this.stageCuts,
      collisions: this.collisions,
      massRatio: this.massRatio,
      switchesActive: this.switches.filter(sw => sw.active).length,
      switchesTotal: this.switches.length,
      objective: this.objectiveText(),
      speed: this.body ? hypot(this.body.vx, this.body.vy) : 0,
      angular: this.body?.av || 0,
      docking: this.dockTimer,
    };
  }

  pointerDown(clientX, clientY, pointerId = 0) {
    if (this.state !== 'playing' || this.paused || this.clearTimer > 0) return false;
    const r = this.canvas.getBoundingClientRect();
    const x = clientX - r.left;
    const y = clientY - r.top;
    const b = this.playRect();
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return false;
    this.drag = { id: pointerId, start: { x, y }, end: { x, y } };
    this.preview = null;
    return true;
  }

  pointerMove(clientX, clientY, pointerId = 0) {
    if (!this.drag || this.drag.id !== pointerId) return false;
    const r = this.canvas.getBoundingClientRect();
    const b = this.playRect();
    this.drag.end = {
      x: clamp(clientX - r.left, b.x, b.x + b.w),
      y: clamp(clientY - r.top, b.y, b.y + b.h),
    };
    this.preview = this.analyzeCut(this.drag.start, this.drag.end);
    return true;
  }

  pointerUp(clientX, clientY, pointerId = 0) {
    if (!this.drag || this.drag.id !== pointerId) return false;
    this.pointerMove(clientX, clientY, pointerId);
    const result = this.preview || this.analyzeCut(this.drag.start, this.drag.end);
    this.drag = null;
    this.preview = null;
    if (!result.valid) {
      if (result.reason !== 'SHORT') {
        this.audio.invalid();
        this.onFx('invalid');
        this.onToast(result.title || 'CUT REJECTED', result.detail || '船体を横切るようにドラッグ');
      }
      return true;
    }
    this.applyCut(result);
    return true;
  }

  cancelPointer(pointerId = null) {
    if (!this.drag || (pointerId !== null && this.drag.id !== pointerId)) return;
    this.drag = null;
    this.preview = null;
  }

  analyzeCut(startWorld, endWorld) {
    const dragLength = hypot(endWorld.x - startWorld.x, endWorld.y - startWorld.y);
    if (dragLength < 28) return { valid: false, reason: 'SHORT' };

    const a = this.worldToLocal(startWorld.x, startWorld.y);
    const b = this.worldToLocal(endWorld.x, endWorld.y);
    const lineLength = hypot(b.x - a.x, b.y - a.y);
    if (lineLength < 1) return { valid: false, reason: 'SHORT' };

    const intersections = [];
    for (let i = 0; i < this.body.poly.length; i += 1) {
      const p = this.body.poly[i];
      const q = this.body.poly[(i + 1) % this.body.poly.length];
      const hit = segmentIntersection(a, b, p, q);
      if (hit && !intersections.some(h => hypot(h.x - hit.x, h.y - hit.y) < 0.5)) intersections.push(hit);
    }
    if (intersections.length < 2) {
      return { valid: false, reason: 'MISS', title: 'NO SECTION', detail: '線を船体の外から外まで通す' };
    }

    const coreDistance = Math.abs(lineSide(this.body.core, a, b)) / lineLength;
    const coreSafe = 14 * this.scaleFactor();
    if (coreDistance < coreSafe) {
      return { valid: false, reason: 'CORE', title: 'CORE PROTECTED', detail: 'オレンジのコアから少し離して切る' };
    }

    const corePositive = lineSide(this.body.core, a, b) > 0;
    const keep = clipHalfPlane(this.body.poly, a, b, corePositive);
    const discard = clipHalfPlane(this.body.poly, a, b, !corePositive);
    if (keep.length < 3 || discard.length < 3) {
      return { valid: false, reason: 'MISS', title: 'NO SECTION', detail: '船体を完全に横切るCUTが必要' };
    }

    const oldArea = polygonArea(this.body.poly);
    const keepArea = polygonArea(keep);
    const discardArea = polygonArea(discard);
    const geometryDiscardFraction = discardArea / oldArea;
    const keepNodes = [];
    const discardNodes = [];
    for (const node of this.body.massNodes || []) {
      const side = lineSide(node, a, b);
      const stays = corePositive ? side >= 0 : side <= 0;
      (stays ? keepNodes : discardNodes).push({ ...node });
    }
    const oldNodeMass = (this.body.massNodes || []).reduce((sum, node) => sum + node.weight, 0);
    const keepNodeMass = keepNodes.reduce((sum, node) => sum + node.weight, 0);
    const discardNodeMass = discardNodes.reduce((sum, node) => sum + node.weight, 0);
    const oldMass = oldArea + oldNodeMass;
    const keepMass = keepArea + keepNodeMass;
    const discardMass = discardArea + discardNodeMass;
    const discardFraction = discardMass / oldMass;
    const remainingStageMass = keepMass / this.initialMass;

    if (geometryDiscardFraction < 0.018 && discardFraction < 0.055) {
      return { valid: false, reason: 'SLIVER', title: 'CUT TOO THIN', detail: 'もっと意味のある量を切り落とす' };
    }
    if (remainingStageMass < 0.25) {
      return { valid: false, reason: 'MASS', title: 'MINIMUM MASS', detail: 'コアを支える質量を25%以上残す' };
    }

    const keepCentroid = polygonCentroid(keep);
    const discardCentroid = polygonCentroid(discard);
    let dx = keepCentroid.x - discardCentroid.x;
    let dy = keepCentroid.y - discardCentroid.y;
    const dl = Math.max(1e-5, hypot(dx, dy));
    dx /= dl;
    dy /= dl;

    const impulseMag = (58 + 255 * discardFraction) * this.scaleFactor();
    const impulseLocal = { x: dx * impulseMag, y: dy * impulseMag };
    const cutMid = intersections.reduce((o, p) => ({ x: o.x + p.x, y: o.y + p.y }), { x: 0, y: 0 });
    cutMid.x /= intersections.length;
    cutMid.y /= intersections.length;
    const lever = { x: cutMid.x - keepCentroid.x, y: cutMid.y - keepCentroid.y };
    const torque = cross(lever.x, lever.y, impulseLocal.x, impulseLocal.y) * 0.00095;

    return {
      valid: true,
      keep,
      discard,
      keepArea,
      discardArea,
      keepMass,
      discardMass,
      keepNodes,
      discardNodes,
      keepNodeMass,
      discardNodeMass,
      keepCentroid,
      discardCentroid,
      discardFraction,
      geometryDiscardFraction,
      remainingStageMass,
      impulseLocal,
      torque,
      intersections,
      cutMid,
    };
  }

  hasAvailableCut() {
    if (!this.body || this.massRatio <= 0.251) return false;
    const poly = this.body.poly;
    if (!poly || poly.length < 3) return false;
    const xs = poly.map(p => p.x);
    const ys = poly.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY) + 80 * this.scaleFactor();
    const center = polygonCentroid(poly);
    const offsets = [-0.34, -0.18, 0, 0.18, 0.34];
    const angles = 16;
    for (let i = 0; i < angles; i += 1) {
      const a = (Math.PI * i) / angles;
      const nx = -Math.sin(a), ny = Math.cos(a);
      const dx = Math.cos(a), dy = Math.sin(a);
      for (const t of offsets) {
        const ox = center.x + nx * span * t;
        const oy = center.y + ny * span * t;
        const p0 = this.localToWorld({ x: ox - dx * span, y: oy - dy * span });
        const p1 = this.localToWorld({ x: ox + dx * span, y: oy + dy * span });
        if (this.analyzeCut(p0, p1).valid) return true;
      }
    }
    return false;
  }

  predictCut(cut) {
    const old = this.body;
    const keepShiftWorld = rotatePoint(cut.keepCentroid, old.angle);
    const discardShiftWorld = rotatePoint(cut.discardCentroid, old.angle);
    const impulseWorld = rotatePoint(cut.impulseLocal, old.angle);
    const massRatio = cut.discardMass / Math.max(1, cut.keepMass);
    const scrapKick = clamp(0.45 / Math.max(0.12, massRatio), 0.6, 2.5);
    return {
      bodyX: old.x + keepShiftWorld.x,
      bodyY: old.y + keepShiftWorld.y,
      bodyVx: old.vx + impulseWorld.x,
      bodyVy: old.vy + impulseWorld.y,
      bodyAngle: old.angle,
      bodyAv: clamp(old.av + cut.torque, -2.2, 2.2),
      scrapX: old.x + discardShiftWorld.x,
      scrapY: old.y + discardShiftWorld.y,
      scrapVx: old.vx - impulseWorld.x * scrapKick,
      scrapVy: old.vy - impulseWorld.y * scrapKick,
      scrapAngle: old.angle,
      scrapAv: old.av - cut.torque * 0.8,
    };
  }

  applyCut(cut) {
    const predicted = this.predictCut(cut);
    const discardPoly = cut.discard.map(p => ({
      x: p.x - cut.discardCentroid.x,
      y: p.y - cut.discardCentroid.y,
    }));
    const discardNodes = cut.discardNodes.map(node => ({
      ...node,
      x: node.x - cut.discardCentroid.x,
      y: node.y - cut.discardCentroid.y,
    }));
    this.fragments.push({
      poly: discardPoly,
      nodes: discardNodes,
      mass: cut.discardMass,
      x: predicted.scrapX,
      y: predicted.scrapY,
      vx: predicted.scrapVx,
      vy: predicted.scrapVy,
      angle: predicted.scrapAngle,
      av: predicted.scrapAv,
      radius: this.computeRadius(discardPoly),
      t: 0,
      life: 12,
    });

    this.body.poly = cut.keep.map(p => ({
      x: p.x - cut.keepCentroid.x,
      y: p.y - cut.keepCentroid.y,
    }));
    this.body.core = {
      x: this.body.core.x - cut.keepCentroid.x,
      y: this.body.core.y - cut.keepCentroid.y,
    };
    this.body.massNodes = cut.keepNodes.map(node => ({
      ...node,
      x: node.x - cut.keepCentroid.x,
      y: node.y - cut.keepCentroid.y,
    }));
    this.body.x = predicted.bodyX;
    this.body.y = predicted.bodyY;
    this.body.vx = predicted.bodyVx;
    this.body.vy = predicted.bodyVy;
    this.body.av = predicted.bodyAv;
    this.body.radius = this.computeRadius();
    this.massRatio = cut.keepMass / this.initialMass;
    this.stageCuts += 1;
    this.totalCuts += 1;
    this.dockTimer = 0;

    this.audio.cut(cut.discardFraction);
    this.onFx('cut');
    const turn = Math.abs(cut.torque) < 0.035 ? 'STRAIGHT' : cut.torque > 0 ? 'CCW' : 'CW';
    const dense = cut.discardNodeMass > 0 ? ' · HEAVY' : '';
    this.onToast(`CUT ${Math.round(cut.discardFraction * 100)}% MASS · ${turn}${dense}`, `HULL MASS ${Math.round(this.massRatio * 100)}%`);
    this.emitCutSparks(cut.intersections);
    this.onChange('hud', this.getSnapshot());
    if (!this.hasAvailableCut()) {
      const exhaustedStage = this.stageIndex;
      this.onToast('NO MORE CUTS', 'コアをGOALへ届かせられなければ終了');
      window.setTimeout(() => {
        if (this.state === 'playing' && this.stageIndex === exhaustedStage && this.clearTimer <= 0) {
          this.finish(false, 'NO_CUTS');
        }
      }, 650);
    }
  }

  emitCutSparks(intersections) {
    for (const p of intersections) {
      const w = this.localToWorld(p);
      for (let i = 0; i < 7; i += 1) {
        const a = (i / 7) * TAU + this.globalTime;
        this.sparks.push({
          x: w.x,
          y: w.y,
          vx: Math.cos(a) * (28 + i * 7),
          vy: Math.sin(a) * (28 + i * 7),
          t: 0,
          life: 0.48,
        });
      }
    }
  }

  update(dt) {
    if (this.state !== 'playing' || this.paused) return;
    this.globalTime += dt;
    this.hudTimer += dt;
    this.collisionCooldown = Math.max(0, this.collisionCooldown - dt);

    if (this.clearTimer > 0) {
      this.clearTimer -= dt;
      this.updateFragments(dt);
      this.updateSparks(dt);
      if (this.clearTimer <= 0) this.advanceStage();
      return;
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.finish(false, 'TIME');
      return;
    }

    const b = this.body;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.angle += b.av * dt;
    b.vx *= Math.pow(0.9997, dt * 60);
    b.vy *= Math.pow(0.9997, dt * 60);
    b.av *= Math.pow(0.9998, dt * 60);

    this.resolveBounds();
    if (this.gate) this.resolveGate();
    this.updateFragments(dt);
    this.updateSwitches(dt);
    this.updateDock(dt);
    this.updateSparks(dt);

    if (this.hudTimer >= 0.12) {
      this.hudTimer = 0;
      this.onChange('hud', this.getSnapshot());
    }
  }

  resolveBounds() {
    const box = this.playRect();
    const verts = this.worldVertices();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of verts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    let hit = false;
    if (minX < box.x) {
      this.body.x += box.x - minX;
      this.body.vx = Math.abs(this.body.vx) * 0.62;
      hit = true;
    } else if (maxX > box.x + box.w) {
      this.body.x -= maxX - (box.x + box.w);
      this.body.vx = -Math.abs(this.body.vx) * 0.62;
      hit = true;
    }
    if (minY < box.y) {
      this.body.y += box.y - minY;
      this.body.vy = Math.abs(this.body.vy) * 0.62;
      hit = true;
    } else if (maxY > box.y + box.h) {
      this.body.y -= maxY - (box.y + box.h);
      this.body.vy = -Math.abs(this.body.vy) * 0.62;
      hit = true;
    }
    if (hit) this.registerCollision('CHAMBER WALL');
  }

  resolveGate() {
    const g = this.gate;
    const verts = this.worldVertices();
    const locked = g.requiresSwitch && !this.allSwitchesActive();
    const topEnd = locked ? this.playRect().y + this.playRect().h : g.gapY - g.gap * 0.5;
    const bottomStart = locked ? this.playRect().y + this.playRect().h : g.gapY + g.gap * 0.5;
    const left = g.x - g.width * 0.5;
    const right = g.x + g.width * 0.5;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of verts) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    const overlapsWall = minX <= right && maxX >= left;
    const exceedsGap = minY <= topEnd || maxY >= bottomStart;
    if (!overlapsWall || !exceedsGap) return;

    const cameFromLeft = this.body.x < g.x;
    const extent = Math.max(12, this.body.radius * 0.76);
    this.body.x = cameFromLeft ? left - extent : right + extent;
    this.body.vx = cameFromLeft ? -Math.abs(this.body.vx) * 0.55 : Math.abs(this.body.vx) * 0.55;
    this.body.vy *= 0.82;
    this.body.av *= 0.78;
    this.dockTimer = 0;
    this.registerCollision('GATE CONTACT');
  }

  registerCollision(label) {
    if (this.collisionCooldown > 0) return;
    this.collisionCooldown = 0.35;
    this.collisions += 1;
    this.totalCollisions += 1;
    this.score = Math.max(0, this.score - 55);
    this.audio.contact();
    this.onFx('contact');
    this.onToast(label, '反動を小さくするか、逆向きCUTで減速');
  }

  dockingStatus() {
    const core = this.coreWorld();
    const coreRadius = 9 * this.scaleFactor();
    const distance = hypot(core.x - this.goal.x, core.y - this.goal.y);
    const coreInside = distance <= Math.max(4, this.goal.r - coreRadius);
    return { coreInside, distance };
  }

  updateDock() {
    if (this.dockingStatus().coreInside) this.clearStage();
  }

  clearStage() {
    if (this.clearTimer > 0) return;
    const bonus = Math.round(
      700 +
      this.massRatio * 420 +
      Math.max(0, this.timeLeft) * 38 -
      this.stageCuts * 55 -
      this.collisions * 45
    );
    this.score += Math.max(250, bonus);
    this.clearTimer = 0.48;
    this.body.vx *= 0.2;
    this.body.vy *= 0.2;
    this.body.av *= 0.2;
    this.audio.dock();
    this.onFx('dock');
    const quick = this.timeLeft >= this.config.time * 0.72 ? ' · QUICK' : '';
    this.onToast(`CORE IN · CLEAR${quick}`, `+${Math.max(250, bonus)} · ${this.stageCuts} CUT${this.stageCuts === 1 ? '' : 'S'}`);
    this.onChange('hud', this.getSnapshot());
  }

  advanceStage() {
    if (this.stageIndex >= STAGES.length - 1) this.finish(true);
    else this.startStage(this.stageIndex + 1);
  }

  finish(victory, reason = '') {
    this.state = victory ? 'victory' : 'gameover';
    this.paused = false;
    this.drag = null;
    this.preview = null;
    const old = { ...this.records };
    if (victory) {
      this.records.bestScore = Math.max(this.records.bestScore, this.score);
      this.records.bestMass = Math.max(this.records.bestMass, Math.round(this.massRatio * 100));
      this.records.fewestCuts = this.records.fewestCuts === 0 ? this.totalCuts : Math.min(this.records.fewestCuts, this.totalCuts);
      this.records.clears += 1;
      this.saveRecords();
    }
    this.onChange(this.state, {
      reason,
      isScoreRecord: victory && this.score > old.bestScore,
      isCutsRecord: victory && (old.fewestCuts === 0 || this.totalCuts < old.fewestCuts),
      isMassRecord: victory && Math.round(this.massRatio * 100) > old.bestMass,
    });
  }

  updateFragments(dt) {
    const box = this.playRect();
    for (const f of this.fragments) {
      f.t += dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.angle += f.av * dt;
      f.vx *= Math.pow(0.997, dt * 60);
      f.vy *= Math.pow(0.997, dt * 60);
      f.av *= Math.pow(0.998, dt * 60);
      const r = Math.max(7, f.radius * 0.38);
      if (f.x - r < box.x) { f.x = box.x + r; f.vx = Math.abs(f.vx) * 0.58; }
      if (f.x + r > box.x + box.w) { f.x = box.x + box.w - r; f.vx = -Math.abs(f.vx) * 0.58; }
      if (f.y - r < box.y) { f.y = box.y + r; f.vy = Math.abs(f.vy) * 0.58; }
      if (f.y + r > box.y + box.h) { f.y = box.y + box.h - r; f.vy = -Math.abs(f.vy) * 0.58; }
      for (const sw of this.switches) {
        if (sw.active) continue;
        const reach = sw.r + Math.min(28, r);
        const speed = hypot(f.vx, f.vy);
        if (speed > 10 && hypot(f.x - sw.x, f.y - sw.y) <= reach) {
          sw.active = true;
          sw.pulse = 1;
          this.stageScrapLinks += 1;
          this.totalScrapLinks += 1;
          this.score += 320;
          f.vx *= -0.34;
          f.vy *= -0.34;
          this.audio.switchHit();
          this.onFx('switch');
          this.onToast('SCRAP LINK', '+320 · CUT片が回路を起動');
          this.onChange('hud', this.getSnapshot());
        }
      }
    }
    this.fragments = this.fragments.filter(f => f.t < f.life);
  }

  updateSwitches(dt) {
    for (const sw of this.switches) sw.pulse = Math.max(0, sw.pulse - dt * 1.8);
  }

  updateSparks(dt) {
    for (const p of this.sparks) {
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
    }
    this.sparks = this.sparks.filter(p => p.t < p.life);
  }

  frame(now) {
    const delta = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.accumulator += delta;
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
    this.drawGrid(ctx);
    if (this.state === 'title') {
      this.drawTitleDemo(ctx);
      return;
    }
    this.drawGoal(ctx);
    this.drawSwitches(ctx);
    this.drawGate(ctx);
    this.drawFragments(ctx);
    this.drawBody(ctx);
    this.drawSparks(ctx);
    this.drawDrag(ctx);
    this.drawTutorial(ctx);
  }

  drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, this.width, this.height);
    g.addColorStop(0, '#111316');
    g.addColorStop(0.52, '#090b0e');
    g.addColorStop(1, '#050608');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);
    const glow = ctx.createRadialGradient(this.width * 0.58, this.height * 0.48, 10, this.width * 0.58, this.height * 0.48, Math.max(this.width, this.height) * 0.7);
    glow.addColorStop(0, 'rgba(255,180,91,.045)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGrid(ctx) {
    const b = this.playRect();
    ctx.save();
    ctx.strokeStyle = 'rgba(224,231,225,.055)';
    ctx.lineWidth = 1;
    const unit = 42;
    const ox = (this.globalTime * 3) % unit;
    for (let x = b.x - unit + ox; x <= b.x + b.w + unit; x += unit) {
      ctx.beginPath();
      ctx.moveTo(x, b.y);
      ctx.lineTo(x, b.y + b.h);
      ctx.stroke();
    }
    for (let y = b.y; y <= b.y + b.h; y += unit) {
      ctx.beginPath();
      ctx.moveTo(b.x, y);
      ctx.lineTo(b.x + b.w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(237,238,224,.14)';
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    ctx.restore();
  }

  drawGoal(ctx) {
    if (!this.goal) return;
    const s = this.dockingStatus();
    const pulse = 0.58 + Math.sin(this.globalTime * 4.2) * 0.16;
    ctx.save();
    ctx.translate(this.goal.x, this.goal.y);
    ctx.strokeStyle = s.coreInside ? '#d5ffe3' : `rgba(131,240,178,${pulse})`;
    ctx.fillStyle = s.coreInside ? 'rgba(131,240,178,.20)' : 'rgba(131,240,178,.055)';
    ctx.lineWidth = s.coreInside ? 4 : 2.5;
    ctx.shadowColor = '#6beaa1';
    ctx.shadowBlur = s.coreInside ? 24 : 14;
    ctx.beginPath();
    ctx.arc(0, 0, this.goal.r, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = 'rgba(131,240,178,.42)';
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(5, this.goal.r - 9 * this.scaleFactor()), 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = s.coreInside ? '#d5ffe3' : '#9ff7c1';
    ctx.font = '900 9px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(s.coreInside ? 'CLEAR' : 'CORE → GOAL', 0, this.goal.r + 19);
    ctx.restore();
  }

  drawSwitches(ctx) {
    if (!this.switches.length) return;
    for (const sw of this.switches) {
      const pulse = sw.active ? 1 : 0.62 + Math.sin(this.globalTime * 4 + sw.id) * 0.18;
      ctx.save();
      ctx.translate(sw.x, sw.y);
      ctx.strokeStyle = sw.active ? '#83f0b2' : `rgba(255,124,99,${pulse})`;
      ctx.fillStyle = sw.active ? 'rgba(131,240,178,.16)' : 'rgba(255,118,95,.10)';
      ctx.lineWidth = sw.active ? 3 : 2;
      ctx.shadowColor = sw.active ? '#83f0b2' : '#ff765f';
      ctx.shadowBlur = 10 + sw.pulse * 18;
      ctx.beginPath();
      ctx.arc(0, 0, sw.r, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.setLineDash([3, 4]);
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.arc(0, 0, sw.r * 0.58, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.fillStyle = sw.active ? '#b9ffd1' : '#ffad98';
      ctx.font = '800 7px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sw.active ? 'LINKED' : 'SCRAP', 0, sw.r + 13);
      ctx.restore();
    }
  }

  drawGate(ctx) {
    if (!this.gate) return;
    const g = this.gate;
    const box = this.playRect();
    const locked = g.requiresSwitch && !this.allSwitchesActive();
    const topEnd = locked ? box.y + box.h : g.gapY - g.gap * 0.5;
    const bottomStart = locked ? box.y + box.h : g.gapY + g.gap * 0.5;
    ctx.save();
    ctx.fillStyle = locked ? 'rgba(255,118,95,.14)' : 'rgba(226,226,208,.12)';
    ctx.strokeStyle = 'rgba(241,183,115,.34)';
    ctx.lineWidth = 1;
    ctx.fillRect(g.x - g.width * 0.5, box.y, g.width, topEnd - box.y);
    ctx.fillRect(g.x - g.width * 0.5, bottomStart, g.width, box.y + box.h - bottomStart);
    ctx.strokeRect(g.x - g.width * 0.5, box.y, g.width, topEnd - box.y);
    ctx.strokeRect(g.x - g.width * 0.5, bottomStart, g.width, box.y + box.h - bottomStart);
    ctx.fillStyle = 'rgba(244,190,123,.72)';
    ctx.font = '800 7px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(locked ? 'SWITCH LOCK' : 'CLEARANCE', g.x, Math.max(box.y + 12, topEnd - 8));
    ctx.restore();
  }

  tracePolygon(ctx, poly) {
    if (!poly.length) return;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
  }

  drawBody(ctx) {
    if (!this.body) return;
    const body = this.body;
    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(body.angle);

    ctx.fillStyle = 'rgba(238,232,208,.12)';
    ctx.strokeStyle = '#e9e1c8';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,206,133,.2)';
    ctx.shadowBlur = 12;
    this.tracePolygon(ctx, body.poly);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    for (const node of body.massNodes || []) {
      const massScale = clamp(node.weight / Math.max(1, this.initialArea), 0.05, 0.22);
      const rr = 5 + massScale * 30;
      ctx.fillStyle = 'rgba(255,180,95,.10)';
      ctx.strokeStyle = 'rgba(255,190,112,.72)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(node.x, node.y, rr, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(node.x, node.y, rr * 0.58, 0, TAU);
      ctx.stroke();
    }

    for (let i = 0; i < body.poly.length; i += 2) {
      const p = body.poly[i];
      ctx.fillStyle = 'rgba(238,225,194,.38)';
      ctx.beginPath();
      ctx.arc(p.x * 0.82, p.y * 0.82, 2.2, 0, TAU);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,190,94,.72)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(body.core.x, body.core.y);
    ctx.lineTo(body.core.x + 24, body.core.y);
    ctx.stroke();

    ctx.fillStyle = '#ff9f43';
    ctx.shadowColor = '#ff9238';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(body.core.x, body.core.y, 9 * this.scaleFactor(), 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff1cf';
    ctx.beginPath();
    ctx.arc(body.core.x - 2, body.core.y - 2, 2.6, 0, TAU);
    ctx.fill();

    ctx.restore();

    const speed = hypot(body.vx, body.vy);
    if (speed > 8) {
      const len = clamp(speed * 0.36, 12, 66);
      const nx = body.vx / speed;
      const ny = body.vy / speed;
      ctx.save();
      ctx.strokeStyle = 'rgba(255,190,94,.42)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(body.x, body.y);
      ctx.lineTo(body.x + nx * len, body.y + ny * len);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  drawFragments(ctx) {
    for (const f of this.fragments) {
      const fadeStart = 8;
      const alpha = f.t <= fadeStart ? 1 : clamp(1 - (f.t - fadeStart) / Math.max(0.1, f.life - fadeStart), 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha * 0.78;
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);
      ctx.fillStyle = 'rgba(255,104,88,.17)';
      ctx.strokeStyle = '#ff7d68';
      ctx.lineWidth = 1.3;
      this.tracePolygon(ctx, f.poly);
      ctx.fill();
      ctx.stroke();
      for (const node of f.nodes || []) {
        ctx.strokeStyle = '#ffc070';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 7, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3.5, 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawSparks(ctx) {
    for (const p of this.sparks) {
      const a = clamp(1 - p.t / p.life, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffd08a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.2 + a * 1.4, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  previewWorldPoly(poly, centroid = { x: 0, y: 0 }) {
    return poly.map(p => {
      const q = rotatePoint({ x: p.x - centroid.x, y: p.y - centroid.y }, this.body.angle);
      const shift = rotatePoint(centroid, this.body.angle);
      return { x: this.body.x + shift.x + q.x, y: this.body.y + shift.y + q.y };
    });
  }

  drawDrag(ctx) {
    if (!this.drag) return;
    const p = this.preview;
    if (p?.valid) {
      const keep = this.previewWorldPoly(p.keep);
      const discard = this.previewWorldPoly(p.discard);
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = '#83f0b2';
      this.tracePolygon(ctx, keep);
      ctx.fill();
      ctx.fillStyle = '#ff715f';
      this.tracePolygon(ctx, discard);
      ctx.fill();
      ctx.restore();

      const impulseWorld = rotatePoint(p.impulseLocal, this.body.angle);
      const mag = hypot(impulseWorld.x, impulseWorld.y);
      const ux = impulseWorld.x / Math.max(1, mag);
      const uy = impulseWorld.y / Math.max(1, mag);
      const arrowLen = clamp(mag * 0.42, 32, 76);
      ctx.save();
      ctx.strokeStyle = '#88f0b5';
      ctx.fillStyle = '#88f0b5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.body.x, this.body.y);
      ctx.lineTo(this.body.x + ux * arrowLen, this.body.y + uy * arrowLen);
      ctx.stroke();
      const ax = this.body.x + ux * arrowLen;
      const ay = this.body.y + uy * arrowLen;
      ctx.translate(ax, ay);
      ctx.rotate(Math.atan2(uy, ux));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -5);
      ctx.lineTo(-10, 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (Math.abs(p.torque) > 0.035) {
        ctx.fillStyle = '#e8d8be';
        ctx.font = '800 9px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(p.torque > 0 ? '↺ CCW' : '↻ CW', this.body.x, this.body.y - this.body.radius - 18);
      }

      const predicted = this.predictCut(p);
      ctx.save();
      ctx.lineWidth = 1.2;
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = 'rgba(131,240,178,.62)';
      ctx.beginPath();
      ctx.moveTo(predicted.bodyX, predicted.bodyY);
      for (const t of [0.25, 0.5, 0.75, 1.0]) {
        ctx.lineTo(predicted.bodyX + predicted.bodyVx * t, predicted.bodyY + predicted.bodyVy * t);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,118,95,.62)';
      ctx.beginPath();
      ctx.moveTo(predicted.scrapX, predicted.scrapY);
      for (const t of [0.25, 0.5, 0.75, 1.0]) {
        ctx.lineTo(predicted.scrapX + predicted.scrapVx * t, predicted.scrapY + predicted.scrapVy * t);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      for (const t of [0.35, 0.7, 1.0]) {
        ctx.fillStyle = 'rgba(131,240,178,.78)';
        ctx.beginPath();
        ctx.arc(predicted.bodyX + predicted.bodyVx * t, predicted.bodyY + predicted.bodyVy * t, 2.2, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,118,95,.78)';
        ctx.beginPath();
        ctx.arc(predicted.scrapX + predicted.scrapVx * t, predicted.scrapY + predicted.scrapVy * t, 2.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.strokeStyle = p?.valid ? '#ffd08a' : '#ff765f';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(this.drag.start.x, this.drag.start.y);
    ctx.lineTo(this.drag.end.x, this.drag.end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = p?.valid ? '#ffd08a' : '#ff765f';
    ctx.beginPath();
    ctx.arc(this.drag.start.x, this.drag.start.y, 4, 0, TAU);
    ctx.arc(this.drag.end.x, this.drag.end.y, 4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawTutorial(ctx) {
    if (this.stageIndex !== 0 || this.totalCuts > 0 || this.drag) return;
    const b = this.playRect();
    const y = clamp(this.body.y - this.body.radius - 28, b.y + 24, b.y + b.h - 24);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(244,235,214,.9)';
    ctx.font = '800 11px system-ui, sans-serif';
    ctx.fillText('船体を横切るように指で線を引く', this.body.x, y);
    const x1 = this.body.x - this.body.radius * 1.2;
    const x2 = this.body.x + this.body.radius * 1.2;
    const yy = this.body.y + Math.sin(this.globalTime * 3) * 5;
    ctx.strokeStyle = 'rgba(255,208,138,.72)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x1, yy);
    ctx.lineTo(x2, yy);
    ctx.stroke();
    ctx.restore();
  }

  drawTitleDemo(ctx) {
    const b = this.playRect();
    const cx = b.x + b.w * 0.68;
    const cy = b.y + b.h * 0.53;
    const r = 64 * this.scaleFactor();
    const angle = Math.sin(this.globalTime * 0.55) * 0.12;
    const poly = Array.from({ length: 8 }, (_, i) => {
      const a = i / 8 * TAU;
      return { x: Math.cos(a) * r * (i % 2 ? 0.92 : 1.05), y: Math.sin(a) * r * (i % 2 ? 1.04 : 0.94) };
    });

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(238,232,208,.09)';
    ctx.strokeStyle = 'rgba(238,226,199,.62)';
    ctx.lineWidth = 2;
    this.tracePolygon(ctx, poly);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff9f43';
    ctx.shadowColor = '#ff9238';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, TAU);
    ctx.fill();
    ctx.restore();

    const phase = (this.globalTime * 0.38) % 1;
    const sx = cx - r * 1.35;
    const ex = cx + r * 1.35;
    const yy = cy + lerp(-r * 0.36, r * 0.32, 0.5 + Math.sin(this.globalTime * 0.8) * 0.5);
    ctx.save();
    ctx.globalAlpha = phase < 0.82 ? 0.82 : (1 - phase) / 0.18;
    ctx.strokeStyle = '#ffd08a';
    ctx.setLineDash([7, 5]);
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(sx, yy);
    ctx.lineTo(lerp(sx, ex, clamp(phase / 0.72, 0, 1)), yy);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = 'rgba(131,240,178,.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x + b.w * 0.86, b.y + b.h * 0.40, 72 * this.scaleFactor(), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}