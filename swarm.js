// swarm.js - Manages the number swarm army

const NEON_COLORS = [
  '#ff2d78', '#00f5ff', '#aaff00', '#ff9500', '#bf5fff',
  '#ff4444', '#44ffaa', '#ffdd00', '#ff6ec7', '#00cfff'
];

class NumberUnit {
  constructor(value, x, y) {
    this.value = value;
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.vx = 0;
    this.vy = 0;
    this.color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
    this.size = this.calcSize();
    this.bobOffset = Math.random() * Math.PI * 2;
    this.bobSpeed = 0.04 + Math.random() * 0.02;
    this.eyeState = 'normal'; // normal, happy, panic
    this.eyeTimer = 0;
    this.glowIntensity = 1;
    this.scale = 1;
    this.scaleTarget = 1;
    this.rotation = (Math.random() - 0.5) * 0.3;
    this.rotationTarget = this.rotation;
    this.depth = 0.5 + Math.random() * 0.5; // fake 3D depth
    this.trail = [];
  }

  calcSize() {
    const val = Math.abs(this.value);
    if (val < 100) return 38;
    if (val < 1000) return 34;
    if (val < 10000) return 28;
    return 24;
  }

  update(dt, swarmCenterX) {
    // Bob animation
    this.bobOffset += this.bobSpeed;

    // Smooth scale
    this.scale += (this.scaleTarget - this.scale) * 0.15;

    // Smooth rotation
    this.rotation += (this.rotationTarget - this.rotation) * 0.1;

    // Eye timer
    if (this.eyeTimer > 0) {
      this.eyeTimer -= dt;
      if (this.eyeTimer <= 0) this.eyeState = 'normal';
    }

    // Glow pulse
    this.glowIntensity = 0.8 + 0.2 * Math.sin(this.bobOffset * 1.5);

    // Store trail
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 6) this.trail.pop();

    // Spring toward target
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    this.vx = (this.vx + dx * 0.18) * 0.78;
    this.vy = (this.vy + dy * 0.18) * 0.78;
    this.x += this.vx;
    this.y += this.vy;
  }

  setEyeState(state) {
    this.eyeState = state;
    this.eyeTimer = 1200;
  }

  getDisplayValue() {
    return formatNumber(this.value);
  }
}

