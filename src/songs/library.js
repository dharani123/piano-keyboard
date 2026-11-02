import { parseSong } from './parse.js';

// Melody only (no bass), written to fit the on-screen keys, C to high F.
// All are old public-domain tunes except "Less Than Zero", which is a chord
// track only (the chords found in the user's tutorial recording, not its melody).
// "Decoded songs" are melodies the user transcribed from their own recordings
// (sheet music made with an online transcriber), kept for their own practice.
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
    id: 'fur-elise',
    title: 'Für Elise (opening)',
    level: 'Hard',
    bpm: 100,
    hint: "Beethoven, in A minor. The E–D♯ wiggle is the keys ' and [ (high E, high D♯). Keep it light and even, and start at a slower speed.",
    pattern: `E+/0.5 D#+/0.5 | E+/0.5 D#+/0.5 E+/0.5 B/0.5 D+/0.5 C+/0.5 | A/1 r/0.5 C/0.5 E/0.5 A/0.5 |
              B/1 r/0.5 E/0.5 G#/0.5 B/0.5 | C+/1 r/0.5 E/0.5 E+/0.5 D#+/0.5 |
              E+/0.5 D#+/0.5 E+/0.5 B/0.5 D+/0.5 C+/0.5 | A/1 r/0.5 C/0.5 E/0.5 A/0.5 |
              B/1 r/0.5 E/0.5 C+/0.5 B/0.5 | A/2`,
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves (verse)',
    level: 'Hard',
    bpm: 120,
    hint: 'A minor in 3/4, with dotted rhythms. G♯ (key U) is the leading note that pulls up to A.',
    pattern: `A | C+/2 D+ | E+/1.5 F+/0.5 E+ | D+/2 B | G/1.5 A/0.5 B | C+/2 A | A/1.5 G#/0.5 A | B/2 G# | E/2 A |
              C+/2 D+ | E+/1.5 F+/0.5 E+ | D+/2 B | G/1.5 A/0.5 B | C+/1.5 B/0.5 A | G#/1.5 F#/0.5 G# | A/3`,
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
  {
    id: 'say-can-you-hear',
    title: 'Say Can You Hear (piano melody)',
    level: 'Decoded songs',
    bpm: 158,
    decoded: true,
    hint: "Right-hand melody from your Songscription sheet, in A major: keys F Y U J K P ' (E F♯ G♯ A B, high C♯ E). Try it on Dream Keys (Shift+3), and start at a slower speed.",
    // Right hand only, from the user's Songscription sheet of the Men I Trust
    // piano part, A major; tied notes are joined into one long note.
    // Lines: intro (A → E) | D F#m Amaj9 | D F#m Amaj9 | D F#m Amaj9 → D Amaj9 E ending
    pattern: `r/3 A/0.5 G#/4.5 |
              r/2 E+/1.5 E+/1 A/0.5 A/2 E/0.5 G#/1 A/3.5 | F#/4 |
              r/2 E+/1.5 E+/1 A/0.5 A/2 E/0.5 G#/2.5 G#/0.5 A/0.5 G#/0.5 F#/1.5 E/2.5 F#/2.5 |
              E+/1.5 E+/1 A/0.5 A/2 E/0.5 G#/1 A/3.5 | F#/3 E/0.5 C#+/7.5 | E/0.5 B/8.5`,
  },
  {
    id: 'tere-bina',
    title: 'Tere Bina (piano melody)',
    level: 'Decoded songs',
    bpm: 75,
    decoded: true,
    // the tune climbs to A5, so the keys slide two places for this song (row = D4…A5)
    layout: -2,
    hint: "Right-hand melody from your Songscription sheet, in F♯ minor. The keys slide two places for this song (E is on S, A on G, high C♯ on I, high A on Enter). It has fast runs, so start with Listen & play at 50%.",
    // Right hand only, from the user's Songscription sheet of A. R. Rahman's
    // "Tere Bina" (Guru), F# minor; tied notes joined. The two C#4s in bar 1
    // are raised an octave (C#+) because the high layout starts at D4.
    // (user's edit: the opening five A's are replaced by the E A G# A phrase,
    // same note lengths, with a short rest first to fill their 2.75 beats)
    pattern: `r/0.75 E/0.5 A/0.5 G#/0.25 A/0.75 |
              E/0.5 A/0.5 G#/0.25 A/0.75 C#+/0.5 B/0.5 A/0.125 G#/0.125 |
              F#/2 r/0.75 F#/0.5 G#/0.5 A/0.25 |
              C#+/0.75 F#/0.5 G#/0.5 A/0.25 D+/0.75 G#/0.5 A/0.5 C#+/0.25 |
              E+/0.75 G#/0.5 A/0.5 C#+/0.25 F#+/1 F+/0.5 F#+/0.25 G#+/0.25 |
              A+/0.75 C#+/0.5 A+/0.5 C#+/0.25 G#+/0.5 B/0.25 F#+/1 B/0.25 |
              E+/0.75 D+/0.5 C#+/0.5 B/0.25 A/0.25 B/0.25 C#+/1.5 |
              C#+/0.5 C#+/0.5 C#+/0.5 C#+/0.5 C#+/0.5 C#+/0.5 C#+/0.75 B/0.25 |
              A/0.5 A/0.5`,
  },
  {
    id: 'namo-namo-ji-shankara',
    title: 'Namo Namo Ji Shankara (piano melody)',
    level: 'Decoded songs',
    bpm: 180,
    decoded: true,
    hint: "Right-hand melody merged from your two Songscription sheets, in E major: keys E F Y U J K (C♯ E F♯ G♯ A B). It lives on F♯ and G♯ (Y and U), so keep those two fingers ready. At 180 BPM the beats go by fast, so start at 50–75%.",
    // Right hand only, merged from two Songscription sheets of "Namo Namo" (Kedarnath),
    // E major, q = 180. Opening (5 bars of 6/8) from the second sheet (first 15 s),
    // which caught the held G#s the first sheet missed (its B A G# pickup left out at
    // the user's request, rest kept so the timing stays; the empty bar after C# E F#
    // filled with another G#/2.5 F#/0.5 at the user's request);
    // the rest from the first sheet (6/4 bars; its start matches sheet 2 bars 6-14).
    // Chords: F#m B E G#m7 F#m7/E A B E/B G#m7 F#m7/E ... A/E B. Tied notes joined.
    pattern: `r/1.5 C#/0.5 E/0.5 F#/0.5 | G#/2.5 F#/0.5 | G#/2.5 F#/0.5 | G#/2.5 F#/0.5 |
              G# F#/0.5 F# E/0.5 F#/2.5 E/0.5 | F#/2.5 E/0.5 F#/2.5 G#/0.5 |
              F#/0.5 G#/0.5 G#/0.5 F# E/0.5 G#/2.5 B/0.5 | G#/2.5 B/0.5 G#/2.5 G#/0.5 |
              F#/0.5 G#/0.5 G#/0.5 F# E/0.5 E F#/0.5 F# F#/0.5 | F# E/0.5 G# E/0.5 E/6 C# F#/1.5 F#/0.5 |
              F# E/0.5 G# E/0.5 E/3 | F#/3 E F#/0.5 G#/1.5`,
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
