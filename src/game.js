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
  const sectorLength = 6;
  const sectorIndex = Math.floor(index / sectorLength) + 1;
  const sectorStage = index % sectorLength + 1;
  const sectorFinal = sectorStage === sectorLength;
  const sectorNames = ['DRIFT FRONTIER', 'GRAVITY REACH', 'PHASE BELT', 'DEEP VECTOR'];
  const sectorName = sectorNames[(sectorIndex - 1) % sectorNames.length];
  const specialCycle = ['VELOCITY_ENTRY', 'SLINGSHOT_ARC', 'MOVING_WARP', 'LASER_CORRIDOR'];
  const specialType = sectorFinal ? specialCycle[(sectorIndex - 1) % specialCycle.length] : null;

  const rnd = seededRandom(n * 7919);
  const angle = specialType === 'VELOCITY_ENTRY' ? -Math.PI * 0.5 : (n === 1 ? 0 : rnd() * TAU);
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const perp = { x: -dir.y, y: dir.x };
  const distance = 500 + Math.min(360, n * 11);
  const portal = { x: dir.x * distance, y: dir.y * distance };
  let time = Math.max(6.5, 10.5 - Math.min(3.2, n * 0.08));
  const portalRadius = Math.max(27, 43 - Math.min(16, n * 0.55));
  let fuelStart = Math.max(58, 88 - Math.min(30, n * 1.15));
  let startVelocity = null;
  let portalMotion = null;

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
      slingCharge: 0,
      slingUsed: false,
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

  const winds = [];
  const windCount = n < 7 ? 0 : (n >= 25 ? 2 : 1);
  for (let i = 0; i < windCount; i += 1) {
    const t = 0.26 + (i + 1) / (windCount + 1) * 0.30;
    const sideSign = (i + n) % 2 === 0 ? 1 : -1;
    const side = sideSign * (24 + rnd() * 54);
    const flow = normalize(
      dir.x * (0.78 + rnd() * 0.35) + perp.x * sideSign * (0.20 + rnd() * 0.35),
      dir.y * (0.78 + rnd() * 0.35) + perp.y * sideSign * (0.20 + rnd() * 0.35),
    );
    winds.push({
      x: portal.x * t + perp.x * side,
      y: portal.y * t + perp.y * side,
      range: 82 + rnd() * 28,
      dx: flow.x,
      dy: flow.y,
      strength: 72 + Math.min(52, n * 1.7),
    });
  }

  const repulsors = [];
  if (n >= 10) {
    const t = 0.47 + rnd() * 0.12;
    const sideSign = n % 2 === 0 ? 1 : -1;
    repulsors.push({
      x: portal.x * t + perp.x * sideSign * (82 + rnd() * 35),
      y: portal.y * t + perp.y * sideSign * (82 + rnd() * 35),
      range: 142 + rnd() * 28,
      period: 1.65 + rnd() * 0.35,
      phase: rnd(),
      strength: 255 + Math.min(90, n * 3.0),
    });
  }

  const phaseGates = [];
  if (n >= 14) {
    const t = 0.58 + rnd() * 0.08;
    phaseGates.push({
      x: portal.x * t,
      y: portal.y * t,
      angle: Math.atan2(dir.y, dir.x) + Math.PI * 0.5,
      halfLen: 78 + rnd() * 24,
      width: 7,
      period: 1.55 + rnd() * 0.35,
      phase: rnd(),
      activeRatio: 0.56,
    });
  }

  const boostRings = [];
  if (n >= 17) {
    const t = 0.30 + rnd() * 0.18;
    const sideSign = n % 2 === 0 ? -1 : 1;
    boostRings.push({
      x: portal.x * t + perp.x * sideSign * (22 + rnd() * 34),
      y: portal.y * t + perp.y * sideSign * (22 + rnd() * 34),
      r: 28 + rnd() * 5,
      dx: dir.x,
      dy: dir.y,
      boost: 92 + Math.min(48, n * 1.5),
      used: false,
    });
  }

  const dragClouds = [];
  if (n >= 21) {
    const t = 0.69 + rnd() * 0.08;
    const sideSign = n % 2 === 0 ? 1 : -1;
    dragClouds.push({
      x: portal.x * t + perp.x * sideSign * (42 + rnd() * 42),
      y: portal.y * t + perp.y * sideSign * (42 + rnd() * 42),
      range: 76 + rnd() * 24,
      drag: 1.35 + Math.min(0.85, n * 0.018),
      phase: rnd() * TAU,
    });
  }

  if (specialType === 'VELOCITY_ENTRY') {
    const entryDistance = distance + 330;
    startVelocity = { x: dir.x * 310, y: dir.y * 310 };

    // High-speed stages use a purpose-built layout so the extra velocity
    // feels intentional instead of inheriting slow-stage hazard density.
    asteroids.length = 0;
    mines.length = 0;
    wells.length = 0;
    lasers.length = 0;
    winds.length = 0;
    repulsors.length = 0;
    phaseGates.length = 0;
    dragClouds.length = 0;
    boostRings.length = 0;

    portal.x = dir.x * entryDistance + perp.x * 175;
    portal.y = dir.y * entryDistance + perp.y * 175;

    // Long reaction lane: first mandatory steering decision arrives
    // after roughly 1.7 s at the initial 310 speed.
    asteroids.push({
      x: dir.x * entryDistance * 0.60,
      y: dir.y * entryDistance * 0.60,
      r: 34,
      spin: 0.32,
      phase: 0.35,
      special: true,
    });

    // Side markers shape a readable high-speed corridor without closing
    // the line toward the laterally offset portal.
    asteroids.push({
      x: dir.x * entryDistance * 0.76 - perp.x * 135,
      y: dir.y * entryDistance * 0.76 - perp.y * 135,
      r: 28,
      spin: -0.24,
      phase: 1.1,
      special: true,
    });
    asteroids.push({
      x: dir.x * entryDistance * 0.84 + perp.x * 285,
      y: dir.y * entryDistance * 0.84 + perp.y * 285,
      r: 30,
      spin: 0.20,
      phase: 2.0,
      special: true,
    });

    time += 1.8;
  } else if (specialType === 'SLINGSHOT_ARC') {
    fuelStart = Math.min(fuelStart, 26);
    time += 2.0;
    wells.length = 0;
    for (let i = 0; i < 2; i += 1) {
      const t = i === 0 ? 0.38 : 0.66;
      const side = i === 0 ? 1 : -1;
      wells.push({
        x: portal.x * t + perp.x * side * 82,
        y: portal.y * t + perp.y * side * 82,
        range: 196,
        strength: 238,
        r: 20,
        slingCharge: 0,
        slingUsed: false,
        special: true,
      });
    }
  } else if (specialType === 'MOVING_WARP') {
    portalMotion = { baseX: portal.x, baseY: portal.y, axisX: perp.x, axisY: perp.y, amp: 105, speed: 1.25, phase: 0 };
    time += 1.5;
  } else if (specialType === 'LASER_CORRIDOR') {
    time += 1.4;
    for (let i = 0; i < 3; i += 1) {
      const t = 0.30 + i * 0.20;
      const side = i % 2 === 0 ? 1 : -1;
      lasers.push({
        x: portal.x * t + perp.x * side * 30,
        y: portal.y * t + perp.y * side * 30,
        len: 72 + i * 7,
        angle: Math.atan2(perp.y, perp.x),
        speed: side * (0.28 + i * 0.06),
        width: 5,
        corridor: true,
      });
    }
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
  if (n === 7) title = 'SOLAR WIND';
  if (n === 10) title = 'PULSE BEACON';
  if (n === 14) title = 'PHASE GATE';
  if (n === 17) title = 'BOOST RING';
  if (n === 21) title = 'DRAG CLOUD';
  if (specialType === 'VELOCITY_ENTRY') title = 'SPECIAL · VELOCITY ENTRY';
  if (specialType === 'SLINGSHOT_ARC') title = 'SPECIAL · SLINGSHOT ARC';
  if (specialType === 'MOVING_WARP') title = 'SPECIAL · MOVING WARP';
  if (specialType === 'LASER_CORRIDOR') title = 'SPECIAL · LASER CORRIDOR';

  let hint = n <= 2
    ? 'スティック方向にノズル。JETで反対方向へ加速'
    : n < 6
      ? '短く噴射して慣性を作り、ワープ口へ'
      : n < 13
        ? '動く障害物と重力を読み、燃料を節約'
        : '障害物の周期を見て一気に抜ける';
  if (n === 7) hint = '青いSOLAR WINDを利用すると少ない噴射で加速できる';
  if (n === 10) hint = 'PULSE BEACONの衝撃波周期を見てラインを選ぶ';
  if (n === 14) hint = 'PHASE GATEが消える瞬間を抜けるか端を回り込む';
  if (n === 17) hint = '緑のBOOST RINGを通ると進行方向へ加速';
  if (n === 21) hint = 'DRAG CLOUD内では速度が落ちる。短く横切るか迂回';
  if (specialType === 'VELOCITY_ENTRY') hint = '高速310で自動進行。長い直進区間の後、中央障害物を避けて右のワープ口へ';
  if (specialType === 'SLINGSHOT_ARC') hint = '燃料は少ない。重力井戸へ接近し、接線速度を出口へ変える';
  if (specialType === 'MOVING_WARP') hint = 'ワープ口が横移動する。到達時刻まで読んで進路を合わせる';
  if (specialType === 'LASER_CORRIDOR') hint = 'レーザーの周期を読み、狭い回廊を一気に抜ける';

  return {
    n,
    title,
    time,
    fuelStart,
    portal,
    portalBase: { x: portal.x, y: portal.y },
    portalMotion,
    portalRadius,
    startVelocity,
    sectorIndex,
    sectorStage,
    sectorLength,
    sectorFinal,
    sectorName,
    specialType,
    bounds: { minX, maxX, minY, maxY },
    asteroids,
    mines,
    wells,
    lasers,
    fuels,
    winds,
    repulsors,
    phaseGates,
    boostRings,
    dragClouds,
    startAim: { x: -dir.x, y: -dir.y },
    hint,
  };
}


const CHIP_MINOR = [0, 2, 3, 5, 7, 8, 10];
const CHIP_MELODY_SHAPES = [
  [0, null, 2, null, 4, null, 5, 4, 2, null, 1, null, 2, 4, 2, null],
  [0, 2, null, 3, 4, null, 2, 1, 0, null, 4, null, 3, 2, 1, null],
  [0, null, 4, 3, 2, null, 5, null, 4, 2, 1, null, 3, 2, 0, null],
  [0, 1, 2, null, 4, 3, 2, null, 5, 4, 3, 2, 1, null, 0, null],
];