class Swarm {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.totalValue = 41;
    this.units = [];
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height * 0.72;
    this.laneOffset = 0; // -1 left, 0 center, 1 right
    this.laneOffsetSmooth = 0;
    this.spawnUnits(3);
    this.shakeX = 0;
    this.shakeY = 0;
  }

  spawnUnits(count) {
    const spread = Math.min(count * 18, 140);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = (spread / 2) * Math.sqrt(Math.random());
      const x = this.centerX + Math.cos(angle) * r;
      const y = this.centerY + Math.sin(angle) * r * 0.45;
      this.units.push(new NumberUnit(this.totalValue, x, y));
    }
  }

  applyGate(gate) {
    let newValue = this.totalValue;
    let isGood = gate.type === 'good';

    if (gate.op === 'multiply') {
      newValue = Math.floor(this.totalValue * gate.value);
    } else if (gate.op === 'add') {
      newValue = this.totalValue + gate.value;
    } else if (gate.op === 'divide') {
      newValue = Math.max(1, Math.floor(this.totalValue / gate.value));
    } else if (gate.op === 'subtract') {
      newValue = Math.max(1, this.totalValue - gate.value);
    }

    const ratio = newValue / this.totalValue;
    this.totalValue = newValue;

    // Determine new unit count (visual representation, max 40 for perf)
    const targetCount = Math.min(40, Math.max(1, Math.round(this.units.length * ratio)));
    this.adjustUnits(targetCount, isGood);

    // React all units
    const eyeState = isGood ? 'happy' : 'panic';
    this.units.forEach(u => {
      u.setEyeState(eyeState);
      u.scaleTarget = isGood ? 1.4 : 0.6;
      setTimeout(() => { u.scaleTarget = 1; }, 400);
    });

    return isGood;
  }

  adjustUnits(targetCount, isGood) {
    const current = this.units.length;
    if (targetCount > current) {
      // Add units
      const toAdd = targetCount - current;
      for (let i = 0; i < toAdd; i++) {
        const src = this.units[Math.floor(Math.random() * this.units.length)];
        const angle = Math.random() * Math.PI * 2;
        const r = 20 + Math.random() * 60;
        const u = new NumberUnit(this.totalValue, src.x + Math.cos(angle)*r, src.y + Math.sin(angle)*r*0.5);
        u.scale = 0.1;
        u.scaleTarget = 1;
        this.units.push(u);
      }
    } else if (targetCount < current) {
      // Remove units
      const toRemove = current - targetCount;
      for (let i = 0; i < toRemove; i++) {
        this.units.pop();
      }
    }
    // Update all values
    this.units.forEach(u => {
      u.value = this.totalValue;
      u.size = u.calcSize();
    });
  }

  update(dt) {
    this.laneOffsetSmooth += (this.laneOffset * 90 - this.laneOffsetSmooth) * 0.12;

    // Shake decay
    this.shakeX *= 0.85;
    this.shakeY *= 0.85;

    // Recalculate target positions (crowd formation)
    const count = this.units.length;
    const cols = Math.ceil(Math.sqrt(count * 1.8));
    const rows = Math.ceil(count / cols);

    this.units.forEach((u, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const totalW = (cols - 1) * 48;
      const totalH = (rows - 1) * 30;
      const baseX = this.centerX + this.laneOffsetSmooth - totalW / 2 + col * 48;
      const baseY = this.centerY - totalH / 2 + row * 30 + Math.sin(u.bobOffset) * 5;
      u.targetX = baseX + (Math.random() - 0.5) * 2;
      u.targetY = baseY;
      u.update(dt, this.centerX);
    });
  }

  shake(intensity) {
    this.shakeX = (Math.random() - 0.5) * intensity;
    this.shakeY = (Math.random() - 0.5) * intensity;
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(this.shakeX, this.shakeY);

    // Sort by depth (fake 3D)
    const sorted = [...this.units].sort((a, b) => a.depth - b.depth);

    sorted.forEach(u => {
      this.drawUnit(u);
    });

    ctx.restore();
  }

  drawUnit(u) {
    const ctx = this.ctx;
    const depthScale = 0.7 + u.depth * 0.6;
    const s = u.size * u.scale * depthScale;
    const alpha = 0.6 + u.depth * 0.4;

    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.rotate(u.rotation);
    ctx.globalAlpha = alpha;

    // Trail glow
    u.trail.forEach((t, i) => {
      const ta = (1 - i / u.trail.length) * 0.08 * alpha;
      ctx.globalAlpha = ta;
      ctx.font = `bold ${s * 0.8}px 'Orbitron', monospace`;
      ctx.fillStyle = u.color;
      ctx.textAlign = 'center';
      ctx.fillText(u.getDisplayValue(), t.x - u.x, t.y - u.y);
    });
    ctx.globalAlpha = alpha;

    // Glow shadow
    ctx.shadowColor = u.color;
    ctx.shadowBlur = 18 * u.glowIntensity * depthScale;

    // 3D block effect
    const txt = u.getDisplayValue();
    ctx.font = `bold ${s}px 'Orbitron', monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Shadow layers (fake 3D extrude)
    for (let d = 4; d >= 1; d--) {
      ctx.fillStyle = shadeColor(u.color, -50 - d * 10);
      ctx.shadowBlur = 0;
      ctx.fillText(txt, d * 1.2, d * 1.2);
    }

    // Main text
    ctx.shadowBlur = 18 * u.glowIntensity;
    ctx.fillStyle = u.color;
    ctx.fillText(txt, 0, 0);

    // White highlight
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.shadowBlur = 0;
    ctx.fillText(txt, -1, -2);

    // Googly eyes
    this.drawEyes(u, s);

    ctx.restore();
  }

  drawEyes(u, s) {
    const ctx = this.ctx;
    const eyeSize = s * 0.22;
    const eyeY = -s * 0.52;
    const eyeSpacing = s * 0.28;

    [-1, 1].forEach(side => {
      const ex = side * eyeSpacing;
      const ey = eyeY;

      // White of eye
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.ellipse(ex, ey, eyeSize, eyeSize * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil direction based on state
      let px = 0, py = 0;
      if (u.eyeState === 'happy') { px = 0; py = eyeSize * 0.15; }
      else if (u.eyeState === 'panic') { px = side * eyeSize * 0.3; py = -eyeSize * 0.3; }
      else { px = side * eyeSize * 0.1; py = 0; }

      // Pupil
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.ellipse(ex + px, ey + py, eyeSize * 0.5, eyeSize * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye shine
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.ellipse(ex + px - eyeSize*0.15, ey + py - eyeSize*0.2, eyeSize*0.15, eyeSize*0.12, 0, 0, Math.PI*2);
      ctx.fill();

      // Happy: eyebrows up; Panic: eyebrows angled inward
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (u.eyeState === 'happy') {
        ctx.arc(ex, ey - eyeSize * 0.9, eyeSize * 0.6, Math.PI * 1.2, Math.PI * 1.8);
      } else if (u.eyeState === 'panic') {
        ctx.moveTo(ex - eyeSize*0.5, ey - eyeSize*0.9);
        ctx.lineTo(ex + eyeSize*0.5*side, ey - eyeSize*1.2);
      } else {
        ctx.moveTo(ex - eyeSize*0.5, ey - eyeSize*0.85);
        ctx.lineTo(ex + eyeSize*0.5, ey - eyeSize*0.85);
      }
      ctx.stroke();
    });
  }
}

function formatNumber(n) {
  if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(0) + 'K';
  return Math.floor(n).toString();
}

function shadeColor(hex, amount) {
  let r = parseInt(hex.slice(1,3),16);
  let g = parseInt(hex.slice(3,5),16);
  let b = parseInt(hex.slice(5,7),16);
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  return `rgb(${r},${g},${b})`;
}
