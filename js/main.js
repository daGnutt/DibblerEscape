import { rng, generateMaze, bfs } from './maze.js';
import { drawTourist, drawFriend, drawDibbler, drawCat, drawCrab, drawBanana, drawStall, drawHotel, drawBus } from './art.js';
import { sfx, toggleMute, muted, toggleMusicMute, musicMuted, startMusic, stopMusic, setMusicIntensity } from './audio.js';
import { THEMES, hash, drawGround, drawHouse, drawPalmTile, drawFountain, drawSplash } from './scenery.js';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d', { alpha: false });
const START_CASH = 3;
const PLAYER_SPEED = 3.0, SPRINT_SPEED = 5.2, PLAYER_R = 0.28, CATCH_DIST = 0.55;
const STAMINA_MAX = 100, STAMINA_DRAIN = 40, STAMINA_REGEN = 22, STAMINA_REGEN_DELAY = 0.8, STAMINA_MIN_RESTART = 25;
const PET_TIME = 2, CAT_COOLDOWN = 8, CAT_MEOW_DIST = 2.5, CAT_MEOW_COOLDOWN = 6;
const ROBES = ['#8e5cd9', '#2fb67c', '#d9803a', '#c94a6b', '#4a7fd9'];
const NAMES = ['Dave', 'Mo', 'Fatima', 'Raj', 'Lucia', 'Omar', 'Bea', 'Kofi', 'Yuki', 'Stan', 'Ines', 'Gus'];
const LOST_BEFORE_CHAT = 4, GIVE_UP_TIME = 12, CHAT_COOLDOWN = 10, RALLY_TIME = 9, SHOUT_RADIUS = 6, START_GRACE = 3;
const VIEW_RANGE = Infinity, VIEW_FOV = (100 * Math.PI) / 180, NOTICE_RADIUS = 1.2, TURN_SPEED = 6, ALERT_TURN_SPEED = 18, PUFF_TILES = 4;

let state = 'title'; // title | play | pause | levelDone | gameOver
let level = 1, totalScore = 0, cash = START_CASH, time = 0;
let high = Number(localStorage.getItem('dibblerHigh') || 0);
const CRAB_SPEED = 1.6, CRAB_PINCH_DIST = 0.5, CRAB_COOLDOWN = 2, STUN_TIME = 0.7, YELP_NOISE_RADIUS = 4;
const PEEL_R = 0.4, PLAYER_SLIDE_TIME = 0.6, PLAYER_SLIDE_SPEED = 5, DIBBLER_SLIP_TIME = 2, DIBBLER_SLIDE_TIME = 0.5;
const PEEL_DROP_MIN = 8, PEEL_DROP_RANGE = 12, MAX_PEELS = 14, PEEL_ARM_TIME = 2;
const STALL_CHANCE = 0.1, MAX_STALLS = 6, STALL_HIT_DIST = 0.5, STALL_NOISE_RADIUS = 5;
let stalls = [], peels = [], crabs = [], friend = null, maze, player, dibblers, cats, exits, petting, flashMsg, rally, chat, chatCooldown = 0, rallyId = 0, startGrace = 0;
const SHOUTS = [
  'Hey, Icelandic man!',
  'Hello my friend!',
  'Psst! Best price!',
  'Sir! Sir! Looking?',
  'Special price, only for you!',
  'Cheap cheap, very good!',
  'Come, come, look!',
  'Hey tourist! Free sample!',
  'Genuine fake watch!',
  'Buy one, get one free!',
  'My friend, where you from?',
  'Hat? Sunglasses? Coconut?',
  'Taxi? Tour? Massage?',
  'I give you good deal!',
  'Hello, Mr. Viking!',
  'Almost free, sir!',
  'No hassle, just look!',
  'Sausage! Best sausage!',
];
let popups = [];
let tile = 32, ox = 0, oy = 0, W = 0, H = 0;

const keys = new Set();
const joy = { active: false, id: null, sx: 0, sy: 0, x: 0, y: 0 };
const sprintBtn = { down: false, id: null };
let touchSeen = false;
const kickBtnRect = () => ({ x: W - 70, y: H - 180, r: 36 });
let particles = [], puffAcc = 0, stepAcc = 0;
const DAY_SMOKE = 'rgba(85,75,70,';
const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
let night = !!(darkQuery && darkQuery.matches);
if (darkQuery) darkQuery.addEventListener('change', e => { night = e.matches; });
const sprintBtnRect = () => ({ x: W - 70, y: H - 80, r: 44 });

// Firefox's software-heavy canvas 2D is slow at high pixel counts, so render it at a lower resolution (override with ?dpr=).
const isFirefox = /Firefox\//.test(navigator.userAgent);
const dprParam = Number(new URLSearchParams(location.search).get('dpr'));
const MAX_DPR = dprParam > 0 ? dprParam : isFirefox ? 1 : 2;
let dpr = 1;
const debug = new URLSearchParams(location.search).has('debug');
const showFps = new URLSearchParams(location.search).has('fps');
let fpsText = '', fpsAcc = 0, fpsFrames = 0, fpsWorst = 0, fpsWork = 0;
let staticLayer = null, staticKey = '', lightSprite = null, lightKey = '';

function makeLayer(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * dpr)); c.height = Math.max(1, Math.ceil(h * dpr));
  const g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [c, g];
}

// Ground and houses never change within a level, so render them once and blit.
function ensureStaticLayer(th) {
  const key = `${tile}|${dpr}|${night}`;
  if (staticLayer && key === staticKey && maze.grid === staticMazeGrid) return;
  staticMazeGrid = maze.grid;
  staticKey = key;
  const [c, g] = makeLayer(tile * maze.w, tile * maze.h);
  for (let y = 0; y < maze.h; y++) {
    for (let x = 0; x < maze.w; x++) {
      const px = x * tile, py = y * tile;
      drawGround(g, th, x, y, px, py, tile);
      if (!maze.grid[y][x]) continue;
      if (!isProp(x, y)) drawHouse(g, th, x, y, px, py, tile, night);
    }
  }
  staticLayer = c;
}

const openAt = (x, y) => x >= 0 && y >= 0 && x < maze.w && y < maze.h && !maze.grid[y][x];
const isFountain = (x, y) => openAt(x - 1, y) && openAt(x + 1, y) && openAt(x, y - 1) && openAt(x, y + 1);
const isProp = (x, y) => isFountain(x, y) || hash(x + 3, y + 8) < 0.16;
let staticMazeGrid = null;

