// semitone = offset from C within the octave.
// White keys run along the home row with no gap, S D F G H J K = C D E F G A B
// (hands shifted one key right of typing position), carrying on into the next
// octave on L ; ' Enter = C D E F. Black keys are the letter-row keys that fall
// between them: E R · Y U I = C# D# · F# G# A#, P [ = the next C# D#.
//
// For exercises that need notes outside that range the whole layout slides by
// two white keys (`shift`): +2 puts C on F, so A S D = low G A B; -2 puts the
// row on D E F … up to the high A. Only letters play notes.

const HOME = [
  ['KeyA', 'A'], ['KeyS', 'S'], ['KeyD', 'D'], ['KeyF', 'F'], ['KeyG', 'G'], ['KeyH', 'H'],
  ['KeyJ', 'J'], ['KeyK', 'K'], ['KeyL', 'L'], ['Semicolon', ';'], ['Quote', "'"], ['Enter', 'Enter'],
];
// The black key between HOME[i] and HOME[i + 1] is UPPER[i + 1]
const UPPER = [
  ['KeyQ', 'Q'], ['KeyW', 'W'], ['KeyE', 'E'], ['KeyR', 'R'], ['KeyT', 'T'], ['KeyY', 'Y'],
  ['KeyU', 'U'], ['KeyI', 'I'], ['KeyO', 'O'], ['KeyP', 'P'], ['BracketLeft', '['], ['BracketRight', ']'],
];
const WHITE_STEPS = [0, 2, 4, 5, 7, 9, 11];
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const SHIFTS = [0, 2, -2];

// Every key of a layout in pitch order; `after` = index of the white key a black one follows
function buildLayout(shift) {
  const keys = [];
  let whites = 0;
  HOME.forEach(([code, key], i) => {
    if (shift === 0 && i === 0) return; // A stays silent in the normal layout
    const w = i - 1 - shift; // white keys from middle C
    const octaveUp = Math.floor(w / 7);
    const semitone = WHITE_STEPS[w - octaveUp * 7];
    keys.push({ code, key, note: NAMES[semitone], semitone, octaveUp, type: 'white' });
    whites++;
    if (i < HOME.length - 1 && semitone !== 4 && semitone !== 11) {
      const [bCode, bKey] = UPPER[i + 1];
      keys.push({ code: bCode, key: bKey, note: NAMES[semitone + 1], semitone: semitone + 1, octaveUp, type: 'black', after: whites - 1 });
    }
  });
  return keys;
}
export const LAYOUTS = Object.fromEntries(SHIFTS.map(s => [s, buildLayout(s)]));
const BY_CODE = Object.fromEntries(SHIFTS.map(s => [s, Object.fromEntries(LAYOUTS[s].map(k => [k.code, k]))]));
const BY_PITCH = Object.fromEntries(SHIFTS.map(s => [s, Object.fromEntries(LAYOUTS[s].map(k => [k.octaveUp * 12 + k.semitone, k]))]));

// The key playing a code in a layout, or undefined
export const keyForCode = (code, shift = 0) => BY_CODE[shift][code];
// The key for a note `rel` octaves from middle C's octave, or undefined
export const keyAt = (semitone, rel, shift = 0) => BY_PITCH[shift][rel * 12 + semitone];
// Pitches (semitones from middle C) a layout can play
export const playable = shift => new Set(LAYOUTS[shift].map(k => k.octaveUp * 12 + k.semitone));

// Keys that play a note in some layout; a key not in the current layout just stays quiet
const NOTE_CODES = new Set(SHIFTS.flatMap(s => LAYOUTS[s].map(k => k.code)));
export const noteCodeFor = code => (NOTE_CODES.has(code) ? code : null);

// The normal layout, as lessons and ear training use it
export const byCode = BY_CODE[0];
export const KEYS = LAYOUTS[0].filter(k => k.octaveUp === 0);
export const HIGH_KEYS = LAYOUTS[0].filter(k => k.octaveUp === 1);
export const HIGH_C = HIGH_KEYS[0];
// semitone → its key in the higher octave (C to F only)
export const highBySemitone = Object.fromEntries(HIGH_KEYS.map(k => [k.semitone, k]));
export const bySemitone = Object.fromEntries(KEYS.map(k => [k.semitone, k]));
export const SEMITONES = Object.fromEntries(KEYS.map(k => [k.note, k.semitone]));

export const MIN_OCTAVE = 1;
export const MAX_OCTAVE = 7;
export const MAX_TRANSPOSE = 12;
