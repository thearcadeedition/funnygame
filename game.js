// game.js - Main game controller

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.resize();

    this.state = 'title'; // title, playing, gameover
    this.score = 0;
    this.distance = 0;
    this.speed = 3.5;
    this.baseSpeed = 3.5;
    this.difficulty = 1;
    this.lastTime = 0;
    this.dt = 16;

    this.swarm = null;
    this.gateManager = null;

    this.screenFlash = { alpha: 0, color: '#00ff88' };
    this.bgOffset = 0;
    this.particles = [];
    this.floatingTexts = [];

    this.inputX = null;
    this.isDragging = false;
    this.dragStartX = 0;

    this.bindInput();
    window.addEventListener('resize', () => this.resize());

    this.bgStars = this.generateStars(80);
    this.bgGrid = true;

    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    const maxW = Math.min(window.innerWidth, 480);
    const h = window.innerHeight;
    this.canvas.width = maxW;
    this.canvas.height = h;
    this.canvas.style.width = maxW + 'px';
    this.canvas.style.height = h + 'px';
  }

  generateStars(n) {
    return Array.from({length: n}, () => ({
      x: Math.random() * 500,
      y: Math.random() * 1000,
      r: Math.random() * 1.5 + 0.3,
      speed: 0.3 + Math.random() * 1.2,
      color: `hsl(${Math.random()*360},80%,80%)`
    }));
  }

  bindInput() {
    // Mouse
    this.canvas.addEventListener('mousedown', e => {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      if (this.state === 'title') this.startGame();
      if (this.state === 'gameover') this.startGame();
    });
    this.canvas.addEventListener('mousemove', e => {
      if (this.isDragging && this.state === 'playing') {
        this.handleDrag(e.clientX);
      }
    });
    this.canvas.addEventListener('mouseup', () => { this.isDragging = false; });

    // Touch
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      const t = e.touches[0];
      this.isDragging = true;
      this.dragStartX = t.clientX;
      if (this.state === 'title') this.startGame();
      if (this.state === 'gameover') this.startGame();
    }, { passive: false });
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (this.state !== 'playing') return;
      this.handleDrag(e.touches[0].clientX);
    }, { passive: false });
    this.canvas.addEventListener('touchend', () => { this.isDragging = false; });

    // Keyboard
    document.addEventListener('keydown', e => {
      if (this.state === 'title' || this.state === 'gameover') {
        this.startGame(); return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.swarm.laneOffset = -1;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.swarm.laneOffset = 1;
      }
    });
    document.addEventListener('keyup', e => {
      if (['ArrowLeft','ArrowRight','a','A','d','D'].includes(e.key)) {
        this.swarm.laneOffset = 0;
      }
    });
  }

  handleDrag(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    const relX = clientX - rect.left;
    const center = this.canvas.width / 2;
    const threshold = this.canvas.width * 0.12;

    if (relX < center - threshold) {
      this.swarm.laneOffset = -1;
    } else if (relX > center + threshold) {
      this.swarm.laneOffset = 1;
    } else {
      this.swarm.laneOffset = 0;
    }
  }

  startGame() {
    this.state = 'playing';
    this.score = 0;
    this.distance = 0;
    this.speed = this.baseSpeed;
    this.difficulty = 1;
    this.swarm = new Swarm(this.canvas);
    this.gateManager = new GateManager(this.canvas);
    this.particles = [];
    this.floatingTexts = [];
    this.screenFlash.alpha = 0;
  }

  loop(timestamp) {
    this.dt = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    this.update();
    this.draw();

    requestAnimationFrame(t => this.loop(t));
  }

  update() {
    if (this.state !== 'playing') return;

    this.distance += this.speed * 0.01;
    this.score = Math.floor(this.distance * 10);

    // Difficulty ramp
    this.difficulty = 1 + this.distance * 0.04;
    this.speed = this.baseSpeed + this.distance * 0.025;

    // Background
    this.bgOffset += this.speed * 0.5;
    this.bgStars.forEach(s => {
      s.y += s.speed * (this.speed / this.baseSpeed);
      if (s.y > this.canvas.height + 10) {
        s.y = -10;
        s.x = Math.random() * this.canvas.width;
      }
    });

    // Swarm
    this.swarm.update(this.dt);

    // Gates
    this.gateManager.update(this.speed, this.difficulty);

    // Collision
    const hit = this.gateManager.checkCollision(this.swarm);
    if (hit) {
      const isGood = this.swarm.applyGate(hit);
      this.triggerGateEffect(hit, isGood);
    }

    // Particles
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2;
      p.life -= 0.018;
    });

    // Floating texts
    this.floatingTexts = this.floatingTexts.filter(t => t.life > 0);
    this.floatingTexts.forEach(t => {
      t.y -= 1.5;
      t.life -= 0.015;
    });

    // Screen flash decay
    this.screenFlash.alpha = Math.max(0, this.screenFlash.alpha - 0.04);

    // Game over if swarm value drops to 0
    if (this.swarm && this.swarm.totalValue <= 0) {
      this.state = 'gameover';
    }
  }

  triggerGateEffect(gateData, isGood) {
    const cx = this.canvas.width / 2;
    const cy = this.swarm.centerY;

    // Screen flash
    this.screenFlash.alpha = 0.35;
    this.screenFlash.color = isGood ? '#00ff88' : '#ff3355';

    // Camera shake
    this.swarm.shake(isGood ? 8 : 18);

    // Floating text
    const label = isGood ? `+${gateData.label}` : gateData.label;
    this.floatingTexts.push({
      text: label,
      x: cx,
      y: cy - 60,
      color: isGood ? '#00ff88' : '#ff3355',
      life: 1,
      size: 32
    });

    // Burst particles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 8;
      this.particles.push({
        x: cx + (Math.random()-0.5)*80,
        y: cy,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 4,
        life: 1,
        color: isGood ? `hsl(${100+Math.random()*60},100%,60%)` : `hsl(${Math.random()*30+350},100%,55%)`
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Background
    this.drawBackground();

    if (this.state === 'title') {
      this.drawTitle();
      return;
    }

    if (this.state === 'playing' || this.state === 'gameover') {
      // Road
      this.drawRoad();

      // Gates
      this.gateManager.draw();

      // Swarm
      this.swarm.draw();

      // Particles
      this.drawParticles();

      // Floating texts
      this.drawFloatingTexts();

      // Screen flash
      if (this.screenFlash.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = this.screenFlash.alpha;
        ctx.fillStyle = this.screenFlash.color;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // HUD
      this.drawHUD();

      if (this.state === 'gameover') {
        this.drawGameOver();
      }
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Deep space gradient
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#050010');
    bg.addColorStop(0.5, '#0a0025');
    bg.addColorStop(1, '#110030');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    this.bgStars.forEach(s => {
      ctx.save();
      ctx.globalAlpha = 0.5 + Math.random() * 0.3;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(s.x % W, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawRoad() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cx = W / 2;
    const horizon = H * 0.3;

    // Road perspective trapezoid
    const roadGrad = ctx.createLinearGradient(0, horizon, 0, H);
    roadGrad.addColorStop(0, '#0d0020');
    roadGrad.addColorStop(1, '#1a0040');
    ctx.fillStyle = roadGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 60, horizon);
    ctx.lineTo(cx + 60, horizon);
    ctx.lineTo(cx + W * 0.5, H + 20);
    ctx.lineTo(cx - W * 0.5, H + 20);
    ctx.closePath();
    ctx.fill();

    // Neon road edge lines
    ['#ff00cc', '#00ccff'].forEach((color, i) => {
      const side = i === 0 ? -1 : 1;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + side * 55, horizon);
      ctx.lineTo(cx + side * W * 0.48, H + 20);
      ctx.stroke();
      ctx.restore();
    });

    // Dashed center lane
    const dashCount = 12;
    for (let i = 0; i < dashCount; i++) {
      const t1 = (i / dashCount + (this.bgOffset * 0.002) % (1/dashCount) * dashCount) % 1;
      const t2 = Math.min(1, t1 + 0.04);
      if (t1 > t2) continue;

      const x1 = cx;
      const y1 = horizon + (H - horizon + 20) * t1;
      const x2 = cx;
      const y2 = horizon + (H - horizon + 20) * t2;

      const alpha = 0.3 + t1 * 0.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.shadowColor = '#aaaaff';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 2 + t1 * 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();
    }

    // Lane divider glow on floor
    const floorGrad = ctx.createRadialGradient(cx, H, 0, cx, H, W * 0.6);
    floorGrad.addColorStop(0, 'rgba(180,0,255,0.12)');
    floorGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
  }

  drawParticles() {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawFloatingTexts() {
    const ctx = this.ctx;
    this.floatingTexts.forEach(t => {
      ctx.save();
      ctx.globalAlpha = t.life;
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 20;
      ctx.font = `bold ${t.size}px 'Orbitron', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    });
  }

  drawHUD() {
    const ctx = this.ctx;
    const W = this.canvas.width;

    // Score
    ctx.save();
    ctx.font = `bold 15px 'Orbitron', monospace`;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#aa44ff';
    ctx.shadowBlur = 10;
    ctx.textAlign = 'left';
    ctx.fillText(`DIST: ${Math.floor(this.distance)}m`, 16, 32);

    // Count display
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.font = `bold 15px 'Orbitron', monospace`;
    ctx.fillText(`ARMY: ${formatNumber(this.swarm.totalValue)}`, W - 16, 32);

    // Speed indicator
    ctx.textAlign = 'center';
    ctx.font = `bold 11px 'Orbitron', monospace`;
    ctx.fillStyle = '#ff9500';
    ctx.shadowColor = '#ff9500';
    ctx.fillText(`SPEED x${this.difficulty.toFixed(1)}`, W/2, 32);

    ctx.restore();

    // Left/Right lane hint arrows (faint)
    if (this.state === 'playing') {
      const laneOffset = this.swarm.laneOffset;
      ['←', '→'].forEach((arrow, i) => {
        const side = i === 0 ? -1 : 1;
        const active = laneOffset === side;
        ctx.save();
        ctx.globalAlpha = active ? 0.9 : 0.25;
        ctx.font = `bold 28px monospace`;
        ctx.fillStyle = active ? '#00ffcc' : '#ffffff';
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur = active ? 20 : 5;
        ctx.textAlign = 'center';
        ctx.fillText(arrow, W/2 + side * W * 0.34, this.canvas.height * 0.88);
        ctx.restore();
      });
    }
  }

  drawTitle() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const t = Date.now() * 0.001;

    // Animated title
    ctx.save();

    // Main title
    ctx.textAlign = 'center';

    // Glow layers
    ['#ff00cc', '#00ccff', '#aaff00'].forEach((c, i) => {
      const offset = Math.sin(t + i * 2) * 2;
      ctx.shadowColor = c;
      ctx.shadowBlur = 30;
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.3;
      ctx.font = `bold 28px 'Orbitron', monospace`;
      ctx.fillText('∞ BRAINROT', W/2 + offset, H * 0.28);
      ctx.fillText('GATE RUNNER', W/2 - offset, H * 0.36);
    });

    ctx.globalAlpha = 1;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 28px 'Orbitron', monospace`;
    ctx.fillText('∞ BRAINROT', W/2, H * 0.28);
    ctx.font = `bold 24px 'Orbitron', monospace`;
    ctx.fillStyle = '#00ffcc';
    ctx.shadowColor = '#00ffcc';
    ctx.fillText('GATE RUNNER', W/2, H * 0.36);

    // Floating demo number
    const bounce = Math.sin(t * 2) * 8;
    ctx.font = `bold 72px 'Orbitron', monospace`;
    ctx.shadowColor = '#ff2d78';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff2d78';
    ctx.fillText('67', W/2, H * 0.56 + bounce);

    // Eyes on the 67
    this.drawTitleEyes(W/2, H * 0.56 + bounce);

    // Tap to play
    const blink = Math.sin(t * 3) > 0;
    if (blink) {
      ctx.font = `bold 14px 'Orbitron', monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#aaaaff';
      ctx.shadowBlur = 10;
      ctx.fillText('TAP / PRESS ANY KEY TO START', W/2, H * 0.74);
    }

    // Controls hint
    ctx.globalAlpha = 0.6;
    ctx.font = `11px 'Orbitron', monospace`;
    ctx.fillStyle = '#aaaacc';
    ctx.shadowBlur = 0;
    ctx.fillText('← → ARROW KEYS  |  DRAG  |  SWIPE', W/2, H * 0.82);

    ctx.restore();
  }

  drawTitleEyes(cx, cy) {
    const ctx = this.ctx;
    const t = Date.now() * 0.002;
    // Simple googly eyes on the title 67
    [-20, 18].forEach((ox, i) => {
      const ex = cx + ox;
      const ey = cy - 30;
      const eyeR = 11;

      ctx.save();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(ex, ey, eyeR, 0, Math.PI*2);
      ctx.fill();

      const px = Math.cos(t + i) * 3;
      const py = Math.sin(t * 0.7) * 3;
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(ex + px, ey + py, eyeR * 0.5, 0, Math.PI*2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(ex + px - 3, ey + py - 3, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    });
  }

  drawGameOver() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff3355';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff3355';
    ctx.font = `bold 36px 'Orbitron', monospace`;
    ctx.fillText('GAME OVER', W/2, H * 0.38);

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 16px 'Orbitron', monospace`;
    ctx.fillText(`FINAL ARMY: ${formatNumber(this.swarm.totalValue)}`, W/2, H * 0.48);
    ctx.fillText(`DISTANCE: ${Math.floor(this.distance)}m`, W/2, H * 0.55);

    const blink = Math.sin(Date.now() * 0.004) > 0;
    if (blink) {
      ctx.font = `bold 14px 'Orbitron', monospace`;
      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.fillText('TAP TO PLAY AGAIN', W/2, H * 0.68);
    }

    ctx.restore();
  }
}

// Start the game when DOM is ready
window.addEventListener('load', () => {
  new Game();
});
