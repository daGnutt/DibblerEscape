const API = 'https://highscore.gnutt.se/api/games/dibbler/boards/default';
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
    const res = await fetch(`${API}?limit=${LIST_SIZE}`);
    const json = await res.json();
    if (json.status !== 'success' || !Array.isArray(json.data)) throw new Error('bad response');
    globalScores = json.data
      .map(r => ({ name: String(r.name ?? ''), points: Number(r.points) || 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, LIST_SIZE);
    globalFailed = false;
  } catch {
    if (!globalScores) globalFailed = true;
  }
}

export async function submitGlobal(name, points, level, runtime) {
  try {
    // A plain-text body avoids a CORS preflight.
    await fetch(`${API}/scores`, { method: 'POST', body: JSON.stringify({ name, points, level, time: runtime }) });
  } catch { /* offline: the score stays in the local list */ }
  await fetchGlobal();
}
