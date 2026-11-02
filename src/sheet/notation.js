// Pure helpers for drawing and reading staff notation.
//
// A pitch is written like 'F#4', 'Bb3', 'C5' (letter, optional # or b, octave;
// middle C is C4). `diatonic` counts letter steps (C4 = 28), which is what the
// staff cares about; `semitone` + `oct` (relative to octave 4) is what the
// piano and the step exercises care about.

export const LETTERS = 'CDEFGAB';
const NATURAL = [0, 2, 4, 5, 7, 9, 11];
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function parsePitch(text) {
  const m = text.match(/^([A-G])([#bn]?)(-?\d)$/);
  if (!m) throw new Error(`Bad pitch "${text}"`);
  const [, letter, acc, octText] = m;
  const octave = Number(octText);
  const li = LETTERS.indexOf(letter);
  let semitone = NATURAL[li] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0);
  let oct = octave - 4;
  if (semitone < 0) { semitone += 12; oct -= 1; }
  if (semitone > 11) { semitone -= 12; oct += 1; }
  return { letter, acc, octave, diatonic: octave * 7 + li, semitone, oct, name: NAMES[semitone] };
}

// Pretty name, flats kept as flats: 'Bb4' → 'B♭'
export const prettyPitch = text => {
  const { letter, acc } = parsePitch(text);
  return letter + (acc === '#' ? '♯' : acc === 'b' ? '♭' : '');
};

// The note to press for a pitch, in the shape the step exercises use
export function stepNote(text) {
  const p = parsePitch(text);
  return { name: p.name, semitone: p.semitone, oct: p.oct };
}

// Key signatures: positive = sharps, negative = flats
export const SHARP_ORDER = 'FCGDAEB';
export const FLAT_ORDER = 'BEADGCF';
// Where each sign sits on the treble staff (bass is two octaves lower)
const SHARP_SPOTS = ['F5', 'C5', 'G5', 'D5', 'A4', 'E5', 'B4'];
const FLAT_SPOTS = ['B4', 'E5', 'A4', 'D5', 'G4', 'C5', 'F4'];

export function keySigSpots(keySig, clef = 'treble') {
  const spots = keySig > 0 ? SHARP_SPOTS.slice(0, keySig) : FLAT_SPOTS.slice(0, -keySig);
  const shift = clef === 'bass' ? -14 : 0;
  return spots.map(p => parsePitch(p).diatonic + shift);
}

// The accidental a key signature puts on a letter: '#', 'b' or ''
export function keySigAcc(letter, keySig) {
  if (keySig > 0 && SHARP_ORDER.slice(0, keySig).includes(letter)) return '#';
  if (keySig < 0 && FLAT_ORDER.slice(0, -keySig).includes(letter)) return 'b';
  return '';
}

// What you actually play for a written note: an accidental written in front
// of it wins, then one written earlier in the same bar (same letter and
// octave), then the key signature.
export function soundingPitch(written, keySig = 0, barAccs = {}) {
  const { letter, octave } = parsePitch(written);
  const shown = parsePitch(written).acc;
  const spot = letter + octave;
  const acc = shown || barAccs[spot] || keySigAcc(letter, keySig);
  return letter + (acc === 'n' ? '' : acc) + octave;
}

// Walk a list of staff items and work out the sounding pitch of every note,
// following the bar rule (accidentals last until the next bar line).
export function soundingNotes(items, keySig = 0) {
  let barAccs = {};
  const out = [];
  items.forEach((item, index) => {
    if (item.bar) { barAccs = {}; return; }
    if (!item.n) return;
    const heads = [].concat(item.n);
    const sounding = heads.map(h => {
      const p = parsePitch(h);
      if (p.acc) barAccs[p.letter + p.octave] = p.acc;
      return soundingPitch(h, keySig, barAccs);
    });
    out.push({ index, sounding });
  });
  return out;
}

// Note lengths in beats (a quarter note = 1 beat)
export const DURATIONS = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 };
export const beatsOf = item => {
  const base = DURATIONS[item.d ?? item.r];
  return item.dot ? base * 1.5 : base;
};

const FROM_BEATS = [[4, 'w', false], [3, 'h', true], [2, 'h', false], [1.5, 'q', true], [1, 'q', false],
  [0.75, 'e', true], [0.5, 'e', false], [0.25, 's', false]];

// A rhythm-exercise pattern ("C D E/2 | r G/0.5 G/0.5 …", C = middle C, + and -
// for octaves) as staff items. Eighths that share a beat are beamed.
export function patternToItems(pattern, keySig = 0) {
  const items = [];
  let beat = 0;
  for (const token of pattern.split(/\s+/).filter(Boolean)) {
    if (token === '|') { items.push({ bar: '|' }); continue; }
    const m = token.match(/^([A-G]#?|r)([+-]*)(?:\/([\d.]+))?$/);
    if (!m) throw new Error(`Bad rhythm token "${token}"`);
    const [, name, shifts, len] = m;
    const beats = len ? Number(len) : 1;
    const shape = FROM_BEATS.find(([b]) => Math.abs(b - beats) < 1e-6);
    if (!shape) throw new Error(`No note shape for ${beats} beats`);
    const [, d, dot] = shape;
    if (name === 'r') {
      items.push({ r: d, dot, beat });
    } else {
      const octave = 4 + [...shifts].reduce((sum, c) => sum + (c === '+' ? 1 : -1), 0);
      const letter = name[0];
      const sharp = name.length > 1;
      // only write the sharp when the key signature doesn't already give it
      const acc = sharp && keySigAcc(letter, keySig) !== '#' ? '#' : !sharp && keySigAcc(letter, keySig) ? 'n' : '';
      items.push({ n: letter + acc + octave, d, dot, beat });
    }
    beat += beats;
  }
  // beam pairs of eighths that start on a beat
  for (let i = 0; i < items.length - 1; i++) {
    const a = items[i];
    const b = items[i + 1];
    if (a.n && b.n && a.d === 'e' && b.d === 'e' && !a.dot && !b.dot && Number.isInteger(a.beat)) {
      a.beam = 's';
      b.beam = 'e';
      i++;
    }
  }
  return items.map(({ beat: _, ...item }) => item);
}

// Random picks without repeating the previous one
export function randomSeq(pool, count) {
  const out = [];
  while (out.length < count) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length === 1 || pick !== out.at(-1)) out.push(pick);
  }
  return out;
}

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
