import { SEMITONES } from '../data/keymap.js';

// Rhythm patterns: space-separated notes, each with an optional length in
// beats after "/" (default 1). "r" is a rest, "|" a bar line (display only).
// Notes joined by commas are a chord: one event per note, all on the same beat.
// "~" after a note ties it to the next one, which must be the same pitch: one press, held for both.
//   "C C D/2 | E/0.5 E/0.5 r G/2 | C,E,G/2 F,A,C+/2 | G/2~ | G/2"
export function parseRhythm(text) {
  const events = [];
  let beat = 0;
  let bar = 0;
  let tiedFrom = null; // the note the previous token tied onward
  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (token === '|') { bar++; continue; }
    const whole = token.match(/^([^/~]+)(?:\/([\d.]+))?(~)?$/);
    if (!whole) throw new Error(`Bad rhythm token "${token}"`);
    const beats = whole[2] ? Number(whole[2]) : 1;
    if (tiedFrom) {
      const same = `${tiedFrom.name}${tiedFrom.shifts}` === whole[1];
      if (!same) throw new Error(`Tie to a different note at "${token}"`);
      tiedFrom.event.beats += beats;
      beat += beats;
      if (!whole[3]) tiedFrom = null;
      continue;
    }
    for (const part of whole[1].split(',')) {
      const match = part.match(/^([A-G]#?|r)([+-]*)$/);
      if (!match) throw new Error(`Bad rhythm token "${token}"`);
      const [, name, shifts] = match;
      const rest = name === 'r';
      const oct = [...shifts].reduce((sum, c) => sum + (c === '+' ? 1 : -1), 0);
      events.push({ name, semitone: rest ? null : SEMITONES[name], oct, beat, beats, rest, bar });
      if (whole[3]) tiedFrom = { name, shifts, event: events.at(-1) };
    }
    beat += beats;
  }
  return events;
}

export const totalBeats = events => Math.max(0, ...events.map(e => e.beat + e.beats));

// Events gathered by the beat they start on, so a chord is one slot
export function slotsOf(events) {
  const slots = [];
  for (const e of events) {
    if (slots.at(-1)?.beat === e.beat) slots.at(-1).notes.push(e);
    else slots.push({ beat: e.beat, beats: e.beats, rest: e.rest, notes: [e] });
  }
  return slots;
}

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
