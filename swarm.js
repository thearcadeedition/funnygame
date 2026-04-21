// swarm.js - Number swarm army

const NEON_COLORS = [
  '#ff2d78','#00f5ff','#aaff00','#ff9500','#bf5fff',
  '#ff4444','#44ffaa','#ffdd00','#ff6ec7','#00cfff'
];

const NUMBER_SEQUENCE = [
  41,
  67,69,74,88,101,133,187,256,314,
  420,444,500,512,600,666,700,727,777,808,
  888,900,911,999,1001,1111,1234,1337,1444,1600,
  1776,1888,1999,2024,2222,2345,2500,2666,3000,3333,
  4040,4444,5000,5555,6000,6666,7000,7777,8888,9999
];

const PHASE_INFO = [
  { start:0,  end:9,  name:'STARTER',               color:'#00f5ff' },
  { start:10, end:19, name:'🟡 MEME POWER ZONE',     color:'#ffdd00' },
  { start:20, end:29, name:'🟠 INTERNET CHAOS',      color:'#ff9500' },
  { start:30, end:39, name:'🔴 BRAINROT BREAKING',   color:'#ff2d78' },
  { start:40, end:49, name:'⚫ ABSURD POWER ZONE',   color:'#bf5fff' },
];

function getPhase(idx) {
  return PHASE_INFO.find(p => idx >= p.start && idx <= p.end) || PHASE_INFO[0];
}

class NumberUnit {
  constructor(value, x, y) {
    this.value  = value;
    this.x      = x;
    this.y      = y;
    this.targetX = x;
    this.targetY = y;
    this.vx = 0; this.vy = 0;
    this.color  = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
    this.bob    = Math.random() * Math.PI * 2;
    this.bobSpd = 0.05 + Math.random() * 0.02;
    this.eyeState = 'normal';
    this.eyeTimer = 0;
    this.glow   = 1;
    this.scale  = 1;
    this.scaleTgt = 1;
  }

  update(dt) {
    this.bob += this.bobSpd;
    this.scale += (this.scaleTgt - this.scale) * 0.15;
    if (this.eyeTimer > 0) { this.eyeTimer -= dt; if (this.eyeTimer <= 0) this.eyeState = 'normal'; }
    this.glow = 0.8 + 0.2 * Math.sin(this.bob * 1.5);

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    this.vx = (this.vx + dx * 0.22) * 0.70;
    this.vy = (this.vy + dy * 0.22) * 0.70;
    this.x += this.vx;
    this.y += this.vy;
  }

  setEyeState(s) { this.eyeState = s; this.eyeTimer = 1200; }
}

