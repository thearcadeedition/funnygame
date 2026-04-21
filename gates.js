// gates.js - Gate system

const GOOD_GATES = [
  { label: 'x2',   op: 'multiply', value: 2,   type: 'good' },
  { label: 'x3',   op: 'multiply', value: 3,   type: 'good' },
  { label: 'x5',   op: 'multiply', value: 5,   type: 'good' },
  { label: 'x10',  op: 'multiply', value: 10,  type: 'good' },
  { label: '+41',  op: 'add',      value: 41,  type: 'good' },
  { label: '+69',  op: 'add',      value: 69,  type: 'good' },
  { label: '+100', op: 'add',      value: 100, type: 'good' },
  { label: '+420', op: 'add',      value: 420, type: 'good' },
  { label: '+777', op: 'add',      value: 777, type: 'good' },
  { label: 'x69',  op: 'multiply', value: 69,  type: 'good' },
];

const BAD_GATES = [
  { label: '÷2',    op: 'divide',   value: 2,   type: 'bad' },
  { label: '÷3',    op: 'divide',   value: 3,   type: 'bad' },
  { label: '-50',   op: 'subtract', value: 50,  type: 'bad' },
  { label: '-100',  op: 'subtract', value: 100, type: 'bad' },
  { label: 'SPLIT', op: 'divide',   value: 4,   type: 'bad' },
  { label: 'CORRUPT',op:'divide',   value: 2,   type: 'bad' },
  { label: '-69',   op: 'subtract', value: 69,  type: 'bad' },
];

class Gate {
  constructor(x, y, lane, gateData, pairId) {
    this.x = x;
    this.y = y;
    this.lane = lane; // -1 = left, 1 = right
    this.data = gateData;
    this.pairId = pairId;
    this.width = 110;
    this.height = 80;
    this.passed = false;
    this.hitFlash = 0;
    this.particles = [];
    this.speed = 3;
  }

  update(speed) {
    this.y += speed;
    this.hitFlash = Math.max(0, this.hitFlash - 0.05);
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3;
      p.life -= 0.02;
    });
  }

  burst(isGood) {
    this.hitFlash = 1;
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.particles.push({
        x: this.x, y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 1,
        color: isGood ? `hsl(${80 + Math.random()*60},100%,60%)` : `hsl(${Math.random()*30},100%,55%)`
      });
    }
  }

  draw(ctx, canvasWidth) {
    const gx = canvasWidth / 2 + this.lane * (canvasWidth * 0.22);
    const gy = this.y;
    const w = this.width;
    const h = this.height;
    const isGood = this.data.type === 'good';

    const baseColor = isGood ? '#00ff88' : '#ff3355';
    const glowColor = isGood ? '#00ffaa' : '#ff2244';

    ctx.save();

    // Particles
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Gate frame glow
    const flash = this.hitFlash;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20 + flash * 30;

    // Gate posts
    const postW = 14;
    const postH = h + 30;

    // Left post
    const grad = ctx.createLinearGradient(gx - w/2 - postW, gy, gx - w/2, gy);
    grad.addColorStop(0, shadeHex(baseColor, -30));
    grad.addColorStop(0.5, baseColor);
    grad.addColorStop(1, shadeHex(baseColor, -30));
    ctx.fillStyle = grad;
    roundRect(ctx, gx - w/2 - postW, gy - postH/2, postW, postH, 5);
    ctx.fill();

    // Right post
    ctx.fillStyle = grad;
    roundRect(ctx, gx + w/2, gy - postH/2, postW, postH, 5);
    ctx.fill();

    // Top beam
    ctx.fillStyle = baseColor;
    ctx.shadowBlur = 25 + flash * 20;
    roundRect(ctx, gx - w/2 - postW, gy - postH/2 - 14, w + postW*2, 14, 5);
    ctx.fill();

    // Gate label background
    const bgAlpha = 0.85 + flash * 0.15;
    ctx.globalAlpha = bgAlpha;
    const labelGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, w/2);
    labelGrad.addColorStop(0, isGood ? 'rgba(0,255,100,0.25)' : 'rgba(255,40,70,0.25)');
    labelGrad.addColorStop(1, 'rgba(0,0,0,0.05)');
    ctx.fillStyle = labelGrad;
    roundRect(ctx, gx - w/2, gy - h/2, w, h, 10);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label text
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';

    const fontSize = this.data.label.length > 5 ? 20 : 28;
    ctx.font = `bold ${fontSize}px 'Orbitron', monospace`;
    ctx.fillText(this.data.label, gx, gy);

    // Type indicator
    ctx.font = `10px 'Orbitron', monospace`;
    ctx.fillStyle = baseColor;
    ctx.shadowBlur = 5;
    ctx.fillText(isGood ? '▲ GOOD' : '▼ BAD', gx, gy + h/2 - 14);

    ctx.restore();
  }
}

class GateManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.gates = [];
    this.nextSpawnY = -300;
    this.pairCounter = 0;
    this.difficulty = 1;
  }

  update(speed, difficultyMult) {
    this.difficulty = difficultyMult;

    this.gates.forEach(g => g.update(speed));

    // Remove off-screen gates
    this.gates = this.gates.filter(g => g.y < this.canvas.height + 200);

    // Spawn new gate pairs
    if (this.gates.filter(g => g.lane === -1).length < 3) {
      this.spawnPair();
    }
  }

  spawnPair() {
    const pairId = this.pairCounter++;
    const y = -180;

    // Decide which side gets good/bad
    const goodOnLeft = Math.random() > 0.5;

    // Pick gate data
    const goodIdx = Math.floor(Math.random() * GOOD_GATES.length);
    const badIdx = Math.floor(Math.random() * BAD_GATES.length);
    let goodData = { ...GOOD_GATES[goodIdx] };
    let badData = { ...BAD_GATES[badIdx] };

    // Scale good gates with difficulty
    if (goodData.op === 'multiply' && this.difficulty > 2) {
      goodData = { ...goodData, value: goodData.value * Math.min(this.difficulty, 5) };
      goodData.label = 'x' + Math.round(goodData.value);
    }

    const leftData = goodOnLeft ? goodData : badData;
    const rightData = goodOnLeft ? badData : goodData;

    this.gates.push(new Gate(this.canvas.width/2, y, -1, leftData, pairId));
    this.gates.push(new Gate(this.canvas.width/2, y, 1, rightData, pairId));
  }

  checkCollision(swarm) {
    const cx = swarm.centerX + swarm.laneOffsetSmooth;
    const cy = swarm.centerY;
    const hitRadius = 55;

    for (const gate of this.gates) {
      if (gate.passed) continue;
      const gx = this.canvas.width/2 + gate.lane * (this.canvas.width * 0.22);
      const gy = gate.y;
      const dx = cx - gx;
      const dy = cy - gy;

      if (Math.abs(dx) < gate.width/2 + hitRadius && Math.abs(dy) < gate.height/2 + hitRadius) {
        gate.passed = true;
        // Mark partner as passed too
        this.gates.filter(g => g.pairId === gate.pairId).forEach(g => g.passed = true);
        return gate.data;
      }
    }
    return null;
  }

  draw() {
    // Draw road lane divider hint
    const ctx = this.canvas.getContext('2d');
    // Draw gates
    this.gates.forEach(g => g.draw(ctx, this.canvas.width));
  }
}

function shadeHex(hex, amount) {
  let r = parseInt(hex.slice(1,3),16);
  let g = parseInt(hex.slice(3,5),16);
  let b = parseInt(hex.slice(5,7),16);
  r = Math.max(0,Math.min(255,r+amount));
  g = Math.max(0,Math.min(255,g+amount));
  b = Math.max(0,Math.min(255,b+amount));
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
