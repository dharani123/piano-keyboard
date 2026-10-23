import { SEMITONES } from '../data/keymap.js';

// Song patterns: space-separated events, each with an optional length in beats
// after "/" (default 1). Join notes with "," to play them together as a chord.
// "+" / "-" after a note = one octave up / down, "r" is a rest, "|" a bar line.
//   "C E G/2 | C,E,G/4 r"
export function parseSong(text) {
  const events = [];
  let beat = 0;
  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (token === '|') continue;
    const match = token.match(/^([^/]+)(?:\/([\d.]+))?$/);
    if (!match) throw new Error(`Bad song token "${token}"`);
    const [, body, len] = match;
    const beats = len ? Number(len) : 1;
    if (body !== 'r') {
      const notes = body.split(',').map(part => {
        const m = part.match(/^([A-G]#?)([+-]*)$/);
        if (!m) throw new Error(`Bad note "${part}" in "${token}"`);
        const [, name, shifts] = m;
        const oct = [...shifts].reduce((sum, c) => sum + (c === '+' ? 1 : -1), 0);
        return { name, semitone: SEMITONES[name], oct };
      });
      events.push({ beat, beats, notes });
    }
    beat += beats;
  }
  return { events, totalBeats: beat };
}