class Swarm {
  constructor(canvas, startValue) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.totalValue = startValue || NUMBER_SEQUENCE[0];
    this.units   = [];
    this.cx      = canvas.width  / 2;
    this.cy      = canvas.height * 0.70;
    // STICKY lane — never auto-returns
    this.lane    = 0;   // target: -1, 0, 1
    this.laneSmooth = 0;
    this.shakeX  = 0;
    this.shakeY  = 0;
    this.spawnUnits(4);
  }

  // Pure grid — no randomness in positions, so nothing overlaps
  gridPos(i, total) {
    const cols = Math.max(1, Math.ceil(Math.sqrt(total * 1.5)));
    const col  = i % cols;
    const row  = Math.floor(i / cols);
    const rows = Math.ceil(total / cols);
    const gapX = 52, gapY = 46;
    const offX = -(cols - 1) * gapX / 2;
    const offY = -(rows - 1) * gapY / 2;
    return { x: offX + col * gapX, y: offY + row * gapY };
  }

  spawnUnits(count) {
    for (let i = 0; i < count; i++) {
      const p = this.gridPos(i, count);
      const u = new NumberUnit(this.totalValue, this.cx + p.x, this.cy + p.y);
      u.scale = 0.05; u.scaleTgt = 1;
      this.units.push(u);
    }
  }

  applyGate(gate) {
    let v = this.totalValue;
    if      (gate.op === 'multiply') v = Math.floor(v * gate.value);
    else if (gate.op === 'add')      v = v + gate.value;
    else if (gate.op === 'divide')   v = Math.max(1, Math.floor(v / gate.value));
    else if (gate.op === 'subtract') v = Math.max(1, v - gate.value);

    const ratio = v / this.totalValue;
    this.totalValue = v;

    const tgt = Math.min(28, Math.max(1, Math.round(this.units.length * ratio)));
    this.resizeUnits(tgt);

    const eye = gate.type === 'good' ? 'happy' : 'panic';
    this.units.forEach(u => {
      u.setEyeState(eye);
      u.scaleTgt = gate.type === 'good' ? 1.4 : 0.6;
      setTimeout(() => { u.scaleTgt = 1; }, 380);
    });
    return gate.type === 'good';
  }

  resizeUnits(target) {
    while (this.units.length < target) {
      const src = this.units[Math.floor(Math.random() * this.units.length)];
      const u = new NumberUnit(this.totalValue, src.x, src.y);
      u.scale = 0.05; u.scaleTgt = 1;
      this.units.push(u);
    }
    if (this.units.length > target) this.units.length = target;
    this.units.forEach(u => { u.value = this.totalValue; });
  }

  update(dt) {
    // Smooth toward sticky lane — no auto-return
    this.laneSmooth += (this.lane * 80 - this.laneSmooth) * 0.11;
    this.shakeX *= 0.80;
    this.shakeY *= 0.80;

    const n = this.units.length;
    this.units.forEach((u, i) => {
      const p = this.gridPos(i, n);
      u.targetX = this.cx + this.laneSmooth + p.x;
      u.targetY = this.cy + p.y + Math.sin(u.bob) * 5;
      u.update(dt);
    });
  }

  shake(v) {
    this.shakeX = (Math.random() - 0.5) * v;
    this.shakeY = (Math.random() - 0.5) * v;
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(this.shakeX), Math.round(this.shakeY));
    this.units.forEach(u => this.drawUnit(u));
    ctx.restore();
  }

  drawUnit(u) {
    const ctx = this.ctx;
    const s = 30 * u.scale;
    if (s < 1.5) return;
    ctx.save();
    ctx.translate(u.x, u.y);

    const txt = formatNumber(u.value);
    ctx.font = `bold ${s}px 'Orbitron', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 3D shadow extrude
    ctx.shadowBlur = 0;
    for (let d = 3; d >= 1; d--) {
      ctx.fillStyle = shadeColor(u.color, -55);
      ctx.fillText(txt, d, d);
    }
    // Main glow text
    ctx.shadowColor = u.color;
    ctx.shadowBlur  = 12 * u.glow;
    ctx.fillStyle   = u.color;
    ctx.fillText(txt, 0, 0);
    // White highlight
    ctx.shadowBlur  = 0;
    ctx.fillStyle   = 'rgba(255,255,255,0.20)';
    ctx.fillText(txt, -1, -1.5);

    this.drawEyes(u, s);
    ctx.restore();
  }

  drawEyes(u, s) {
    const ctx = this.ctx;
    const er  = s * 0.20;
    const eyY = -s * 0.50;
    const eyX = s * 0.24;

    [-1, 1].forEach(side => {
      const ox = side * eyX;
      ctx.shadowBlur = 0;
      // white
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.ellipse(ox, eyY, er, er * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // pupil offset
      let px = 0, py = 0;
      if (u.eyeState === 'happy') py = er * 0.2;
      if (u.eyeState === 'panic') { px = side * er * 0.3; py = -er * 0.35; }
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.ellipse(ox+px, eyY+py, er*0.48, er*0.52, 0, 0, Math.PI*2);
      ctx.fill();
      // shine
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.ellipse(ox+px-er*0.14, eyY+py-er*0.18, er*0.13, er*0.10, 0, 0, Math.PI*2);
      ctx.fill();
    });
  }
}

function formatNumber(n) {
  if (n >= 1e12) return (n/1e12).toFixed(1)+'T';
  if (n >= 1e9)  return (n/1e9).toFixed(1)+'B';
  if (n >= 1e6)  return (n/1e6).toFixed(1)+'M';
  if (n >= 1e4)  return (n/1e3).toFixed(0)+'K';
  return Math.floor(n).toString();
}

function shadeColor(hex, amt) {
  let r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  r=Math.max(0,Math.min(255,r+amt)); g=Math.max(0,Math.min(255,g+amt)); b=Math.max(0,Math.min(255,b+amt));
  return `rgb(${r},${g},${b})`;
}
