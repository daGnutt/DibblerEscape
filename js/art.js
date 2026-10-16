// Procedural cartoony sprites, drawn centred at (x,y); s = tile size.
function outline(ctx, s) { ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.strokeStyle = '#222'; }

function ellipse(ctx, x, y, rx, ry, fill, s) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  outline(ctx, s);
  ctx.stroke();
}

function rect(ctx, x, y, w, h, fill, s) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  outline(ctx, s);
  ctx.strokeRect(x, y, w, h);
}

export function drawTourist(ctx, x, y, s, phase, flash, moving, dir = 1, shirt = '#ff6b9a') {
  const swing = moving ? Math.sin(phase) : 0;
  const bounce = moving ? -Math.abs(Math.cos(phase)) * s * 0.07 : 0;
  ctx.save();
  ctx.translate(x, y + bounce);
  ctx.scale(dir < 0 ? -1 : 1, 1);
  if (flash) ctx.globalAlpha = 0.5;
  const limb = (cx, cy, w, h, angle, fill) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    rect(ctx, -w / 2, 0, w, h, fill, s);
    ctx.restore();
  };
  limb(-s * 0.12, s * 0.2, s * 0.15, s * 0.24, swing * 0.8, '#f2d2b3'); // legs
  limb(s * 0.12, s * 0.2, s * 0.15, s * 0.24, -swing * 0.8, '#f2d2b3');
  ctx.rotate(moving ? 0.12 : 0); // lean forward when running
  limb(-s * 0.26, -s * 0.2, s * 0.1, s * 0.24, -swing * 0.9, '#f2d2b3'); // back arm
  rect(ctx, -s * 0.24, s * 0.02, s * 0.48, s * 0.22, '#8a7a4a', s); // cargo shorts
  rect(ctx, -s * 0.24, -s * 0.25, s * 0.48, s * 0.3, shirt, s); // hawaii shirt
  limb(s * 0.26, -s * 0.2, s * 0.1, s * 0.24, swing * 0.9, '#f2d2b3'); // front arm
  ctx.fillStyle = '#ffe14d';
  for (const [dx, dy] of [[-0.12, -0.15], [0.08, -0.1], [0, -0.2], [-0.05, 0]]) {
    ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.04, 0, 7); ctx.fill();
  }
  ellipse(ctx, 0, -s * 0.38, s * 0.15, s * 0.15, '#f2d2b3', s);
  ctx.fillStyle = '#222';
  ctx.fillRect(-s * 0.07, -s * 0.4, s * 0.04, s * 0.05);
  ctx.fillRect(s * 0.03, -s * 0.4, s * 0.04, s * 0.05);
  ellipse(ctx, 0, -s * 0.5, s * 0.28, s * 0.07, '#e8c35a', s); // tropic hat
  ellipse(ctx, 0, -s * 0.56, s * 0.14, s * 0.1, '#e8c35a', s);
  ctx.restore();
}

export function drawDibbler(ctx, x, y, s, t, color, chasing) {
  const sway = Math.sin(t * 8 + x) * s * 0.03;
  ctx.save();
  ctx.translate(x + sway, y);
  ctx.beginPath(); // long flowy robe
  ctx.moveTo(-s * 0.12, -s * 0.25);
  ctx.lineTo(s * 0.12, -s * 0.25);
  ctx.lineTo(s * 0.34, s * 0.42);
  ctx.lineTo(-s * 0.34, s * 0.42);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  outline(ctx, s); ctx.stroke();
  ellipse(ctx, 0, -s * 0.36, s * 0.14, s * 0.14, '#e0b48c', s);
  ctx.fillStyle = '#222';
  ctx.fillRect(-s * 0.06, -s * 0.38, s * 0.04, s * 0.05);
  ctx.fillRect(s * 0.03, -s * 0.38, s * 0.04, s * 0.05);
  ctx.fillStyle = '#3a2a1a';
  ctx.fillRect(-s * 0.09, -s * 0.3, s * 0.18, s * 0.03);
  if (chasing) {
    ctx.fillStyle = '#ff3b3b';
    ctx.font = `bold ${s * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -s * 0.6);
  }
  ctx.restore();
}

export function drawCat(ctx, x, y, s, t, petting) {
  ctx.save();
  ctx.translate(x, y + s * 0.1);
  ctx.strokeStyle = '#f4a23c'; ctx.lineWidth = s * 0.06;
  ctx.beginPath(); // tail
  ctx.moveTo(-s * 0.2, 0);
  ctx.quadraticCurveTo(-s * 0.4, -s * 0.1 + Math.sin(t * 4) * s * 0.1, -s * 0.3, -s * 0.3);
  ctx.stroke();
  ellipse(ctx, 0, 0, s * 0.22, s * 0.15, '#f4a23c', s);
  ellipse(ctx, s * 0.2, -s * 0.1, s * 0.12, s * 0.11, '#f4a23c', s);
  ctx.fillStyle = '#f4a23c';
  ctx.beginPath(); // ears
  ctx.moveTo(s * 0.13, -s * 0.18); ctx.lineTo(s * 0.16, -s * 0.28); ctx.lineTo(s * 0.21, -s * 0.2);
  ctx.moveTo(s * 0.22, -s * 0.2); ctx.lineTo(s * 0.28, -s * 0.28); ctx.lineTo(s * 0.3, -s * 0.15);
  ctx.fill();
  if (petting) {
    ctx.fillStyle = '#ff5c8a';
    ctx.font = `${s * 0.3}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('♥', s * 0.1, -s * 0.35 - ((t * 20) % 10));
  }
  ctx.restore();
}

