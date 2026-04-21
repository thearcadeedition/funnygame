# ∞ INFINITE BRAINROT GATE RUNNER

> Hyper-casual neon endless runner. Grow your army of googly-eyed 3D numbers through 50 levels of escalating brainrot.

---

## 🎮 Controls

| Input | Action |
|-------|--------|
| **Arrow Left / A** | Move left lane (STICKY) |
| **Arrow Right / D** | Move right lane (STICKY) |
| **Drag / Swipe** | Steer left or right |
| **Tap / Any Key** | Start / advance screens |

> Lane choice is **sticky** — your swarm stays in the lane you pick until you move it again.

---

## 🔢 Number Progression (50 Levels)

| Phase | Numbers |
|-------|---------|
| STARTER | 41 → 67 → 69 → ... → 314 |
| 🟡 MEME POWER ZONE | 420 → 444 → ... → 808 |
| 🟠 INTERNET CHAOS | 888 → 900 → ... → 1600 |
| 🔴 BRAINROT BREAKING | 1776 → 1888 → ... → 3333 |
| ⚫ ABSURD POWER ZONE | 4040 → 4444 → ... → 9999 |
| 🌌 INFINITE MODE | 10K → 100K → 1M → 1B → 1T → ∞ |

---

## ⚙️ Mechanics

- **5 gates per level** — clear them all to advance
- **Green gates** (+add / ×multiply) grow your swarm
- **Red gates** (−subtract / ÷divide / SPLIT / CORRUPT) shrink it
- Numbers display in compact format (K / M / B / T)
- Speed and gates-per-level increase as you progress

---

## 🚀 Run Locally

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

Or just open `index.html` directly in Chrome/Firefox.

## 🌐 GitHub Pages

Push to a repo → Settings → Pages → main branch / root → done.

---

## 📁 Files

```
index.html   entry point
style.css    neon CRT aesthetic
game.js      loop, input, screens, HUD
gates.js     gate data, spawning, collision
swarm.js     number units, googly eyes, grid layout
README.md    this file
```
