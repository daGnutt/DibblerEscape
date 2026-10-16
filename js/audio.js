let ctx = null;
const load = key => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
const save = (key, v) => { try { localStorage.setItem(key, v ? '1' : '0'); } catch { /* storage unavailable */ } };
export let muted = load('dibblerMuted');
export const toggleMute = () => { muted = !muted; save('dibblerMuted', muted); return muted; };
export let musicMuted = load('dibblerMusicMuted');
export const toggleMusicMute = () => { musicMuted = !musicMuted; save('dibblerMusicMuted', musicMuted); return musicMuted; };

function ensureCtx() {
  ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function noteAt(freq, when, dur, type = 'square', vol = 0.08, slide = 0) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, when);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), when + dur);
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g).connect(ctx.destination);
  o.start(when);
  o.stop(when + dur);
}

function tone(freq, dur, type, vol, delay = 0, slide = 0) {
  if (muted) return;
  try {
    ensureCtx();
    noteAt(freq, ctx.currentTime + delay, dur, type, vol, slide);
  } catch { /* audio unavailable */ }
}

export const sfx = {
  coin() { tone(900, 0.08, 'square', 0.08); tone(1300, 0.15, 'square', 0.08, 0.08); },
  purr() { tone(90, 0.25, 'sawtooth', 0.06); tone(100, 0.25, 'sawtooth', 0.06, 0.25); },
  alert() { tone(300, 0.2, 'sawtooth', 0.05, 0, 200); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, i * 0.12)); },
  lose() { [400, 300, 220, 150].forEach((f, i) => tone(f, 0.25, 'sawtooth', 0.08, i * 0.2)); },
  tip() { [784, 988, 1175].forEach((f, i) => tone(f, 0.15, 'triangle', 0.09, i * 0.08)); },
  meow() {
    tone(700, 0.12, 'triangle', 0.07, 0, 350);
    tone(1050, 0.28, 'triangle', 0.07, 0.12, -600);
  },
  // Dibbler exclamation: a rising-then-falling vowel-ish buzz ("Hey!") with a pitch variation per dibbler.
  shout(p = 1) {
    if (muted) return;
    try {
      ensureCtx();
      const when = ctx.currentTime, dur = 0.28;
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(160 * p, when);
      o.frequency.linearRampToValueAtTime(260 * p, when + dur * 0.4);
      o.frequency.linearRampToValueAtTime(190 * p, when + dur);
      f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(700, when);
      f.frequency.linearRampToValueAtTime(1500, when + dur * 0.6);
      g.gain.setValueAtTime(0.0001, when);
      g.gain.linearRampToValueAtTime(0.16, when + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(f).connect(g).connect(ctx.destination);
      o.start(when);
      o.stop(when + dur);
    } catch { /* audio unavailable */ }
  },
  step(vol = 0.12, pitch = 900) { step_(vol, pitch); },
};

// ---- Music: a bouncy island loop (C - Am - F - G). Tempo rises with intensity (0..1). ----
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const BASE_BPM = 118, MAX_BPM = 178;
const ROOTS = [48, 45, 41, 43];
const CHORDS = [[64, 67], [64, 69], [65, 69], [62, 67]];
const MELODY = [
  76, 0, 72, 74, 76, 0, 79, 76,
  76, 0, 72, 69, 72, 0, 74, 72,
  72, 0, 69, 72, 77, 0, 76, 72,
  74, 0, 71, 74, 79, 0, 77, 74,
];
let noiseBuf = null;
let musicTimer = null, musicOn = false, nextTime = 0, step = 0, intensity = 0;

export const setMusicIntensity = v => { intensity = Math.max(0, Math.min(1, v)); };

function getNoiseBuf() {
  noiseBuf = noiseBuf || (() => {
    const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.05), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  })();
  return noiseBuf;
}

// Short pitter-patter tick; vol scales with distance, pitch varies so steps don't sound identical.
function step_(vol, pitch) {
  if (muted || vol <= 0.002) return;
  try {
    ensureCtx();
    const when = ctx.currentTime, dur = 0.05;
    const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = getNoiseBuf();
    f.type = 'bandpass'; f.frequency.value = pitch * (0.9 + Math.random() * 0.2); f.Q.value = 2;
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(ctx.destination);
    src.start(when);
  } catch { /* audio unavailable */ }
}

function hat(when, vol) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = getNoiseBuf();
  f.type = 'highpass'; f.frequency.value = 6000;
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(when);
}

function playStep(s, when, dur) {
  const bar = Math.floor(s / 8), i = s % 8;
  const m = MELODY[s];
  if (m) noteAt(hz(m), when, dur * 1.6, 'triangle', 0.07);
  if (i === 0 || i === 3 || i === 7) noteAt(hz(ROOTS[bar]), when, dur * 1.4, 'sine', 0.12);
  if (i === 4) noteAt(hz(ROOTS[bar] + 7), when, dur * 1.2, 'sine', 0.1);
  if (i === 2 || i === 6) CHORDS[bar].forEach(c => noteAt(hz(c), when, dur * 0.8, 'square', 0.025));
  if (i === 0 || i === 4) noteAt(70, when, 0.12, 'sine', 0.18, -40);
  hat(when, i % 2 ? 0.05 : 0.025);
  if (intensity > 0.6) { // extra offbeat sparkle when things get tense
    hat(when + dur / 2, 0.03);
    if (m) noteAt(hz(m + 12), when + dur / 2, dur * 0.6, 'triangle', 0.03);
  }
}

function schedule() {
  while (nextTime < ctx.currentTime + 0.15) {
    const dur = 60 / (BASE_BPM + (MAX_BPM - BASE_BPM) * intensity) / 2;
    if (!muted && !musicMuted) playStep(step, nextTime, dur);
    nextTime += dur;
    step = (step + 1) % 32;
  }
}

export function startMusic() {
  if (musicOn) return;
  try {
    ensureCtx();
    musicOn = true;
    nextTime = ctx.currentTime + 0.1;
    musicTimer = setInterval(schedule, 25);
  } catch { /* audio unavailable */ }
}

export function stopMusic() {
  if (!musicOn) return;
  musicOn = false;
  clearInterval(musicTimer);
  musicTimer = null;
}