export function drawCrab(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y + s * 0.1);
  ctx.strokeStyle = '#c0392b'; ctx.lineWidth = s * 0.03;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const w = Math.sin(t * 14 + i * 2) * s * 0.03;
      ctx.beginPath();
      ctx.moveTo(side * s * 0.1, (i - 1) * s * 0.05);
      ctx.lineTo(side * s * 0.22, (i - 1) * s * 0.07 + w);
      ctx.stroke();
    }
    const snap = Math.sin(t * 8 + side) * 0.2;
    ctx.beginPath();
    ctx.moveTo(side * s * 0.1, -s * 0.05);
    ctx.lineTo(side * s * 0.2, -s * 0.15);
    ctx.stroke();
    ellipse(ctx, side * s * 0.22, -s * 0.2, s * (0.07 + snap * 0.1), s * 0.06, '#e74c3c', s);
  }
  ellipse(ctx, 0, 0, s * 0.14, s * 0.1, '#e74c3c', s);
  ellipse(ctx, -s * 0.05, -s * 0.12, s * 0.025, s * 0.025, '#fff', s);
  ellipse(ctx, s * 0.05, -s * 0.12, s * 0.025, s * 0.025, '#fff', s);
  ctx.restore();
}

export function drawBanana(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y + s * 0.1);
  ctx.rotate(-0.3);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3a2a00'; ctx.lineWidth = s * 0.07; ctx.fillStyle = '#ffe14a';
  ctx.beginPath();
  ctx.moveTo(-s * 0.34, -s * 0.04);
  ctx.quadraticCurveTo(-s * 0.05, s * 0.42, s * 0.36, -s * 0.1);
  ctx.quadraticCurveTo(0, s * 0.14, -s * 0.34, -s * 0.04);
  ctx.closePath();
  ctx.stroke(); ctx.fill();
  ctx.fillStyle = '#5a3d00';
  ctx.fillRect(-s * 0.37, -s * 0.07, s * 0.06, s * 0.06);
  ctx.restore();
}

export function drawStall(ctx, x, y, s, toppled) {
  ctx.save();
  ctx.translate(x, y + s * 0.1);
  if (toppled) {
    rect(ctx, -s * 0.3, s * 0.05, s * 0.4, s * 0.1, '#8a5a2b', s);
    rect(ctx, s * 0.05, -s * 0.05, s * 0.28, s * 0.08, '#e0453a', s);
    for (const [fx, fy, c] of [[-s * 0.25, s * 0.22, '#ff9f1c'], [s * 0.0, s * 0.25, '#e63946'], [s * 0.25, s * 0.2, '#9fe870'], [-s * 0.1, s * 0.3, '#ffd84d']]) ellipse(ctx, fx, fy, s * 0.05, s * 0.05, c, s);
    ctx.restore();
    return;
  }
  rect(ctx, -s * 0.3, s * 0.0, s * 0.6, s * 0.22, '#8a5a2b', s);
  rect(ctx, -s * 0.28, -s * 0.3, s * 0.04, s * 0.3, '#6b4a2b', s);
  rect(ctx, s * 0.24, -s * 0.3, s * 0.04, s * 0.3, '#6b4a2b', s);
  for (let i = 0; i < 6; i++) rect(ctx, -s * 0.34 + i * s * 0.115, -s * 0.38, s * 0.115, s * 0.16, i % 2 ? '#fff' : '#e0453a', s);
  for (const [fx, c] of [[-s * 0.18, '#ff9f1c'], [-s * 0.03, '#e63946'], [s * 0.12, '#9fe870'], [s * 0.22, '#ffd84d']]) ellipse(ctx, fx, -s * 0.02, s * 0.055, s * 0.055, c, s);
  ctx.restore();
}

export function drawHotel(ctx, x, y, s) {
  rect(ctx, x - s * 0.4, y - s * 0.4, s * 0.8, s * 0.8, '#fff1c9', s);
  rect(ctx, x - s * 0.4, y - s * 0.4, s * 0.8, s * 0.2, '#e0453a', s);
  rect(ctx, x - s * 0.1, y + s * 0.1, s * 0.2, s * 0.3, '#6b4a2b', s);
  ctx.fillStyle = '#222';
  ctx.font = `bold ${s * 0.17}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('HOTEL', x, y - s * 0.05);
}

export function drawBus(ctx, x, y, s) {
  rect(ctx, x - s * 0.45, y - s * 0.28, s * 0.9, s * 0.5, '#3aa0e0', s);
  ctx.fillStyle = '#d8f1ff';
  for (let i = 0; i < 3; i++) ctx.fillRect(x - s * 0.38 + i * s * 0.26, y - s * 0.2, s * 0.2, s * 0.17);
  ctx.fillStyle = '#222';
  for (const dx of [-0.25, 0.25]) { ctx.beginPath(); ctx.arc(x + dx * s, y + s * 0.24, s * 0.08, 0, 7); ctx.fill(); }
  ctx.font = `bold ${s * 0.15}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('BUS', x, y + s * 0.12);
}

export function drawFriend(ctx, x, y, s, phase, moving, dir, fallen) {
  if (!fallen) { drawTourist(ctx, x, y, s, phase, false, moving, dir, '#4db8ff'); return; }
  ctx.save();
  ctx.translate(x, y + s * 0.2);
  ctx.rotate(-Math.PI / 2 * (dir < 0 ? -1 : 1));
  drawTourist(ctx, 0, 0, s, 0, false, false, 1, '#4db8ff');
  ctx.restore();
}