function ensureLightSprite() {
  const key = `${tile}|${dpr}`;
  if (lightSprite && key === lightKey) return;
  lightKey = key;
  const [c, g] = makeLayer(tile * 7, tile * 7);
  const gr = g.createRadialGradient(tile * 3.5, tile * 3.5, tile * 0.3, tile * 3.5, tile * 3.5, tile * 3.5);
  gr.addColorStop(0, 'rgba(255,214,140,0.28)'); gr.addColorStop(1, 'rgba(255,214,140,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, tile * 7, tile * 7);
  lightSprite = c;
}

// Procedural sprites are expensive to stroke every frame (esp. in Firefox), so bake animation frames once and blit them.
const spriteCache = new Map();
function sprite(key, size, drawFn) {
  const full = `${key}|${tile}|${dpr}|${night}`;
  let e = spriteCache.get(full);
  if (e) return e;
  const w = tile * size;
  const [c, g] = makeLayer(w, w);
  g.translate(w / 2, w / 2);
  drawFn(g, tile);
  e = { c, w };
  spriteCache.set(full, e);
  return e;
}
const blit = (e, x, y) => ctx.drawImage(e.c, x - e.w / 2, y - e.w / 2, e.w, e.w);
const blitLying = (e, x, y, dir) => {
  ctx.save();
  ctx.translate(x, y + tile * 0.2);
  ctx.rotate((-Math.PI / 2) * (dir < 0 ? -1 : 1));
  blit(e, 0, 0);
  ctx.restore();
};
const frameOf = (t, rate, n) => Math.floor(((t * rate) % 1 + 1) % 1 * n);

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (maze) layout();
}
window.addEventListener('resize', resize);

function layout() {
  spriteCache.clear();
  const topPad = 44;
  tile = Math.floor(Math.min(W / maze.w, (H - topPad) / maze.h));
  ox = Math.floor((W - tile * maze.w) / 2);
  oy = topPad + Math.floor((H - topPad - tile * maze.h) / 2);
}

const isWall = (x, y) => y < 0 || x < 0 || y >= maze.h || x >= maze.w || maze.grid[y][x] === 1;
let openCache = null, openCacheGrid = null;
const openTiles = () => {
  if (openCacheGrid === maze.grid) return openCache;
  const r = [];
  for (let y = 0; y < maze.h; y++) for (let x = 0; x < maze.w; x++) if (!maze.grid[y][x]) r.push([x, y]);
  openCache = r; openCacheGrid = maze.grid;
  return r;
};

function startLevel() {
  const rand = rng((Date.now() ^ (level * 7919)) >>> 0);
  const cw = Math.min(5 + level, 14), ch = Math.min(4 + level, 9);
  maze = generateMaze(cw, ch, rand);
  const all = openTiles();
  const isEdge = ([x, y]) => x === 1 || y === 1 || x === maze.w - 2 || y === maze.h - 2;
  const edges = all.filter(isEdge);
  const start = edges[Math.floor(rand() * edges.length)];
  const dist = new Map(all.map(t => [t.join(), (bfs(maze.grid, start, t) || []).length]));
  const far = Math.max(...edges.map(t => dist.get(t.join()))) * 0.6;
  const pickExit = taken => {
    const c = edges.filter(t => dist.get(t.join()) >= far && !taken.some(o => Math.hypot(o[0] - t[0], o[1] - t[1]) < 4));
    const pool = c.length ? c : edges.filter(t => dist.get(t.join()) > 0);
    return pool[Math.floor(rand() * pool.length)];
  };
  const hotel = pickExit([]);
  exits = [{ type: 'hotel', x: hotel[0], y: hotel[1] }];
  if (level % 3 === 0) {
    const bus = pickExit([hotel]);
    exits.push({ type: 'bus', x: bus[0], y: bus[1] });
  }
  player = { x: start[0] + 0.5, y: start[1] + 0.5, dir: 1, moving: false, runPhase: 0, stamina: STAMINA_MAX, sprinting: false, exhausted: false, regenWait: 0 };
  petting = null; popups = []; noises = []; particles = []; rally = null; chat = null; chatCooldown = 0; startGrace = START_GRACE;
  const open = openTiles().filter(([x, y]) => {
    const p = bfs(maze.grid, start, [x, y]);
    return p && p.length >= 8 && !hasLineOfSight(player.x, player.y, x + 0.5, y + 0.5) && !exits.some(e => e.x === x && e.y === y);
  });
  const pick = () => open.splice(Math.floor(rand() * open.length), 1)[0];
  const nD = Math.min(2 + level, 12), nC = Math.min(1 + Math.floor(level / 2), 6);
  dibblers = Array.from({ length: nD }, (_, i) => {
    const [x, y] = pick();
    return { x: x + 0.5, y: y + 0.5, path: [], repath: 0, face: Math.random() * Math.PI * 2, faceTarget: 0, chasing: false, sees: false, lost: 0, lastSeen: null, name: NAMES[i % NAMES.length], color: ROBES[i % ROBES.length] };
  });
  cats = Array.from({ length: nC }, () => {
    const [x, y] = pick();
    return { x: x + 0.5, y: y + 0.5, path: [], cooldown: 0, tipped: false, wait: rand() * 3 };
  });
  // Stalls sit just past the free end of a wall segment (a wall tile with exactly one wall neighbour).
  const stallSpots = [];
  const dirs4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 1; y < maze.h - 1; y++) {
    for (let x = 1; x < maze.w - 1; x++) {
      if (!isWall(x, y)) continue;
      const wallN = dirs4.filter(([dx, dy]) => isWall(x + dx, y + dy));
      if (wallN.length !== 1) continue;
      const [dx, dy] = wallN[0];
      const sx = x - dx, sy = y - dy;
      if (!isWall(sx, sy) && !exits.some(e => e.x === sx && e.y === sy) && (sx !== start[0] || sy !== start[1])) stallSpots.push([sx, sy]);
    }
  }
  stalls = [];
  while (stallSpots.length && stalls.length < MAX_STALLS) {
    const [x, y] = stallSpots.splice(Math.floor(rand() * stallSpots.length), 1)[0];
    if (rand() < STALL_CHANCE && !stalls.some(s => s.x === x + 0.5 && s.y === y + 0.5)) stalls.push({ x: x + 0.5, y: y + 0.5, toppled: false });
  }
  peels = Array.from({ length: Math.min(2 + Math.floor(level / 2), 8) }, () => {
    const [x, y] = pick();
    return { x: x + 0.5, y: y + 0.5 };
  });
  crabs = Array.from({ length: Math.min(1 + Math.floor(level / 2), 8) }, () => {
    const [x, y] = pick();
    return { x: x + 0.5, y: y + 0.5, path: [], cooldown: 0, wait: rand() * 2 };
  });
  friend = nD >= 4 ? { x: player.x, y: player.y, path: [], repath: 0, dir: 1, runPhase: 0, moving: false, fallen: 0 } : null;
  layout();
  flashMsg = { text: `Level ${level}: reach the ${exits.length > 1 ? 'hotel or the bus' : 'hotel'}!`, t: 3 };
  state = 'play';
}

function inputVec() {
  let x = 0, y = 0;
  if (keys.has('ArrowLeft') || keys.has('a')) x -= 1;
  if (keys.has('ArrowRight') || keys.has('d')) x += 1;
  if (keys.has('ArrowUp') || keys.has('w')) y -= 1;
  if (keys.has('ArrowDown') || keys.has('s')) y += 1;
  if (joy.active) { x += joy.x; y += joy.y; }
  const m = Math.hypot(x, y);
  return m > 1 ? [x / m, y / m] : [x, y];
}

