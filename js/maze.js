export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Returns {w,h,grid}; grid[y][x] is 1 = wall, 0 = street. Size is (2cw+1)x(2ch+1).
export function generateMaze(cw, ch, rand, braid = 0.4) {
  const w = cw * 2 + 1, h = ch * 2 + 1;
  const grid = Array.from({ length: h }, () => Array(w).fill(1));
  const seen = Array.from({ length: ch }, () => Array(cw).fill(false));
  const stack = [[0, 0]];
  seen[0][0] = true;
  grid[1][1] = 0;
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const opts = dirs.filter(([dx, dy]) => {
      const nx = cx + dx, ny = cy + dy;
      return nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen[ny][nx];
    });
    if (!opts.length) { stack.pop(); continue; }
    const [dx, dy] = opts[Math.floor(rand() * opts.length)];
    const nx = cx + dx, ny = cy + dy;
    seen[ny][nx] = true;
    grid[cy * 2 + 1 + dy][cx * 2 + 1 + dx] = 0;
    grid[ny * 2 + 1][nx * 2 + 1] = 0;
    stack.push([nx, ny]);
  }
  // Knock out some walls to create loops so you can't be trapped in dead ends.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (grid[y][x] === 1 && (x + y) % 2 === 1 && rand() < braid) grid[y][x] = 0;
    }
  }
  // Open plazas: clear 3x3 blocks around random cell centres, often leaving a single block (a fountain) in the middle.
  const plazas = Math.max(2, Math.round((cw * ch) / 6));
  for (let i = 0; i < plazas; i++) {
    const px = 1 + 2 * Math.floor(rand() * cw), py = 1 + 2 * Math.floor(rand() * ch);
    for (let y = py - 1; y <= py + 1; y++) {
      for (let x = px - 1; x <= px + 1; x++) {
        if (x > 0 && y > 0 && x < w - 1 && y < h - 1) grid[y][x] = 0;
      }
    }
    const interior = px > 1 && px < w - 2 && py > 1 && py < h - 2;
    if (interior && rand() < 0.7) grid[py][px] = 1;
  }
  return { w, h, grid };
}

export function bfs(grid, from, to) {
  const h = grid.length, w = grid[0].length;
  const prev = new Int32Array(w * h).fill(-1);
  const start = from[1] * w + from[0], goal = to[1] * w + to[0];
  const q = [start];
  prev[start] = start;
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    if (cur === goal) break;
    const cx = cur % w, cy = (cur / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || grid[ny][nx] || prev[ny * w + nx] !== -1) continue;
      prev[ny * w + nx] = cur;
      q.push(ny * w + nx);
    }
  }
  if (prev[goal] === -1) return null;
  const path = [];
  for (let c = goal; c !== start; c = prev[c]) path.push([c % w, (c / w) | 0]);
  path.reverse();
  return path;
}
