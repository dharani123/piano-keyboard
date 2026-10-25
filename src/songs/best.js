import { PASS_STARS } from '../lessons/progress.js';

// Best stars per song and mode: { "songId:mode": 0-3 }. Carnatic exercises
// finished in Relax are stored as "songId:relax", which counts as a pass.
const KEY = 'desk-piano-songs';
export function loadBest() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; }
}
export function saveBest(best) {
  try { localStorage.setItem(KEY, JSON.stringify(best)); } catch { /* storage unavailable */ }
}

// ★★ in either mode, or played through in Relax
export const isPassed = (best, id) =>
  Math.max(best[`${id}:wait`] ?? 0, best[`${id}:play`] ?? 0, best[`${id}:relax`] ?? 0) >= PASS_STARS;

export const withRelaxFinish = (best, id) => ({ ...best, [`${id}:relax`]: PASS_STARS });

// Relax calls this when an exercise has been played to its last line
export function markRelaxFinished(id) {
  saveBest(withRelaxFinish(loadBest(), id));
}
