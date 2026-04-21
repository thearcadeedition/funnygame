// gates.js - Gate system

const GOOD_GATES = [
  { label:'+41',  op:'add',      value:41,  type:'good' },
  { label:'+69',  op:'add',      value:69,  type:'good' },
  { label:'+100', op:'add',      value:100, type:'good' },
  { label:'+420', op:'add',      value:420, type:'good' },
  { label:'+777', op:'add',      value:777, type:'good' },
  { label:'x2',   op:'multiply', value:2,   type:'good' },
  { label:'x3',   op:'multiply', value:3,   type:'good' },
  { label:'x5',   op:'multiply', value:5,   type:'good' },
  { label:'x10',  op:'multiply', value:10,  type:'good' },
];

const BAD_GATES = [
  { label:'-50',    op:'subtract', value:50,  type:'bad' },
  { label:'-100',   op:'subtract', value:100, type:'bad' },
  { label:'-69',    op:'subtract', value:69,  type:'bad' },
  { label:'÷2',     op:'divide',   value:2,   type:'bad' },
  { label:'÷3',     op:'divide',   value:3,   type:'bad' },
  { label:'SPLIT',  op:'divide',   value:4,   type:'bad' },
  { label:'CORRUPT',op:'divide',   value:2,   type:'bad' },
];

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

class Gate {
  constructor(lane, gateData, pairId) {
    this.y      = -220;
    this.lane   = lane;  // -1 or 1
    this.data   = gateData;
    this.pairId = pairId;
    this.w      = 115;
    this.h      = 85;
    this.passed = false;
    this.flash  = 0;
    this.particles = [];
  }

  update(speed) {
    this.y += speed;
    this.flash = Math.max(0, this.flash - 0.06);
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.life -= 0.025;
    });
  }

  burst(good) {
    this.flash = 1;
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 2 + Math.random() * 7;
      this.particles.push({
        x: 0, y: 0,
        vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 3,
        life: 1,
        color: good ? `hsl(${100+Math.random()*60},100%,60%)` : `hsl(${Math.random()*25+345},100%,55%)`
      });
    }
  }

  draw(ctx, canvasW) {
    const gx = canvasW / 2 + this.lane * canvasW * 0.23;
    const gy = this.y;
    const w  = this.w, h = this.h;
    const good = this.data.type === 'good';
    const base = good ? '#00ff88' : '#ff3355';
    const glow = good ? '#00ffaa' : '#ff2244';

    ctx.save();

    // Particles
    ctx.save();
    ctx.translate(gx, gy);
    this.particles.forEach(p => {
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI*2); ctx.fill();
    });
    ctx.restore();

    // Gate arch shape
    const postW = 13;
    const archH = h + 35;
    ctx.shadowColor = glow;
    ctx.shadowBlur  = 18 + this.flash * 25;

    // Left post
    ctx.fillStyle = base;
    roundRect(ctx, gx - w/2 - postW, gy - archH/2, postW, archH, 4);
    ctx.fill();
    // Right post
    roundRect(ctx, gx + w/2, gy - archH/2, postW, archH, 4);
    ctx.fill();
    // Top beam
    roundRect(ctx, gx - w/2 - postW, gy - archH/2 - 13, w + postW*2, 13, 4);
    ctx.fill();

    // Inner label area
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = base;
    ctx.shadowBlur = 0;
    roundRect(ctx, gx - w/2, gy - h/2, w, h, 8);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label
    ctx.shadowColor = glow;
    ctx.shadowBlur  = 14 + this.flash * 10;
    ctx.fillStyle   = '#ffffff';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    const fs = this.data.label.length > 5 ? 20 : 28;
    ctx.font = `bold ${fs}px 'Orbitron', monospace`;
    ctx.fillText(this.data.label, gx, gy);

    // Subtext
    ctx.font = '10px Orbitron, monospace';
    ctx.fillStyle = base;
    ctx.shadowBlur = 4;
    ctx.fillText(good ? '▲ GOOD' : '▼ BAD', gx, gy + h/2 - 13);

    ctx.restore();
  }
}

class GateManager {
  constructor(canvas) {
    this.canvas  = canvas;
    this.gates   = [];
    this.pairIdx = 0;
    this.gatesHit    = 0;      // gates cleared this level
    this.gatesPerLevel = 5;    // how many gate pairs per level
    this.levelDone = false;
  }

  reset() {
    this.gates    = [];
    this.gatesHit = 0;
    this.levelDone = false;
  }

  update(speed) {
    this.gates.forEach(g => g.update(speed));
    this.gates = this.gates.filter(g => g.y < this.canvas.height + 200);

    // Only spawn if level not yet done and not too many pending
    const pending = this.gates.filter(g => !g.passed && g.lane === -1).length;
    if (!this.levelDone && pending < 2 && this.gatesHit < this.gatesPerLevel) {
      this.spawnPair();
    }
  }

  spawnPair() {
    const id = this.pairIdx++;
    const goodLeft = Math.random() > 0.5;
    const good = GOOD_GATES[Math.floor(Math.random() * GOOD_GATES.length)];
    const bad  = BAD_GATES[Math.floor(Math.random() * BAD_GATES.length)];
    this.gates.push(new Gate(-1, goodLeft ? good : bad, id));
    this.gates.push(new Gate( 1, goodLeft ? bad  : good, id));
  }

  checkCollision(swarm) {
    const cx = swarm.cx + swarm.laneSmooth;
    const cy = swarm.cy;
    const r  = 52;

    for (const g of this.gates) {
      if (g.passed) continue;
      const gx = this.canvas.width/2 + g.lane * this.canvas.width * 0.23;
      const gy = g.y;
      if (Math.abs(cx - gx) < g.w/2 + r && Math.abs(cy - gy) < g.h/2 + r) {
        g.passed = true;
        g.burst(g.data.type === 'good');
        this.gates.filter(p => p.pairId === g.pairId).forEach(p => p.passed = true);
        this.gatesHit++;
        if (this.gatesHit >= this.gatesPerLevel) this.levelDone = true;
        return g.data;
      }
    }
    return null;
  }

  draw() {
    this.gates.forEach(g => g.draw(this.canvas.getContext('2d'), this.canvas.width));
  }
}
