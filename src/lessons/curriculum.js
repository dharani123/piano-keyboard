import { parseNotes, songById } from '../data/songs.js';

// The course, in the order a piano teacher would take a beginner through it:
// orientation → rhythm → intervals & hand position → ear (name that note) → scales → chords → songs.
//
// Theory blocks: a string is a paragraph; { list }, { tip }, and
// { keys: { mark: [...notes], labels: { note: text } }, caption } draws a
// mini keyboard. Text supports **bold**, *italic* and `key` markup.
//
// Exercises:
//   { type: 'steps', hint: 'glow' | 'none', make: () => steps, prompt }
//      step = { notes, label, reveal?, prompt?, play?, listen?, phrase? }
//      play   – notes the app plays when the step starts (ear training)
//      listen – notes behind a "Hear it" button (chord demos)
//   { type: 'rhythm', bpm, pattern }  – timed play-along, see rhythm.js
//   { type: 'ear', pool, count, reference, ... } – name the note you hear, see ear/rounds.js

const notes = text => parseNotes(text);
const note = text => parseNotes(text)[0];
const pretty = name => name.replace('#', '♯');

const WHITES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ALL_TWELVE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = { 'D♭': 'C#', 'E♭': 'D#', 'G♭': 'F#', 'A♭': 'G#', 'B♭': 'A#' };

function randomSeq(pool, count) {
  const out = [];
  while (out.length < count) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick !== out.at(-1)) out.push(pick);
  }
  return out;
}

// One step per note, labelled with its name
const noteSteps = (text, extra = {}) =>
  notes(text).map(n => ({ notes: [n], label: pretty(n.name), phrase: n.phrase, ...extra }));

const chordStep = (text, label, extra = {}) => {
  const ns = notes(text);
  return { notes: ns, label, listen: ns, chord: true, ...extra };
};

const FINGERS = [
  { label: 'L5', name: 'C', text: 'Left hand, finger **5** (pinky)' },
  { label: 'L4', name: 'D', text: 'Left hand, finger **4** (ring)' },
  { label: 'L3', name: 'E', text: 'Left hand, finger **3** (middle)' },
  { label: 'L2', name: 'F', text: 'Left hand, finger **2** (index)' },
  { label: 'R2', name: 'G', text: 'Right hand, finger **2** (index)' },
  { label: 'R3', name: 'A', text: 'Right hand, finger **3** (middle)' },
  { label: 'R4', name: 'B', text: 'Right hand, finger **4** (ring)' },
];

// Name-that-note lesson, see src/ear/rounds.js for the config
const earLesson = (id, title, theory, config) => ({
  id,
  title,
  theory,
  exercise: { type: 'ear', prompt: 'Listen, then press the note you heard', ...config },
});

const songLesson = (id, songId, theory) => ({
  id,
  title: songById[songId].title,
  theory,
  exercise: {
    type: 'steps',
    hint: 'glow',
    prompt: 'Play the glowing key',
    make: () => songById[songId].notes.map(n => ({ notes: [n], label: pretty(n.name), phrase: n.phrase })),
  },
});

