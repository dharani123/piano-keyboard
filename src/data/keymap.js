// semitone = offset from C within the octave.
// White keys run along the home row with no gap, S D F G H J K = C D E F G A B
// (hands shifted one key right of typing position); black keys are the top-row
// keys that fall between them.
export const KEYS = [
  { code: 'KeyS', key: 'S', note: 'C',  semitone: 0,  type: 'white' },
  { code: 'KeyE', key: 'E', note: 'C#', semitone: 1,  type: 'black', after: 0 },
  { code: 'KeyD', key: 'D', note: 'D',  semitone: 2,  type: 'white' },
  { code: 'KeyR', key: 'R', note: 'D#', semitone: 3,  type: 'black', after: 1 },
  { code: 'KeyF', key: 'F', note: 'E',  semitone: 4,  type: 'white' },
  { code: 'KeyG', key: 'G', note: 'F',  semitone: 5,  type: 'white' },
  { code: 'KeyY', key: 'Y', note: 'F#', semitone: 6,  type: 'black', after: 3 },
  { code: 'KeyH', key: 'H', note: 'G',  semitone: 7,  type: 'white' },
  { code: 'KeyU', key: 'U', note: 'G#', semitone: 8,  type: 'black', after: 4 },
  { code: 'KeyJ', key: 'J', note: 'A',  semitone: 9,  type: 'white' },
  { code: 'KeyI', key: 'I', note: 'A#', semitone: 10, type: 'black', after: 5 },
  { code: 'KeyK', key: 'K', note: 'B',  semitone: 11, type: 'white' },
];

// The home row carries on into the next octave: L ; ' Enter = C D E F, with P [ as
// its C# D#. `after` counts white keys from S, so these sit after the main seven.
export const HIGH_KEYS = [
  { code: 'KeyL',         key: 'L',     note: 'C',  semitone: 0, octaveUp: 1, type: 'white' },
  { code: 'KeyP',         key: 'P',     note: 'C#', semitone: 1, octaveUp: 1, type: 'black', after: 7 },
  { code: 'Semicolon',    key: ';',     note: 'D',  semitone: 2, octaveUp: 1, type: 'white' },
  { code: 'BracketLeft',  key: '[',     note: 'D#', semitone: 3, octaveUp: 1, type: 'black', after: 8 },
  { code: 'Quote',        key: "'",     note: 'E',  semitone: 4, octaveUp: 1, type: 'white' },
  { code: 'Enter',        key: 'Enter', note: 'F',  semitone: 5, octaveUp: 1, type: 'white' },
];
export const HIGH_C = HIGH_KEYS[0];
// semitone → its key in the higher octave (C to F only)
export const highBySemitone = Object.fromEntries(HIGH_KEYS.map(k => [k.semitone, k]));

// The number row is a second, wider keyboard: ` 1 2 = G A B below, 3–9 = C–B (same
// octave as ASDF/JKL), 0 - = Backspace = C D E F above. F-keys are the black keys:
// Fn sits between digit n and n+1 (F3 = C#). No F-key falls between ` and 1, so
// that low G# is missing. `shows` = the on-screen key with the same note name.
const top = (code, note, semitone, octaveUp, shows) => ({ code, note, semitone, octaveUp, shows });
export const TOP_ROW = [
  top('Backquote', 'G', 7, -1, 'KeyH'), top('Digit1', 'A', 9, -1, 'KeyJ'), top('F1', 'A#', 10, -1, 'KeyI'),
  top('Digit2', 'B', 11, -1, 'KeyK'),
  top('Digit3', 'C', 0, 0, 'KeyS'), top('F3', 'C#', 1, 0, 'KeyE'), top('Digit4', 'D', 2, 0, 'KeyD'),
  top('F4', 'D#', 3, 0, 'KeyR'), top('Digit5', 'E', 4, 0, 'KeyF'), top('Digit6', 'F', 5, 0, 'KeyG'),
  top('F6', 'F#', 6, 0, 'KeyY'), top('Digit7', 'G', 7, 0, 'KeyH'), top('F7', 'G#', 8, 0, 'KeyU'),
  top('Digit8', 'A', 9, 0, 'KeyJ'), top('F8', 'A#', 10, 0, 'KeyI'), top('Digit9', 'B', 11, 0, 'KeyK'),
  top('Digit0', 'C', 0, 1, 'KeyL'), top('F10', 'C#', 1, 1, 'KeyP'), top('Minus', 'D', 2, 1, 'Semicolon'),
  top('F11', 'D#', 3, 1, 'BracketLeft'), top('Equal', 'E', 4, 1, 'Quote'), top('Backspace', 'F', 5, 1, 'Enter'),
];

export const byCode = Object.fromEntries([...KEYS, ...HIGH_KEYS, ...TOP_ROW].map(k => [k.code, k]));
// The key code a keyboard key plays, or null
export const noteCodeFor = code => (byCode[code] ? code : null);
// The on-screen piano key that lights up for a played key
export const shownCode = code => byCode[code]?.shows ?? code;

export const bySemitone = Object.fromEntries(KEYS.map(k => [k.semitone, k]));
export const SEMITONES = Object.fromEntries(KEYS.map(k => [k.note, k.semitone]));

export const MIN_OCTAVE = 1;
export const MAX_OCTAVE = 7;
export const MAX_TRANSPOSE = 12;
