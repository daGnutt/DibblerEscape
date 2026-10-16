import { drawTourist, drawDibbler } from './art.js';

// Themed scenery: sunny tropical day / evening. All coordinates are screen pixels; s = tile size.
export const THEMES = {
  day: {
    sea: '#4fc3e8', sand: ['#f4dfa6', '#efd696'], speck: 'rgba(190,150,80,0.35)',
    houses: ['#ff9f8a', '#ffd66b', '#7fdbd0', '#f7b6d2', '#b8e07a'], roof: '#c0553b', shade: 'rgba(120,70,30,0.28)',
    window: '#bfe9ff', water: '#59d4f0', stone: '#e8e2d4', leaf: '#2fa84f', trunk: '#8a5a2b', planter: '#c98f5a',
    overlay: null,
  },
  night: {
    sea: '#0a1a3a', sand: ['#8a7aa8', '#7f6f9e'], speck: 'rgba(30,20,60,0.35)',
    houses: ['#a35a7a', '#a8893f', '#3f8f9a', '#8a5a9a', '#5a8a56'], roof: '#4a2540', shade: 'rgba(10,5,40,0.4)',
    window: '#ffd56b', water: '#4aa6d8', stone: '#9a97b8', leaf: '#1d6a47', trunk: '#4a3322', planter: '#6a4a5a',
    overlay: 'rgba(15,20,70,0.38)',
  },
};

// Deterministic per-tile randomness so the scenery doesn't flicker.
export function hash(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function lineWidth(ctx, s) { ctx.lineWidth = Math.max(1, s * 0.05); ctx.strokeStyle = 'rgba(30,20,20,0.7)'; }

export function drawGround(ctx, th, x, y, px, py, s) {
  ctx.fillStyle = th.sand[(x + y) % 2];
  ctx.fillRect(px, py, s, s);
  const h = hash(x, y);
  ctx.fillStyle = th.speck;
  for (let i = 0; i < 3; i++) {
    const hx = hash(x * 7 + i, y * 13 + 1), hy = hash(x * 5 + 2, y * 11 + i);
    ctx.fillRect(px + hx * s * 0.9, py + hy * s * 0.9, Math.max(1, s * 0.05), Math.max(1, s * 0.05));
  }
  if (h < 0.06) { // tiny shell
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(px + s * 0.5, py + s * 0.6, s * 0.06, s * 0.04, 0, 0, 7); ctx.fill();
  }
}

export function drawHouse(ctx, th, x, y, px, py, s, night) {
  const color = th.houses[Math.floor(hash(x, y) * th.houses.length)];
  ctx.fillStyle = color;
  ctx.fillRect(px, py, s, s);
  ctx.fillStyle = th.roof; // roof edge
  ctx.fillRect(px, py, s, s * 0.22);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(px, py + s * 0.22, s, s * 0.05);
  ctx.fillStyle = th.shade; // ground-level shadow
  ctx.fillRect(px, py + s * 0.85, s, s * 0.15);
  if (hash(x + 99, y + 17) < 0.7) {
    ctx.fillStyle = th.window;
    ctx.fillRect(px + s * 0.3, py + s * 0.42, s * 0.4, s * 0.3);
    ctx.strokeStyle = 'rgba(60,40,30,0.8)';
    ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.strokeRect(px + s * 0.3, py + s * 0.42, s * 0.4, s * 0.3);
    ctx.beginPath(); ctx.moveTo(px + s * 0.5, py + s * 0.42); ctx.lineTo(px + s * 0.5, py + s * 0.72); ctx.stroke();
    if (night) { // glow
      ctx.fillStyle = 'rgba(255,213,107,0.25)';
      ctx.fillRect(px + s * 0.22, py + s * 0.34, s * 0.56, s * 0.46);
    }
  }
}

export function drawPalmTile(ctx, th, px, py, s, t, seed) {
  ctx.fillStyle = th.planter;
  ctx.fillRect(px + s * 0.08, py + s * 0.55, s * 0.84, s * 0.4);
  lineWidth(ctx, s);
  ctx.strokeRect(px + s * 0.08, py + s * 0.55, s * 0.84, s * 0.4);
  const cx = px + s / 2, base = py + s * 0.58, sway = Math.sin(t * 1.5 + seed * 10) * s * 0.04;
  ctx.strokeStyle = th.trunk; ctx.lineWidth = s * 0.1; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx, base); ctx.quadraticCurveTo(cx + s * 0.1, base - s * 0.5, cx + sway, base - s * 0.9); ctx.stroke();
  ctx.fillStyle = th.leaf; ctx.strokeStyle = 'rgba(20,60,30,0.8)'; ctx.lineWidth = Math.max(1, s * 0.03);
  const topX = cx + sway, topY = base - s * 0.9;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + sway * 0.05;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * s * 0.3, topY + Math.sin(a) * s * 0.15 - s * 0.18, topX + Math.cos(a) * s * 0.5, topY + Math.sin(a) * s * 0.3 + s * 0.05);
    ctx.quadraticCurveTo(topX + Math.cos(a) * s * 0.3, topY + Math.sin(a) * s * 0.15 - s * 0.05, topX, topY);
    ctx.fill(); ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