function collides(x, y, r) {
  for (let ty = Math.floor(y - r); ty <= Math.floor(y + r); ty++) {
    for (let tx = Math.floor(x - r); tx <= Math.floor(x + r); tx++) {
      if (!isWall(tx, ty)) continue;
      const cx = Math.max(tx, Math.min(x, tx + 1)), cy = Math.max(ty, Math.min(y, ty + 1));
      if (Math.hypot(x - cx, y - cy) < r) return true;
    }
  }
  return false;
}

// When blocked head-on by a corner, slide sideways toward the nearest offset that lets the move through.
function nudgeAround(e, dx, dy, r) {
  const step = Math.hypot(dx, dy), horiz = dx !== 0;
  for (let o = 0.04; o <= 0.5; o += 0.04) {
    const free = s => horiz
      ? !collides(e.x + dx, e.y + s * o, r) && !collides(e.x, e.y + s * o, r)
      : !collides(e.x + s * o, e.y + dy, r) && !collides(e.x + s * o, e.y, r);
    const pos = free(1), neg = free(-1);
    if (!pos && !neg) continue;
    const s = pos && neg ? 0 : pos ? 1 : -1;
    const side = s || ((horiz ? e.y : e.x) % 1 < 0.5 ? -1 : 1);
    const m = Math.min(o, step) * side;
    if (horiz) { if (!collides(e.x, e.y + m, r)) e.y += m; }
    else if (!collides(e.x + m, e.y, r)) e.x += m;
    return;
  }
}

function moveEntity(e, dx, dy, r) {
  const blockedX = dx && collides(e.x + dx, e.y, r), blockedY = dy && collides(e.x, e.y + dy, r);
  if (!blockedX) e.x += dx;
  if (!collides(e.x, e.y + dy, r)) e.y += dy;
  else if (blockedY && !dx) nudgeAround(e, 0, dy, r);
  if (blockedX && !dy) nudgeAround(e, dx, 0, r);
}

function followPath(e, speed, dt) {
  if (!e.path.length) return;
  const [tx, ty] = e.path[0];
  const dx = tx + 0.5 - e.x, dy = ty + 0.5 - e.y, d = Math.hypot(dx, dy);
  const step = speed * dt;
  if (d <= step) { e.x = tx + 0.5; e.y = ty + 0.5; e.path.shift(); }
  else { e.x += (dx / d) * step; e.y += (dy / d) * step; }
  e.dir = dx < 0 ? -1 : 1;
  e.faceTarget = Math.atan2(dy, dx);
}

const angleDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

function turnToward(d, dt) {
  const delta = Math.atan2(Math.sin(d.faceTarget - d.face), Math.cos(d.faceTarget - d.face));
  const rate = (d.chasing ? ALERT_TURN_SPEED : TURN_SPEED) * dt;
  d.face += Math.max(-rate, Math.min(rate, delta));
}

// A dibbler sees you if you're close, or inside its view cone, in range and not behind a wall.
function canSee(d) {
  const dist = Math.hypot(player.x - d.x, player.y - d.y);
  if (dist > VIEW_RANGE || !hasLineOfSight(d.x, d.y, player.x, player.y)) return false;
  return dist < NOTICE_RADIUS || angleDiff(d.face, Math.atan2(player.y - d.y, player.x - d.x)) <= VIEW_FOV / 2;
}

function viewConePoints(d, rays = 14) {
  const pts = [[d.x, d.y]];
  for (let i = 0; i <= rays; i++) {
    const a = d.face - VIEW_FOV / 2 + (VIEW_FOV * i) / rays;
    const cx = Math.cos(a), cy = Math.sin(a);
    let r = 0;
    while (r < VIEW_RANGE && !isWall(Math.floor(d.x + cx * (r + 0.15)), Math.floor(d.y + cy * (r + 0.15)))) r += 0.15;
    pts.push([d.x + cx * r, d.y + cy * r]);
  }
  return pts;
}

const tileOf = e => Array.isArray(e) ? e : [Math.floor(e.x), Math.floor(e.y)];

function hasLineOfSight(x0, y0, x1, y1) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.ceil(dist / 0.15);
  for (let i = 1; i < steps; i++) {
    const f = i / steps;
    if (isWall(Math.floor(x0 + (x1 - x0) * f), Math.floor(y0 + (y1 - y0) * f))) return false;
  }
  return true;
}

function shoutSpotted(spotter) {
  sfx.shout(0.9 + Math.random() * 0.4);
  spotter.puffTiles = PUFF_TILES;
  popups.push({ x: spotter.x, y: spotter.y - 0.8, text: SHOUTS[Math.floor(Math.random() * SHOUTS.length)], t: 1.5 });
  const seen = tileOf(player);
  for (const o of dibblers) {
    if (o === spotter || o.sees || Math.hypot(o.x - spotter.x, o.y - spotter.y) > SHOUT_RADIUS) continue;
    o.chasing = true;
    o.lost = 0;
    o.lastSeen = seen;
    o.repath = 0;
    o.puffTiles = PUFF_TILES;
  }
}

function emitPuff(x, y, color) {
  particles.push({ x: x + (Math.random() - 0.5) * 0.15, y, vx: (Math.random() - 0.5) * 0.4, vy: -0.3 - Math.random() * 0.3, t: 0, life: 0.5 + Math.random() * 0.3, r: 0.08 + Math.random() * 0.05, color });
}

function groupChat(sender) {
  chatCooldown = CHAT_COOLDOWN;
  rally = { id: ++rallyId, tile: sender.lastSeen || tileOf(sender), t: RALLY_TIME };
  sender.rallyDone = rally.id;
  chat = { text: `💬 ${sender.name}: lost the tourist! Everyone close in!`, t: 3 };
  sfx.alert();
}

const FRIEND_DISTRACT_TIME = 3, FRIEND_DISTRACT_COOLDOWN = 6, FRIEND_NOTICE_DIST = 1.5;
const FRIEND_FALL_TIME = 5, FRIEND_KICK_DIST = 1.3, KICK_NOISE_RADIUS = 3, KICK_NOISE_TIME = 0.8;
const SPRINT_NOISE_RADIUS = 2.5;
let noises = [];

// Dibblers that aren't already on the hunt come to investigate a noise.
function makeNoise(x, y, radius, retarget = true) {
  noises.push({ x, y, t: 0, r: radius });
  const heard = [Math.floor(x), Math.floor(y)];
  for (const d of dibblers) {
    if (d.sees || (d.chasing && !retarget) || d.distracted > 0 || Math.hypot(d.x - x, d.y - y) > radius) continue;
    d.chasing = true;
    d.lost = 0;
    d.lastSeen = heard;
    d.repath = 0;
  }
}

function updateFriend(dt) {
  const f = friend;
  f.moving = false;
  if (f.fallen > 0) {
    f.fallen -= dt;
    if (f.slideT > 0) { f.slideT -= dt; moveEntity(f, f.slideDir[0] * 4 * dt, f.slideDir[1] * 4 * dt, 0.28); }
    return;
  }
  f.repath -= dt;
  const dist = Math.hypot(player.x - f.x, player.y - f.y);
  if (dist > 1.4 && f.repath <= 0) {
    f.repath = 0.35;
    f.path = bfs(maze.grid, tileOf(f), tileOf(player)) || [];
  } else if (dist <= 1.4) f.path = [];
  const bx = f.x, by = f.y;
  followPath(f, PLAYER_SPEED * 0.95, dt);
  f.moving = Math.hypot(f.x - bx, f.y - by) > 0.0005;
  if (f.moving) f.runPhase += dt * 12;
}

