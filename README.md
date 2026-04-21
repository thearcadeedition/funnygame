# ∞ INFINITE BRAINROT GATE RUNNER

> A hyper-casual neon endless runner where you grow your army of googly-eyed 3D numbers by passing through the right gates.

![Brainrot Gate Runner](https://img.shields.io/badge/game-brainrot-ff2d78?style=for-the-badge)
![HTML5](https://img.shields.io/badge/HTML5-canvas-00f5ff?style=for-the-badge)
![No Frameworks](https://img.shields.io/badge/zero-dependencies-aaff00?style=for-the-badge)

---

## 🎮 Game Description

You control a swarm of glowing, bouncing, googly-eyed 3D numbers that march endlessly forward. Your mission: steer left or right to pass through gates that multiply your army. Avoid the red gates that shrink it. How big can your number army grow?

---

## 🕹️ Controls

| Input | Action |
|-------|--------|
| **Arrow Left / A** | Move swarm to left lane |
| **Arrow Right / D** | Move swarm to right lane |
| **Mouse Drag** | Drag left/right to steer |
| **Touch Swipe** | Swipe left/right on mobile |
| **Tap / Any Key** | Start or restart game |

---

## ⚙️ Core Mechanics

### Number Swarm Army
- You start with a small crowd of numbered units, each glowing in neon colors
- Every unit has animated **googly eyes** that react emotionally to gate hits
- Units **bounce, wobble, and glow** as they move forward
- The swarm visually grows or shrinks based on your choices

### Gate System
Two gates appear side-by-side. You pick one by steering into it.

#### 🟢 Green Gates (GOOD — Grow your army)
| Gate | Effect |
|------|--------|
| `x2`, `x3`, `x5`, `x10` | Multiplies your total |
| `+41`, `+69`, `+100`, `+420`, `+777` | Adds flat value |

#### 🔴 Red Gates (BAD — Shrink your army)
| Gate | Effect |
|------|--------|
| `÷2`, `÷3` | Divides your total |
| `-50`, `-69`, `-100` | Subtracts flat value |
| `SPLIT`, `CORRUPT` | Heavily reduces the swarm |

### Emotional Eyes
- **Happy eyes** 👀 — after hitting a green gate
- **Panic eyes** 😱 — after hitting a red gate
- **Normal eyes** — cruising forward

### Number Progression
Numbers scale with compact notation:
```
41 → 420 → 1.3K → 69K → 1.0M → 4.2B → ∞
```

### Infinite Difficulty
- Gates scroll faster as distance increases
- Multiplier gates get stronger deeper into the run
- More frequent bad gate combos appear at high difficulty

---

## 🚀 How to Run Locally

### Option 1: Just open the file
```
Open index.html in any modern browser
```
> ⚠️ Some browsers block local font loading — use a local server for best results.

### Option 2: Local server (recommended)
```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# Then open: http://localhost:8080
```

### Option 3: GitHub Pages
1. Push this folder to a GitHub repo
2. Go to Settings → Pages
3. Set source to `main` branch, `/ (root)`
4. Your game is live at `https://yourusername.github.io/brainrot-gate-runner`

---

## 📁 Project Structure

```
/brainrot-gate-runner
 ├── index.html     # Entry point, loads all scripts
 ├── style.css      # Neon CRT aesthetic, scanlines, vignette
 ├── game.js        # Main game loop, input, HUD, screen effects
 ├── gates.js       # Gate data, spawning, collision, rendering
 ├── swarm.js       # Number units, googly eyes, crowd formation
 └── README.md      # This file
```

---

## 🎨 Visual Effects

- **Fake 3D numbers** — depth-scaled with extruded shadow layers
- **Neon glow trails** behind every unit
- **Screen flash** on gate hits (green or red)
- **Camera shake** on impact
- **Particle bursts** at gate collision points
- **Floating combo text** (+x5, CORRUPT, etc.)
- **CRT scanline overlay** and vignette for retro feel
- **Perspective road** with vanishing point and lane markers

---

## 🧠 Tech Stack

- Pure **HTML5 Canvas** — no WebGL, no frameworks
- **Vanilla JavaScript** — ES6 classes, requestAnimationFrame loop
- **Google Fonts** — Orbitron for that cyber aesthetic
- Zero npm, zero build step — just open and play

---

*Built with maximum brainrot energy. 67 approves.*
