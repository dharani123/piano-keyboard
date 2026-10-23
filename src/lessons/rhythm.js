import { SEMITONES } from '../data/keymap.js';

// Rhythm patterns: space-separated notes, each with an optional length in
// beats after "/" (default 1). "r" is a rest, "|" a bar line (display only).
//   "C C D/2 | E/0.5 E/0.5 r G/2"
export function parseRhythm(text) {
  const events = [];
  let beat = 0;
  let bar = 0;
  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (token === '|') { bar++; continue; }
    const match = token.match(/^([A-G]#?|r)([+-]*)(?:\/([\d.]+))?$/);
    if (!match) throw new Error(`Bad rhythm token "${token}"`);
    const [, name, shifts, len] = match;
    const beats = len ? Number(len) : 1;
    const rest = name === 'r';
    const oct = [...shifts].reduce((sum, c) => sum + (c === '+' ? 1 : -1), 0);
    events.push({ name, semitone: rest ? null : SEMITONES[name], oct, beat, beats, rest, bar });
    beat += beats;
  }
  return events;
}

export const totalBeats = events => events.reduce((sum, e) => sum + e.beats, 0);

// Timing windows in seconds, and the points each grade is worth
export const GRADES = [
  { grade: 'perfect', within: 0.07, points: 1 },
  { grade: 'good', within: 0.14, points: 0.8 },
  { grade: 'ok', within: 0.25, points: 0.5 },
];
const MAX_WINDOW = GRADES.at(-1).within;

// presses: [{ time (seconds from beat 0), semitone, octave }]
// Each press is matched to the closest unclaimed note of the same pitch.
export function scoreRhythm(events, presses, secondsPerBeat, baseOctave) {
  const notes = events.filter(e => !e.rest);
  const results = notes.map(() => ({ grade: 'miss', dt: null }));
  let extras = 0;

  for (const p of [...presses].sort((a, b) => a.time - b.time)) {
    let best = -1;
    let bestDt = Infinity;
    notes.forEach((e, i) => {
      if (results[i].dt !== null) return;
      if (e.semitone !== p.semitone || baseOctave + e.oct !== p.octave) return;
      const dt = p.time - e.beat * secondsPerBeat;
      if (Math.abs(dt) <= MAX_WINDOW && Math.abs(dt) < Math.abs(bestDt)) { best = i; bestDt = dt; }
    });
    if (best === -1) { extras++; continue; }
    const g = GRADES.find(g => Math.abs(bestDt) <= g.within);
    results[best] = { grade: g.grade, dt: bestDt };
  }

  const points = results.reduce((sum, r) => sum + (GRADES.find(g => g.grade === r.grade)?.points ?? 0), 0);
  const accuracy = Math.max(0, (points - extras * 0.25) / notes.length);
  return { results, extras, accuracy };
}

export function starsForAccuracy(accuracy) {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.7) return 2;
  if (accuracy >= 0.5) return 1;
  return 0;
}