function kickFriend() {
  if (state !== 'play' || !friend || friend.fallen > 0 || petting) return;
  if (Math.hypot(player.x - friend.x, player.y - friend.y) > FRIEND_KICK_DIST) return;
  friend.fallen = FRIEND_FALL_TIME;
  friend.path = [];
  sfx.alert();
  popups.push({ x: friend.x, y: friend.y - 0.8, text: 'Ow! My shin!', t: 1.8 });
  makeNoise(friend.x, friend.y, KICK_NOISE_RADIUS);
}

// Aim where the tourist will be by the time this dibbler arrives, backing off to the nearest open tile.
function interceptTile(d, speed) {
  const dist = Math.hypot(d.x - player.x, d.y - player.y);
  const lead = Math.min(dist / speed, 1.5);
  const vx = player.vx || 0, vy = player.vy || 0;
  for (let f = 1; f > 0; f -= 0.1) {
    const tx = Math.floor(player.x + vx * lead * f), ty = Math.floor(player.y + vy * lead * f);
    if (maze.grid[ty] && maze.grid[ty][tx] === 0) return [tx, ty];
  }
  return tileOf(player);
}

function update(dt) {
  time += dt;
  if (flashMsg) { flashMsg.t -= dt; if (flashMsg.t <= 0) flashMsg = null; }
  popups = popups.filter(p => (p.t -= dt) > 0);
  noises = noises.filter(n => (n.t += dt) < KICK_NOISE_TIME);
  for (const p of particles) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  particles = particles.filter(p => p.t < p.life);
  if (state !== 'play') return;

  const prevPX = player.x, prevPY = player.y;
  if (petting) {
    petting.t -= dt;
    if (petting.t <= 0) {
      const cat = petting.cat;
      cat.cooldown = CAT_COOLDOWN;
      if (!cat.tipped && cash < START_CASH) {
        cash++;
        cat.tipped = true;
        sfx.tip();
        popups.push({ x: player.x, y: player.y - 0.8, text: 'Lucky cat! +1 cash', t: 1.8 });
      }
      petting = null;
    }
  } else {
    const stunned = player.stun > 0;
    if (stunned) player.stun -= dt;
    const sliding = player.slide > 0;
    if (sliding) player.slide -= dt;
    const [vx, vy] = sliding ? player.slideDir : stunned ? [0, 0] : inputVec();
    if (vx || vy) player.dir = vx < 0 ? -1 : vx > 0 ? 1 : player.dir;
    const wantsSprint = !sliding && (keys.has('Shift') || sprintBtn.down) && (vx || vy);
    player.sprinting = !!wantsSprint && !player.exhausted && player.stamina > 0;
    const spd = sliding ? PLAYER_SLIDE_SPEED : player.sprinting ? SPRINT_SPEED : PLAYER_SPEED;
    if (player.sprinting && player.moving) {
      puffAcc += dt;
      stepAcc += dt;
      if (puffAcc > 0.04) { puffAcc = 0; emitPuff(player.x - player.dir * 0.15, player.y + 0.38, 'rgba(235,225,200,'); }
      if (stepAcc > 0.16) { stepAcc = 0; sfx.step(0.14, 1000); if (startGrace <= 0) makeNoise(player.x, player.y, SPRINT_NOISE_RADIUS, false); }
    }
    const bx = player.x, by = player.y;
    moveEntity(player, vx * spd * dt, vy * spd * dt, PLAYER_R);
    player.moving = Math.hypot(player.x - bx, player.y - by) > 0.0005;
    if (player.moving) player.runPhase += dt * (player.sprinting ? 20 : 12);
    if (player.sprinting) {
      player.stamina = Math.max(0, player.stamina - STAMINA_DRAIN * dt);
      player.regenWait = STAMINA_REGEN_DELAY;
      if (player.stamina === 0) player.exhausted = true;
    }
  }
  if (!player.sprinting) {
    player.regenWait = Math.max(0, player.regenWait - dt);
    if (!player.regenWait) player.stamina = Math.min(STAMINA_MAX, player.stamina + STAMINA_REGEN * dt);
    if (player.exhausted && player.stamina >= STAMINA_MIN_RESTART) player.exhausted = false;
  }
  if (petting) { player.moving = false; player.sprinting = false; }
  // Smoothed velocity so hunters can lead their target.
  const k = Math.min(1, dt * 12);
  player.vx = (player.vx || 0) + ((player.x - prevPX) / dt - (player.vx || 0)) * k;
  player.vy = (player.vy || 0) + ((player.y - prevPY) / dt - (player.vy || 0)) * k;

  if (player.sprinting) {
    for (const st of stalls) {
      if (st.toppled || Math.hypot(st.x - player.x, st.y - player.y) > STALL_HIT_DIST) continue;
      st.toppled = true;
      sfx.crash();
      popups.push({ x: st.x, y: st.y - 0.8, text: 'CRASH!', t: 1.4 });
      makeNoise(st.x, st.y, STALL_NOISE_RADIUS);
      for (let n = 0, tries = 0; n < 3 && tries < 12; tries++) {
        const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 0.6;
        const px = st.x + Math.cos(a) * r, py = st.y + Math.sin(a) * r;
        if (isWall(Math.floor(px), Math.floor(py))) continue;
        peels.push({ x: px, y: py, arm: 0.5 });
        n++;
      }
    }
  }

  for (let i = peels.length - 1; i >= 0; i--) {
    const pl = peels[i];
    if (!(player.slide > 0) && !petting && Math.hypot(pl.x - player.x, pl.y - player.y) < PEEL_R) {
      const m = Math.hypot(player.vx || 0, player.vy || 0);
      player.slideDir = m > 0.1 ? [player.vx / m, player.vy / m] : [player.dir, 0];
      player.slide = PLAYER_SLIDE_TIME;
      sfx.yelp();
      popups.push({ x: player.x, y: player.y - 0.8, text: 'Whoa!', t: 1.2 });
      peels.splice(i, 1);
      continue;
    }
    if (friend && friend.fallen <= 0 && Math.hypot(pl.x - friend.x, pl.y - friend.y) < PEEL_R) {
      const [tx, ty] = friend.path[0] || [];
      const m = tx === undefined ? 0 : Math.hypot(tx + 0.5 - friend.x, ty + 0.5 - friend.y);
      friend.slideDir = m > 0.01 ? [(tx + 0.5 - friend.x) / m, (ty + 0.5 - friend.y) / m] : [friend.dir, 0];
      friend.slideT = DIBBLER_SLIDE_TIME;
      friend.fallen = FRIEND_FALL_TIME;
      friend.path = [];
      popups.push({ x: friend.x, y: friend.y - 0.8, text: 'Whoa! My banana!', t: 1.8 });
      peels.splice(i, 1);
      continue;
    }
    if (pl.arm > 0) { pl.arm -= dt; continue; }
    for (const d of dibblers) {
      if (d.slip > 0 || Math.hypot(pl.x - d.x, pl.y - d.y) >= PEEL_R) continue;
      d.slip = DIBBLER_SLIP_TIME;
      d.slipDir = [Math.cos(d.face), Math.sin(d.face)];
      d.path = [];
      popups.push({ x: d.x, y: d.y - 0.8, text: 'Waaah!', t: 1.5 });
      peels.splice(i, 1);
      break;
    }
  }

  for (const c of crabs) {
    c.cooldown = Math.max(0, c.cooldown - dt);
    if (c.cooldown === 0 && !petting && !(player.stun > 0) && Math.hypot(c.x - player.x, c.y - player.y) < CRAB_PINCH_DIST) {
      c.cooldown = CRAB_COOLDOWN;
      player.stun = STUN_TIME;
      c.path = [];
      sfx.yelp();
      popups.push({ x: player.x, y: player.y - 0.8, text: 'Ouch! Crab!', t: 1.2 });
      makeNoise(player.x, player.y, YELP_NOISE_RADIUS);
    }
    if (!c.path.length) {
      c.wait -= dt;
      if (c.wait <= 0) {
        const [cx, cy] = tileOf(c);
        const near = openTiles().filter(([x, y]) => Math.abs(x - cx) + Math.abs(y - cy) <= 5);
        c.path = bfs(maze.grid, [cx, cy], near[Math.floor(Math.random() * near.length)]) || [];
        c.wait = 0.5 + Math.random() * 2;
      }
    } else followPath(c, CRAB_SPEED, dt);
  }

  for (const c of cats) {
    c.cooldown = Math.max(0, c.cooldown - dt);
    c.meowCd = Math.max(0, (c.meowCd || 0) - dt);
    if (!petting && c.cooldown === 0 && c.meowCd === 0 && Math.hypot(c.x - player.x, c.y - player.y) < CAT_MEOW_DIST) {
      c.meowCd = CAT_MEOW_COOLDOWN;
      sfx.meow();
    }
    if (petting && petting.cat === c) continue;
    if (!c.path.length) {
      c.wait -= dt;
      if (c.wait <= 0) {
        const [cx, cy] = tileOf(c);
        const near = openTiles().filter(([x, y]) => Math.abs(x - cx) + Math.abs(y - cy) <= 6);
        const t = near[Math.floor(Math.random() * near.length)];
        c.path = bfs(maze.grid, [cx, cy], t) || [];
        c.wait = 1 + Math.random() * 3;
      }
    } else followPath(c, 1.1, dt);
    if (!petting && c.cooldown === 0 && Math.hypot(c.x - player.x, c.y - player.y) < 0.6) {
      petting = { cat: c, t: PET_TIME };
      sfx.purr();
      popups.push({ x: c.x, y: c.y - 0.6, text: 'Must pet the cat!', t: 1.5 });
    }
  }

  if (friend) updateFriend(dt);

  // Hunting dibblers are a bit faster than walking but slower than sprinting.
  const speed = 3.3 + Math.min(level, 10) * 0.07;
  chatCooldown = Math.max(0, chatCooldown - dt);
  startGrace = Math.max(0, startGrace - dt);
  if (rally) { rally.t -= dt; if (rally.t <= 0) rally = null; }
  if (chat) { chat.t -= dt; if (chat.t <= 0) chat = null; }
  for (let i = dibblers.length - 1; i >= 0; i--) {
    const d = dibblers[i];
    d.repath -= dt;
    const fromX = d.x, fromY = d.y;
    const dist = Math.hypot(d.x - player.x, d.y - player.y);
    d.distractCd = Math.max(0, (d.distractCd || 0) - dt);
    if (d.distracted > 0) {
      d.distracted -= dt;
      if (d.distracted <= 0) { d.distracted = 0; d.distractCd = FRIEND_DISTRACT_COOLDOWN; }
    } else if (friend && d.distractCd === 0 && !dibblers.some(o => o.distracted > 0) && Math.hypot(d.x - friend.x, d.y - friend.y) < FRIEND_NOTICE_DIST) {
      d.distracted = FRIEND_DISTRACT_TIME;
      d.chasing = false; d.lastSeen = null; d.path = [];
      popups.push({ x: d.x, y: d.y - 0.8, text: 'Oh, hello there!', t: 1.5 });
    }
    const distracted = d.distracted > 0;
    d.peelTimer = (d.peelTimer ?? PEEL_DROP_MIN + Math.random() * PEEL_DROP_RANGE) - dt;
    if (d.peelTimer <= 0) {
      // Only roaming dibblers litter; hunters keep their eyes on the tourist.
      if (!d.sees && !d.chasing && !distracted && !(d.slip > 0) && peels.length < MAX_PEELS) peels.push({ x: d.x, y: d.y, arm: PEEL_ARM_TIME });
      d.peelTimer = PEEL_DROP_MIN + Math.random() * PEEL_DROP_RANGE;
    }
    d.sees = !distracted && !(d.slip > 0) && startGrace <= 0 && canSee(d);
    if (d.sees) {
      if (!d.chasing) shoutSpotted(d);
      d.chasing = true;
      d.lost = 0;
      d.lastSeen = tileOf(player);
      if (rally) d.rallyDone = rally.id; // has eyes on the tourist: ignore the group chat
    } else if (d.chasing) {
      d.lost += dt;
      const arrived = d.lastSeen && Math.hypot(d.x - (d.lastSeen[0] + 0.5), d.y - (d.lastSeen[1] + 0.5)) < 0.3;
      if (arrived) {
        // Nobody here: tell the group chat and go back to roaming right away.
        if (chatCooldown === 0) groupChat(d);
        d.chasing = false; d.lastSeen = null; d.path = []; d.repath = 0;
      } else {
        if (d.lost > LOST_BEFORE_CHAT && chatCooldown === 0) groupChat(d);
        if (d.lost > GIVE_UP_TIME) { d.chasing = false; d.lastSeen = null; }
      }
    }
    if (d.repath <= 0) {
      d.repath = 0.35;
      let target = null;
      const rallying = rally && d.rallyDone !== rally.id;
      if (d.sees) target = interceptTile(d, speed);
      else if (d.chasing && d.lastSeen) target = d.lastSeen;
      else if (rallying) {
        const [tx, ty] = tileOf(d);
        if (tx === rally.tile[0] && ty === rally.tile[1]) d.rallyDone = rally.id;
        else target = rally.tile;
      }
      if (target) d.path = bfs(maze.grid, tileOf(d), target) || [];
      else if (!d.path.length) {
        const open = openTiles();
        d.path = bfs(maze.grid, tileOf(d), open[Math.floor(Math.random() * open.length)]) || [];
      }
    }
    const hunting = d.sees || d.chasing || (rally && d.rallyDone !== rally.id);
    if (d.slip > 0) {
      d.slip -= dt;
      if (DIBBLER_SLIP_TIME - d.slip < DIBBLER_SLIDE_TIME) moveEntity(d, d.slipDir[0] * 4 * dt, d.slipDir[1] * 4 * dt, 0.28);
      d.repath = 0;
    } else if (distracted) {
      d.faceTarget = Math.atan2(friend.y - d.y, friend.x - d.x);
    } else if (d.sees && (dist < 1.2 || !d.path.length)) {
      // Close in on the exact position so a stationary (petting) player can't dodge by tile offset.
      const m = Math.max(dist, 0.001);
      d.x += ((player.x - d.x) / m) * Math.min(speed * dt, dist);
      d.y += ((player.y - d.y) / m) * Math.min(speed * dt, dist);
      d.path = [];
      d.faceTarget = Math.atan2(player.y - d.y, player.x - d.x);
    } else {
      followPath(d, d.sees ? speed : hunting ? speed * 0.85 : speed * 0.35, dt);
    }
    if (d.sees) d.faceTarget = Math.atan2(player.y - d.y, player.x - d.x);
    if (d.puffTiles > 0) {
      const moved = Math.hypot(d.x - fromX, d.y - fromY);
      d.puffTiles -= moved;
      d.puffAcc = (d.puffAcc || 0) + dt;
      d.stepAcc = (d.stepAcc || 0) + dt;
      if (moved > 0 && d.stepAcc > 0.14) { d.stepAcc = 0; sfx.step(0.1 * Math.max(0, 1 - dist / 9), 700); }
      if (moved > 0 && d.puffAcc > 0.05) { d.puffAcc = 0; emitPuff(d.x, d.y + 0.35, 'rgba(210,210,210,'); }
    }
    turnToward(d, dt);
    if (dist < CATCH_DIST && !(d.slip > 0)) {
      cash--;
      sfx.coin();
      popups.push({ x: player.x, y: player.y - 0.8, text: 'You throw money! -1 cash', t: 1.5 });
      dibblers.splice(i, 1);
      if (cash <= 0) { endGame(); return; }
    }
  }

  for (const e of exits) {
    if (Math.hypot(e.x + 0.5 - player.x, e.y + 0.5 - player.y) < 0.6) {
      const gained = cash * 100 + level * 50;
      totalScore += gained;
      sfx.win();
      state = 'levelDone';
      flashMsg = null;
      return;
    }
  }
}