export function drawFountain(ctx, th, px, py, s, t, night) {
  ctx.fillStyle = th.stone;
  ctx.beginPath(); ctx.ellipse(px + s / 2, py + s * 0.62, s * 0.46, s * 0.3, 0, 0, 7); ctx.fill();
  lineWidth(ctx, s); ctx.stroke();
  ctx.fillStyle = th.water;
  ctx.beginPath(); ctx.ellipse(px + s / 2, py + s * 0.62, s * 0.38, s * 0.23, 0, 0, 7); ctx.fill();
  ctx.fillStyle = th.stone;
  ctx.fillRect(px + s * 0.44, py + s * 0.3, s * 0.12, s * 0.32);
  ctx.beginPath(); ctx.ellipse(px + s / 2, py + s * 0.32, s * 0.16, s * 0.07, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1.5, s * 0.04);
  for (let i = -1; i <= 1; i++) { // water jets
    const ph = (t * 1.3 + i * 0.33) % 1;
    ctx.beginPath();
    ctx.moveTo(px + s / 2, py + s * 0.3);
    ctx.quadraticCurveTo(px + s / 2 + i * s * 0.2, py + s * (0.05 + 0.1 * ph), px + s / 2 + i * s * 0.32, py + s * 0.56);
    ctx.stroke();
  }
  if (night) {
    const g = ctx.createRadialGradient(px + s / 2, py + s * 0.55, s * 0.1, px + s / 2, py + s * 0.55, s * 1.2);
    g.addColorStop(0, 'rgba(120,220,255,0.35)'); g.addColorStop(1, 'rgba(120,220,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - s, py - s * 0.6, s * 3, s * 3);
  }
}

// Animated title-screen scene: the tourist sprints past palms with a mob of dibblers close behind.
export function drawSplash(ctx, th, night, W, H, t) {
  const horizon = H * 0.5, ground = H * 0.74;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, night ? '#0b1840' : '#58c8f5');
  sky.addColorStop(1, night ? '#7a5aa6' : '#d8f4ff');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizon + 1);

  // sun / moon with slowly turning rays
  const sx = W * 0.8, sy = H * 0.2, sr = Math.min(W, H) * 0.07;
  if (!night) {
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t * 0.2);
    ctx.fillStyle = 'rgba(255,230,120,0.5)';
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath(); ctx.moveTo(sr * 1.2, -sr * 0.12); ctx.lineTo(sr * 2, 0); ctx.lineTo(sr * 1.2, sr * 0.12); ctx.fill();
    }
    ctx.restore();
  }
  ctx.fillStyle = night ? '#f3f0d8' : '#ffd84d';
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, 7); ctx.fill();
  if (night) {
    ctx.fillStyle = '#7a5aa6';
    ctx.beginPath(); ctx.arc(sx + sr * 0.4, sy - sr * 0.1, sr * 0.85, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 40; i++) ctx.fillRect(hash(i, 1) * W, hash(i, 2) * horizon * 0.9, 2, 2);
  }

  // sea with waves
  ctx.fillStyle = th.sea;
  ctx.fillRect(0, horizon, W, ground - horizon);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  for (let r = 0; r < 4; r++) {
    ctx.beginPath();
    for (let x = 0; x <= W; x += 12) {
      const y = horizon + 14 + r * (ground - horizon) * 0.22 + Math.sin(x * 0.03 + t * 1.5 + r) * 4;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }

  // beach
  ctx.fillStyle = th.sand[0];
  ctx.fillRect(0, ground - 6, W, H - ground + 6);
  ctx.fillStyle = th.speck;
  for (let i = 0; i < 80; i++) ctx.fillRect(hash(i, 7) * W, ground + hash(i, 8) * (H - ground), 3, 3);

  // scrolling palms give a sense of running
  const ps = H * 0.24, span = W + ps * 3;
  for (let i = 0; i < 4; i++) {
    const x = ((i * span) / 4 - t * ps * 1.6) % span;
    drawPalmTile(ctx, th, (x < -ps ? x + span : x) - ps / 2, ground - ps * 0.85, ps, t, i);
  }

  // chase scene
  const cs = Math.min(W * 0.2, H * 0.24), feet = H * 0.9, y = feet - cs * 0.42;
  const tx = W * 0.62;
  for (let i = 0; i < 5; i++) { // dust trail
    const k = (t * 3 + i * 0.2) % 1;
    ctx.fillStyle = `rgba(${night ? '220,210,230' : '120,100,80'},${0.5 * (1 - k)})`;
    ctx.beginPath(); ctx.arc(tx - cs * 0.3 - k * cs * 0.9, feet - cs * 0.08 - k * cs * 0.25, cs * 0.07 * (1 + k * 1.5), 0, 7); ctx.fill();
  }
  const colors = ['#8e5cd9', '#2fb67c', '#d9803a', '#c94a6b'];
  for (let i = 3; i >= 0; i--) {
    const dx = tx - cs * (1.25 + i * 0.85) + Math.sin(t * 3 + i) * cs * 0.08;
    drawDibbler(ctx, dx, y + Math.abs(Math.sin(t * 9 + i)) * -cs * 0.05, cs * 0.95, t + i, colors[i], true);
  }
  drawTourist(ctx, tx, y, cs, t * 20, false, true, 1);
  ctx.font = `${cs * 0.35}px sans-serif`; // tossed cash
  ctx.textAlign = 'center';
  for (let i = 0; i < 3; i++) {
    const k = (t * 0.8 + i / 3) % 1;
    ctx.globalAlpha = 1 - k * k;
    ctx.fillText('💵', tx - cs * 0.4 - k * cs * 2.2, feet - cs * 0.9 - Math.sin(k * Math.PI) * cs * 0.8);
  }
  ctx.globalAlpha = 1;
}
