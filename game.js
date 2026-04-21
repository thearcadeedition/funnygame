// game.js - Main game loop with level system

class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx    = this.canvas.getContext('2d');
    this.resize();

    // States: title | playing | levelend | infinite | gameover
    this.state    = 'title';
    this.levelIdx = 0;   // index into NUMBER_SEQUENCE
    this.speed    = 3.8;
    this.lastTime = 0;
    this.dt       = 16;

    this.swarm       = null;
    this.gateManager = null;

    this.flash       = { alpha: 0, color: '#00ff88' };
    this.bgOffset    = 0;
    this.particles   = [];
    this.floatingTxt = [];
    this.bgStars     = this.makeStars(90);

    // Level-end screen state
    this.levelEndTimer = 0;
    this.levelEndData  = null;

    // Infinite mode state
    this.infiniteStages = ['10K','100K','1M','1B','1T','∞'];
    this.infiniteIdx    = 0;

    this.bindInput();
    window.addEventListener('resize', () => this.resize());
    requestAnimationFrame(t => this.loop(t));
  }

  resize() {
    const w = Math.min(window.innerWidth, 480);
    const h = window.innerHeight;
    this.canvas.width  = w;
    this.canvas.height = h;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
  }

  makeStars(n) {
    return Array.from({length:n}, () => ({
      x: Math.random()*480,
      y: Math.random()*900,
      r: Math.random()*1.4+0.3,
      spd: 0.3 + Math.random()*1.2,
      c: `hsl(${Math.random()*360},70%,80%)`
    }));
  }

  // ─── INPUT ───────────────────────────────────────────
  bindInput() {
    // Click / tap — advance screens
    this.canvas.addEventListener('pointerdown', e => {
      e.preventDefault();
      this._ptrDown = true;
      this._ptrStartX = e.clientX;
      this._ptrX = e.clientX;
      if (this.state === 'title')    { this.startGame(); return; }
      if (this.state === 'levelend') { this.nextLevel(); return; }
      if (this.state === 'gameover') { this.resetGame(); return; }
      if (this.state === 'infinite') { this.nextInfinite(); return; }
    });
    this.canvas.addEventListener('pointermove', e => {
      e.preventDefault();
      this._ptrX = e.clientX;
      if (this._ptrDown && this.state === 'playing') this.handlePointer(e.clientX);
    });
    this.canvas.addEventListener('pointerup', e => {
      e.preventDefault();
      this._ptrDown = false;
    });
    this.canvas.setPointerCapture && this.canvas.addEventListener('gotpointercapture', ()=>{});

    // Keyboard
    document.addEventListener('keydown', e => {
      if (this.state === 'title')    { this.startGame(); return; }
      if (this.state === 'levelend') { this.nextLevel(); return; }
      if (this.state === 'gameover') { this.resetGame(); return; }
      if (this.state === 'infinite') { this.nextInfinite(); return; }
      if (this.state !== 'playing')  return;

      if (e.key === 'ArrowLeft'  || e.key === 'a' || e.key === 'A') this.swarm.lane = -1;
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.swarm.lane =  1;
    });
    // No keyup reset — lane is sticky
  }

  handlePointer(clientX) {
    const rect = this.canvas.getBoundingClientRect();
    const rx   = clientX - rect.left;
    const W    = this.canvas.width;
    const threshold = W * 0.15;
    if      (rx < W/2 - threshold) this.swarm.lane = -1;
    else if (rx > W/2 + threshold) this.swarm.lane =  1;
    // If within center band, keep current lane (sticky)
  }

  // ─── GAME FLOW ────────────────────────────────────────
  startGame() {
    this.levelIdx = 0;
    this.infiniteIdx = 0;
    this.beginLevel();
  }

  resetGame() {
    this.levelIdx = 0;
    this.state = 'title';
  }

  beginLevel() {
    this.state    = 'playing';
    const val     = NUMBER_SEQUENCE[this.levelIdx];
    this.swarm    = new Swarm(this.canvas, val);
    this.gateManager = new GateManager(this.canvas);
    this.gateManager.gatesPerLevel = 5 + Math.floor(this.levelIdx / 5);
    this.particles   = [];
    this.floatingTxt = [];
    this.flash.alpha = 0;
    this.speed = 3.5 + this.levelIdx * 0.08;
  }

  nextLevel() {
    this.levelIdx++;
    if (this.levelIdx >= NUMBER_SEQUENCE.length) {
      // Enter infinite mode
      this.state = 'infinite';
      this.infiniteIdx = 0;
    } else {
      this.beginLevel();
    }
  }

  nextInfinite() {
    this.infiniteIdx++;
    if (this.infiniteIdx >= this.infiniteStages.length) {
      // Loop infinite
      this.infiniteIdx = 0;
    }
    this.state = 'infinite';
  }

  endLevel() {
    const next = NUMBER_SEQUENCE[this.levelIdx + 1];
    const phase = getPhase(this.levelIdx);
    this.levelEndData = {
      current: NUMBER_SEQUENCE[this.levelIdx],
      next: next,
      phase: phase,
      score: this.swarm.totalValue,
      levelIdx: this.levelIdx
    };
    this.state = 'levelend';
  }

  // ─── MAIN LOOP ────────────────────────────────────────
  loop(ts) {
    this.dt = Math.min(ts - this.lastTime, 50);
    this.lastTime = ts;
    this.update();
    this.draw();
    requestAnimationFrame(t => this.loop(t));
  }

  update() {
    // Animate stars regardless of state
    this.bgOffset += this.speed * 0.4;
    this.bgStars.forEach(s => {
      s.y += s.spd * (this.speed / 3.5);
      if (s.y > this.canvas.height + 10) { s.y = -10; s.x = Math.random() * this.canvas.width; }
    });

    if (this.state !== 'playing') return;

    this.swarm.update(this.dt);
    this.gateManager.update(this.speed);

    // Collision
    const hit = this.gateManager.checkCollision(this.swarm);
    if (hit) {
      const good = this.swarm.applyGate(hit);
      this.spawnEffect(good, hit);
    }

    // Particles & floaters
    this.particles = this.particles.filter(p => p.life > 0);
    this.particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.22; p.life-=0.02; });
    this.floatingTxt = this.floatingTxt.filter(t => t.life > 0);
    this.floatingTxt.forEach(t => { t.y -= 1.6; t.life -= 0.016; });
    this.flash.alpha = Math.max(0, this.flash.alpha - 0.04);

    // Level complete?
    if (this.gateManager.levelDone && this.gateManager.gates.every(g => g.y > this.canvas.height - 50 || g.passed)) {
      this.endLevel();
    }
  }

  spawnEffect(good, gate) {
    const cx = this.canvas.width / 2;
    const cy = this.swarm.cy;
    this.flash.alpha = 0.30;
    this.flash.color = good ? '#00ff88' : '#ff3355';
    this.swarm.shake(good ? 7 : 16);

    this.floatingTxt.push({
      text: good ? gate.label : gate.label,
      x: cx, y: cy - 65,
      color: good ? '#00ff88' : '#ff3355',
      life: 1, size: 30
    });

    for (let i = 0; i < 36; i++) {
      const a = Math.random()*Math.PI*2, spd = 2+Math.random()*8;
      this.particles.push({
        x: cx+(Math.random()-0.5)*70, y: cy,
        vx: Math.cos(a)*spd, vy: Math.sin(a)*spd-3.5,
        life: 1,
        color: good ? `hsl(${100+Math.random()*60},100%,60%)` : `hsl(${Math.random()*30+345},100%,55%)`
      });
    }
  }

  // ─── DRAW ─────────────────────────────────────────────
  draw() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;

    this.drawBG();

    if (this.state === 'title') { this.drawTitle(); return; }

    if (this.state === 'levelend') { this.drawLevelEnd(); return; }
    if (this.state === 'infinite') { this.drawInfinite(); return; }
    if (this.state === 'gameover') { this.drawGameOver(); return; }

    // Playing
    this.drawRoad();
    this.gateManager.draw();
    this.swarm.draw();
    this.drawParticles();
    this.drawFloaters();

    if (this.flash.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flash.alpha;
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0,0,W,H);
      ctx.restore();
    }

    this.drawHUD();
    this.drawLaneArrows();
    this.drawProgressBar();
  }

  drawBG() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const bg = ctx.createLinearGradient(0,0,0,H);
    bg.addColorStop(0,'#060012');
    bg.addColorStop(0.5,'#0b0028');
    bg.addColorStop(1,'#130035');
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,W,H);
    this.bgStars.forEach(s => {
      ctx.save();
      ctx.globalAlpha = 0.45 + Math.random()*0.2;
      ctx.fillStyle = s.c;
      ctx.shadowColor = s.c; ctx.shadowBlur = 3;
      ctx.beginPath(); ctx.arc(s.x % W, s.y, s.r, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  drawRoad() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const cx = W/2, hor = H*0.28;

    // Road fill
    const rg = ctx.createLinearGradient(0,hor,0,H);
    rg.addColorStop(0,'#0e0022'); rg.addColorStop(1,'#1c0045');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(cx-55,hor); ctx.lineTo(cx+55,hor);
    ctx.lineTo(cx+W*0.5,H+20); ctx.lineTo(cx-W*0.5,H+20);
    ctx.closePath(); ctx.fill();

    // Edge lines
    [['#ff00cc',-1],['#00ccff',1]].forEach(([c,s]) => {
      ctx.save(); ctx.strokeStyle=c; ctx.shadowColor=c; ctx.shadowBlur=12; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(cx+s*50,hor); ctx.lineTo(cx+s*W*0.47,H+20); ctx.stroke();
      ctx.restore();
    });

    // Dashes
    for (let i=0; i<14; i++) {
      const t1 = ((i/14) + (this.bgOffset*0.0022)) % 1;
      const t2 = Math.min(1, t1+0.04);
      const y1 = hor + (H-hor+20)*t1;
      const y2 = hor + (H-hor+20)*t2;
      ctx.save();
      ctx.globalAlpha = 0.28 + t1*0.5;
      ctx.strokeStyle = '#fff'; ctx.shadowColor='#aaf'; ctx.shadowBlur=5;
      ctx.lineWidth = 1.5 + t1*3;
      ctx.beginPath(); ctx.moveTo(cx,y1); ctx.lineTo(cx,y2); ctx.stroke();
      ctx.restore();
    }
  }

  drawParticles() {
    const ctx = this.ctx;
    this.particles.forEach(p => {
      ctx.save(); ctx.globalAlpha=p.life*0.85;
      ctx.fillStyle=p.color; ctx.shadowColor=p.color; ctx.shadowBlur=7;
      ctx.beginPath(); ctx.arc(p.x,p.y,4*p.life,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  drawFloaters() {
    const ctx = this.ctx;
    this.floatingTxt.forEach(t => {
      ctx.save(); ctx.globalAlpha=t.life;
      ctx.fillStyle=t.color; ctx.shadowColor=t.color; ctx.shadowBlur=18;
      ctx.font=`bold ${t.size}px 'Orbitron',monospace`;
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(t.text,t.x,t.y);
      ctx.restore();
    });
  }

  drawHUD() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const phase = getPhase(this.levelIdx);
    const levelNum = this.levelIdx + 1;

    ctx.save();
    // Level
    ctx.font = `bold 13px 'Orbitron',monospace`;
    ctx.fillStyle = '#ffffff'; ctx.shadowColor='#aa44ff'; ctx.shadowBlur=8;
    ctx.textAlign='left';
    ctx.fillText(`LVL ${levelNum}`, 14, 30);

    // Phase name
    ctx.font = `bold 11px 'Orbitron',monospace`;
    ctx.fillStyle = phase.color; ctx.shadowColor=phase.color;
    ctx.fillText(phase.name, 14, 48);

    // Army count
    ctx.textAlign='right';
    ctx.font=`bold 14px 'Orbitron',monospace`;
    ctx.fillStyle='#00ffcc'; ctx.shadowColor='#00ffcc';
    ctx.fillText(`ARMY: ${formatNumber(this.swarm.totalValue)}`, W-14, 30);

    // Target number
    const target = NUMBER_SEQUENCE[this.levelIdx];
    ctx.font=`bold 11px 'Orbitron',monospace`;
    ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00';
    ctx.fillText(`TARGET: ${formatNumber(target)}`, W-14, 48);

    ctx.restore();
  }

  drawLaneArrows() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const lane = this.swarm.lane;

    ['←','→'].forEach((ch, i) => {
      const side = i===0 ? -1 : 1;
      const active = lane === side;
      ctx.save();
      ctx.globalAlpha = active ? 0.92 : 0.20;
      ctx.fillStyle   = active ? '#00ffcc' : '#ffffff';
      ctx.shadowColor = '#00ffcc'; ctx.shadowBlur = active ? 20 : 4;
      ctx.font = `bold 32px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(ch, W/2 + side*W*0.36, H*0.87);
      ctx.restore();
    });
  }

  drawProgressBar() {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const hit  = this.gateManager.gatesHit;
    const total = this.gateManager.gatesPerLevel;
    const pct  = Math.min(1, hit / total);
    const bw   = W * 0.6, bh = 6;
    const bx   = (W-bw)/2, by = 62;

    ctx.save();
    // Track
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,3); ctx.fill();
    // Fill
    const phase = getPhase(this.levelIdx);
    ctx.fillStyle = phase.color;
    ctx.shadowColor = phase.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(bx,by,bw*pct,bh,3); ctx.fill();
    // Label
    ctx.shadowBlur=0; ctx.globalAlpha=0.6;
    ctx.font=`10px 'Orbitron',monospace`;
    ctx.fillStyle='#ffffff'; ctx.textAlign='center';
    ctx.fillText(`${hit}/${total} GATES`, W/2, by+bh+13);
    ctx.restore();
  }

  // ─── SCREENS ─────────────────────────────────────────
  drawTitle() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const t = Date.now()*0.001;

    ctx.save();
    ctx.textAlign = 'center';

    // Chromatic aberration title layers
    [['#ff00cc',3],['#00ccff',-3]].forEach(([c,off]) => {
      ctx.globalAlpha=0.22; ctx.fillStyle=c; ctx.shadowColor=c; ctx.shadowBlur=25;
      ctx.font=`bold 26px 'Orbitron',monospace`;
      ctx.fillText('∞ BRAINROT', W/2+off, H*0.26);
      ctx.fillText('GATE RUNNER', W/2-off, H*0.34);
    });
    ctx.globalAlpha=1;
    ctx.shadowColor='#ffffff'; ctx.shadowBlur=18;
    ctx.fillStyle='#ffffff';
    ctx.font=`bold 26px 'Orbitron',monospace`;
    ctx.fillText('∞ BRAINROT', W/2, H*0.26);
    ctx.font=`bold 22px 'Orbitron',monospace`;
    ctx.fillStyle='#00ffcc'; ctx.shadowColor='#00ffcc';
    ctx.fillText('GATE RUNNER', W/2, H*0.34);

    // Bouncing 41
    const bob = Math.sin(t*2)*9;
    ctx.font=`bold 80px 'Orbitron',monospace`;
    ctx.fillStyle='#ff2d78'; ctx.shadowColor='#ff2d78'; ctx.shadowBlur=28;
    ctx.fillText('41', W/2, H*0.55+bob);
    this.drawTitleEyes(W/2, H*0.55+bob, 80);

    // Tap to play blink
    if (Math.sin(t*3)>0) {
      ctx.font=`bold 13px 'Orbitron',monospace`;
      ctx.fillStyle='#ffffff'; ctx.shadowColor='#aaaaff'; ctx.shadowBlur=8;
      ctx.fillText('TAP OR PRESS ANY KEY', W/2, H*0.74);
    }
    ctx.globalAlpha=0.5;
    ctx.font=`11px 'Orbitron',monospace`;
    ctx.fillStyle='#aaaacc'; ctx.shadowBlur=0;
    ctx.fillText('← → KEYS  ·  DRAG  ·  SWIPE', W/2, H*0.81);
    ctx.restore();
  }

  drawTitleEyes(cx, cy, fontSize) {
    const ctx = this.ctx;
    const t = Date.now()*0.002;
    const er = fontSize*0.13;
    [[-fontSize*0.25, 0],[fontSize*0.12, 0]].forEach(([ox, oy], i) => {
      const ex=cx+ox, ey=cy-fontSize*0.38;
      ctx.save(); ctx.shadowBlur=0;
      ctx.fillStyle='white'; ctx.beginPath(); ctx.arc(ex,ey,er,0,Math.PI*2); ctx.fill();
      const px=Math.cos(t+i)*er*0.35, py=Math.sin(t*0.8)*er*0.35;
      ctx.fillStyle='#111'; ctx.beginPath(); ctx.arc(ex+px,ey+py,er*0.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath();
      ctx.arc(ex+px-er*0.15,ey+py-er*0.2,er*0.18,0,Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  drawLevelEnd() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const d = this.levelEndData;
    const t = Date.now()*0.001;

    this.drawBG();

    ctx.save();
    // Panel
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0,0,W,H);

    ctx.textAlign='center';

    // "LEVEL COMPLETE"
    ctx.font=`bold 28px 'Orbitron',monospace`;
    ctx.fillStyle='#aaff00'; ctx.shadowColor='#aaff00'; ctx.shadowBlur=30;
    ctx.fillText('LEVEL COMPLETE!', W/2, H*0.22);

    // Current number big
    const bob = Math.sin(t*2.5)*6;
    ctx.font=`bold 72px 'Orbitron',monospace`;
    ctx.fillStyle='#00ffcc'; ctx.shadowColor='#00ffcc'; ctx.shadowBlur=35;
    ctx.fillText(formatNumber(d.current), W/2, H*0.42+bob);
    this.drawTitleEyes(W/2, H*0.42+bob, 72);

    // Phase
    ctx.font=`bold 14px 'Orbitron',monospace`;
    ctx.fillStyle=d.phase.color; ctx.shadowColor=d.phase.color; ctx.shadowBlur=10;
    ctx.fillText(d.phase.name, W/2, H*0.55);

    // Army score
    ctx.font=`bold 13px 'Orbitron',monospace`;
    ctx.fillStyle='#ffffff'; ctx.shadowColor='#aaaaff'; ctx.shadowBlur=6;
    ctx.fillText(`ARMY SIZE: ${formatNumber(d.score)}`, W/2, H*0.63);

    // Next target
    if (d.next) {
      ctx.font=`bold 12px 'Orbitron',monospace`;
      ctx.fillStyle='#ffdd00'; ctx.shadowColor='#ffdd00'; ctx.shadowBlur=8;
      ctx.fillText(`NEXT TARGET: ${formatNumber(d.next)}`, W/2, H*0.71);
    }

    // Tap to continue blink
    if (Math.sin(t*3)>0) {
      ctx.font=`bold 13px 'Orbitron',monospace`;
      ctx.fillStyle='#00ffcc'; ctx.shadowColor='#00ffcc'; ctx.shadowBlur=10;
      ctx.fillText('TAP TO CONTINUE ▶', W/2, H*0.82);
    }

    ctx.restore();
  }

  drawInfinite() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const t = Date.now()*0.001;
    const stage = this.infiniteStages[this.infiniteIdx];
    const colors = ['#00f5ff','#ffdd00','#ff9500','#ff2d78','#bf5fff','#ffffff'];
    const c = colors[this.infiniteIdx % colors.length];

    this.drawBG();
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';

    ctx.font=`bold 22px 'Orbitron',monospace`;
    ctx.fillStyle='#ffffff'; ctx.shadowColor='#ffffff'; ctx.shadowBlur=15;
    ctx.fillText('🌌 INFINITE MODE', W/2, H*0.22);

    const bob = Math.sin(t*2)*8;
    ctx.font=`bold 88px 'Orbitron',monospace`;
    ctx.fillStyle=c; ctx.shadowColor=c; ctx.shadowBlur=40;
    ctx.fillText(stage, W/2, H*0.48+bob);
    if (stage !== '∞') this.drawTitleEyes(W/2, H*0.48+bob, 88);

    ctx.font=`bold 13px 'Orbitron',monospace`;
    ctx.fillStyle='#aaaaff'; ctx.shadowColor='#aaaaff'; ctx.shadowBlur=6;
    ctx.fillText('YOU HAVE ASCENDED BEYOND NUMBERS', W/2, H*0.62);

    if (Math.sin(t*3)>0) {
      ctx.font=`bold 13px 'Orbitron',monospace`;
      ctx.fillStyle='#00ffcc'; ctx.shadowColor='#00ffcc'; ctx.shadowBlur=10;
      ctx.fillText(stage==='∞' ? 'YOU WIN. TAP TO LOOP.' : 'TAP TO GO FURTHER ▶', W/2, H*0.76);
    }
    ctx.restore();
  }

  drawGameOver() {
    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const t = Date.now()*0.001;
    this.drawBG();
    ctx.save();
    ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';

    ctx.font=`bold 34px 'Orbitron',monospace`;
    ctx.fillStyle='#ff3355'; ctx.shadowColor='#ff3355'; ctx.shadowBlur=28;
    ctx.fillText('GAME OVER', W/2, H*0.38);

    ctx.font=`bold 15px 'Orbitron',monospace`;
    ctx.fillStyle='#ffffff'; ctx.shadowColor='#ffffff'; ctx.shadowBlur=8;
    ctx.fillText(`LEVEL ${this.levelIdx+1}  ·  ${getPhase(this.levelIdx).name}`, W/2, H*0.50);

    if (Math.sin(t*3)>0) {
      ctx.font=`bold 13px 'Orbitron',monospace`;
      ctx.fillStyle='#00ffcc'; ctx.shadowColor='#00ffcc';
      ctx.fillText('TAP TO PLAY AGAIN', W/2, H*0.65);
    }
    ctx.restore();
  }
}

window.addEventListener('load', () => { new Game(); });