function endGame() {
  state = 'gameOver';
  sfx.lose();
  if (totalScore > high) { high = totalScore; localStorage.setItem('dibblerHigh', String(high)); }
}

function startGame() { level = 1; totalScore = 0; cash = START_CASH; startLevel(); }

function advance() {
  if (state === 'title' || state === 'gameOver') startGame();
  else if (state === 'levelDone') {
    if (totalScore > high) { high = totalScore; localStorage.setItem('dibblerHigh', String(high)); }
    level++; startLevel();
  } else if (state === 'pause') state = 'play';
}

// Stroked text (especially emoji) is costly per frame in Firefox, so render each string once to a sprite.
const textCache = new Map();
function textSprite(str, size, color) {
  const key = `${size}|${color}|${dpr}|${str}`;
  let e = textCache.get(key);
  if (e) return e;
  if (textCache.size > 300) textCache.clear();
  const font = `bold ${size}px "Comic Sans MS", system-ui, sans-serif`;
  const g0 = ctx;
  g0.font = font;
  const pad = Math.ceil(size * 0.2);
  const w = Math.ceil(g0.measureText(str).width) + pad * 2, h = Math.ceil(size * 1.6) + pad;
  const [c, g] = makeLayer(w, h);
  g.font = font; g.textAlign = 'left';
  g.lineWidth = size * 0.15; g.lineJoin = 'round'; g.strokeStyle = '#222';
  g.strokeText(str, pad, size * 1.2);
  g.fillStyle = color;
  g.fillText(str, pad, size * 1.2);
  e = { c, w, h, pad, base: size * 1.2 };
  textCache.set(key, e);
  return e;
}

