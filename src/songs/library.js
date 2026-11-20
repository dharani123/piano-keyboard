import { parseSong } from './parse.js';

// Melody only (no bass), written to fit the on-screen keys, C to high F.
// All are old public-domain tunes except "Less Than Zero", which is a chord
// track only (the chords found in the user's tutorial recording, not its melody).
// "Decoded songs" are melodies the user transcribed from their own recordings
// (sheet music made with an online transcriber), kept for their own practice.
// Each decoded song names its `scale`, one of the Scales tab's 24 (scales/curriculum.js).
const RAW = [
  {
    id: 'hot-cross-buns',
    title: 'Hot Cross Buns',
    level: 'Easy',
    bpm: 80,
    pattern: 'E D C/2 | E D C/2 | C/0.5 C/0.5 C/0.5 C/0.5 D/0.5 D/0.5 D/0.5 D/0.5 | E D C/2',
  },
  {
    id: 'rain-rain',
    title: 'Rain, Rain, Go Away',
    level: 'Easy',
    bpm: 90,
    hint: 'Only three notes: G, E and A (Pa, Ga, Da). Listen for the little hill G → E → G and the lift up to A.',
    pattern: 'G E G/0.5 G/0.5 E | G/0.5 G/0.5 E/0.5 E/0.5 A/0.5 A/0.5 G | G/0.5 G/0.5 E/0.5 E/0.5 A/0.5 A/0.5 G | G E G/0.5 G/0.5 E',
  },
  {
    id: 'three-blind-mice',
    title: 'Three Blind Mice',
    level: 'Easy',
    bpm: 100,
    hint: 'Built from sets of three: "Three blind mice" is E D C (Ga Ri Sa) going down, "see how they run" is G F E (Pa Ma Ga). The middle part climbs up to high C.',
    pattern: `E/1.5 D/1.5 | C/3 | E/1.5 D/1.5 | C/3 | G/1.5 F F/0.5 | E/3 | G/1.5 F F/0.5 | E/2.5 G/0.5 |
              C+ C+/0.5 B/0.5 A/0.5 B/0.5 | C+ G/0.5 G G/0.5 | C+/0.5 C+/0.5 C+/0.5 B/0.5 A/0.5 B/0.5 | C+ G/0.5 G G/0.5 |
              C+/0.5 C+/0.5 C+/0.5 B/0.5 A/0.5 B/0.5 | C+ G/0.5 G F/0.5 | E/1.5 D/1.5 | C/3`,
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
    scale: 'A major',
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
    scale: 'F♯ minor',
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
    scale: 'E major',
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
  {
    id: 'ram-ram',
    title: 'Ram Ram (piano melody)',
    level: 'Decoded songs',
    bpm: 80,
    decoded: true,
    scale: 'D major',
    hint: "Right-hand melody from your Songscription sheet, in D major: keys E D F Y H J K P ; ' (C♯ D E F♯ G A B, high C♯ D E). It walks down step by step from high D, so let your hand drift left bar by bar. The 16th-note pairs at the end of bars 1–3 are quick, so start with Listen & play at 75%.",
    // Right hand only, from the user's Songscription sheet of "Ram Ram", D major, 4/4, q = 80.
    // Chords: D Dmaj7 Bm7 | D/A G | D/F# Em7 | A/E D/A | D. Tied D4 in bar 4 joined.
    pattern: `D+/1.5 E+/0.5 C#+/1.5 E+/0.25 C#+/0.25 |
              B/1.5 C#+/0.5 A/1.5 B/0.25 A/0.25 |
              G/1.5 A/0.5 F#/1.5 G/0.25 F#/0.25 |
              E/0.75 D/0.75 C#/0.5 E/0.75 F#/0.75 A/0.5 |
              D+/1 r/3`,
  },
  {
    id: 'rangulu-ranguley',
    title: 'Rangulu Ranguley (piano melody)',
    level: 'Decoded songs',
    bpm: 83,
    decoded: true,
    scale: 'D♭ major',
    // the tune reaches G♭5, so the keys slide one place for this song (row = C4…G5)
    layout: -1,
    hint: "Right-hand melody from your Songscription sheet, in D♭ major. The keys slide one place for this song, so C is on A: W F T Y U O (D♭ F G♭ A♭ B♭, high D♭), plus K P ' ] for high C E♭ F G♭. Bars 5 and 7 to 8 have fast 16th-note runs, so listen first and start at 50%.",
    // Right hand only, from the user's Songscription sheet of "Rangulu Ranguley" (Ramayana),
    // D♭ major, 4/4, q = 83. Flats are written as sharps (D♭ = C#, E♭ = D#, G♭ = F#, A♭ = G#,
    // B♭ = A#); tied notes joined. No layout reaches A♭3, so the three low notes go up an
    // octave: B♭3 and A♭3 in bar 3, B♭3 in bar 5.
    // Chords: D♭ | | | G♭ | E♭m7 | B | D♭ E♭m7 | Bmaj7 | (bar 9 bass G♭)
    pattern: `r/0.5 C#+/0.5 C#/0.25 F/0.25 F#/0.5 C#+/0.75 C#/0.25 A#/0.25 C#/0.25 F#/0.25 G#/0.25 |
              F#/0.25 F/0.5 F#/2.5 C#+/0.25 A#/0.25 F#/0.25 |
              F/0.75 F#/0.75 A#/0.75 G#/0.75 F#/0.25 F/0.25 G#/0.5 |
              F#/0.25 F/0.25 F#/3.25 C#/0.25 |
              F/0.25 F#/0.25 C#+/0.25 A#/0.5 F#/0.25 F/0.25 G#/0.25 C#/0.25 F/0.25 F#/0.25 A#/0.25 C#/0.25 F/0.25 F#/0.25 A#/0.25 |
              F#/0.25 F/0.5 F#/2.5 F#/0.25 A#/0.25 C+/0.25 |
              C#+/0.25 G#/0.5 G#/0.75 C#+/0.25 C#+/0.25 C#+/0.25 A#/0.5 A#/0.5 C#+/0.5 C#+/0.25 |
              C#+/0.25 D#+/0.25 D#+/0.75 F+/0.5 F#+/0.25 F+/0.25 C#+/0.25 C#+/0.25 A#/0.25 A#/0.25 C#+/0.25 C#+/0.5 |
              G#/0.5 F#/0.25 F/0.75 r/2.5`,
  },
  {
    id: 'povodhe-prema',
    title: 'Povodhe Prema (piano melody)',
    level: 'Decoded songs',
    bpm: 71,
    decoded: true,
    scale: 'C♯ minor',
    hint: "Right-hand melody from your Songscription sheet, in E major / C♯ minor: keys F Y U J K P [ ' (E F♯ G♯ A B, high C♯ D♯ E). The first eight bars are steady eighth notes rocking between two keys, so keep your hand still and let two fingers do the work. Listen first, then try it at 75%.",
    // Right hand only, from the user's Songscription sheet of "Povodhe Prema" (Oy!), four sharps,
    // 4/4, q = 71; the screenshot shows 10 bars. Tied notes joined. The sheet spans E4 to E6, too
    // wide for any layout, so bars 1 to 8 sit an octave lower than written, except the G#4 and
    // E4 that end bar 8. Bars 9 and 10 are as written. Bar 1 opens with C# A in place of the
    // sheet's eighth rest and A, at the user's request, so it matches bar 3.
    // Chords: F#m | C#m | F#m | C#m | A | B | C#m7 | B | Esus4 E/B | (bar 10 not labelled)
    pattern: `C#+/0.5 A/0.5 C#+/0.5 A/0.5 C#+/0.5 A/0.5 C#+/0.25 D#+/0.25 E+/0.5 |
              C#+/0.5 G#/0.5 C#+/0.5 G#/0.5 C#+/0.5 G#/0.5 C#+/0.5 G#/0.5 |
              C#+/0.5 A/0.5 C#+/0.5 A/0.5 C#+/0.5 A/0.5 C#+/0.25 D#+/0.25 E+/0.5 |
              C#+/0.5 G#/0.5 C#+/0.5 G#/0.5 C#+/0.5 G#/0.5 C#+/0.5 G#/0.5 |
              C#+/0.5 A/0.5 C#+/0.5 A/0.5 C#+/0.5 A/0.5 C#+/0.5 A/0.5 |
              D#+/0.5 B/0.5 D#+/0.5 B/0.5 D#+/0.5 B/0.5 D#+/0.5 B/0.5 |
              E+/0.5 C#+/0.5 E+/0.5 C#+/0.5 E+/0.5 C#+/0.5 E+/0.5 C#+/0.5 |
              D#+/0.5 B/0.5 D#+/0.5 B/0.5 D#+/0.5 B/0.5 D#+/0.5 G#/0.25 E/0.25 |
              A/3.5 G#/0.25 F#/0.25 |
              G#/3.5 G#/0.25 B/0.25`,
  },
  {
    id: 'oye-bgm',
    title: 'Oye BGM (piano melody)',
    level: 'Decoded songs',
    bpm: 138,
    decoded: true,
    scale: 'E♭ major',
    // the tune peaks on G5 once it sits an octave down, so the keys slide two places (row = D4…A5)
    layout: -2,
    hint: "Top line of the melody from your Songscription sheet, in E♭ major. The keys slide two places for this song, so D is on A: Y J K O ; ' (B♭, high C D E♭ F G). The tune sways around the same few notes, but 138 BPM moves quickly, so listen first and start at 50%.",
    // Top note of the right hand only, from the user's Songscription sheet of the "Oy!" piano
    // BGM, E♭ major, 4/4, q = 138. Flats are written as sharps (E♭ = D#, B♭ = A#); tied notes
    // joined. The whole tune is one octave below the sheet (B♭5 to G6 as written). The G6 that
    // ends bar 10 is held through the tied low G5 at the start of bar 11.
    // Chords: E♭ is the only one marked on the sheet.
    pattern: `r/3 D#+/0.5 D+/0.5 |
              D#+/1 A#/2 G+/0.5 C+/1 |
              A#/1.5 r/0.5 A#/0.5 D#+/0.5 D+/0.5 |
              D#+/1 A#/2 G+/0.5 C+/1 |
              A#/2 r/0.5 D#+/0.5 D+/0.5 |
              D#+/1 A#/2 G+/0.5 C+/1 |
              A#/1.5 r/1 G+/0.5 F+/0.5 |
              G+/1.5 F+/0.5 G+/1.5 F+/0.5 |
              G+/1.5 F+/0.5 G+/0.5 F+/0.5 D#+/0.5 F+/0.5 |
              G+/1 G+/2 G+/0.5 G+/1 |
              F+/2 r/0.5 D#+/0.5 D+/0.5 |
              D#+/2 r/2`,
  },
  {
    id: 'oye-emotional-bgm',
    title: 'Oye Emotional BGM (piano melody)',
    level: 'Decoded songs',
    bpm: 163,
    decoded: true,
    scale: 'C major',
    // the tune reaches A5, so the keys slide two places for this song (row = D4…A5)
    layout: -2,
    hint: "Melody from your Songscription sheet, in C major, all white keys. The keys slide two places for this song, so D is on A: A S D F G H J K (D E F G A B, high C D), plus ' Enter for high G A. It is mostly quarter and half notes, but 163 BPM is quick, so listen first and start at 50%.",
    // Melody from the user's Songscription sheet of the "Oy!" emotional BGM, C major, 4/4,
    // q = 163, 16 bars. Written with octaves and chords: this takes the top note, except that
    // the D5+D6 in bar 4 and C5+C6 in bar 5 use the lower note, because C6 and D6 have no key
    // in any layout that also holds D4. The trill on the C in bar 4 is played as a plain note.
    // Chords: C | | | | | D | | G | Dm | C | G/D | C | G/D Dm | C | G/D | C
    pattern: `r/1 E C+ B |
              C+/4 |
              r/1 E C+ B |
              C+/2 D+/2 |
              r/1 C+ C+ B |
              A/2 A/2 |
              r/1 A B A |
              G/4 |
              r/1 D G F |
              F/2 E/2 |
              A+/2 G+/2 |
              C+/4 |
              r/1 A+ G+ F |
              F/2 E/2 |
              A+/2 G+/2 |
              C+/4`,
  },
  {
    id: 'blinding-lights',
    title: 'Blinding Lights (piano melody)',
    level: 'Decoded songs',
    bpm: 171,
    decoded: true,
    scale: 'F minor',
    hint: "The opening riff from your Songscription sheet, right hand only, an octave lower so it fits: keys S R G H I (C E♭ F G B♭). F (G) is home, so keep a finger there. At 171 BPM the beats go by fast, so start at 50–75%.",
    // Right hand only, from the user's Songscription sheet of The Weeknd's "Blinding Lights",
    // q = 171, 4/4, 7 bars. Written an octave lower: the sheet runs C5 to B♭5, above the top key.
    // Tied notes joined. The closing F D B♭ chord takes its top note, F, as in other decoded songs.
    // Chords: Fm | | Cm | | E♭ | | B♭/F
    pattern: `F/2 F/1.5 D#/0.5 |
              F/0.5 G C D#/1.5 |
              F/2 F/1.5 D#/0.5 |
              F/0.5 G C D#/1.5 |
              A#/0.5 G F D#/1.5 |
              A#/0.5 G F D# F/4.5`,
  },
  {
    id: 'starboy',
    title: 'Starboy (piano melody)',
    level: 'Decoded songs',
    bpm: 93,
    decoded: true,
    scale: 'A minor',
    // the tune reaches A5, so the keys slide two places for this song (row = D4…A5)
    layout: -2,
    hint: "Right-hand melody from your Songscription sheet, in A minor, all white keys. The keys slide two places for this song, so D is on A: D F G (F G A), J K L (high C D E), ' Enter (high G A). Most bars repeat one note in a dotted rhythm, so listen first and start at 75%.",
    // Right hand only, from the user's Songscription sheet of The Weeknd's "Starboy"
    // (ft. Daft Punk), A minor, 4/4, q = 93, 8 bars. Tied notes joined (the C5 into bar 2,
    // the A5s into bars 4 and 8).
    // Chords: Am | G/A | F/A | G/A | Am | G/A | F/A (bars 2-8; bar 1 is the pickup)
    pattern: `r/3 D+/0.25 D+/0.25 C+/0.25 C+/0.75 |
              A/1 A/0.5 A/0.75 A/0.75 A/0.5 |
              r/0.5 G/1 G/0.5 G/0.75 E+/0.25 E+/0.25 G+/0.25 E+/0.25 A+/0.75 |
              F/1 F/0.5 F/0.75 F/0.75 F/0.5 |
              r/0.5 G/1 G/0.5 G/0.5 D+/0.25 D+/0.25 D+/0.25 D+/0.25 D+/0.25 D+/0.25 |
              D+/0.5 C+/0.25 A/0.75 A/0.5 A/0.75 A/0.75 A/0.5 |
              r/0.5 G/1 G/0.5 G/0.75 E+/0.25 E+/0.25 G+/0.25 E+/0.25 A+/0.75 |
              r/3.5`,
  },
  {
    id: 'pink-panther',
    title: 'Pink Panther Theme (opening)',
    level: 'Decoded songs',
    bpm: 116,
    decoded: true,
    scale: 'E minor',
    // the tune creeps up by half steps (D♯→E, F♯→G), notes outside E minor on purpose
    chromatic: true,
    hint: "The sneaky opening, in E minor. It starts with two half steps up: R→F (D♯ E), then Y→H (F♯ G). Then H L K (G, high C, B), F H K (E G B), the long I (B♭), and J H F D F (A G E D E) to finish. Hum the half steps along with it.",
    // Henry Mancini's "The Pink Panther Theme" (1963), opening phrase only, melody from
    // memory (not a Songscription sheet), straight eighths. Kept for half-step practice.
    pattern: `r/0.5 D#/0.5 E/2 r/0.5 F#/0.5 G/2 |
              r/0.5 D#/0.5 E/0.5 F#/0.5 G/0.5 C+/0.5 B/0.5 E/0.5 G/0.5 B/0.5 A#/3 |
              A/0.5 G/0.5 E/0.5 D/0.5 E/4`,
  },
  {
    id: 'bbm-piano-piece',
    title: 'B♭ minor piano piece (untitled)',
    level: 'Decoded songs',
    bpm: 92,
    decoded: true,
    scale: 'B♭ minor',
    // the tune reaches A♭5, so the keys slide two places for this song (row = D4…A5)
    layout: -2,
    hint: "Right-hand melody from your Songscription sheet, in B♭ minor (five flats), almost all black keys. The keys slide two places for this song: Y (B♭), J (C), I O (D♭ E♭), ; (F) and ] (high A♭). The rising D♭ E♭ F run (I O ;) comes back in nearly every bar, so learn it first. 92 BPM is relaxed, so try 75% and then full speed.",
    // Right hand only, from the user's Songscription sheet (title not shown), B♭ minor, 4/4,
    // q = 92, 9 bars after a one-beat rest. Chords take their top note. Tied notes joined
    // (each F5 carried over a bar line, the tied B♭ chords, and the last F5 into the final chord).
    // Chords: B♭m7 | Fm7/A♭ A♭7 | G♭maj7 | E♭m7 A♭ | B♭m7 | Fm7/A♭ A♭7 | G♭maj7 | E♭m7 A♭ | B♭m
    pattern: `r/1.5 A#/1 C#+/0.5 D#+/0.5 F+/1 |
              G#+/1.5 A#/1 F+/0.5 D#+/0.25 F+/0.25 |
              A#/0.5 D#+/0.5 C#+/0.5 A#/1 C#+/0.5 D#+/0.5 F+/1 |
              D#+/1.5 C+/1 C#+/1 |
              A#/1.5 A#/1 C#+/0.5 D#+/0.5 F+/1 |
              G#+/1.5 A#/1 F+/0.5 D#+/0.25 F+/0.25 |
              A#/0.5 D#+/0.5 C#+/0.5 A#/1 C#+/0.5 D#+/0.5 F+/1 |
              D#+/1.5 C+/1 C#+/1 |
              F+/0.5 F+/0.5 F+/0.25 D#+/0.25 F+/1.5 r/1`,
  },
  {
    id: 'moonu-just-the-two-of-us',
    title: 'Moonu BGM: Just the Two of Us (piano melody)',
    level: 'Decoded songs',
    bpm: 101,
    decoded: true,
    scale: 'D minor',
    hint: "Right-hand melody from your two Songscription sheets, in D minor, an octave lower so it fits, on the normal keys: S D F G H (C D E F G, Sa Ri Ga Ma Pa), J I (A, B♭). It keeps falling back to D (Ri), and from bar 10 it circles D G G G F E. 101 BPM is gentle, so try 75% and then full speed.",
    // Right hand only, from the user's two Songscription sheets of the Moonu BGM "Just the two
    // of us" ("3 Bgm The piano n I"): 0-30 s (bars 1-13, q = 101) and 25-55 s (q = 99), which
    // overlap: the second sheet's bars 1-3 are the first's bars 11-13, so it joins at its bar 4
    // (bar 14 here). D minor (one flat), 4/4, 21 bars. Written an octave lower: the sheets run
    // G4 to B♭5. Top note of each chord; grace notes and trills left out; tied notes joined.
    // The last bar's quick run up to D6 and the 8va D is left out: it ends on the held D.
    // Bars 1 and 5: E G F is E F, the G (Pa) dropped and the F (Ma) held for both (the user, 2026-11-19).
    // The notes below C4 are left out too, for the default layout (the user, 2026-11-19): the G
    // ending bar 20 is a rest and the A C B♭ bar after it is dropped.
    // Chords: Dm | Am7 | B♭maj7 | Gm7 Am7 | Dm | Am7 | B♭maj7 | Gm7 Am7 | Dm | Dm7/C | Gm | Am7 |
    //         Dm | Dm7/C | Gm | Am | Dm Am7 | Dm Am7 | Dm Am7 | Dm9 (the F Am/E bar dropped)
    pattern: `r/3 E/0.5 F/0.5 |
              D/2 r/1 D/0.5 C/0.5 |
              E/1.5 C/1.5 E/0.5 F/0.5 |
              D/2 r/1.5 C/0.5 |
              E/2 r/1 E/0.5 F/0.5 |
              D/2 r/1 D/0.5 C/0.5 |
              E/1 F/0.25 E/0.25 D/0.25 C/0.25 r/1 E/0.5 F/0.5 |
              D/2 r/1.5 C/0.5 |
              E/2 r/2 |
              D/0.5 G/0.5 G/0.5 G/0.5 F/0.5 E/0.5 F/1 |
              D/0.5 G/0.5 G/0.5 G/0.5 F/0.5 E/0.5 F/1 |
              D/0.5 G/0.5 G/0.5 G/0.5 F/0.5 E/0.5 D/0.25 E/0.25 D/0.25 C/0.25 |
              C/0.5 D/0.5 E/0.5 F/0.5 E/2 |
              D/0.5 G/0.5 G/0.5 G/0.5 F/0.5 E/0.5 F/1 |
              D/0.5 A#/0.5 A/0.5 G/0.5 F/0.5 E/0.5 F/1 |
              D/0.5 G/0.5 G/0.5 G/0.5 F/0.5 E/0.5 D/0.5 C/0.5 |
              C/0.5 D/0.5 E/0.5 F/0.5 E/2 |
              F/0.5 D/0.5 F/0.5 E/2.5 |
              F/0.5 D/0.5 F/0.5 E/2.5 |
              F/0.5 D/0.5 F/0.5 E/2 r/0.5 |
              D/4`,
  },
  {
    id: 'kanave-kanave',
    title: 'Kanave Kanave (piano melody)',
    level: 'Decoded songs',
    bpm: 94,
    decoded: true,
    scale: 'A minor',
    barBeats: 3.5, // 7/8: bar lines on the graphs every seven eighths
    hint: "Right-hand melody from your Songscription sheet, in A minor, all white keys: H J K L ; ' (G A B, high C D E). It is in 7/8: seven quick notes a bar, counted 1-2-3-4 5-6-7. Bars 1 to 8 are one phrase, A A E A D C B, played three times and then A B C and a long B. Try 75% first.",
    // Right hand only, from the user's Songscription sheet of "Kanave Kanave" ("The piano n I |
    // Jus the two of us"), A minor, 7/8 (3.5 beats a bar), q = 94, 13 bars. Bars 1-8 as written
    // (A4 to E5); bars 9-13 sit an octave higher on the sheet (A5 to D6) and are written an
    // octave lower here, so it all fits the default keys. Top note of each chord (bars 9, 11, 13
    // are chords on A5); grace notes and trills left out; tied notes joined.
    // Chords: Am Em7/B | Em7/B | Am | Em7/B | Am | Em7/B | Am | Em7 | Am Em | | Fmaj7 | C G/D | Am
    pattern: `A/0.5 A/0.5 E+/0.5 A/0.5 D+/0.5 C+/0.5 B/0.5 |
              A/0.5 A/0.5 E+/0.5 A/0.5 D+/0.5 C+/0.5 B/0.5 |
              A/0.5 A/0.5 E+/0.5 A/0.5 D+/0.5 C+/0.5 B/0.5 |
              A/0.5 B/0.5 C+/0.5 B/2 |
              A/0.5 A/0.5 E+/0.5 A/0.5 D+/0.5 C+/0.5 B/0.5 |
              A/0.5 A/0.5 E+/0.5 A/0.5 D+/0.5 C+/0.5 B/0.5 |
              A/0.5 A/0.5 E+/0.5 A/0.5 D+/0.5 C+/0.5 B/0.5 |
              A/0.5 B/0.5 C+/0.5 B/2 |
              A/0.5 A/0.5 A/0.5 A/0.5 A/0.5 A/1 |
              A/0.5 B/0.5 C+/0.5 B/1 A/0.5 G/0.5 |
              A/0.5 A/0.5 A/0.5 A/0.5 A/0.5 A/1 |
              A/0.5 D+/0.5 C+/0.5 B/1 A/0.5 G/0.5 |
              A/0.5 A/0.5 A/0.5 A/0.5 A/0.5 r/1`,
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