class ChipRng {
  constructor(seed) { this.state = seed >>> 0 || 0x6d2b79f5; }
  next() {
    let t = this.state = (this.state + 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(max) { return Math.floor(this.next() * max); }
  pick(items) { return items[Math.min(items.length - 1, this.int(items.length))]; }
}

function chipScaleMidi(root, scale, degree) {
  const octave = Math.floor(degree / scale.length);
  const index = ((degree % scale.length) + scale.length) % scale.length;
  return root + scale[index] + octave * 12;
}

function chipTone(events, channel, start, duration, midi, volume, duty, endMidi) {
  const event = { channel, start, duration, midi, volume };
  if (duty !== undefined) event.duty = duty;
  if (endMidi !== undefined) event.endMidi = endMidi;
  events.push(event);
}

function chipNoise(events, start, duration, volume, noiseKind, noiseRate = 1) {
  events.push({ channel: 'noise', start, duration, volume, noiseKind, noiseRate });
}

function generateJetDriftBgm(bpm = 110) {
  const intensity = 0.68;
  const seed = 0x53504143;
  const bars = 4;
  const rootMidi = 57;
  const progression = [0, 5, 6, 4];
  const melodyDensity = 0.78;
  const duty = 0.25;
  const rng = new ChipRng((seed ^ ('battle'.length * 0x9e3779b9)) >>> 0);
  const step = 60 / bpm / 4;
  const barDuration = step * 16;
  const duration = bars * barDuration;
  const events = [];
  const shape = rng.pick(CHIP_MELODY_SHAPES);
  const shapeShift = rng.int(CHIP_MINOR.length);
  const leadRoot = rootMidi + 12 + (rng.next() > 0.72 ? 12 : 0);
  const leadVolume = 0.16 + intensity * 0.1;
  const pulse2Volume = 0.13 + intensity * 0.08;

  for (let bar = 0; bar < bars; bar += 1) {
    const barStart = bar * barDuration;
    const chordRootDegree = progression[bar % progression.length];
    const variation = bar >= Math.max(2, Math.floor(bars / 2));

    for (let localStep = 0; localStep < 16; localStep += 1) {
      const shapeDegree = shape[localStep];
      if (shapeDegree === null || rng.next() > melodyDensity + intensity * 0.2) continue;
      let degree = shapeDegree + shapeShift + chordRootDegree;
      if (variation && localStep >= 8 && rng.next() > 0.55) degree += rng.next() > 0.5 ? 1 : -1;
      const midi = chipScaleMidi(leadRoot, CHIP_MINOR, degree);
      const lengthSteps = rng.next() > 0.76 ? 2 : 1;
      chipTone(events, 'pulse1', barStart + localStep * step, step * lengthSteps * 0.88, midi, leadVolume, duty);
    }

    const chordDegrees = [chordRootDegree, chordRootDegree + 2, chordRootDegree + 4, chordRootDegree + 2];
    for (let localStep = 0; localStep < 16; localStep += 2) {
      const arpIndex = Math.floor(localStep / 2) % chordDegrees.length;
      const degree = chordDegrees[arpIndex];
      const midi = chipScaleMidi(rootMidi + 12, CHIP_MINOR, degree + (bar % 2 === 1 && arpIndex === 2 ? 7 : 0));
      chipTone(events, 'pulse2', barStart + localStep * step, step * 2 * 0.72, midi, pulse2Volume, 0.125);
    }

    const bassPattern = [0, 4, 0, 5];
    for (let beat = 0; beat < 4; beat += 1) {
      const midi = chipScaleMidi(rootMidi - 12, CHIP_MINOR, chordRootDegree + bassPattern[beat]);
      chipTone(events, 'triangle', barStart + beat * 4 * step, step * 2.9, midi, 0.13 + 0.82 * 0.09 + intensity * 0.04);
      if (intensity > 0.55 && beat < 3) {
        const nextMidi = chipScaleMidi(rootMidi - 12, CHIP_MINOR, chordRootDegree + (beat % 2 === 0 ? 4 : 0));
        chipTone(events, 'triangle', barStart + (beat * 4 + 2) * step, step * 1.6, nextMidi, 0.1 + intensity * 0.05);
      }
    }

    const drum = 0.84 * (0.55 + intensity * 0.65);
    for (let localStep = 0; localStep < 16; localStep += 1) {
      const when = barStart + localStep * step;
      if (localStep % 4 === 0) chipNoise(events, when, step * 0.75, 0.12 + drum * 0.09, 'kick', 0.72);
      if (localStep === 4 || localStep === 12) chipNoise(events, when, step * 0.86, 0.11 + drum * 0.1, 'snare', 1.1);
      if (localStep % 2 === 0 && rng.next() < 0.5 + drum * 0.42) {
        chipNoise(events, when, step * 0.34, 0.045 + drum * 0.05, 'hat', 1.5 + intensity * 0.5);
      }
    }
  }

  events.sort((a, b) => a.start - b.start);
  return { version: 'sound-wave-eight-bit-v1', kind: 'bgm', purpose: 'battle', loop: true, duration, bpm, bars, seed, intensity, events };
}

function generateJetDriftSfx(purpose, intensity, seed) {
  const rng = new ChipRng((seed ^ (purpose.length * 0x85ebca6b)) >>> 0);
  const events = [];
  const v = 0.17 + intensity * 0.12;
  let duration = 0.35;

  if (purpose === 'pickup') {
    duration = 0.42;
    [76, 83, 88].forEach((midi, index) => {
      chipTone(events, index === 1 ? 'pulse2' : 'pulse1', index * 0.08, 0.12, midi + rng.int(2), v * (0.88 + index * 0.05), index === 1 ? 0.125 : 0.25);
    });
  } else if (purpose === 'magic') {
    duration = 0.62;
    [60, 67, 72, 79, 84, 91].forEach((midi, index) => {
      chipTone(events, index % 2 === 0 ? 'pulse1' : 'pulse2', index * 0.055, 0.15, midi + rng.int(4), v * 0.82, index % 3 === 0 ? 0.125 : 0.25);
    });
    chipNoise(events, 0.12, 0.26, v * 0.42, 'metal', 2.2);
  } else if (purpose === 'explosion') {
    duration = 0.82;
    chipNoise(events, 0, 0.68, v * 1.28, 'burst', 0.58 + intensity * 0.35);
    chipNoise(events, 0.08, 0.42, v * 0.8, 'snare', 0.42);
    chipTone(events, 'triangle', 0, 0.52, 45, v * 0.65, undefined, 24);
  } else if (purpose === 'damage') {
    duration = 0.42;
    chipTone(events, 'pulse1', 0, 0.29, 69 + rng.int(4), v, 0.125, 36 + rng.int(5));
    chipTone(events, 'pulse2', 0.035, 0.22, 63, v * 0.72, 0.125, 41);
    chipNoise(events, 0, 0.21, v * 0.82, 'metal', 0.7 + intensity * 0.8);
  } else if (purpose === 'critical') {
    duration = 0.48;
    chipNoise(events, 0, 0.11, v * 1.2, 'burst', 1.7);
    [72, 79, 84, 91].forEach((midi, index) => {
      chipTone(events, index % 2 === 0 ? 'pulse1' : 'pulse2', index * 0.065, 0.12, midi + rng.int(3), v, index % 2 === 0 ? 0.125 : 0.25);
    });
    chipTone(events, 'triangle', 0.015, 0.23, 43, v * 0.58, undefined, 31);
  }

  return { version: 'sound-wave-eight-bit-v1', kind: 'sfx', purpose, loop: false, duration, bpm: 0, bars: 0, seed, intensity, events };
}

const JET_DRIFT_8BIT = {
  bgmSlow: generateJetDriftBgm(110),
  bgmFast: generateJetDriftBgm(164),
  warp: generateJetDriftSfx('magic', 0.88, 0x57415250),
  clear: generateJetDriftSfx('critical', 0.72, 0x434c4541),
  explosion: generateJetDriftSfx('explosion', 0.92, 0x424f4f4d),
  pickup: generateJetDriftSfx('pickup', 0.72, 0x4655454c),
  warning: generateJetDriftSfx('damage', 0.50, 0x5741524e),
};

function chipMidiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function makeChipPulseWave(context, duty) {
  const harmonics = 32;
  const real = new Float32Array(harmonics + 1);
  const imag = new Float32Array(harmonics + 1);
  for (let n = 1; n <= harmonics; n += 1) {
    const phase = Math.PI * 2 * n * duty;
    real[n] = (2 / (Math.PI * n)) * Math.sin(phase);
    imag[n] = (2 / (Math.PI * n)) * (1 - Math.cos(phase));
  }
  return context.createPeriodicWave(real, imag, { disableNormalization: false });
}

function makeChipNoiseBuffer(context, metallic) {
  const length = 4096;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let lfsr = metallic ? 0x5d : 0x5a5d;
  for (let i = 0; i < length; i += 1) {
    const bit = ((lfsr >> 0) ^ (lfsr >> 1)) & 1;
    lfsr = metallic
      ? ((lfsr >> 1) | (bit << 6)) & 0x7f
      : ((lfsr >> 1) | (bit << 14)) & 0x7fff;
    data[i] = (lfsr & 1) === 0 ? -1 : 1;
  }
  return buffer;
}

const chipGraphCache = new WeakMap();

function chipCacheFor(context) {
  const cached = chipGraphCache.get(context);
  if (cached) return cached;
  const created = {
    pulse125: makeChipPulseWave(context, 0.125),
    pulse25: makeChipPulseWave(context, 0.25),
    pulse50: makeChipPulseWave(context, 0.5),
    noise: makeChipNoiseBuffer(context, false),
    metalNoise: makeChipNoiseBuffer(context, true),
  };
  chipGraphCache.set(context, created);
  return created;
}

function chipPulseWave(cache, duty) {
  if (duty === 0.125) return cache.pulse125;
  if (duty === 0.5) return cache.pulse50;
  return cache.pulse25;
}

function chipNoiseFilter(context, kind) {
  const filter = context.createBiquadFilter();
  if (kind === 'kick') {
    filter.type = 'lowpass'; filter.frequency.value = 980; filter.Q.value = 0.6;
  } else if (kind === 'snare') {
    filter.type = 'bandpass'; filter.frequency.value = 2100; filter.Q.value = 0.55;
  } else if (kind === 'hat') {
    filter.type = 'highpass'; filter.frequency.value = 5200; filter.Q.value = 0.45;
  } else if (kind === 'metal') {
    filter.type = 'bandpass'; filter.frequency.value = 3200; filter.Q.value = 2.2;
  } else {
    filter.type = 'bandpass'; filter.frequency.value = 1250; filter.Q.value = 0.42;
  }
  return filter;
}

function trackChipNode(nodes, node) {
  if (!nodes) return;
  nodes.add(node);
  node.addEventListener('ended', () => nodes.delete(node), { once: true });
}

function scheduleChipEvent(context, destination, event, offset, nodes) {
  const start = offset + event.start;
  const end = start + Math.max(event.channel === 'noise' ? 0.012 : 0.015, event.duration);
  const cache = chipCacheFor(context);

  if (event.channel === 'noise') {
    const source = context.createBufferSource();
    source.buffer = event.noiseKind === 'metal' ? cache.metalNoise : cache.noise;
    source.loop = true;
    source.playbackRate.value = clamp(event.noiseRate ?? 1, 0.2, 4);
    const filter = chipNoiseFilter(context, event.noiseKind);
    const gain = context.createGain();
    const volume = clamp(event.volume, 0, 0.5);
    const attack = Math.min(0.004, event.duration * 0.12);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.max(0.001, attack));
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(start);
    source.stop(end + 0.004);
    trackChipNode(nodes, source);
    return;
  }

  const oscillator = context.createOscillator();
  const gain = context.createGain();
  if (event.channel === 'triangle') oscillator.type = 'triangle';
  else oscillator.setPeriodicWave(chipPulseWave(cache, event.duty));
  const startHz = chipMidiToHz(event.midi);
  oscillator.frequency.setValueAtTime(startHz, start);
  if (event.endMidi !== undefined) {
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, chipMidiToHz(event.endMidi)),
      Math.max(start + 0.01, end - 0.006),
    );
  }
  const attack = Math.min(0.006, event.duration * 0.16);
  const release = Math.min(0.025, event.duration * 0.28);
  const volume = clamp(event.volume, 0, 0.45);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + Math.max(0.002, attack));
  gain.gain.setValueAtTime(Math.max(0.0002, volume * 0.9), Math.max(start + attack, end - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(start);
  oscillator.stop(end + 0.004);
  trackChipNode(nodes, oscillator);
}

function scheduleChipComposition(context, destination, composition, offset, nodes) {
  for (const event of composition.events) scheduleChipEvent(context, destination, event, offset, nodes);
}

class AudioBus {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.sfxBus = null;
    this.jetOsc = null;
    this.jetGain = null;
    this.musicNodes = new Set();
    this.sfxNodes = new Set();
    this.musicTimer = 0;
    this.musicNextTime = 0;
    this.musicMode = 'slow';
    this.musicComposition = JET_DRIFT_8BIT.bgmSlow;
  }

  async unlock() {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
        this.master = this.ctx.createGain();
        this.musicBus = this.ctx.createGain();
        this.sfxBus = this.ctx.createGain();
        const compressor = this.ctx.createDynamicsCompressor();
        this.master.gain.value = 0.78;
        this.musicBus.gain.value = 0.22;
        this.sfxBus.gain.value = 0.76;
        compressor.threshold.value = -8;
        compressor.knee.value = 4;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.002;
        compressor.release.value = 0.08;
        this.musicBus.connect(this.master);
        this.sfxBus.connect(this.master);
        this.master.connect(compressor);
        compressor.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(value) {
    this.enabled = value;
    if (value) {
      void this.unlock();
    } else {
      this.stopJet();
      this.stopMusic();
      this.ctx?.suspend?.().catch(() => {});
    }
  }

  async startMusic(mode = 'slow') {
    if (!this.enabled) return;
    await this.unlock();
    if (!this.ctx || !this.musicBus) return;
    if (this.musicTimer && this.musicMode === mode) return;
    if (this.musicTimer) this.stopMusic();
    this.musicMode = mode;
    this.musicComposition = mode === 'fast' ? JET_DRIFT_8BIT.bgmFast : JET_DRIFT_8BIT.bgmSlow;
    this.musicNextTime = this.ctx.currentTime + 0.035;
    this.scheduleMusicAhead();
    this.musicTimer = window.setInterval(() => this.scheduleMusicAhead(), 350);
  }

  scheduleMusicAhead() {
    if (!this.ctx || !this.musicBus || !this.enabled || !this.musicComposition) return;
    while (this.musicNextTime < this.ctx.currentTime + 1.35) {
      scheduleChipComposition(this.ctx, this.musicBus, this.musicComposition, this.musicNextTime, this.musicNodes);
      this.musicNextTime += this.musicComposition.duration;
    }
  }

  stopMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = 0;
    for (const node of this.musicNodes) {
      try { node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    }
    this.musicNodes.clear();
  }

  stopSfx() {
    for (const node of this.sfxNodes) {
      try { node.stop(); } catch {}
      try { node.disconnect(); } catch {}
    }
    this.sfxNodes.clear();
  }

  async playSfx(composition, delay = 0) {
    if (!this.enabled) return;
    await this.unlock();
    if (!this.ctx || !this.sfxBus) return;
    scheduleChipComposition(this.ctx, this.sfxBus, composition, this.ctx.currentTime + 0.012 + delay, this.sfxNodes);
  }

  startJet() {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running' || this.jetOsc || !this.sfxBus) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(78, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(0.014, now + 0.035);
    osc.connect(amp).connect(this.sfxBus);
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
    void this.playSfx(JET_DRIFT_8BIT.pickup);
  }

  fail() {
    this.stopJet();
    void this.playSfx(JET_DRIFT_8BIT.explosion);
  }

  warp() {
    this.stopJet();
    void this.playSfx(JET_DRIFT_8BIT.warp);
    void this.playSfx(JET_DRIFT_8BIT.clear, 0.18);
  }

  warpOut() {
    void this.playSfx(JET_DRIFT_8BIT.warp);
  }

  warning() {
    void this.playSfx(JET_DRIFT_8BIT.warning);
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
    this.warpOutTimer = 0;
    this.strandedTimer = 0;
    this.globalTime = 0;
    this.hudTimer = 0;
    this.timeWarned = false;
    this.timeCriticalWarned = false;
    this.fuelWarned = false;
    this.fuelCriticalWarned = false;
    this.musicUrgent = false;
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
    this.ghostStore = this.loadGhostStore();
    this.bestGhostStore = this.loadBestGhostStore();
    this.ghostTrail = [];
    this.bestGhostTrail = [];
    this.currentTrail = [];
    this.stageElapsed = 0;
    this.trailSampleTimer = 0;
    this.pathLength = 0;
    this.lastLineRating = null;
    this.warpTravelDir = { x: 0, y: -1 };
    this.wireframeWarpEnabled = true;
    try {
      const savedWarpMode = localStorage.getItem('jetDriftWireframeWarpV1');
      if (savedWarpMode === '0') this.wireframeWarpEnabled = false;
    } catch {}
    this.frame = this.frame.bind(this);
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });
    requestAnimationFrame(this.frame);
  }

  setOnChange(fn) { this.onChange = fn || (() => {}); }
  setToastCallback(fn) { this.onToast = fn || (() => {}); }
  setFxCallback(fn) { this.onFx = fn || (() => {}); }
  setAudioEnabled(v) {
    this.audio.setEnabled(v);
    if (v && this.state === 'playing') void this.audio.startMusic(this.isMusicUrgent() ? 'fast' : 'slow');
  }
  unlockAudio() { this.audio.unlock(); }

  getWireframeWarpEnabled() {
    return this.wireframeWarpEnabled;
  }

  setWireframeWarpEnabled(value) {
    this.wireframeWarpEnabled = Boolean(value);
    try { localStorage.setItem('jetDriftWireframeWarpV1', this.wireframeWarpEnabled ? '1' : '0'); } catch {}
    this.onChange('settings', this.getSnapshot());
  }

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

  loadGhostStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem('jetDriftGhostsV1') || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  getGhostTrail(index) {
    const packed = this.ghostStore[String(index)];
    if (!Array.isArray(packed)) return [];
    return packed
      .filter((p) => Array.isArray(p) && p.length >= 3 && p.every(Number.isFinite))
      .slice(0, 180)
      .map((p) => ({ x: p[0], y: p[1], t: p[2] / 100 }));
  }

  loadBestGhostStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem('jetDriftBestGhostsV1') || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  getBestGhostTrail(index) {
    const entry = this.bestGhostStore[String(index)];
    const packed = entry?.trail;
    if (!Array.isArray(packed)) return [];
    return packed
      .filter((p) => Array.isArray(p) && p.length >= 3 && p.every(Number.isFinite))
      .slice(0, 180)
      .map((p) => ({ x: p[0], y: p[1], t: p[2] / 100 }));
  }

  packCurrentTrail() {
    return this.currentTrail.map((p) => [
      Math.round(p.x),
      Math.round(p.y),
      Math.round(p.t * 100),
    ]);
  }

  saveBestGhost(rating) {
    if (!this.currentTrail || this.currentTrail.length < 2) return false;
    this.recordTrailPoint(true);
    const key = String(this.stageIndex);
    const previous = this.bestGhostStore[key];
    const elapsed = this.stageElapsed;
    const isBetter = !previous
      || rating.score > Number(previous.score || 0)
      || (rating.score === Number(previous.score || 0) && elapsed < Number(previous.time || Infinity));
    if (!isBetter) return false;

    this.bestGhostStore[key] = {
      score: rating.score,
      time: Math.round(elapsed * 100) / 100,
      trail: this.packCurrentTrail(),
    };
    const endlessKeys = Object.keys(this.bestGhostStore)
      .filter((k) => Number(k) >= 24)
      .sort((a, b) => Number(a) - Number(b));
    while (Object.keys(this.bestGhostStore).length > 64 && endlessKeys.length) {
      delete this.bestGhostStore[endlessKeys.shift()];
    }
    try { localStorage.setItem('jetDriftBestGhostsV1', JSON.stringify(this.bestGhostStore)); } catch {}
    return true;
  }

  recordTrailPoint(force = false) {
    if (!this.currentTrail) return;
    const p = this.player;
    const last = this.currentTrail[this.currentTrail.length - 1];
    const moved = !last || Math.hypot(p.x - last.x, p.y - last.y) >= 7;
    if (!force && !moved) return;
    if (last && Math.abs(last.t - this.stageElapsed) < 0.025) {
      if (force) {
        last.x = p.x;
        last.y = p.y;
        last.t = this.stageElapsed;
      }
      return;
    }
    this.currentTrail.push({ x: p.x, y: p.y, t: this.stageElapsed });
    if (this.currentTrail.length > 180) this.currentTrail.splice(1, 1);
  }

  saveCurrentGhost() {
    if (!this.currentTrail || this.currentTrail.length < 2) return;
    this.recordTrailPoint(true);
    const key = String(this.stageIndex);
    this.ghostStore[key] = this.packCurrentTrail();
    const endlessKeys = Object.keys(this.ghostStore)
      .filter((k) => Number(k) >= 24)
      .sort((a, b) => Number(a) - Number(b));
    while (Object.keys(this.ghostStore).length > 64 && endlessKeys.length) {
      delete this.ghostStore[endlessKeys.shift()];
    }
    try { localStorage.setItem('jetDriftGhostsV1', JSON.stringify(this.ghostStore)); } catch {}
  }

  evaluateLine() {
    const straight = Math.max(1, Math.hypot(this.stage.portal.x, this.stage.portal.y));
    const ratio = Math.max(1, this.pathLength / straight);
    const direct = clamp(1 - (ratio - 1) / 0.90, 0, 1);
    const time = clamp(this.timeLeft / Math.max(0.1, this.stage.time), 0, 1);
    const fuel = clamp(this.fuel / Math.max(1, this.stage.fuelStart), 0, 1);
    const score = Math.round((direct * 0.64 + time * 0.21 + fuel * 0.15) * 100);
    const grade = score >= 92 ? 'S' : score >= 82 ? 'A' : score >= 70 ? 'B' : score >= 58 ? 'C' : 'D';
    return { score, grade, ratio, time, fuel };
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
    void this.audio.startMusic('slow');
    this.onChange('start', this.getSnapshot());
  }

  startAgain() {
    this.start();
  }

  returnToTitle() {
    this.audio.stopJet();
    this.audio.stopMusic();
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
      this.audio.stopMusic();
    } else {
      void this.audio.startMusic(this.isMusicUrgent() ? 'fast' : 'slow');
    }
    this.onChange(this.paused ? 'pause' : 'resume', this.getSnapshot());
  }

  startStage(index, silent = false, warpOut = false) {
    this.stageIndex = index;
    this.stage = createStage(index);
    this.player.x = 0;
    this.player.y = 0;
    this.player.vx = this.stage.startVelocity?.x || 0;
    this.player.vy = this.stage.startVelocity?.y || 0;
    this.player.angle = warpOut
      ? -Math.PI * 0.5
      : (this.stage.startVelocity ? Math.atan2(this.player.vy, this.player.vx) : 0);
    this.aimX = -Math.cos(this.player.angle);
    this.aimY = -Math.sin(this.player.angle);
    this.fuel = this.stage.fuelStart;
    this.timeLeft = this.stage.time;
    this.ghostTrail = this.getGhostTrail(index);
    this.bestGhostTrail = this.getBestGhostTrail(index);
    this.currentTrail = [{ x: 0, y: 0, t: 0 }];
    this.stageElapsed = 0;
    this.trailSampleTimer = 0;
    this.stageStarted = Boolean(this.stage.startVelocity);
    this.pathLength = 0;
    this.lastLineRating = null;
    this.failTimer = 0;
    this.clearTimer = 0;
    this.warpOutTimer = warpOut ? (this.wireframeWarpEnabled ? 1.24 : 0.72) : 0;
    this.strandedTimer = 0;
    this.timeWarned = false;
    this.timeCriticalWarned = false;
    this.fuelWarned = false;
    this.fuelCriticalWarned = false;
    this.musicUrgent = false;
    this.thrusting = false;
    this.audio.stopJet();
    this.audio.stopSfx();
    void this.audio.startMusic('slow');
    if (!warpOut) {
      this.warpTravelDir = normalize(this.stage.portal.x, this.stage.portal.y, 0, -1);
    }
    if (warpOut) {
      this.audio.warpOut();
      if (this.wireframeWarpEnabled) this.onFx('warp3dOut');
    }
    if (!silent) {
      const special = this.stage.specialType ? ' · SPECIAL' : '';
      this.onToast(
        'SECTOR ' + String(this.stage.sectorIndex).padStart(2, '0') + ' · ' + this.stage.sectorStage + '/' + this.stage.sectorLength + special,
        this.stage.title + ' · ' + this.stage.hint,
      );
    }
    this.onChange('stage', this.getSnapshot());
  }

  startStageRun() {
    if (
      this.stageStarted ||
      this.state !== 'playing' ||
      this.paused ||
      this.failTimer > 0 ||
      this.clearTimer > 0 ||
      this.warpOutTimer > 0
    ) return false;

    this.stageStarted = true;
    this.onChange('hud', this.getSnapshot());
    return true;
  }

  setNozzle(x, y) {
    const n = normalize(x, y, this.aimX, this.aimY);
    this.aimX = n.x;
    this.aimY = n.y;
    this.startStageRun();
  }

  setThrusting(v) {
    const wantsThrust = Boolean(v);
    if (wantsThrust) this.startStageRun();
    const next = wantsThrust && this.state === 'playing' && !this.paused && this.failTimer <= 0 && this.clearTimer <= 0 && this.warpOutTimer <= 0;
    if (next === this.thrusting) return;
    this.thrusting = next;
    if (next) {
      this.audio.unlock();
      this.audio.startJet();
    } else {
      this.audio.stopJet();
    }
  }

  isMusicUrgent() {
    return this.timeLeft <= 2.5 || this.fuel <= 12;
  }

  syncMusicTempo() {
    const urgent = this.isMusicUrgent();
    if (urgent === this.musicUrgent) return;
    this.musicUrgent = urgent;
    void this.audio.startMusic(urgent ? 'fast' : 'slow');
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
      sectorIndex: this.stage.sectorIndex,
      sectorStage: this.stage.sectorStage,
      sectorLength: this.stage.sectorLength,
      sectorName: this.stage.sectorName,
      specialType: this.stage.specialType,
      stageStarted: this.stageStarted,
      wireframeWarp: this.wireframeWarpEnabled,
    };
  }

  triggerFail(reason) {
    if (this.state !== 'playing' || this.failTimer > 0 || this.clearTimer > 0) return;
    this.saveCurrentGhost();
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
    this.recordTrailPoint(true);
    const rating = this.evaluateLine();
    this.lastLineRating = rating;
    const newBestGhost = this.saveBestGhost(rating);
    this.saveCurrentGhost();
    const velocity = Math.hypot(this.player.vx, this.player.vy);
    this.warpTravelDir = velocity > 20
      ? normalize(this.player.vx, this.player.vy, this.stage.portal.x, this.stage.portal.y)
      : normalize(this.stage.portal.x - this.player.x, this.stage.portal.y - this.player.y, 0, -1);
    const lineBonus = rating.score * 3;
    const sectorBonus = this.stage.sectorFinal ? 500 + this.stage.sectorIndex * 100 : 0;
    const bonus = Math.round(700 + this.timeLeft * 95 + this.fuel * 6 + lineBonus + sectorBonus);
    this.score += bonus;
    this.clearTimer = this.wireframeWarpEnabled ? 1.58 : 1.00;
    this.thrusting = false;
    this.audio.warp();
    this.onFx('clear');
    if (this.wireframeWarpEnabled) this.onFx('warp3dIn');
    this.records.furthest = Math.max(this.records.furthest, this.stageIndex + 2);
    this.records.bestScore = Math.max(this.records.bestScore, this.score);
    this.saveRecords();
    const clearPrefix = this.stage.sectorFinal
      ? 'SECTOR ' + String(this.stage.sectorIndex).padStart(2, '0') + ' CLEAR · '
      : '';
    this.onToast(
      clearPrefix + (newBestGhost ? 'NEW BEST · ' : '') + 'LINE ' + rating.grade,
      'PATH ' + rating.ratio.toFixed(2) + 'x · FUEL ' + Math.round(this.fuel) + '% · +' + bonus,
    );
    this.onChange('hud', this.getSnapshot());
  }

  minePosition(mine) {
    const s = Math.sin(this.stageElapsed * mine.speed + mine.phase) * mine.amp;
    return {
      x: mine.bx + mine.axisX * s,
      y: mine.by + mine.axisY * s,
    };
  }

  laserSegment(laser) {
    const a = laser.angle + this.stageElapsed * laser.speed;
    const dx = Math.cos(a) * laser.len;
    const dy = Math.sin(a) * laser.len;
    return {
      ax: laser.x - dx,
      ay: laser.y - dy,
      bx: laser.x + dx,
      by: laser.y + dy,
    };
  }

  repulsorPulse(repulsor) {
    const phase = ((this.stageElapsed / repulsor.period) + repulsor.phase) % 1;
    if (phase > 0.20) return 0;
    const t = phase / 0.20;
    return Math.pow(1 - t, 1.7);
  }

  phaseGateActive(gate) {
    const phase = ((this.stageElapsed / gate.period) + gate.phase) % 1;
    return phase < gate.activeRatio;
  }

  phaseGateSegment(gate) {
    const dx = Math.cos(gate.angle) * gate.halfLen;
    const dy = Math.sin(gate.angle) * gate.halfLen;
    return { ax: gate.x - dx, ay: gate.y - dy, bx: gate.x + dx, by: gate.y + dy };
  }

  update(dt) {
    if (this.state !== 'playing' || this.paused) return;
    this.globalTime += dt;
    this.hudTimer += dt;

    if (this.clearTimer > 0) {
      this.clearTimer -= dt;
      if (this.clearTimer <= 0) this.startStage(this.stageIndex + 1, false, true);
      return;
    }

    if (this.warpOutTimer > 0) {
      this.warpOutTimer -= dt;
      if (this.warpOutTimer <= 0) {
        this.warpOutTimer = 0;
        if (this.wireframeWarpEnabled) this.onFx('warp3dEnd');
      }
      return;
    }

    if (this.failTimer > 0) {
      this.failTimer -= dt;
      if (this.failTimer <= 0) this.startStage(this.stageIndex, true);
      return;
    }

    if (!this.stageStarted) {
      if (this.hudTimer >= 0.1) {
        this.hudTimer = 0;
        this.onChange('hud', this.getSnapshot());
      }
      return;
    }

    this.stageElapsed += dt;
    this.trailSampleTimer += dt;

    if (this.stage.portalMotion) {
      const motion = this.stage.portalMotion;
      const offset = Math.sin(this.stageElapsed * motion.speed + motion.phase) * motion.amp;
      this.stage.portal.x = motion.baseX + motion.axisX * offset;
      this.stage.portal.y = motion.baseY + motion.axisY * offset;
    }

    this.timeLeft -= dt;
    if (!this.timeWarned && this.timeLeft <= 4) {
      this.timeWarned = true;
      this.audio.warning('time');
      this.onFx('warning');
    }
    if (!this.timeCriticalWarned && this.timeLeft <= 2.5) {
      this.timeCriticalWarned = true;
      this.audio.warning('time');
      this.syncMusicTempo();
      this.onFx('warningCritical');
    }
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
        const nx = dx / d;
        const ny = dy / d;
        const closeness = 1 - d / well.range;
        const pull = (closeness * 0.72 + closeness * closeness * 1.18) * well.strength;
        ax += nx * pull;
        ay += ny * pull;

        const tangentX = -ny;
        const tangentY = nx;
        const tangentialSpeed = Math.abs(p.vx * tangentX + p.vy * tangentY);
        if (!well.slingUsed && d < well.range * 0.60 && tangentialSpeed > 48) {
          const charge = tangentialSpeed * (0.45 + closeness);
          well.slingCharge = Math.max(well.slingCharge || 0, charge);
        }

        if (!well.slingUsed && (well.slingCharge || 0) > 35 && d > well.range * 0.62) {
          const outX = -nx;
          const outY = -ny;
          const outwardSpeed = p.vx * outX + p.vy * outY;
          if (outwardSpeed > 18) {
            const speedNow = Math.max(1, Math.hypot(p.vx, p.vy));
            const boost = 38 + Math.min(74, (well.slingCharge || 0) * 0.34);
            p.vx += p.vx / speedNow * boost;
            p.vy += p.vy / speedNow * boost;
            well.slingUsed = true;
            this.score += Math.round(180 + boost * 2);
            this.audio.pickup();
            this.onFx('pickup');
            this.onToast('GRAVITY SLINGSHOT', '+' + Math.round(boost) + ' VELOCITY');
          }
        }
      }
    }

    for (const wind of this.stage.winds) {
      const d = Math.hypot(p.x - wind.x, p.y - wind.y);
      if (d < wind.range) {
        const falloff = 1 - d / wind.range;
        ax += wind.dx * wind.strength * falloff;
        ay += wind.dy * wind.strength * falloff;
      }
    }

    for (const repulsor of this.stage.repulsors) {
      const dx = p.x - repulsor.x;
      const dy = p.y - repulsor.y;
      const d = Math.hypot(dx, dy);
      const pulse = this.repulsorPulse(repulsor);
      if (pulse > 0 && d < repulsor.range && d > 3) {
        const push = repulsor.strength * pulse * (1 - d / repulsor.range);
        ax += dx / d * push;
        ay += dy / d * push;
      }
    }

    for (const cloud of this.stage.dragClouds) {
      const d = Math.hypot(p.x - cloud.x, p.y - cloud.y);
      if (d < cloud.range) {
        const falloff = 1 - d / cloud.range;
        ax -= p.vx * cloud.drag * falloff;
        ay -= p.vy * cloud.drag * falloff;
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

    if (!this.fuelWarned && this.fuel <= 25) {
      this.fuelWarned = true;
      this.audio.warning('fuel');
      this.onFx('warning');
    }
    if (!this.fuelCriticalWarned && this.fuel <= 12) {
      this.fuelCriticalWarned = true;
      this.audio.warning('fuel');
      this.onFx('warningCritical');
    }
    this.syncMusicTempo();

    p.vx += ax * dt;
    p.vy += ay * dt;
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 420) {
      p.vx = p.vx / speed * 420;
      p.vy = p.vy / speed * 420;
    }
    const prevX = p.x;
    const prevY = p.y;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    this.pathLength += Math.hypot(p.x - prevX, p.y - prevY);
    if (this.trailSampleTimer >= 0.075) {
      this.trailSampleTimer = 0;
      this.recordTrailPoint();
    }

    if (speed > 8) p.angle = Math.atan2(p.vy, p.vx);

    for (const pickup of this.stage.fuels) {
      if (pickup.taken) continue;
      if (Math.hypot(p.x - pickup.x, p.y - pickup.y) <= p.r + pickup.r) {
        pickup.taken = true;
        this.fuel = Math.min(100, this.fuel + pickup.amount);
        this.audio.pickup();
        this.syncMusicTempo();
        this.onFx('pickup');
        this.onToast('FUEL + ' + pickup.amount, Math.round(this.fuel) + '%');
      }
    }

    for (const ring of this.stage.boostRings) {
      if (ring.used) continue;
      if (Math.hypot(p.x - ring.x, p.y - ring.y) <= p.r + ring.r) {
        ring.used = true;
        p.vx += ring.dx * ring.boost;
        p.vy += ring.dy * ring.boost;
        this.audio.pickup();
        this.onFx('pickup');
        this.onToast('BOOST RING', '+' + Math.round(ring.boost) + ' VELOCITY');
      }
    }

    const portalDistance = Math.hypot(p.x - this.stage.portal.x, p.y - this.stage.portal.y);
    if (portalDistance <= this.stage.portalRadius + p.r * 0.35) {
      this.clearStage();
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

    for (const gate of this.stage.phaseGates) {
      if (!this.phaseGateActive(gate)) continue;
      const s = this.phaseGateSegment(gate);
      if (pointSegmentDistance(p.x, p.y, s.ax, s.ay, s.bx, s.by) <= p.r + gate.width * 0.5) {
        this.triggerFail('PHASE GATE');
        return;
      }
    }

    const bounds = this.stage.bounds;
    const outsideMap = (
      p.x < bounds.minX ||
      p.x > bounds.maxX ||
      p.y < bounds.minY ||
      p.y > bounds.maxY
    );
    if (outsideMap && this.fuel <= 0) {
      this.triggerFail('LOST IN SPACE');
      return;
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

  getWarpProjection() {
    if (!this.wireframeWarpEnabled) return null;

    if (this.clearTimer > 0) {
      const duration = 1.58;
      const t = clamp(1 - this.clearTimer / duration, 0, 1);
      const mix = this.smoothWarp(clamp((t - 0.02) / 0.48, 0, 1));
      return { active: true, mix, t, phase: 'in' };
    }

    if (this.warpOutTimer > 0) {
      const duration = 1.24;
      const t = clamp(1 - this.warpOutTimer / duration, 0, 1);
      const mix = 1 - this.smoothWarp(clamp((t - 0.40) / 0.56, 0, 1));
      return { active: true, mix, t, phase: 'out' };
    }

    return null;
  }

  getProjectionForward() {
    const target = normalize(
      this.stage.portal.x - this.player.x,
      this.stage.portal.y - this.player.y,
      0,
      -1,
    );
    const projection = this.getWarpProjection();
    if (projection?.phase !== 'out' || !this.warpTravelDir) return target;

    const blend = this.smoothWarp(clamp((projection.t - 0.26) / 0.48, 0, 1));
    return normalize(
      lerp(this.warpTravelDir.x, target.x, blend),
      lerp(this.warpTravelDir.y, target.y, blend),
      target.x,
      target.y,
    );
  }

  worldToScreen(x, y) {
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const dx = x - this.player.x;
    const dy = y - this.player.y;
    const orthoX = cx + dx;
    const orthoY = cy + dy;
    const projection = this.getWarpProjection();

    if (!projection || projection.mix <= 0.0001) {
      return { x: orthoX, y: orthoY, scale: 1, squash: 1, depth: 0, mix: 0 };
    }

    // The existing 2D stage plane itself becomes an X/Z plane.
    // The route from stage origin to the goal is used as the camera-forward axis.
    const forward = this.getProjectionForward();
    const rightX = -forward.y;
    const rightY = forward.x;
    const lateral = dx * rightX + dy * rightY;
    const along = dx * forward.x + dy * forward.y;

    const minDim = Math.min(this.width, this.height);
    const focal = minDim * 0.58;
    const cameraDepth = minDim * 0.72;
    const cameraHeight = minDim * 0.35;
    const depth = Math.max(minDim * 0.18, cameraDepth + along);
    const perspectiveScale = clamp(focal / depth, 0.10, 2.35);
    const horizonY = this.height * 0.34;
    const perspectiveX = cx + lateral * perspectiveScale;
    const perspectiveY = horizonY + cameraHeight * perspectiveScale;

    const mix = projection.mix;
    return {
      x: lerp(orthoX, perspectiveX, mix),
      y: lerp(orthoY, perspectiveY, mix),
      scale: lerp(1, perspectiveScale, mix),
      squash: lerp(1, 0.56, mix),
      depth,
      mix,
    };
  }

  screenAngleForVector(x, y, vx, vy) {
    const a = this.worldToScreen(x, y);
    const b = this.worldToScreen(x + vx * 24, y + vy * 24);
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  isVisible(x, y, pad = 80) {
    const s = this.worldToScreen(x, y);
    const extra = pad * Math.max(1, s.scale || 1);
    return s.x > -extra && s.x < this.width + extra && s.y > -extra && s.y < this.height + extra;
  }

  drawStarfield(ctx) {
    ctx.fillStyle = '#02050b';
    ctx.fillRect(0, 0, this.width, this.height);
    const cell = 120;
    const projection = this.getWarpProjection();
    const spread = 1 + (projection?.mix || 0) * 1.35;
    const halfW = (this.width * 0.5 + 120) * spread;
    const halfH = (this.height * 0.5 + 120) * spread;
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
          const r = (((h >>> 20) & 3) === 0 ? 1.4 : 0.75) * clamp(s.scale || 1, 0.22, 1.7);
          ctx.globalAlpha = alpha * lerp(1, clamp((s.scale || 1) * 1.15, 0.30, 1), s.mix || 0);
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
    ctx.scale(p.scale || 1, (p.scale || 1) * (p.squash || 1));
    ctx.rotate(this.stageElapsed * 0.7);
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
    ctx.fillStyle = `rgba(60,195,255,${0.10 * (1 - (p.mix || 0) * 0.82)})`;
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
    ctx.scale(p.scale || 1, (p.scale || 1) * (p.squash || 1));
    ctx.rotate(this.stageElapsed * a.spin + a.phase);
    const warpMix = p.mix || 0;
    ctx.fillStyle = `rgba(27,39,53,${1 - warpMix * 0.82})`;
    ctx.strokeStyle = warpMix > 0.02
      ? `rgba(116,220,242,${0.45 + warpMix * 0.50})`
      : '#52677e';
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
    ctx.scale(p.scale || 1, (p.scale || 1) * (p.squash || 1));
    ctx.rotate(-this.stageElapsed * 1.4);
    const warpMix = p.mix || 0;
    ctx.strokeStyle = warpMix > 0.02 ? 'rgba(255,111,151,.94)' : '#ff6d78';
    ctx.fillStyle = `rgba(41,20,27,${1 - warpMix * 0.76})`;
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
    ctx.arc(0, 0, 4 + Math.sin(this.stageElapsed * 5) * 1.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawWell(ctx, well) {
    if (!this.isVisible(well.x, well.y, well.range)) return;
    const p = this.worldToScreen(well.x, well.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale || 1, (p.scale || 1) * (p.squash || 1));
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
    ctx.arc(0, 0, 20 + Math.sin(this.stageElapsed * 2.2) * 3, 0, TAU);
    ctx.stroke();

    if ((well.slingCharge || 0) > 35 || well.slingUsed) {
      ctx.strokeStyle = well.slingUsed ? 'rgba(118,255,173,.42)' : 'rgba(118,236,255,.88)';
      ctx.lineWidth = well.slingUsed ? 1.2 : 2.1;
      ctx.beginPath();
      ctx.arc(0, 0, well.range * 0.58, -0.85, 0.85);
      ctx.stroke();
    }
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
    ctx.lineWidth = laser.width * clamp(((a.scale || 1) + (b.scale || 1)) * 0.5, 0.35, 1.6);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff8595';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 8 * clamp(c.scale || 1, 0.30, 1.8), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawFuel(ctx, pickup) {
    if (pickup.taken || !this.isVisible(pickup.x, pickup.y, 40)) return;
    const p = this.worldToScreen(pickup.x, pickup.y);
    const pulse = 1 + Math.sin(this.stageElapsed * 5 + pickup.x) * 0.08;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(pulse * (p.scale || 1), pulse * (p.scale || 1) * (p.squash || 1));
    ctx.strokeStyle = '#8affbd';
    ctx.fillStyle = `rgba(80,255,160,${0.16 * (1 - (p.mix || 0) * 0.78)})`;
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

  drawGhostPath(ctx, trail, style) {
    if (!trail || trail.length < 2) return;

    ctx.save();
    ctx.lineWidth = style.lineWidth;
    ctx.strokeStyle = style.stroke;
    ctx.setLineDash(style.dash);
    ctx.beginPath();
    for (let i = 0; i < trail.length; i += 1) {
      const p = this.worldToScreen(trail[i].x, trail[i].y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    let ghost = trail[trail.length - 1];
    let ghostAngle = 0;
    for (let i = 1; i < trail.length; i += 1) {
      if (trail[i].t >= this.stageElapsed) {
        const a = trail[i - 1];
        const b = trail[i];
        const span = Math.max(0.001, b.t - a.t);
        const mix = clamp((this.stageElapsed - a.t) / span, 0, 1);
        ghost = { x: lerp(a.x, b.x, mix), y: lerp(a.y, b.y, mix) };
        ghostAngle = Math.atan2(b.y - a.y, b.x - a.x);
        break;
      }
    }

    const s = this.worldToScreen(ghost.x, ghost.y);
    if (s.x > -30 && s.x < this.width + 30 && s.y > -30 && s.y < this.height + 30) {
      ctx.translate(s.x, s.y);
      ctx.scale(s.scale || 1, (s.scale || 1) * (s.squash || 1));
      ghostAngle = this.screenAngleForVector(ghost.x, ghost.y, Math.cos(ghostAngle), Math.sin(ghostAngle));
      ctx.rotate(ghostAngle);
      ctx.fillStyle = style.fill;
      ctx.shadowColor = style.shadow;
      ctx.shadowBlur = style.shadowBlur;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -5);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-6, 5);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.rotate(-ghostAngle);
      ctx.font = '800 7px ui-monospace, monospace';
      ctx.fillStyle = style.labelColor;
      ctx.fillText(style.label, 10, -8);
    }
    ctx.restore();
  }

  drawGhostTrail(ctx) {
    if (this.clearTimer > 0) return;

    this.drawGhostPath(ctx, this.ghostTrail, {
      stroke: 'rgba(108,218,255,.24)',
      fill: 'rgba(153,232,255,.30)',
      shadow: '#5edcff',
      shadowBlur: 8,
      labelColor: 'rgba(133,218,246,.52)',
      label: 'LAST',
      dash: [6, 7],
      lineWidth: 1.45,
    });

    this.drawGhostPath(ctx, this.bestGhostTrail, {
      stroke: 'rgba(244,252,255,.42)',
      fill: 'rgba(245,253,255,.52)',
      shadow: '#ffffff',
      shadowBlur: 11,
      labelColor: 'rgba(245,253,255,.76)',
      label: 'BEST',
      dash: [2, 5],
      lineWidth: 1.8,
    });
  }

  drawWind(ctx, wind) {
    if (!this.isVisible(wind.x, wind.y, wind.range + 30)) return;
    const p = this.worldToScreen(wind.x, wind.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale || 1, (p.scale || 1) * (p.squash || 1));
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, wind.range);
    g.addColorStop(0, 'rgba(55,192,255,.18)');
    g.addColorStop(1, 'rgba(55,192,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, wind.range, 0, TAU);
    ctx.fill();
    ctx.rotate(this.screenAngleForVector(wind.x, wind.y, wind.dx, wind.dy));
    ctx.strokeStyle = 'rgba(115,224,255,.52)';
    ctx.lineWidth = 1.4;
    for (let y = -36; y <= 36; y += 24) {
      const shift = ((this.stageElapsed * 36 + y * 3) % 42) - 21;
      ctx.beginPath();
      ctx.moveTo(-44 + shift, y);
      ctx.lineTo(38 + shift, y);
      ctx.lineTo(28 + shift, y - 5);
      ctx.moveTo(38 + shift, y);
      ctx.lineTo(28 + shift, y + 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawRepulsor(ctx, repulsor) {
    if (!this.isVisible(repulsor.x, repulsor.y, repulsor.range + 20)) return;
    const p = this.worldToScreen(repulsor.x, repulsor.y);
    const pulse = this.repulsorPulse(repulsor);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale || 1, (p.scale || 1) * (p.squash || 1));
    ctx.fillStyle = 'rgba(255,126,183,.14)';
    ctx.strokeStyle = 'rgba(255,119,176,.76)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, TAU);
    ctx.fill();
    ctx.stroke();
    const phase = ((this.stageElapsed / repulsor.period) + repulsor.phase) % 1;
    const ringR = 14 + phase * (repulsor.range - 14);
    ctx.strokeStyle = `rgba(255,126,183,${0.12 + (1 - phase) * 0.55})`;
    ctx.lineWidth = 2 + pulse * 2;
    ctx.beginPath();
    ctx.arc(0, 0, ringR, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawPhaseGate(ctx, gate) {
    const s = this.phaseGateSegment(gate);
    const a = this.worldToScreen(s.ax, s.ay);
    const b = this.worldToScreen(s.bx, s.by);
    const active = this.phaseGateActive(gate);
    ctx.save();
    ctx.strokeStyle = active ? 'rgba(255,82,118,.88)' : 'rgba(104,220,255,.24)';
    ctx.shadowColor = active ? '#ff4269' : '#6fe8ff';
    ctx.shadowBlur = active ? 14 : 5;
    ctx.lineWidth = (active ? gate.width : 2) * clamp(((a.scale || 1) + (b.scale || 1)) * 0.5, 0.35, 1.6);
    if (!active) ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawBoostRing(ctx, ring) {
    if (!this.isVisible(ring.x, ring.y, 60)) return;
    const p = this.worldToScreen(ring.x, ring.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale || 1, (p.scale || 1) * (p.squash || 1));
    ctx.rotate(this.screenAngleForVector(ring.x, ring.y, ring.dx, ring.dy));
    ctx.globalAlpha = ring.used ? 0.22 : 1;
    ctx.strokeStyle = '#76ffad';
    ctx.shadowColor = '#65ffac';
    ctx.shadowBlur = ring.used ? 3 : 12;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, ring.r, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-10, -7);
    ctx.lineTo(11, 0);
    ctx.lineTo(-10, 7);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawDragCloud(ctx, cloud) {
    if (!this.isVisible(cloud.x, cloud.y, cloud.range + 30)) return;
    const p = this.worldToScreen(cloud.x, cloud.y);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.scale || 1, (p.scale || 1) * (p.squash || 1));
    const g = ctx.createRadialGradient(0, 0, 5, 0, 0, cloud.range);
    g.addColorStop(0, 'rgba(126,119,170,.24)');
    g.addColorStop(0.65, 'rgba(73,72,112,.17)');
    g.addColorStop(1, 'rgba(45,45,80,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, cloud.range, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(159,151,207,.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      const a = this.stageElapsed * (0.12 + i * 0.04) + cloud.phase + i * 2.1;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 14, Math.sin(a) * 10, cloud.range * (0.34 + i * 0.13), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawLineRating(ctx) {
    if (!this.lastLineRating || this.clearTimer <= 0) return;
    const r = this.lastLineRating;
    const duration = this.wireframeWarpEnabled ? 1.58 : 1.0;
    const t = clamp(1 - this.clearTimer / duration, 0, 1);
    const alpha = clamp(Math.min(t * 5, (1 - t) * 6 + 0.25), 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.shadowColor = '#69e2ff';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#e9fbff';
    ctx.font = '900 30px ui-monospace, monospace';
    ctx.fillText('LINE ' + r.grade, this.width * 0.5, this.height * 0.72);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(174,225,241,.85)';
    ctx.font = '800 10px ui-monospace, monospace';
    ctx.fillText('PATH ' + r.ratio.toFixed(2) + 'x · SCORE ' + r.score, this.width * 0.5, this.height * 0.72 + 18);
    ctx.restore();
  }

  drawPlayer(ctx) {
    const p = this.player;
    const projected = this.worldToScreen(p.x, p.y);
    let cx = projected.x;
    let cy = projected.y;
    let shipScale = clamp(projected.scale || 1, 0.20, 2.0);
    const warpProjection = this.getWarpProjection();

    if (warpProjection?.phase === 'in') {
      const travel = this.smoothWarp(clamp((warpProjection.t - 0.36) / 0.44, 0, 1));
      cx = lerp(cx, this.width * 0.5, travel * 0.34);
      cy = lerp(cy, this.height * 0.34, travel);
      shipScale *= 1 - travel * 0.90;
    } else if (warpProjection?.phase === 'out') {
      const emerge = this.smoothWarp(clamp((warpProjection.t - 0.26) / 0.42, 0, 1));
      cx = lerp(this.width * 0.5, cx, emerge);
      cy = lerp(this.height * 0.34, cy, emerge);
      shipScale *= 0.10 + emerge * 0.90;
    }

    const nozzleAngle = this.screenAngleForVector(p.x, p.y, this.aimX, this.aimY);
    const shipAngle = this.screenAngleForVector(p.x, p.y, Math.cos(p.angle), Math.sin(p.angle));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(shipScale, shipScale);

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
    ctx.rotate(shipAngle);
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

    const readyPulse = 0.55 + Math.sin(this.globalTime * 8.5) * 0.18;
    ctx.shadowColor = '#75dfff';
    ctx.shadowBlur = this.thrusting ? 14 : 8;

    ctx.fillStyle = '#132330';
    ctx.strokeStyle = '#9eddf5';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(7, -5);
    ctx.lineTo(14, -8);
    ctx.lineTo(19, -5);
    ctx.lineTo(19, 5);
    ctx.lineTo(14, 8);
    ctx.lineTo(7, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = this.thrusting
      ? 'rgba(225,251,255,.95)'
      : `rgba(115,220,255,${readyPulse})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(18, -4);
    ctx.lineTo(22, 0);
    ctx.lineTo(18, 4);
    ctx.stroke();

    if (!this.thrusting && this.fuel > 0) {
      const flicker = 8 + Math.sin(this.globalTime * 13) * 2;
      const preview = ctx.createLinearGradient(20, 0, 20 + flicker + 11, 0);
      preview.addColorStop(0, `rgba(206,249,255,${0.36 + readyPulse * 0.18})`);
      preview.addColorStop(0.28, `rgba(82,210,255,${0.28 + readyPulse * 0.14})`);
      preview.addColorStop(1, 'rgba(82,210,255,0)');
      ctx.fillStyle = preview;
      ctx.beginPath();
      ctx.moveTo(20, -3.6);
      ctx.lineTo(20 + flicker + 11, 0);
      ctx.lineTo(20, 3.6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = `rgba(255,218,128,${0.40 + readyPulse * 0.22})`;
      ctx.beginPath();
      ctx.arc(21.5, 0, 1.6, 0, TAU);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();

    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 10) {
      const dx = p.vx / speed;
      const dy = p.vy / speed;
      const trailAngle = this.screenAngleForVector(p.x, p.y, dx, dy);
      const trailLen = clamp(speed * 0.18, 20, 70);
      ctx.strokeStyle = 'rgba(118,213,255,.45)';
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(trailAngle) * trailLen, Math.sin(trailAngle) * trailLen);
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
    for (const gate of this.stage.phaseGates) {
      const p = toMini(gate.x, gate.y);
      ctx.fillStyle = this.phaseGateActive(gate) ? '#ff657d' : '#67dfff';
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    for (const ring of this.stage.boostRings) {
      if (ring.used) continue;
      const p = toMini(ring.x, ring.y);
      ctx.strokeStyle = '#76ffad';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.8, 0, TAU);
      ctx.stroke();
    }

    const portal = toMini(this.stage.portal.x, this.stage.portal.y);
    ctx.strokeStyle = '#77e9ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(portal.x, portal.y, 4, 0, TAU);
    ctx.stroke();

    const meRaw = toMini(this.player.x, this.player.y);
    const me = {
      x: clamp(meRaw.x, x + 3, x + w - 3),
      y: clamp(meRaw.y, y + 3, y + h - 3),
    };
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

  drawProjectedWorldGrid(ctx) {
    const projection = this.getWarpProjection();
    if (!projection || projection.mix <= 0.02) return;

    const forward = this.getProjectionForward();
    const right = { x: -forward.y, y: forward.x };
    const alpha = 0.04 + projection.mix * 0.22;
    const centerX = this.player.x;
    const centerY = this.player.y;

    ctx.save();
    ctx.strokeStyle = `rgba(92,211,242,${alpha})`;
    ctx.lineWidth = 1;

    for (let i = -5; i <= 5; i += 1) {
      const lx = right.x * i * 90;
      const ly = right.y * i * 90;
      const a = this.worldToScreen(centerX + lx - forward.x * 260, centerY + ly - forward.y * 260);
      const b = this.worldToScreen(centerX + lx + forward.x * 900, centerY + ly + forward.y * 900);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (let i = -3; i <= 10; i += 1) {
      const fx = forward.x * i * 90;
      const fy = forward.y * i * 90;
      const a = this.worldToScreen(centerX + fx - right.x * 520, centerY + fy - right.y * 520);
      const b = this.worldToScreen(centerX + fx + right.x * 520, centerY + fy + right.y * 520);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawWorld(ctx) {
    this.drawProjectedWorldGrid(ctx);
    for (const cloud of this.stage.dragClouds) this.drawDragCloud(ctx, cloud);
    for (const wind of this.stage.winds) this.drawWind(ctx, wind);
    this.drawGhostTrail(ctx);
    for (const well of this.stage.wells) this.drawWell(ctx, well);
    for (const repulsor of this.stage.repulsors) this.drawRepulsor(ctx, repulsor);
    for (const gate of this.stage.phaseGates) this.drawPhaseGate(ctx, gate);
    for (const ring of this.stage.boostRings) this.drawBoostRing(ctx, ring);
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

  smoothWarp(t) {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  }

  getHyperspaceAmount(progress, outgoing = false) {
    const t = clamp(progress, 0, 1);
    if (!outgoing) {
      return this.smoothWarp(clamp((t - 0.44) / 0.42, 0, 1));
    }
    return 1 - this.smoothWarp(clamp((t - 0.18) / 0.48, 0, 1));
  }

  drawHyperspace3D(ctx, progress, outgoing = false) {
    const amount = this.getHyperspaceAmount(progress, outgoing);
    if (amount <= 0.001) return;

    const cx = this.width * 0.5;
    const cy = this.height * 0.34;
    const diag = Math.hypot(this.width, this.height);
    const timeDrive = outgoing
      ? (1 - progress) * 2.2
      : progress * 2.6;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // As the jump engages, the projected stage dims rather than being replaced.
    const veil = clamp((amount - 0.12) / 0.88, 0, 1);
    if (veil > 0) {
      ctx.fillStyle = `rgba(0,4,10,${veil * 0.72})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Deterministic stars represented as 3D points flying past the camera.
    // Their previous/current depth positions project into streaks, creating a forward-jump feel.
    const starCount = 92;
    for (let i = 0; i < starCount; i += 1) {
      const seedA = ((i * 73 + 19) % 211) / 211;
      const seedB = ((i * 131 + 47) % 223) / 223;
      const seedC = ((i * 197 + 61) % 227) / 227;

      const angle = seedA * TAU;
      const spread = 0.12 + seedB * 1.06;
      const radius = spread * diag * 0.52;
      const baseX = Math.cos(angle) * radius;
      const baseY = Math.sin(angle) * radius * 0.72;

      const cycle = (seedC + timeDrive * (0.52 + seedB * 0.42)) % 1;
      const zNow = 0.10 + cycle * 0.90;
      const speed = 0.10 + amount * (0.40 + seedA * 0.42);
      const zPrev = clamp(zNow + speed, 0.12, 1.34);

      const perspectiveNow = 1 / Math.max(0.08, zNow);
      const perspectivePrev = 1 / Math.max(0.08, zPrev);
      const x2 = cx + baseX * perspectiveNow * 0.28;
      const y2 = cy + baseY * perspectiveNow * 0.28;
      const x1 = cx + baseX * perspectivePrev * 0.28;
      const y1 = cy + baseY * perspectivePrev * 0.28;

      const streak = amount * (0.35 + seedB * 0.80);
      const ex = lerp(x1, x2, streak);
      const ey = lerp(y1, y2, streak);
      const alpha = clamp(0.18 + amount * 0.78 - seedC * 0.10, 0, 0.94);

      ctx.strokeStyle = `rgba(220,246,255,${alpha})`;
      ctx.lineWidth = 0.65 + amount * 1.65 + seedB * 0.8;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      if (amount < 0.30) {
        ctx.fillStyle = `rgba(238,252,255,${0.32 + (1 - amount) * 0.45})`;
        ctx.beginPath();
        ctx.arc(x2, y2, 0.7 + seedA * 0.8, 0, TAU);
        ctx.fill();
      }
    }

    // A subtle central bloom communicates entry/exit velocity without hiding the projection.
    const bloomR = 18 + amount * Math.min(this.width, this.height) * 0.20;
    const bloom = ctx.createRadialGradient(cx, cy, 0, cx, cy, bloomR);
    bloom.addColorStop(0, `rgba(224,249,255,${amount * 0.34})`);
    bloom.addColorStop(0.18, `rgba(91,199,255,${amount * 0.18})`);
    bloom.addColorStop(1, 'rgba(40,130,255,0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(cx, cy, bloomR, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  drawProjectedWarpFlash(ctx, progress, outgoing = false) {
    const t = clamp(progress, 0, 1);
    const projection = this.getWarpProjection();
    const mix = projection?.mix || 0;

    if (mix > 0.02) {
      ctx.save();
      ctx.fillStyle = `rgba(0,5,11,${mix * 0.08})`;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    this.drawHyperspace3D(ctx, t, outgoing);

    const flash = outgoing
      ? clamp((0.10 - t) / 0.10, 0, 1)
      : clamp((t - 0.93) / 0.07, 0, 1);
    if (flash <= 0) return;
    ctx.save();
    ctx.fillStyle = `rgba(236,252,255,${flash * 0.92})`;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.restore();
  }

  drawWarpEffect(ctx) {
    if (this.clearTimer <= 0) return;
    if (this.wireframeWarpEnabled) {
      const duration = 1.58;
      const t = clamp(1 - this.clearTimer / duration, 0, 1);
      this.drawProjectedWarpFlash(ctx, t, false);
      return;
    }
    const duration = 1.0;
    const t = clamp(1 - this.clearTimer / duration, 0, 1);
    const portal = this.worldToScreen(this.stage.portal.x, this.stage.portal.y);
    const cx = portal.x;
    const cy = portal.y;
    const diag = Math.hypot(this.width, this.height);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, diag * 0.62);
    bg.addColorStop(0, `rgba(180,236,255,${0.10 + t * 0.18})`);
    bg.addColorStop(0.28, `rgba(57,139,221,${0.08 + t * 0.16})`);
    bg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);

    const count = 74;
    const stretch = 26 + t * t * 360;
    const spread = 18 + t * 34;
    for (let i = 0; i < count; i += 1) {
      const a = ((i * 137.508) % 360) * Math.PI / 180;
      const seed = ((i * 47) % 97) / 97;
      const base = 20 + seed * diag * 0.44;
      const startR = base + t * spread * seed;
      const endR = startR + stretch * (0.35 + seed * 0.95);
      const x1 = cx + Math.cos(a) * startR;
      const y1 = cy + Math.sin(a) * startR;
      const x2 = cx + Math.cos(a) * endR;
      const y2 = cy + Math.sin(a) * endR;
      const alpha = clamp(0.16 + t * 0.72 - seed * 0.10, 0, 0.92);
      ctx.strokeStyle = `rgba(${205 + Math.floor(seed * 40)},${232 + Math.floor(seed * 20)},255,${alpha})`;
      ctx.lineWidth = 0.7 + seed * 1.8 + t * 1.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    if (t > 0.18) {
      const tunnelT = clamp((t - 0.18) / 0.52, 0, 1);
      const r = 12 + tunnelT * Math.min(this.width, this.height) * 0.38;
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      core.addColorStop(0, `rgba(245,253,255,${0.34 + tunnelT * 0.30})`);
      core.addColorStop(0.12, `rgba(115,214,255,${0.22 + tunnelT * 0.20})`);
      core.addColorStop(1, 'rgba(70,170,255,0)');
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TAU);
      ctx.fill();
    }

    const flash = clamp((t - 0.76) / 0.24, 0, 1);
    if (flash > 0) {
      ctx.fillStyle = `rgba(232,250,255,${flash * 0.90})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    ctx.restore();
  }

  drawWarpOutEffect(ctx) {
    if (this.warpOutTimer <= 0) return;
    if (this.wireframeWarpEnabled) {
      const duration = 1.24;
      const t = clamp(1 - this.warpOutTimer / duration, 0, 1);
      this.drawProjectedWarpFlash(ctx, t, true);
      return;
    }
    const duration = 0.72;
    const t = clamp(1 - this.warpOutTimer / duration, 0, 1);
    const cx = this.width * 0.5;
    const cy = this.height * 0.5;
    const diag = Math.hypot(this.width, this.height);
    const collapse = 1 - t;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const flash = clamp(1 - t * 2.8, 0, 1);
    if (flash > 0) {
      ctx.fillStyle = `rgba(231,250,255,${flash * 0.82})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    const count = 70;
    for (let i = 0; i < count; i += 1) {
      const a = ((i * 137.508) % 360) * Math.PI / 180;
      const seed = ((i * 53) % 101) / 101;
      const outer = 42 + seed * diag * 0.46;
      const len = (70 + seed * 250) * collapse;
      const inner = 14 + seed * 34 + t * outer * 0.72;
      const x1 = cx + Math.cos(a) * inner;
      const y1 = cy + Math.sin(a) * inner;
      const x2 = cx + Math.cos(a) * (inner + len);
      const y2 = cy + Math.sin(a) * (inner + len);
      ctx.strokeStyle = `rgba(205,239,255,${clamp(0.18 + collapse * 0.68, 0, 0.9)})`;
      ctx.lineWidth = 0.8 + seed * 1.5 + collapse * 1.4;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    const r = 10 + collapse * Math.min(this.width, this.height) * 0.33;
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    core.addColorStop(0, `rgba(245,253,255,${0.44 * collapse})`);
    core.addColorStop(0.2, `rgba(96,211,255,${0.28 * collapse})`);
    core.addColorStop(1, 'rgba(65,170,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();

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

    ctx.restore();
  }

  drawSpecialStageAtmosphere(ctx) {
    const type = this.stage?.specialType;
    if (!type || this.failTimer > 0 || this.clearTimer > 0 || this.warpOutTimer > 0 || this.state !== 'playing') return;

    const t = this.stageElapsed;
    const pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
    const w = this.width;
    const h = this.height;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    if (type === 'VELOCITY_ENTRY') {
      const speed = Math.hypot(this.player.vx, this.player.vy);
      const strength = clamp((speed - 180) / 180, 0.25, 1);
      const cx = w * 0.5;
      const cy = h * 0.5;
      const diag = Math.hypot(w, h);
      ctx.strokeStyle = `rgba(116,226,255,${0.10 + strength * 0.22})`;
      ctx.lineWidth = 1 + strength * 1.2;
      for (let i = 0; i < 30; i += 1) {
        const a = ((i * 137.508) % 360) * Math.PI / 180;
        const seed = ((i * 43) % 101) / 101;
        const phase = (t * (0.8 + seed * 0.7) + seed) % 1;
        const r1 = 50 + phase * diag * 0.44;
        const len = 18 + strength * (45 + seed * 85);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * (r1 + len), cy + Math.sin(a) * (r1 + len));
        ctx.stroke();
      }
    } else if (type === 'SLINGSHOT_ARC') {
      ctx.strokeStyle = `rgba(179,122,255,${0.11 + pulse * 0.09})`;
      ctx.lineWidth = 1.4;
      const cx = w * 0.5;
      const cy = h * 0.54;
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.arc(cx, cy, 72 + i * 56 + pulse * 6, -0.92, 0.92);
        ctx.stroke();
      }
    } else if (type === 'MOVING_WARP') {
      ctx.strokeStyle = `rgba(92,229,255,${0.08 + pulse * 0.06})`;
      ctx.lineWidth = 1;
      const shift = (t * 80) % 36;
      for (let y = -36 + shift; y < h + 36; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (type === 'LASER_CORRIDOR') {
      const alpha = 0.10 + pulse * 0.08;
      const edge = Math.min(44, w * 0.07);
      const left = ctx.createLinearGradient(0, 0, edge, 0);
      left.addColorStop(0, `rgba(255,48,81,${alpha})`);
      left.addColorStop(1, 'rgba(255,48,81,0)');
      ctx.fillStyle = left;
      ctx.fillRect(0, 0, edge, h);
      const right = ctx.createLinearGradient(w, 0, w - edge, 0);
      right.addColorStop(0, `rgba(255,48,81,${alpha})`);
      right.addColorStop(1, 'rgba(255,48,81,0)');
      ctx.fillStyle = right;
      ctx.fillRect(w - edge, 0, edge, h);
    }

    ctx.restore();

    // Common special-stage frame.
    ctx.save();
    ctx.strokeStyle = type === 'LASER_CORRIDOR'
      ? 'rgba(255,82,110,.28)'
      : type === 'SLINGSHOT_ARC'
        ? 'rgba(182,130,255,.24)'
        : 'rgba(103,223,255,.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(5.5, 5.5, w - 11, h - 11);
    ctx.restore();
  }

  drawCrisisOverlay(ctx) {
    if (this.failTimer > 0 || this.clearTimer > 0 || this.state !== 'playing') return;

    const timeDanger = this.timeLeft <= 4;
    const timeCritical = this.timeLeft <= 2.5;
    const fuelDanger = this.fuel <= 25;
    const fuelCritical = this.fuel <= 12;
    if (!timeDanger && !fuelDanger) return;

    const fast = timeCritical || fuelCritical;
    const pulse = 0.5 + 0.5 * Math.sin(this.globalTime * (fast ? 11 : 6));
    ctx.save();

    if (timeDanger) {
      const alpha = (timeCritical ? 0.14 : 0.06) + pulse * (timeCritical ? 0.10 : 0.035);
      const vignette = ctx.createRadialGradient(
        this.width * 0.5, this.height * 0.5, Math.min(this.width, this.height) * 0.20,
        this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height) * 0.70
      );
      vignette.addColorStop(0, 'rgba(255,42,62,0)');
      vignette.addColorStop(1, `rgba(255,38,58,${alpha})`);
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, this.width, this.height);

      ctx.textAlign = 'center';
      ctx.font = `900 ${timeCritical ? 31 : 21}px ui-monospace, monospace`;
      ctx.fillStyle = timeCritical
        ? `rgba(255,248,249,${0.78 + pulse * 0.22})`
        : `rgba(255,210,153,${0.72 + pulse * 0.18})`;
      ctx.shadowColor = timeCritical ? '#ff344f' : '#ff9e42';
      ctx.shadowBlur = timeCritical ? 20 : 10;
      ctx.fillText(`TIME ${Math.max(0, this.timeLeft).toFixed(1)}`, this.width * 0.5, 45);
      ctx.shadowBlur = 0;
    }

    if (fuelDanger) {
      const y = this.height - 53;
      ctx.textAlign = 'center';
      ctx.font = `900 ${fuelCritical ? 25 : 18}px ui-monospace, monospace`;
      ctx.fillStyle = fuelCritical
        ? `rgba(255,246,236,${0.75 + pulse * 0.25})`
        : `rgba(255,198,118,${0.68 + pulse * 0.18})`;
      ctx.shadowColor = '#ff6f3f';
      ctx.shadowBlur = fuelCritical ? 18 : 10;
      ctx.fillText(fuelCritical ? 'FUEL CRITICAL' : 'FUEL LOW', this.width * 0.5, y);
      ctx.shadowBlur = 0;

      const bandAlpha = (fuelCritical ? 0.09 : 0.04) + pulse * (fuelCritical ? 0.07 : 0.025);
      const g = ctx.createLinearGradient(0, this.height, 0, this.height * 0.56);
      g.addColorStop(0, `rgba(255,86,42,${bandAlpha})`);
      g.addColorStop(1, 'rgba(255,86,42,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, this.height * 0.54, this.width, this.height * 0.46);
    }

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
      if (this.wireframeWarpEnabled) {
        this.drawPlayer(ctx);
      } else if (this.clearTimer > 0) {
        const t = clamp(1 - this.clearTimer / 1.0, 0, 1);
        const suction = 1 - Math.pow(1 - clamp(t / 0.72, 0, 1), 3);
        const portal = this.worldToScreen(this.stage.portal.x, this.stage.portal.y);
        const startX = this.width * 0.5;
        const startY = this.height * 0.5;
        const shipX = lerp(startX, portal.x, suction);
        const shipY = lerp(startY, portal.y, suction);
        const shrink = 1 - clamp((t - 0.12) / 0.76, 0, 1) * 0.86;
        ctx.save();
        ctx.globalAlpha = clamp(1 - Math.max(0, t - 0.72) / 0.28, 0, 1);
        ctx.translate(shipX, shipY);
        ctx.rotate((t * t) * TAU * 2.35);
        ctx.scale(shrink, shrink);
        ctx.translate(-startX, -startY);
        this.drawPlayer(ctx);
        ctx.restore();
      } else if (this.warpOutTimer > 0) {
        const t = clamp(1 - this.warpOutTimer / 0.72, 0, 1);
        const emerge = 1 - Math.pow(1 - t, 3);
        const cx = this.width * 0.5;
        const cy = this.height * 0.5;
        const scale = 0.10 + emerge * 0.90;
        ctx.save();
        ctx.globalAlpha = clamp(t * 2.2, 0, 1);
        ctx.translate(cx, cy);
        ctx.rotate((1 - emerge) * TAU * 2.1);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        this.drawPlayer(ctx);
        ctx.restore();
      } else {
        this.drawPlayer(ctx);
      }
    }
    if (this.clearTimer <= 0 && this.warpOutTimer <= 0) {
      this.drawSpecialStageAtmosphere(ctx);
      this.drawDirectionCue(ctx);
      this.drawMinimap(ctx);
      this.drawCrisisOverlay(ctx);
    }
    this.drawWarpOutEffect(ctx);
    this.drawExplosionEffect(ctx);
    this.drawWarpEffect(ctx);
    this.drawLineRating(ctx);
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