function text(str, x, y, size, color = '#fff', align = 'center') {
  const e = textSprite(str, size, color);
  const tw = e.w - e.pad * 2;
  const left = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2;
  ctx.drawImage(e.c, left - e.pad, y - e.base, e.w, e.h);
}


function overlay(title, lines) {
  ctx.fillStyle = 'rgba(10,20,35,0.8)';
  ctx.fillRect(0, 0, W, H);
  text(title, W / 2, H / 2 - 60, Math.min(64, W / 9), '#ffd84d');
  lines.forEach((l, i) => text(l, W / 2, H / 2 + i * 34, Math.min(22, W / 20)));
}

function keycap(label, x, y) {
  ctx.font = 'bold 14px system-ui, sans-serif';
  const w = Math.max(26, ctx.measureText(label).width + 14);
  ctx.fillStyle = '#f4f4f4'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, w, 26, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#222'; ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + 18);
  return w;
}

function drawKeyHints() {
  const y = H - 40;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.roundRect(8, y - 6, friend ? 440 : 330, 38, 8); ctx.fill();
  let x = 14;
  for (const k of ['←', '↑', '↓', '→']) x += keycap(k, x, y) + 4;
  text('Move', x + 22, y + 20, 15);
  x += 62;
  x += keycap('Shift', x, y) + 6;
  text('Sprint', x + 28, y + 20, 15);
  if (friend) {
    x += 74;
    x += keycap('Ctrl', x, y) + 6;
    text('Kick', x + 22, y + 20, 15);
  }
}

function drawTitle(th) {
  drawSplash(ctx, th, night, W, H, time);
  const size = Math.min(84, W / 7);
  const bounce = Math.sin(time * 3) * size * 0.05;
  ctx.save();
  ctx.translate(W / 2, H * 0.2 + bounce);
  ctx.rotate(Math.sin(time * 1.5) * 0.03);
  text('DIBBLER', 0, 0, size, '#ffd84d');
  text('ESCAPE', 0, size * 0.95, size, '#ff6b9a');
  ctx.restore();
  const fs = Math.min(20, W / 26), py = H * 0.5;
  ctx.fillStyle = 'rgba(10,20,35,0.6)';
  ctx.beginPath(); ctx.roundRect(W / 2 - Math.min(W * 0.46, 380), py - fs * 1.4, Math.min(W * 0.92, 760), fs * 7.2, 14); ctx.fill();
  text('Get back to your hotel with cash left!', W / 2, py, fs);
  text('Dodge the street merchants and crabs. Always pet the cats.', W / 2, py + fs * 1.5, fs);
  text('Arrows / WASD move · Shift sprint · P pause · M mute', W / 2, py + fs * 3, fs * 0.9, '#cfe9ff');
  text(Math.floor(time * 2) % 2 ? 'Press SPACE or tap to start' : '', W / 2, py + fs * 4.6, fs * 1.1, '#9fe870');
  text(`Best: ${high}`, W / 2, py + fs * 6, fs * 0.9, '#ffd84d');
  text('Designed by Gnutt, coded by CoPilot for GitHub', W / 2, H - 16, Math.min(14, W / 34), '#cfe9ff');
}

