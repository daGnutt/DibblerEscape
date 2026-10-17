const API_URL = 'https://script.google.com/macros/s/AKfycbwTOC7mvfNLtz3mObbvQOzOy-5GE8fDbB5Zq8pb27-tNlMsYA69aa8EqITvBNw2AVPb/exec';
export const LIST_SIZE = 10;
export const NAME_MAX = 20;

// null = not loaded (yet); the server may cap its list differently, we assume LIST_SIZE entries.
let globalScores = null, globalFailed = false;
export const getGlobal = () => globalScores;
export const globalStatus = () => (globalScores ? 'ok' : globalFailed ? 'offline' : 'loading');

function loadLocal() {
  try {
    const list = JSON.parse(localStorage.getItem('dibblerScores') || '[]');
    if (Array.isArray(list) && list.length) return list.slice(0, LIST_SIZE);
  } catch { /* fall through to migration */ }
  const old = Number(localStorage.getItem('dibblerHigh') || 0);
  return old > 0 ? [{ name: 'You', points: old, level: 0 }] : [];
}
let localScores = loadLocal();
export const getLocal = () => localScores;

const qualifies = (list, points) => points > 0 && (list.length < LIST_SIZE || points > list[list.length - 1].points);
export const qualifiesLocal = points => qualifies(localScores, points);
export const qualifiesGlobal = points => !!globalScores && qualifies(globalScores, points);

export const cleanName = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
export const savedName = () => cleanName(localStorage.getItem('dibblerName'));

export function addLocal(name, points, level) {
  localScores = [...localScores, { name, points, level }].sort((a, b) => b.points - a.points).slice(0, LIST_SIZE);
  try { localStorage.setItem('dibblerScores', JSON.stringify(localScores)); } catch { /* storage unavailable */ }
}

export async function fetchGlobal() {
  try {
    const res = await fetch(API_URL);
    const json = await res.json();
    if (json.status !== 'success' || !Array.isArray(json.data)) throw new Error('bad response');
    globalScores = json.data
      .map(r => ({ name: String(r.Name ?? ''), points: Number(r.Points) || 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, LIST_SIZE);
    globalFailed = false;
  } catch {
    if (!globalScores) globalFailed = true;
  }
}

export async function submitGlobal(name, points, level, runtime) {
  try {
    // A plain-text body avoids a CORS preflight, which Apps Script can't answer.
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ name, points, level, runtime }) });
  } catch { /* offline: the score stays in the local list */ }
  await fetchGlobal();
}

// Shows a name box over the canvas; calls done(name) on Enter/OK, or done(null) on Escape/Skip.
export function promptName(done) {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:50%;top:64%;transform:translateX(-50%);display:flex;gap:8px;z-index:10';
  const input = document.createElement('input');
  input.maxLength = NAME_MAX;
  input.placeholder = 'Your name';
  input.value = savedName();
  input.style.cssText = 'font:20px system-ui,sans-serif;padding:8px 12px;border-radius:8px;border:2px solid #ffd84d;width:min(60vw,260px)';
  const mk = (label, bg) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `font:bold 18px system-ui,sans-serif;padding:8px 14px;border-radius:8px;border:0;background:${bg};cursor:pointer`;
    return b;
  };
  const ok = mk('OK', '#9fe870'), skip = mk('Skip', '#ddd');
  let finished = false;
  const finish = name => {
    if (finished) return;
    finished = true;
    box.remove();
    if (name) { try { localStorage.setItem('dibblerName', name); } catch { /* ignore */ } }
    done(name);
  };
  const submit = () => finish(cleanName(input.value) || 'Anonymous');
  ok.onclick = submit;
  skip.onclick = () => finish(null);
  input.onkeydown = e => {
    if (e.key === 'Enter') submit();
    else if (e.key === 'Escape') finish(null);
  };
  box.append(input, ok, skip);
  document.body.append(box);
  input.focus();
  input.select();
}
