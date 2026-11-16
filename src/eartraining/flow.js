import { parseNotes } from '../data/songs.js';

// Falling-notes flow for the Ear Training patterns, like Relax: the patterns from `from`
// to the last one, each played ROUNDS times in a row at one beat per swara, with
// REST_BEATS of quiet before the next pattern. Returns a player.js song plus where
// each pattern sits, so the screen can show which one is falling.

export const ROUNDS = 2;
export const REST_BEATS = 4;
export const FLOW_BPM = 52; // slower than the Carnatic 70 (the user, 2026-11-16: 70 → 60 → 52); 75% = 39 BPM
export const FLOW_SPEEDS = [0.5, 0.75, 1];
export const DEFAULT_SPEED = 0.75;

const SWARA_OF = { C: 'Sa', D: 'Ri', E: 'Ga', F: 'Ma', G: 'Pa' };

// patterns: [{ title, names: ['C', 'D', ...] }]
export function buildFlow(patterns, from = 0) {
  const events = [];
  const segments = [];
  let beat = 0;
  patterns.slice(from).forEach((p, k) => {
    const start = beat;
    const notes = parseNotes(p.names.join(' '));
    for (let r = 0; r < ROUNDS; r++) {
      for (const n of notes) {
        events.push({ beat, beats: 1, notes: [{ name: SWARA_OF[n.name] ?? n.name, semitone: n.semitone, oct: n.oct }] });
        beat++;
      }
    }
    segments.push({ index: from + k, title: p.title, start, end: beat });
    beat += REST_BEATS;
  });
  return { song: { events, totalBeats: beat - REST_BEATS }, segments };
}

// The pattern falling at `beat` (the next one during a rest), or the last one after the end
export const segmentAt = (segments, beat) => segments.find(s => beat < s.end) ?? segments.at(-1);