function drawDebug() {
  const px = x => ox + x * tile, py = y => oy + y * tile;
  ctx.lineWidth = 1;
  for (const d of dibblers) {
    ctx.strokeStyle = d.sees ? 'rgba(255,0,0,0.8)' : 'rgba(0,255,255,0.6)';
    ctx.beginPath();
    for (const [x, y] of viewConePoints(d, 28).slice(1)) { ctx.moveTo(px(d.x), py(d.y)); ctx.lineTo(px(x), py(y)); }
    ctx.stroke();
    // Remaining route and its final destination.
    const route = [[d.x, d.y], ...d.path.map(([x, y]) => [x + 0.5, y + 0.5])];
    if (d.chasing && d.lastSeen) route.push([d.lastSeen[0] + 0.5, d.lastSeen[1] + 0.5]);
    if (route.length > 1) {
      ctx.strokeStyle = d.color; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath();
      route.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, px(x), py(y)));
      ctx.stroke(); ctx.setLineDash([]);
      const [dx, dy] = route[route.length - 1];
      ctx.fillStyle = d.color; ctx.strokeStyle = '#000';
      ctx.beginPath(); ctx.arc(px(dx), py(dy), tile * 0.18, 0, 7); ctx.fill(); ctx.stroke();
      text(d.name, px(dx), py(dy) - tile * 0.25, 12, '#fff');
    }
    ctx.lineWidth = 1;
  }
}

function draw() {
  const th = night ? THEMES.night : THEMES.day;
  ctx.fillStyle = th.sea;
  if (!maze) ctx.fillRect(0, 0, W, H);
  else {
    // Only paint the sea around the maze; the static layer covers the rest.
    const mw = tile * maze.w, mh = tile * maze.h;
    ctx.fillRect(0, 0, W, oy);
    ctx.fillRect(0, oy + mh, W, H - oy - mh);
    ctx.fillRect(0, oy, ox, mh);
    ctx.fillRect(ox + mw, oy, W - ox - mw, mh);
    ensureStaticLayer(th);
    ctx.drawImage(staticLayer, ox, oy, mw, mh);
    const props = [];
    for (let y = 0; y < maze.h; y++) {
      for (let x = 0; x < maze.w; x++) {
        if (!maze.grid[y][x]) continue;
        const px = ox + x * tile, py = oy + y * tile;
        const cx = px + tile / 2, cy = py + tile / 2;
        if (isFountain(x, y)) {
          const fr = frameOf(time * 1.3, 1, 16);
          props.push({ y: y + 0.9, f: () => blit(sprite(`fountain${fr}`, 3, (g, s) => drawFountain(g, th, -s / 2, -s / 2, s, fr / 16 / 1.3, night)), cx, cy) });
        } else if (hash(x + 3, y + 8) < 0.16) {
          const seed = hash(x, y);
          const fr = frameOf(time * 1.5 + seed * 10, 1 / (Math.PI * 2), 16);
          props.push({ y: y + 0.9, f: () => blit(sprite(`palm${fr}`, 2, (g, s) => drawPalmTile(g, th, -s / 2, -s / 2, s, (fr / 16) * Math.PI * 2 / 1.5, 0)), cx, cy) });
        }
      }
    }
    for (const e of exits) {
      const cx = ox + (e.x + 0.5) * tile, cy = oy + (e.y + 0.5) * tile;
      blit(sprite(e.type, 2, (g, s) => (e.type === 'hotel' ? drawHotel : drawBus)(g, 0, 0, s)), cx, cy);
    }
    for (const d of dibblers) {
      const pts = viewConePoints(d);
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo : ctx.moveTo).call(ctx, ox + x * tile, oy + y * tile));
      ctx.closePath();
      ctx.fillStyle = d.sees ? 'rgba(255,60,60,0.3)' : night ? 'rgba(255,240,120,0.28)' : 'rgba(255,200,40,0.2)';
      ctx.fill();
    }
    const ents = [
      ...props,
      ...stalls.map(st => ({ y: st.y, f: () => blit(sprite(`stall${st.toppled}`, 2, (g, s) => drawStall(g, 0, 0, s, st.toppled)), ox + st.x * tile, oy + st.y * tile) })),
      ...peels.map(p => ({ y: p.y - 0.4, f: () => {
        const gx = ox + p.x * tile, gy = oy + p.y * tile;
        blit(sprite('peel', 2, (g, s) => drawBanana(g, 0, 0, s)), gx, gy);
      } })),
      ...crabs.map(c => ({ y: c.y, f: () => {
        const tf = Math.floor(time * 20) % 31;
        blit(sprite(`crab${tf}`, 2, (g, s) => drawCrab(g, 0, 0, s, tf / 20)), ox + c.x * tile, oy + c.y * tile);
      } })),
      ...cats.map(c => ({ y: c.y, f: () => {
        const pet = !!(petting && petting.cat === c);
        const tf = Math.floor(time * 20) % (pet ? 160 : 31);
        blit(sprite(`cat${pet}${tf}`, 2, (g, s) => drawCat(g, 0, 0, s, tf / 20, pet)), ox + c.x * tile, oy + c.y * tile);
      } })),
      ...(friend ? [{ y: friend.y, f: () => {
        const fr = friend.moving ? frameOf(friend.runPhase, 1 / (Math.PI * 2), 16) : 0, fl = friend.fallen > 0, dir = friend.dir < 0 ? -1 : 1;
        blit(sprite(`friend${fr}${friend.moving}${fl}${dir}`, 2, (g, s) => drawFriend(g, 0, 0, s, (fr / 16) * Math.PI * 2, friend.moving, dir, fl)), ox + friend.x * tile, oy + friend.y * tile);
      } }] : []),
      ...dibblers.map(d => ({ y: d.y, f: () => {
        const chasing = !!d.sees;
        const e = sprite(`dib${d.color}${chasing}`, 2, (g, s) => drawDibbler(g, 0, 0, s, 0, d.color, chasing));
        if (d.slip > 0) blitLying(e, ox + d.x * tile, oy + d.y * tile, d.slipDir[0]);
        else blit(e, ox + d.x * tile + Math.sin(time * 8 + d.x) * tile * 0.03, oy + d.y * tile);
      } })),
      { y: player.y, f: () => {
        const fr = player.moving ? frameOf(player.runPhase, 1 / (Math.PI * 2), 16) : 0, dir = player.dir < 0 ? -1 : 1;
        const e = sprite(`tourist${fr}${player.moving}${dir}`, 2, (g, s) => drawTourist(g, 0, 0, s, (fr / 16) * Math.PI * 2, false, player.moving, dir));
        if (player.slide > 0) blitLying(e, ox + player.x * tile, oy + player.y * tile, player.slideDir[0]);
        else blit(e, ox + player.x * tile, oy + player.y * tile);
      } },
    ].sort((a, b) => a.y - b.y);
    ents.forEach(e => e.f());
    for (const p of particles) {
      const k = p.t / p.life;
      ctx.fillStyle = `${night ? p.color : DAY_SMOKE}${((night ? 0.6 : 0.75) * (1 - k)).toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(ox + p.x * tile, oy + p.y * tile, tile * p.r * (1 + k * 1.8), 0, 7);
      ctx.fill();
    }
    for (const n of noises) {
      const k = n.t / KICK_NOISE_TIME;
      ctx.strokeStyle = `rgba(255,255,255,${(0.8 * (1 - k)).toFixed(2)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ox + n.x * tile, oy + n.y * tile, tile * n.r * k, 0, 7);
      ctx.stroke();
    }
    if (th.overlay) {
      ctx.fillStyle = th.overlay;
      ctx.fillRect(ox, oy, tile * maze.w, tile * maze.h);
      const lx = ox + player.x * tile, ly = oy + player.y * tile;
      ensureLightSprite();
      ctx.drawImage(lightSprite, lx - tile * 3.5, ly - tile * 3.5, tile * 7, tile * 7);
    }
    if (debug) drawDebug();
    for (const p of popups) text(p.text, ox + p.x * tile, oy + (p.y - (1.5 - p.t) * 0.3) * tile, Math.max(14, tile * 0.5), '#fff');

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, 40);
    text(`Cash: ${'💵'.repeat(Math.max(0, cash))}`, 12, 28, 20, '#fff', 'left');
    text(`Level ${level}`, W / 2, 28, 20);
    text(`Score ${totalScore}  Best ${high}${muted ? '  🔇' : musicMuted ? '  🎵✖' : ''}`, W - 12, 28, 18, '#fff', 'right');
    if (flashMsg) text(flashMsg.text, W / 2, H - 20, 22, '#ffd84d');
    if (chat) text(chat.text, W / 2, 84, Math.min(20, W / 28), '#9fe870');
    const bw = Math.min(160, W * 0.3);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(10, 46, bw + 4, 14);
    ctx.fillStyle = player.exhausted ? '#e0453a' : player.stamina < 35 ? '#ffb02e' : '#4fd36b';
    ctx.fillRect(12, 48, (bw * player.stamina) / STAMINA_MAX, 10);
    if (!touchSeen) drawKeyHints();
    if (touchSeen) {
      const b = sprintBtnRect();
      ctx.fillStyle = sprintBtn.down ? 'rgba(255,216,77,0.8)' : 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      text('SPRINT', b.x, b.y + 6, 16);
      if (friend) {
        const k = kickBtnRect();
        ctx.fillStyle = friend.fallen > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(77,184,255,0.5)';
        ctx.beginPath(); ctx.arc(k.x, k.y, k.r, 0, 7); ctx.fill();
        text('KICK', k.x, k.y + 6, 15);
      }
    }
    if (joy.active) {
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(joy.sx, joy.sy, 50, 0, 7); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath(); ctx.arc(joy.sx + joy.x * 50, joy.sy + joy.y * 50, 22, 0, 7); ctx.fill();
    }
  }
  if (state === 'title') drawTitle(th);
  if (state === 'pause') overlay('Paused', ['Press P or tap to resume']);
  if (state === 'levelDone') overlay('Made it!', [`Cash left: ${cash}  (+${cash * 100 + level * 50})`, `Total score: ${totalScore}`, 'Press any key or tap for next level']);
  if (state === 'gameOver') overlay('Out of cash!', [`Final score: ${totalScore}`, `Best: ${high}`, 'Press SPACE or tap to retry']);
  if (showFps) text(fpsText, W - 12, H - 12, 14, '#fff', 'right');
}

