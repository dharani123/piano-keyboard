import { parseSong } from './parse.js';

// Melody only (no bass), written to fit the on-screen keys, C to high F.
// All are old public-domain tunes except "Less Than Zero", which is a chord
// track only (the chords found in the user's tutorial recording, not its melody).
const RAW = [
  {
    id: 'hot-cross-buns',
    title: 'Hot Cross Buns',
    level: 'Easy',
    bpm: 80,
    pattern: 'E D C/2 | E D C/2 | C/0.5 C/0.5 C/0.5 C/0.5 D/0.5 D/0.5 D/0.5 D/0.5 | E D C/2',
  },
  {
    id: 'mary',
    title: 'Mary Had a Little Lamb',
    level: 'Easy',
    bpm: 100,
    pattern: 'E D C D | E E E/2 | D D D/2 | E G G/2 | E D C D | E E E E | D D E D | C/4',
  },
  {
    id: 'au-clair',
    title: 'Au Clair de la Lune',
    level: 'Easy',
    bpm: 100,
    pattern: 'C C C D | E/2 D/2 | C E D D | C/4 | C C C D | E/2 D/2 | C E D D | C/4',
  },
  {
    id: 'twinkle',
    title: 'Twinkle Twinkle Little Star',
    level: 'Easy',
    bpm: 90,
    pattern: `C C G G | A A G/2 | F F E E | D D C/2 | G G F F | E E D/2 | G G F F | E E D/2 |
              C C G G | A A G/2 | F F E E | D D C/2`,
  },
  {
    id: 'lightly-row',
    title: 'Lightly Row',
    level: 'Easy',
    bpm: 110,
    pattern: `G E E/2 | F D D/2 | C D E F | G G G/2 | G E E/2 | F D D/2 | C E G G | C/4 |
              D D D D | D E F/2 | E E E E | E F G/2 | G E E/2 | F D D/2 | C E G G | C/4`,
  },
  {
    id: 'ode',
    title: 'Ode to Joy',
    level: 'Medium',
    bpm: 100,
    // the low G at the end of the middle part is moved up an octave
    pattern: `E E F G | G F E D | C C D E | E/1.5 D/0.5 D/2 | E E F G | G F E D | C C D E | D/1.5 C/0.5 C/2 |
              D D E C | D E/0.5 F/0.5 E C | D E/0.5 F/0.5 E D | C D G/2 |
              E E F G | G F E D | C C D E | D/1.5 C/0.5 C/2`,
  },
  {
    id: 'london-bridge',
    title: 'London Bridge',
    level: 'Medium',
    bpm: 110,
    pattern: 'G/1.5 A/0.5 G F | E F G/2 | D E F/2 | E F G/2 | G/1.5 A/0.5 G F | E F G/2 | D/2 G/2 | E C/3',
  },
  {
    id: 'frere-jacques',
    title: 'Frère Jacques',
    level: 'Medium',
    bpm: 110,
    // in G so it stays on the white keys and above middle C
    pattern: `G A B G | G A B G | B C+ D+/2 | B C+ D+/2 |
              D+/0.5 E+/0.5 D+/0.5 C+/0.5 B G | D+/0.5 E+/0.5 D+/0.5 C+/0.5 B G | G D G/2 | G D G/2`,
  },
  {
    id: 'old-macdonald',
    title: 'Old MacDonald',
    level: 'Medium',
    bpm: 110,
    // in G so it stays on the white keys and above middle C
    pattern: `G G G D | E E D/2 | B B A A | G/3 D | G G G D | E E D/2 | B B A A | G/3 D/0.5 D/0.5 |
              G G G D/0.5 D/0.5 | G G G/2 | G/0.5 G/0.5 G G/0.5 G/0.5 G | G/0.5 G/0.5 G/0.5 G/0.5 G G |
              G G G D | E E D/2 | B B A A | G/4`,
  },
  {
    id: 'row-boat',
    title: 'Row, Row, Row Your Boat',
    level: 'Medium',
    bpm: 90,
    pattern: `C/1.5 C/1.5 | C D/0.5 E/1.5 | E D/0.5 E F/0.5 | G/3 |
              C+/0.5 C+/0.5 C+/0.5 G/0.5 G/0.5 G/0.5 E/0.5 E/0.5 E/0.5 C/0.5 C/0.5 C/0.5 | G F/0.5 E D/0.5 | C/3`,
  },
  {
    id: 'saints',
    title: 'When the Saints Go Marching In',
    level: 'Medium',
    bpm: 120,
    pattern: `r C E F | G/4 | r C E F | G/4 | r C E F | G/2 E/2 | C/2 E/2 | D/4 |
              r E E D | C/3 C | E/2 G/1.5 G/0.5 | F/4 | r E F G | E/2 C/2 | D/4 | C/4`,
  },
  {
    id: 'jingle',
    title: 'Jingle Bells',
    level: 'Medium',
    bpm: 120,
    pattern: `E E E/2 | E E E/2 | E G C/1.5 D/0.5 | E/4 | F F F/1.5 F/0.5 | F E E E/0.5 E/0.5 | E D D E | D/2 G/2 |
              E E E/2 | E E E/2 | E G C/1.5 D/0.5 | E/4 | F F F F | F E E E/0.5 E/0.5 | G G F D | C/4`,
  },
  {
    id: 'birthday',
    title: 'Happy Birthday',
    level: 'Medium',
    bpm: 100,
    // in F so the whole tune sits between middle C and high C; one black key, A♯ (I)
    pattern: `C/0.75 C/0.25 D C F E/2 | C/0.75 C/0.25 D C G F/2 |
              C/0.75 C/0.25 C+ A F E D/2 | A#/0.75 A#/0.25 A F G F/2`,
  },
  {
    id: 'less-than-zero',
    title: 'Less Than Zero (chords)',
    level: 'Chords',
    bpm: 136,
    chords: true,
    // C F loop, then C F C F Am Em G; every chord lasts 2 bars (G lasts 4)
    pattern: `C,E,G/8 F,A,C+/8 C,E,G/8 F,A,C+/8 | C,E,G/8 F,A,C+/8 C,E,G/8 F,A,C+/8 |
              C,E,G/8 F,A,C+/8 C,E,G/8 F,A,C+/8 | A,C+,E+/8 E,G,B/8 G,B,D+/16 |
              C,E,G/8 F,A,C+/8 C,E,G/8 F,A,C+/8 | C,E,G/8 F,A,C+/8 C,E,G/8 F,A,C+/8 |
              C,E,G/8 F,A,C+/8 C,E,G/8 F,A,C+/8 | A,C+,E+/8 E,G,B/8 G,B,D+/16 | C,E,G/8 F,A,C+/8`,
  },
];

const CHORD_NAMES = { '0,4,7': 'C', '5,9,0': 'F', '9,0,4': 'Am', '4,7,11': 'Em', '7,11,2': 'G' };

export const SONG_LIBRARY = RAW.map(s => {
  const { events, totalBeats } = parseSong(s.pattern);
  for (const e of events) {
    if (e.notes.length > 1) e.label = CHORD_NAMES[e.notes.map(n => n.semitone).join(',')] ?? null;
  }
  return { ...s, events, totalBeats };
});
export const songFromLibrary = Object.fromEntries(SONG_LIBRARY.map(s => [s.id, s]));
