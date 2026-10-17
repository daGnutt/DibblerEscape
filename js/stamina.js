export const AUTO_SPRINT_DIST = 3.5;

// A dibbler that has eyes on the tourist (or is chasing) and is near enough to be a threat.
export function dibblerClosingIn(dibblers, player, dist = AUTO_SPRINT_DIST) {
  return dibblers.some(d => (d.sees || d.chasing) && !(d.slip > 0) && !(d.stun > 0) && !(d.distracted > 0)
    && Math.hypot(d.x - player.x, d.y - player.y) < dist);
}

// Stamina only comes back while standing still (and after the post-sprint delay).
export function regenStamina(stamina, max, rate, dt, moving, regenWait) {
  if (moving || regenWait > 0) return stamina;
  return Math.min(max, stamina + rate * dt);
}