window.addEventListener('keydown', e => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k.startsWith('Arrow') || k === ' ') e.preventDefault();
  if (k === 'm') { toggleMute(); return; }
  if (k === 'n') { toggleMusicMute(); return; }
  if (state === 'play' && (k === 'p' || k === 'Escape')) { state = 'pause'; return; }
  if (state === 'pause' && (k === 'p' || k === 'Escape')) { state = 'play'; return; }
  if (state === 'title' || state === 'gameOver') {
    if (k === ' ' && !e.repeat) advance();
    return;
  }
  if (state !== 'play' && !e.repeat) { advance(); return; }
  if (k === 'Control') { if (!e.repeat) kickFriend(); return; }
  keys.add(k);
});
window.addEventListener('keyup', e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
window.addEventListener('blur', () => { keys.clear(); if (state === 'play') state = 'pause'; });

canvas.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse') touchSeen = true;
  if (state === 'title' || state === 'gameOver') {
    // Touch screens have no space bar, so taps still start/restart there.
    if (e.pointerType !== 'mouse') advance();
    return;
  }
  if (state !== 'play') { advance(); return; }
  const b = sprintBtnRect();
  if (touchSeen && Math.hypot(e.clientX - b.x, e.clientY - b.y) < b.r) {
    sprintBtn.down = true; sprintBtn.id = e.pointerId;
    return;
  }
  const kb = kickBtnRect();
  if (touchSeen && friend && Math.hypot(e.clientX - kb.x, e.clientY - kb.y) < kb.r) {
    kickFriend();
    return;
  }
  if (e.pointerType === 'mouse') return;
  Object.assign(joy, { active: true, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: 0, y: 0 });
});
canvas.addEventListener('pointermove', e => {
  if (!joy.active || e.pointerId !== joy.id) return;
  const dx = e.clientX - joy.sx, dy = e.clientY - joy.sy, m = Math.hypot(dx, dy);
  const k = m > 50 ? 50 / m : 1;
  joy.x = (dx * k) / 50; joy.y = (dy * k) / 50;
});
const endPointer = e => {
  if (e.pointerId === joy.id) { joy.active = false; joy.x = joy.y = 0; }
  if (e.pointerId === sprintBtn.id) { sprintBtn.down = false; sprintBtn.id = null; }
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

let musicLevel = 0;
function updateMusic(dt) {
  if (state !== 'play') { stopMusic(); return; }
  startMusic();
  let danger = 0;
  for (const d of dibblers) {
    const dist = Math.hypot(d.x - player.x, d.y - player.y);
    danger = Math.max(danger, (d.sees ? 1 : 0.7) * Math.max(0, 1 - dist / 8));
  }
  const tired = player.exhausted ? 1 : Math.max(0, (30 - player.stamina) / 30);
  const broke = cash <= 1 ? 0.8 : 0;
  const target = Math.max(danger, tired * 0.8, broke);
  musicLevel += (target - musicLevel) * Math.min(1, dt * 1.5);
  setMusicIntensity(musicLevel);
}

let last = performance.now();
function frame(now) {
  const rawDt = (now - last) / 1000;
  const dt = Math.min(0.05, rawDt);
  last = now;
  const t0 = performance.now();
  update(dt);
  updateMusic(dt);
  draw();
  if (showFps) {
    const raw = rawDt * 1000;
    fpsAcc += raw; fpsFrames++; fpsWorst = Math.max(fpsWorst, raw); fpsWork = Math.max(fpsWork, performance.now() - t0);
    if (fpsAcc >= 1000) {
      fpsText = `${Math.round((fpsFrames * 1000) / fpsAcc)} fps  worst ${Math.round(fpsWorst)}ms  cpu ${fpsWork.toFixed(1)}ms  dpr ${dpr}`;
      fpsAcc = fpsFrames = fpsWorst = fpsWork = 0;
    }
  }
  requestAnimationFrame(frame);
}
resize();
requestAnimationFrame(frame);