export const UNITS = [
  {
    title: 'Meet the keyboard',
    lessons: [
      {
        id: 'keys',
        title: 'White & black keys',
        theory: [
          'A piano keyboard is one pattern repeated over and over: white keys, with black keys sitting between some of them.',
          'The black keys come in groups of **two** and **three**. That pattern is how pianists find their way around without labels. Learn to *see* the groups and you will never get lost.',
          { keys: { mark: ['C#', 'D#', 'F#', 'G#', 'A#'], labels: { 'C#': '2', 'D#': '2', 'F#': '3', 'G#': '3', 'A#': '3' } }, caption: 'A group of 2 black keys, then a group of 3' },
          'On Desk Piano the home row plays the white keys and the row above plays the black keys: `E` `R` are the group of two, `Y` `U` `I` the group of three.',
          { tip: 'Rest your fingers on `S` `D` `F` `G` and `H` `J` `K` `L`: typing position, shifted one key to the right. That is your home position for every lesson.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          prompt: 'Play the glowing key',
          make: () => [
            ...noteSteps('C D E F G A B'),
            ...noteSteps('C# D# | F# G# A#').map(s => ({ ...s, phrase: s.phrase + 1 })),
          ],
        },
      },
      {
        id: 'alphabet',
        title: 'The musical alphabet',
        theory: [
          'Music uses just seven letter names: **A B C D E F G**. After G it starts again from A.',
          'The easiest note to find is **C**: the white key just to the *left* of the group of two black keys. Pianists use it as their landmark.',
          { keys: { mark: ['C'] }, caption: 'C sits just left of the two black keys' },
          'Moving to the right, notes get **higher**. Moving left, they get **lower**. Starting from C, the white keys spell **C D E F G A B**, and the key after B is C again, one **octave** higher.',
          { tip: 'Say each note name out loud as you play it. Teachers ask for this because it builds the link between name and key much faster.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          prompt: 'Play up the alphabet, then back down',
          make: () => noteSteps('C D E F G A B | A G F E D C'),
        },
      },
      {
        id: 'fingers',
        title: 'Finger numbers',
        theory: [
          'Pianists number their fingers, the same way on both hands: **thumb = 1, index = 2, middle = 3, ring = 4, pinky = 5**. Piano music prints these numbers above the notes to show which finger to use.',
          { keys: { mark: WHITES, labels: { C: 'L5', D: 'L4', E: 'L3', F: 'L2', G: 'R2', A: 'R3', B: 'R4' } }, caption: 'Desk Piano fingering (L = left hand, R = right hand)' },
          {
            list: [
              'Left hand: pinky (5) on `S`, ring (4) on `D`, middle (3) on `F`, index (2) on `G`',
              'Right hand: index (2) on `H`, middle (3) on `J`, ring (4) on `K`, pinky (5) on `L`',
              'Both thumbs (1) rest on `Space`, which is your sustain pedal',
            ],
          },
          'You will get finger numbers instead of note names. Play each one without looking down. If you miss twice, the key glows.',
        ],
        exercise: {
          type: 'steps',
          hint: 'none',
          make: () => randomSeq(FINGERS, 14).map(f => ({
            notes: [note(f.name)], label: f.label, reveal: f.name, prompt: f.text,
          })),
        },
      },
      {
        id: 'note-finder',
        title: 'Note finder',
        theory: [
          'Time to learn the note names by heart. You will see a letter: find it with no glowing help.',
          { keys: { mark: ['C', 'F'] }, caption: 'Landmarks: C is left of the 2 black keys, F is left of the 3' },
          'Use the landmarks. **C** is left of the group of two black keys and **F** is left of the group of three. From a landmark, count up or down the alphabet.',
          { tip: 'Two wrong tries on a note and it glows, so you are never stuck. Aim for three stars with no mistakes at all.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'none',
          make: () => randomSeq(WHITES, 14).map(name => ({
            notes: [note(name)], label: name, prompt: `Find **${name}**`,
          })),
        },
      },
    ],
  },
  {
    title: 'Rhythm & counting',
    lessons: [
      {
        id: 'beat',
        title: 'Feel the beat',
        theory: [
          'Music has a steady pulse called the **beat**, like a heartbeat. **Tempo** is how fast the beats go, measured in beats per minute (BPM).',
          'Beats are grouped into **bars** (also called measures). Most songs count **1 2 3 4, 1 2 3 4**. The first beat of each bar is the strongest, and the metronome clicks it higher.',
          'A **quarter note ♩** lasts exactly one beat.',
          { tip: 'Press **Listen first** to hear how it should sound. Then press **Start**: you get four count-in clicks, and you start playing on the next "1". Playing exactly on the click earns a *Perfect*.' },
        ],
        exercise: { type: 'rhythm', bpm: 80, pattern: 'C C C C | C C C C | G G G G | C C C C' },
      },
      {
        id: 'long-notes',
        title: 'Half & whole notes',
        theory: [
          'Not every note lasts one beat.',
          {
            list: [
              '**Quarter note ♩**: 1 beat',
              '**Half note 𝅗𝅥**: 2 beats. Hold it while you count "1-2"',
              '**Whole note 𝅝**: 4 beats, a whole bar. Count "1-2-3-4"',
            ],
          },
          'Desk Piano checks when each note *starts*. Keep holding the key for its full length so it sounds right, and keep counting in your head.',
        ],
        exercise: { type: 'rhythm', bpm: 80, pattern: 'C C D/2 | E E F/2 | G/2 G/2 | C/4' },
      },
      {
        id: 'rests',
        title: 'Rests',
        theory: [
          'A **rest** is a beat of silence, and silence counts too! A **quarter rest 𝄽** is one beat where you play nothing.',
          'The hardest part about rests is not rushing. Keep counting through them so the next note comes in exactly on time.',
          { tip: 'In the timeline, rests are the faded boxes.' },
        ],
        exercise: { type: 'rhythm', bpm: 80, pattern: 'C r C r | D D r D | E r E r | C/2 r/2' },
      },
      {
        id: 'eighths',
        title: 'Eighth notes: Hot Cross Buns',
        theory: [
          'An **eighth note ♪** lasts half a beat, so two of them fit in one beat. Count them **"1-and 2-and 3-and 4-and"**.',
          'Now you can put melody and rhythm together in one of the most common first pieces: *Hot Cross Buns*. It uses just three notes, **E D C**.',
          { keys: { mark: ['C', 'D', 'E'] }, caption: 'Hot Cross Buns uses E, D and C' },
        ],
        exercise: {
          type: 'rhythm',
          bpm: 72,
          pattern: 'E D C/2 | E D C/2 | C/0.5 C/0.5 C/0.5 C/0.5 D/0.5 D/0.5 D/0.5 D/0.5 | E D C/2',
        },
      },
    ],
  },
  {
    title: 'Steps, skips & hand position',
    lessons: [
      {
        id: 'half-whole',
        title: 'Half steps & whole steps',
        theory: [
          'The distance between two notes is called an **interval**. The smallest one is a **half step**: from any key to the very next key, black or white. Two half steps make a **whole step**.',
          'Most white keys have a black key between them, so they are a whole step apart. But **E–F** and **B–C** have no black key between them. They are natural half steps.',
          { keys: { mark: ['E', 'F', 'B'] }, caption: 'E–F and B–C: half steps with no black key between' },
          'The exercise plays every key in order, white and black. This is the **chromatic scale**: all half steps.',
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          prompt: 'Play every key in order: all half steps',
          make: () => noteSteps('C C# D D# E F F# G G# A A# B | A# A G# G F# F E D# D C# C'),
        },
      },
      {
        id: 'steps-skips',
        title: 'Steps & skips',
        theory: [
          'A **step** moves to the next letter (C→D). On sheet music it goes from a line to the next space.',
          'A **skip** jumps over one letter (C→E). On sheet music it goes from a line to the next line.',
          { keys: { mark: ['C', 'E', 'G'] }, caption: 'C–E–G: skip, skip' },
          'Good readers recognise steps and skips by their *shape* instead of naming every note. Feel the difference under your fingers: a step uses the next finger, a skip jumps over one.',
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            ...noteSteps('C D E D C', { prompt: '**Steps**: move to the next key' }),
            ...noteSteps('C E G E C', { prompt: '**Skips**: jump over one key', phrase: 1 }),
            ...noteSteps('D F A F D', { prompt: '**Skips** starting on D', phrase: 2 }),
            ...noteSteps('E D C E G', { prompt: '**Mixed**: steps then skips', phrase: 3 }),
          ],
        },
      },
      {
        id: 'c-position',
        title: 'C position',
        theory: [
          'Most beginner pieces sit in **C position**: five fingers on five neighbouring notes, **C D E F G**, so you never need to look down.',
          { keys: { mark: ['C', 'D', 'E', 'F', 'G'], labels: { C: 'A', D: 'S', E: 'D', F: 'F', G: 'J' } }, caption: 'C position on Desk Piano: A S D F + J' },
          'Play these patterns from memory, without the glow. Two wrong tries and help appears.',
          { tip: 'Teachers drill five-finger patterns because they train finger independence, so every finger learns to press on its own.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'none',
          prompt: 'Play the pattern (names shown below)',
          make: () => noteSteps('C D E F G F E D C | C E D F E G F E D C | G E C'),
        },
      },
    ],
  },
  {
    title: 'Ear training',
    lessons: [
      earLesson('ear-cg', 'Your anchor: C and G', [
        'Good musicians can hear a note and find it. Very few people are born with **perfect pitch**, but anyone can learn **relative pitch**: you judge a note by how it sounds *next to a note you know*.',
        'Your anchor note is **C**. Every round in this unit starts with C, then plays a mystery note. Your job is to find it on the keyboard. Any octave counts.',
        '**G** is the easiest note to hear against C. It sounds **open and stable**, like the start of a fanfare. The jump from C up to G is big and bright.',
        { keys: { mark: ['C', 'G'] }, caption: 'This lesson: C and G' },
        { tip: 'Sing or hum along. If your voice can find the note, your fingers will follow. Over the unit you will slowly learn to *carry C in your head*.' },
      ], { pool: ['C', 'G'], count: 12, reference: 'every', intro: ['C', 'G'] }),
      earLesson('ear-e', 'Meet E', [
        '**E** sits between C and G. C, E and G together make the C major chord, so E sounds **sweet and bright**, the "happy" note.',
        'From C, E is a small cheerful step up, about the first two notes of *"Oh when the saints"*.',
        { keys: { mark: ['C', 'E', 'G'] }, caption: 'This lesson: C, E and G. About half the rounds are E.' },
      ], { pool: ['C', 'E', 'G'], focus: 'E', count: 12, reference: 'every', intro: ['E'] }),
      earLesson('ear-d', 'Meet D', [
        '**D** is right next to C. It sounds **unfinished**, like a question. It wants to step back down to C or on up to E.',
        'C to D is the opening of *Do-Re-Mi*: "Do, a deer…"',
        { keys: { mark: ['C', 'D', 'E', 'G'] }, caption: 'This lesson: C, D, E and G' },
        { tip: 'D and E are close. Ask yourself: does it want to **fall to C** (D) or does it feel **settled and sweet** (E)?' },
      ], { pool: ['C', 'D', 'E', 'G'], focus: 'D', count: 14, reference: 'every', intro: ['D'] }),
      earLesson('ear-f', 'Meet F', [
        '**F** feels **heavy**: it leans down and wants to fall to E. Play F then E and you will feel it settle.',
        'C up to F is the start of *Here Comes the Bride*.',
        { keys: { mark: ['C', 'D', 'E', 'F', 'G'] }, caption: 'This lesson: C to G' },
      ], { pool: ['C', 'D', 'E', 'F', 'G'], focus: 'F', count: 14, reference: 'every', intro: ['F'] }),
      earLesson('ear-a', 'Meet A', [
        '**A** is **warm and a little wistful**. It is higher than G and a bit softer.',
        'C up to A is the leap at the start of *My Bonnie Lies Over the Ocean*.',
        { keys: { mark: ['C', 'D', 'E', 'F', 'G', 'A'] }, caption: 'This lesson: C to A' },
      ], { pool: ['C', 'D', 'E', 'F', 'G', 'A'], focus: 'A', count: 16, reference: 'every', intro: ['A'] }),
      earLesson('ear-b', 'Meet B', [
        '**B** is the **leading note**. It leans hard **up to C**, as if it can\'t wait to get home. Play B then high C and feel the relief.',
        'It is the most tense of the white keys, so once you know that pull you\'ll never miss it.',
        { keys: { mark: WHITES }, caption: 'This lesson: all seven white keys' },
      ], { pool: WHITES, focus: 'B', count: 16, reference: 'every', intro: ['B'] }),
      earLesson('ear-neighbours', 'Close neighbours', [
        'The hardest notes to tell apart are **neighbours**: D/E, E/F, A/B and B/C.',
        'This round plays them **in pairs, back to back**. Compare them directly: which one feels settled, which one wants to move?',
        { list: ['**E or F?** E is sweet and settled, F is heavy and wants to fall.', '**A or B?** A is warm, B pulls up to C.', '**B or C?** B is tense, C is home.'] },
      ], { pool: ['C', 'D', 'E', 'F', 'A', 'B'], pairs: [['D', 'E'], ['E', 'F'], ['A', 'B'], ['B', 'C']], count: 16, reference: 'every' }),
      earLesson('ear-whites', 'All the white keys', [
        'Every white key, at random, 20 rounds. Use what you\'ve learned: **G** open, **E** sweet, **D** a question, **F** heavy, **A** warm, **B** pulling home.',
        { keys: { mark: WHITES }, caption: 'All seven white keys' },
      ], { pool: WHITES, count: 20, reference: 'every' }),
      earLesson('ear-fs', 'Black keys: F♯', [
        'Now the black keys. **F♯** (`Y`) sits exactly halfway between C and the next C. It sounds **tense and unsettled**, like a siren or a question with no answer.',
        'In old music it was called *the devil in music*. Once you hear its strangeness, it\'s easy to spot.',
        { keys: { mark: [...WHITES, 'F#'] }, caption: 'This lesson: white keys + F♯' },
      ], { pool: [...WHITES, 'F#'], focus: 'F#', count: 16, reference: 'every', intro: ['F#'] }),
      earLesson('ear-cs-ds', 'C♯ and D♯', [
        '**C♯** (`E`) is a tiny step above C. It sounds **crunchy and dark**, almost rubbing against C.',
        '**D♯** (`R`) sounds **sad**: it\'s the note that turns a happy C major chord into C minor.',
        { keys: { mark: [...WHITES, 'C#', 'D#', 'F#'] }, caption: 'This lesson: white keys + C♯, D♯, F♯' },
      ], { pool: [...WHITES, 'C#', 'D#', 'F#'], count: 16, reference: 'every', intro: ['C#', 'D#'] }),
      earLesson('ear-gs-as', 'G♯ and A♯', [
        '**G♯** (`U`) sounds **dark and dramatic**, like a film score building suspense.',
        '**A♯** (`I`) sounds **bluesy and relaxed**: it\'s the note that gives a chord a soulful, unfinished feel.',
        { keys: { mark: ALL_TWELVE }, caption: 'This lesson: all twelve notes' },
      ], { pool: ALL_TWELVE, count: 16, reference: 'every', intro: ['G#', 'A#'] }),
      earLesson('ear-twelve', 'All twelve notes', [
        'Every note on the keyboard, 20 rounds, C before each one. This is the full test of your ear.',
        { tip: 'If you\'re unsure, think: white or black? Then: which family does it feel like?' },
      ], { pool: ALL_TWELVE, count: 20, reference: 'every' }),
      earLesson('ear-ref-sometimes', 'Reference sometimes', [
        'Time to let go of C. In this lesson C plays **only in some rounds**. In the others you hear just the mystery note.',
        'Keep C in your head: hum it quietly before you answer. Press **🔊 Hear C** if you lose it.',
      ], { pool: ALL_TWELVE, count: 20, reference: 'sometimes' }),
      earLesson('ear-ref-once', 'Reference once', [
        'C plays **once, at the start**. After that you\'re on your own (but **🔊 Hear C** is always there).',
        'This is where relative pitch starts to feel like a superpower: you carry C with you and measure every note against it.',
      ], { pool: ALL_TWELVE, count: 20, reference: 'start' }),
      earLesson('ear-octaves', 'Any octave', [
        'Notes now come from **three octaves**: low, middle and high. An E is still an E, whether it\'s deep or bright.',
        'Answer in any octave. You don\'t need to press `Z` or `X`.',
      ], { pool: ALL_TWELVE, count: 20, reference: 'start', octaves: [-1, 0, 1] }),
      earLesson('ear-voices', 'Any instrument', [
        'Each round uses a **random instrument**: organ, strings, bells and more. Real music isn\'t always a piano!',
        'Listen past the *sound* to the *pitch*.',
      ], { pool: ALL_TWELVE, count: 20, reference: 'start', randomVoice: true }),
      earLesson('ear-quick', 'Quick ear', [
        'The final test: **3 seconds** to answer each note. Too slow counts as a miss.',
        'Fast recognition means the note is truly in your ear, not worked out. Pass this and the **Ear Gym** opens for daily practice. 🎧',
      ], { pool: ALL_TWELVE, count: 20, reference: 'start', timeLimit: 3000 }),
    ],
  },
  {
    title: 'Scales',
    lessons: [
      {
        id: 'c-major',
        title: 'The C major scale',
        theory: [
          'A **scale** is eight notes in a row, from one note up to the same note an octave higher. **C major** uses only the white keys: C D E F G A B C.',
          'Every major scale follows the same pattern of steps: **W W H W W W H** (W = whole step, H = half step). Notice that the half steps are E–F and B–C.',
          { keys: { mark: WHITES }, caption: 'C major: all the white keys' },
          'For the top C, press `L` (right after `K`). It is the C one octave up, so you never leave your hand position.',
        ],
        exercise: { type: 'steps', hint: 'glow', prompt: 'Play the scale up and back down', make: () => noteSteps('C D E F G A B C+ | B A G F E D C') },
      },
      {
        id: 'sharps-flats',
        title: 'Sharps & flats',
        theory: [
          'A **sharp ♯** raises a note by a half step. A **flat ♭** lowers it by a half step.',
          'So the black key between C and D has two names: **C♯** and **D♭**. Same key, two names (pianists call these *enharmonic* notes).',
          { keys: { mark: ['C#', 'D#', 'F#', 'G#', 'A#'], labels: { 'C#': 'C♯ D♭', 'D#': 'D♯ E♭', 'F#': 'F♯ G♭', 'G#': 'G♯ A♭', 'A#': 'A♯ B♭' } }, caption: 'Every black key has a sharp name and a flat name' },
          { tip: 'For a sharp, find the white key and go one step right. For a flat, go one step left.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'none',
          make: () => randomSeq(['C#', 'D#', 'F#', 'G#', 'A#', ...Object.keys(FLATS)], 12).map(name => {
            const n = note(FLATS[name] ?? name);
            return { notes: [n], label: pretty(name), prompt: `Find **${pretty(name)}**` };
          }),
        },
      },
      {
        id: 'g-major',
        title: 'The G major scale',
        theory: [
          'Start a major scale on **G** with the same **W W H W W W H** pattern and you will find it needs one black key: **F♯**. That is why the key of G major has one sharp.',
          { keys: { mark: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'] }, caption: 'G major: G A B C D E F♯ G' },
          'Start on `H` (G) and go up to B. Then press `X` and continue **C D E F♯ G**.',
        ],
        exercise: { type: 'steps', hint: 'glow', prompt: 'Play the G major scale', make: () => noteSteps('G A B C+ D+ E+ F#+ G+') },
      },
    ],
  },
  {
    title: 'Chords',
    lessons: [
      {
        id: 'c-chord',
        title: 'Your first chord: C major',
        theory: [
          'A **chord** is three or more notes played together. The most common chord is the **triad**: a root note, then a skip, then another skip. Starting on C, that gives **C E G**.',
          { keys: { mark: ['C', 'E', 'G'], labels: { C: 'A', E: 'D', G: 'J' } }, caption: 'C major chord: A + D + J' },
          'Press all three keys at the same moment. Major chords sound **bright and happy**.',
          'Pianists also play chords one note at a time. That is called a **broken chord** (or arpeggio).',
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            chordStep('C E G', 'C', { prompt: 'Press **C + E + G** together' }),
            ...noteSteps('C E G', { prompt: 'Now broken: one note at a time', phrase: 1 }),
            chordStep('C E G', 'C', { prompt: 'Together again', phrase: 2 }),
            ...noteSteps('G E C', { prompt: 'Broken, going down', phrase: 3 }),
            chordStep('C E G', 'C', { prompt: 'And once more together', phrase: 4 }),
          ],
        },
      },
      {
        id: 'major-minor',
        title: 'Major vs minor',
        theory: [
          'Lower the middle note of a major chord by a half step and it becomes **minor**, which sounds darker and sadder.',
          { keys: { mark: ['C', 'D#', 'G'], labels: { 'D#': 'E♭' } }, caption: 'C minor: C + E♭ + G' },
          '**C major** = C E G. **C minor** = C **E♭** G. Only one finger moves, but the mood changes completely.',
          '**A minor** is A C E. Here we play it as **C E A**: the same notes, rearranged. That is called an **inversion**.',
          { tip: 'Use **Hear it** to compare the two sounds before you play.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            chordStep('C E G', 'C', { prompt: '**C major**: happy' }),
            chordStep('C D# G', 'Cm', { prompt: '**C minor**: sad (E drops to E♭)' }),
            chordStep('C E G', 'C', { prompt: '**C major** again' }),
            chordStep('C D# G', 'Cm', { prompt: '**C minor** again' }),
            chordStep('C E A', 'Am', { prompt: '**A minor** (as C E A)', phrase: 1 }),
            chordStep('C E G', 'C', { prompt: 'Back to **C major**', phrase: 1 }),
          ],
        },
      },
      {
        id: 'i-iv-v',
        title: 'I – IV – V',
        theory: [
          'Thousands of songs use just three chords. In C major they are built on the 1st, 4th and 5th notes of the scale: **C (I), F (IV) and G (V)**.',
          'Pianists use **inversions** so the hand barely moves:',
          { list: ['**C** = C E G', '**F** = C F A (C stays, two fingers move up)', '**G** = D G B', 'back to **C** = C E G'] },
          { keys: { mark: ['C', 'F', 'A'] }, caption: 'F chord as C F A' },
          'Play this progression a few times and you will recognise it in countless songs.',
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [0, 1].flatMap(round => [
            chordStep('C E G', 'C', { prompt: '**I**: C chord', phrase: round }),
            chordStep('C F A', 'F', { prompt: '**IV**: F chord', phrase: round }),
            chordStep('D G B', 'G', { prompt: '**V**: G chord', phrase: round }),
            chordStep('C E G', 'C', { prompt: '**I**: home to C', phrase: round }),
          ]),
        },
      },
    ],
  },
  {
    title: 'Songs',
    lessons: [
      songLesson('song-mary', 'mary', [
        'Your first real piece! *Mary Had a Little Lamb* uses only **C D E** and **G**, nearly all steps.',
        { tip: 'Keep your left hand still on `S` `D` `F` and let the fingers do the work.' },
      ]),
      songLesson('song-twinkle', 'twinkle', [
        '*Twinkle Twinkle Little Star* opens with a big skip, **C up to G**, then walks back down by steps.',
        'Notice the pattern: each line goes down the scale one step at a time. Spotting patterns like this is how pianists memorise music.',
      ]),
      songLesson('song-ode', 'ode', [
        'Beethoven\'s *Ode to Joy* is almost entirely **steps**, which makes it perfect for C position.',
        { tip: 'Near the end of the third line there is a dip to **low G**. Press `Z` when the hint asks, then `X` to come back.' },
      ]),
      songLesson('song-jingle', 'jingle', [
        '*Jingle Bells* has lots of **repeated notes**. Keep them even, like a steady beat.',
      ]),
      songLesson('song-birthday', 'birthday', [
        '*Happy Birthday* starts **below** middle C, on low G. Press `Z` before you begin.',
        'It has the biggest jump in the course, an **octave**, on "Happy birthday *dear*...".',
      ]),
      {
        id: 'song-twinkle-timed',
        title: 'Twinkle, in time',
        theory: [
          'The final test: play *Twinkle Twinkle* **with rhythm**. Each line is six quarter notes and then a half note at the end. Hold that one for "1-2".',
          'This puts together everything you have learned: note names, fingers, steps and skips, and steady counting. 🎓',
        ],
        exercise: {
          type: 'rhythm',
          bpm: 84,
          pattern: 'C C G G | A A G/2 | F F E E | D D C/2 | G G F F | E E D/2 | G G F F | E E D/2 | C C G G | A A G/2 | F F E E | D D C/2',
        },
      },
    ],
  },
];

// Flat list with numbering, e.g. lesson.num = "2.3"
export const LESSONS = UNITS.flatMap((unit, u) =>
  unit.lessons.map((lesson, l) => ({ ...lesson, num: `${u + 1}.${l + 1}`, unit: u }))
);
export const lessonById = Object.fromEntries(LESSONS.map(l => [l.id, l]));
