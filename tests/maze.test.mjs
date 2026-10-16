import assert from 'node:assert/strict';
import { rng, generateMaze, bfs } from '../js/maze.js';

for (let seed = 1; seed <= 50; seed++) {
  const cw = 5 + (seed % 10), ch = 4 + (seed % 6);
  const m = generateMaze(cw, ch, rng(seed));
  assert.equal(m.w, cw * 2 + 1);
  const path = bfs(m.grid, [1, 1], [m.w - 2, m.h - 2]);
  assert.ok(path, `seed ${seed}: hotel reachable`);
  assert.ok(bfs(m.grid, [1, 1], [m.w - 2, 1]), `seed ${seed}: bus reachable`);
}
console.log('maze tests passed');
