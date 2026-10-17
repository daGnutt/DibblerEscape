export const AUTO_SPRINT_START_DIST = 1;
export const AUTO_SPRINT_STOP_DIST = 3.5;

// Hysteresis: start when a hunting dibbler is within START, keep going until every dibbler is at least STOP away.
export function updateAutoSprint(active, dibblers, player, start = AUTO_SPRINT_START_DIST, stop = AUTO_SPRINT_STOP_DIST) {
  const dist = d => Math.hypot(d.x - player.x, d.y - player.y);
  if (active) return dibblers.some(d => dist(d) < stop);
  return dibblers.some(d => (d.sees || d.chasing) && !(d.slip > 0) && !(d.stun > 0) && !(d.distracted > 0) && dist(d) < start);
}

// Stamina only comes back while standing still (and after the post-sprint delay).
export function regenStamina(stamina, max, rate, dt, moving, regenWait) {
  if (moving || regenWait > 0) return stamina;
  return Math.min(max, stamina + rate * dt);
}
