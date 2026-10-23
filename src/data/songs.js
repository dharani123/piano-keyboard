import { SEMITONES } from './keymap.js';

// Notes are written as note names; a trailing "-" means one octave lower,
// "+" one octave higher than the octave you start the song in.
// "|" separates phrases (only used for display).
const RAW = [
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle Little Star',
    notes: `C C G G A A G | F F E E D D C | G G F F E E D | G G F F E E D |
            C C G G A A G | F F E E D D C`,
  },
  {
    id: 'mary',
    title: 'Mary Had a Little Lamb',
    notes: `E D C D E E E | D D D | E G G | E D C D E E E | E D D E D C`,
  },
  {
    id: 'ode',
    title: 'Ode to Joy',
    notes: `E E F G G F E D C C D E E D D | E E F G G F E D C C D E D C C |
            D D E C D E F E C D E F E D C D G- |
            E E F G G F E D C C D E D C C`,
  },
  {
    id: 'jingle',
    title: 'Jingle Bells',
    notes: `E E E | E E E | E G C D E | F F F F F E E E E D D E D G |
            E E E | E E E | E G C D E | F F F F F E E E G G F D C`,
  },
  {
    id: 'birthday',
    title: 'Happy Birthday',
    notes: `G- G- A- G- C B- | G- G- A- G- D C | G- G- G E C B- A- | F F E C D C`,
  },
];

export function parseNotes(text) {
  const notes = [];
  let phrase = 0;
  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (token === '|') { phrase++; continue; }
    const match = token.match(/^([A-G]#?)([+-]*)$/);
    if (!match) throw new Error(`Bad note "${token}"`);
    const [, name, shifts] = match;
    const oct = [...shifts].reduce((sum, c) => sum + (c === '+' ? 1 : -1), 0);
    notes.push({ name, semitone: SEMITONES[name], oct, phrase });
  }
  return notes;
}

export const SONGS = RAW.map(s => ({ ...s, notes: parseNotes(s.notes) }));
export const songById = Object.fromEntries(SONGS.map(s => [s.id, s]));
