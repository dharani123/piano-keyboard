import { parseNotes } from '../data/songs.js';

// The Identify Notes tab: interval training. The app plays two notes one after the
// other; you press them back in the same order. Same lesson format as
// lessons/curriculum.js: each round is two steps, the first carrying `play` (both
// notes, so "Hear again" replays the pair during either step).

const WHITES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const ALL_TWELVE = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// `count` rounds of two different notes from `pool`, in the order they are played
// (up or down), never the same pair twice in a row
export function twoNoteRounds(pool, count, random = Math.random) {
  const rounds = [];
  while (rounds.length < count) {
    const a = pool[Math.floor(random() * pool.length)];
    const b = pool[Math.floor(random() * pool.length)];
    if (a === b || rounds.at(-1)?.join() === [a, b].join()) continue;
    rounds.push([a, b]);
  }
  return rounds;
}

const pretty = name => name.replace('#', '♯');
// seconds from the first note's start to the second's: a clear pause between them
const GAP = 1;

function roundSteps([a, b], round) {
  const [first, second] = parseNotes(`${a} ${b}`);
  return [
    { notes: [first], play: [first, second], gap: GAP, label: '?', reveal: pretty(a), phrase: round, prompt: 'Two notes, one after the other. Press the **first** note' },
    { notes: [second], label: '?', reveal: pretty(b), phrase: round, prompt: 'Now the **second** note: did it go up or down?' },
  ];
}

// Greater / lesser: hear two notes, say whether the second went up or down
// the Greater / lesser lessons play their notes closer together
const GL_GAP = 0.6;
export const HIGHER = '↑ Higher';
export const LOWER = '↓ Lower';

export function higherLowerQuestions(pool, count, random = Math.random) {
  return twoNoteRounds(pool, count, random).map(([a, b]) => {
    const [first, second] = parseNotes(`${a} ${b}`);
    return {
      prompt: 'Two notes, one after the other. Did the **second** note go **higher** or **lower**?',
      play: [first, second],
      gap: GL_GAP,
      options: [HIGHER, LOWER],
      answer: second.semitone > first.semitone ? HIGHER : LOWER,
      reveal: `**${pretty(a)} → ${pretty(b)}**`,
    };
  });
}

const higherLower = (id, title, pool, range) => ({
  id,
  title,
  theory: [
    `The app plays **two notes** from ${range}, **one after the other**. You don't press the notes: just say whether the **second** note was **higher** or **lower** than the first.`,
    { list: [
      'Press `↑` for **Higher** or `↓` for **Lower** (or click the buttons).',
      'A wrong answer counts as a mistake; the question stays until you get it.',
      'Press `B` to hear the two notes again.',
      'Once you get it right, the notes play again with their keys lit, then the next question starts.',
    ] },
    { tip: 'Hum the two notes softly and feel whether your voice went up or down.' },
  ],
  exercise: {
    type: 'choice',
    keys: { ArrowUp: HIGHER, ArrowDown: LOWER },
    make: () => higherLowerQuestions(pool, 15),
  },
});

// Greater / lesser with three notes: four slope pictures, one per shape (up-up, up-down,
// down-up, down-down), in a random order; pick the one that matches the notes played.
// Each option is three note names ("C E G"); q.slopes gives their pitches for the picture.
const SHAPES = [[true, true], [true, false], [false, true], [false, false]];
export const shapeOf = ([a, b, c]) => [b > a, c > b];

// three different-neighbour notes from `pool` (names) that go `shape`
function threeNotes(pool, [firstUp, secondUp], random) {
  for (;;) {
    const names = [0, 1, 2].map(() => pool[Math.floor(random() * pool.length)]);
    const [a, b, c] = parseNotes(names.join(' ')).map(n => n.semitone);
    if (a !== b && b !== c && (b > a) === firstUp && (c > b) === secondUp) return names;
  }
}

function shuffle(list, random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// `count` questions, each shape about as often, never the same three notes twice in a row
export function threeNoteQuestions(pool, count, random = Math.random) {
  const questions = [];
  let last = null;
  while (questions.length < count) {
    const shape = SHAPES[Math.floor(random() * SHAPES.length)];
    const names = threeNotes(pool, shape, random);
    if (names.join() === last) continue;
    last = names.join();
    const answer = names.join(' ');
    const others = SHAPES.filter(s => s !== shape).map(s => threeNotes(pool, s, random).join(' '));
    const options = shuffle([answer, ...others], random);
    questions.push({
      prompt: 'Three notes, one after the other. Which picture has the **same shape**?',
      play: parseNotes(answer),
      gap: GL_GAP,
      options,
      slopes: Object.fromEntries(options.map(o => [o, parseNotes(o).map(n => n.semitone)])),
      answer,
      reveal: `**${names.map(pretty).join(' → ')}**`,
    });
  }
  return questions;
}

const higherLowerThree = (id, title, pool, range) => ({
  id,
  title,
  theory: [
    `The app plays **three notes** from ${range}, **one after the other**. Then pick the **picture** whose line goes the same way: from the 1st note to the 2nd, and from the 2nd to the 3rd, did it go **up** (increased) or **down** (decreased)?`,
    { list: [
      'Every picture has a different shape: up then up, up then down (/\\), down then up (\\/), or down then down.',
      'Higher dots are higher notes. Click the picture you heard.',
      'A wrong answer counts as a mistake; the question stays until you get it.',
      'Press `B` to hear the three notes again.',
    ] },
    { tip: 'Hum along softly and trace the shape with your hand: a climb, a hill, a valley or a slide down.' },
  ],
  exercise: {
    type: 'choice',
    make: () => threeNoteQuestions(pool, 15),
  },
});

// ---- Listening cues: one unit per cue, each a two- or three-way choice about a pair of notes ----

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SWARAS = ['Sa', 'Ri1', 'Ri', 'Ga2', 'Ga', 'Ma', 'Ma2', 'Pa', 'Da1', 'Da', 'Ni2', 'Ni'];
// what the distance between two notes is called, by semitones (1 to 12)
export const INTERVAL_NAMES = ['', 'half step', 'whole step', 'minor 3rd', 'major 3rd', '4th', 'tritone',
  '5th', 'minor 6th', 'major 6th', 'minor 7th', 'major 7th', 'octave'];
// pitch = semitones above this octave's C (12 = the C above); C to F above stays inside the default layout
const noteAt = pitch => parseNotes(NAMES[pitch % 12] + '+'.repeat(Math.floor(pitch / 12)))[0];
const label = pitch => pretty(NAMES[pitch % 12]) + (pitch >= 12 ? '′' : '');
const WHITE_PITCHES = [0, 2, 4, 5, 7, 9, 11];
const WHITES_TO_HIGH_F = [...WHITE_PITCHES, 12, 14, 16, 17];
const TWELVE_TO_HIGH_F = [...Array(18).keys()];

// `count` questions about two different notes from `pool` (pitches, see noteAt).
// classes = [{ option, test(distance, first, second) }]: each question first picks an
// option evenly, then a pair from the pool that fits it, so every answer comes up about
// as often. `from` fixes the first note; `up` keeps the second note above the first;
// `together` plays both at once. Never the same pair twice in a row.
export function pairQuestions({ pool, classes, count, prompt, from, up = false, together = false, random = Math.random }) {
  const pairs = [];
  for (const a of from === undefined ? pool : [from]) {
    for (const b of pool) {
      const distance = Math.abs(b - a);
      if (distance < 1 || distance > 12 || (up && b < a)) continue;
      const fits = classes.find(c => c.test(distance, a, b));
      if (fits) pairs.push({ a, b, option: fits.option });
    }
  }
  const byOption = classes.map(c => pairs.filter(p => p.option === c.option));
  const questions = [];
  let last = null;
  while (questions.length < count) {
    const group = byOption[Math.floor(random() * byOption.length)];
    const { a, b, option } = group[Math.floor(random() * group.length)];
    const key = `${a},${b}`;
    if (key === last) continue;
    last = key;
    const distance = Math.abs(b - a);
    questions.push({
      prompt,
      play: [noteAt(a), noteAt(b)],
      gap: GAP,
      together,
      options: classes.map(c => c.option),
      answer: option,
      reveal: `**${label(a)} ${together ? '+' : '→'} ${label(b)}**: ${distance === 12 ? 'an' : 'a'} ${INTERVAL_NAMES[distance]}`
        + (from === 0 ? ` (Sa → ${SWARAS[b % 12]}${b >= 12 ? ' above' : ''})` : ''),
    });
  }
  return questions;
}

// keys for two or three options, so the piano keys stay free
const TWO_KEYS = ['ArrowLeft', 'ArrowRight'];
const THREE_KEYS = ['ArrowLeft', 'ArrowDown', 'ArrowRight'];
const keysFor = classes => Object.fromEntries(classes.map((c, i) => [(classes.length === 2 ? TWO_KEYS : THREE_KEYS)[i], c.option]));

const cueLesson = ({ id, title, theory, ...config }) => ({
  id,
  title,
  theory: [
    ...theory,
    { list: [
      `Answer with ${config.classes.length === 2 ? '`←` / `→`' : '`←` / `↓` / `→`'} (or click the buttons).`,
      'A wrong answer counts as a mistake; the question stays until you get it.',
      'Press `B` to hear the notes again.',
    ] },
  ],
  exercise: { type: 'choice', keys: keysFor(config.classes), make: () => pairQuestions({ count: 15, ...config }) },
});

// Step or leap
export const STEP = '← Step';
export const LEAP = 'Leap →';
const STEP_OR_LEAP = [
  { option: STEP, test: d => d <= 2 },
  { option: LEAP, test: d => d >= 3 },
];
const stepTheory = keys => [
  `The app plays **two notes** from ${keys}, one after the other. Was the second one a **step** away or a **leap**?`,
  { list: [
    '**Step**: a half or whole step, the next key over (C→D, E→F, B→A). It sounds like a tune just moving on.',
    '**Leap**: anything bigger (C→E, D→A). It sounds like a jump, with a gap between the notes.',
  ] },
  { tip: 'Hum both notes. If your voice just slides to the next note, it is a step; if it has to jump, it is a leap.' },
];

// Hollow, sweet or tense
export const HOLLOW = '← Hollow';
export const SWEET = '↓ Sweet';
export const TENSE = 'Tense →';
const FEEL = [
  { option: HOLLOW, test: d => [5, 7, 12].includes(d) },
  { option: SWEET, test: d => [3, 4, 8, 9].includes(d) },
  { option: TENSE, test: d => [1, 2, 6, 10, 11].includes(d) },
];
const feelTheory = how => [
  `The app plays **two notes ${how}**. How do they sound next to each other?`,
  { list: [
    '**Hollow**: open and empty, like a bare frame. A 4th, 5th or octave (Sa–Ma, Sa–Pa, Sa–Sa′).',
    '**Sweet**: full and warm. A 3rd or 6th (Sa–Ga, Sa–Ga2, Sa–Da, Sa–Da1).',
    '**Tense**: crunchy, rubbing, wants to move. A 2nd, 7th or tritone (Sa–Ri, Sa–Ni, Sa–Ma2).',
  ] },
  { tip: 'Hollow and sweet both sound calm: hollow is plain, sweet has colour. Tense is the one that rubs.' },
];

// At rest or wants to move, after C (Sa)
export const REST = '← At rest';
export const MOVE = 'Wants to move →';

// Close calls: two intervals that are easy to mix up, always going up
const closeCall = (id, title, [low, high], why) => {
  const name = d => INTERVAL_NAMES[d].replace(/^./, c => c.toUpperCase());
  return cueLesson({
    id,
    title,
    pool: TWELVE_TO_HIGH_F,
    up: true,
    prompt: `Two notes going **up**. Was it a **${INTERVAL_NAMES[low]}** or a **${INTERVAL_NAMES[high]}**?`,
    classes: [
      { option: `← ${name(low)}`, test: d => d === low },
      { option: `${name(high)} →`, test: d => d === high },
    ],
    theory: [
      `The app plays **two notes going up**, from any key. Was the jump a **${INTERVAL_NAMES[low]}** (like Sa→${SWARAS[low]}) or a **${INTERVAL_NAMES[high]}** (like Sa→${high === 12 ? 'Sa′' : SWARAS[high]})?`,
      { list: why },
    ],
  });
};

// Single note with base C: C, then one note; press the note you heard (EarExercise)
const singleNote = (id, title, pool, range) => ({
  id,
  title,
  theory: [
    `The app plays the base note **C**, then **one more note** from ${range}. Press the note you heard on the piano.`,
    { list: [
      'Every round starts with C, so you always have it to compare against.',
      'Any octave of the right note counts.',
      'If you miss, you hear your note and then the real one. Press the glowing key to go on.',
      'Press `B` to hear C and the note again.',
    ] },
    { tip: 'Hum C, then hum up to the mystery note and count the steps on the keys.' },
  ],
  exercise: {
    type: 'ear',
    prompt: 'Listen: **C**, then the mystery note. Press the note you heard',
    pool,
    count: 15,
    reference: 'every',
  },
});

export const IDENTIFY_UNITS = [
  {
    title: 'Greater / lesser',
    allOpen: true, // the two modes, in either order
    lessons: [
      higherLower('id-gl-whites', 'Greater / lesser: 7 white keys', WHITES, 'the **7 white keys**, C to B'),
      higherLower('id-gl-twelve', 'Greater / lesser: all 12 keys', ALL_TWELVE, '**all 12 keys**, C to B with the black keys'),
      higherLowerThree('id-gl-three', 'Greater / lesser: three notes', WHITES, 'the **7 white keys**, C to B'),
    ],
  },
  {
    title: 'Step or leap',
    lessons: [
      cueLesson({ id: 'id-sl-whites', title: 'Step or leap: white keys', pool: WHITE_PITCHES, classes: STEP_OR_LEAP,
        prompt: 'Two notes, one after the other. Was it a **step** or a **leap**?', theory: stepTheory('the **7 white keys**, C to B') }),
      cueLesson({ id: 'id-sl-twelve', title: 'Step or leap: all 12 keys', pool: [...Array(12).keys()], classes: STEP_OR_LEAP,
        prompt: 'Two notes, one after the other. Was it a **step** or a **leap**?', theory: stepTheory('**all 12 keys**, black keys included') }),
    ],
  },
  {
    title: 'Hollow, sweet or tense',
    lessons: [
      cueLesson({ id: 'id-feel-together', title: 'Hollow, sweet or tense: together', pool: WHITES_TO_HIGH_F, classes: FEEL, together: true,
        prompt: 'Two notes **at once**. Do they sound **hollow**, **sweet** or **tense**?', theory: feelTheory('at the same time') }),
      cueLesson({ id: 'id-feel-apart', title: 'Hollow, sweet or tense: one after the other', pool: WHITES_TO_HIGH_F, classes: FEEL,
        prompt: 'Two notes, one after the other. Do they sound **hollow**, **sweet** or **tense**?',
        theory: [...feelTheory('one after the other'), { tip: 'Harder than together: hold the first note in your head (or hum it) while the second one plays.' }] }),
    ],
  },
  {
    title: 'At rest or wants to move',
    lessons: [
      cueLesson({
        id: 'id-rest-whites',
        title: 'At rest or wants to move',
        pool: WHITES_TO_HIGH_F.filter(p => p <= 12),
        from: 0,
        classes: [
          { option: REST, test: (d, a, b) => [4, 7, 12].includes(b) },
          { option: MOVE, test: (d, a, b) => [2, 5, 9, 11].includes(b) },
        ],
        prompt: 'Listen: **C (Sa)**, then a white key. Could the tune **stop** on it, or does it **want to move**?',
        theory: [
          'The app plays **C (Sa)**, then **one white key** above it. With Sa as home, some notes feel settled and some lean somewhere else.',
          { list: [
            '**At rest**: Ga (E), Pa (G), upper Sa (C′). A song could end on these.',
            '**Wants to move**: Ri (D) falls back to Sa, Ma (F) drops to Ga, Da (A) leans down to Pa, Ni (B) pulls up to Sa′.',
          ] },
          { tip: 'After the note, imagine the music stopping right there. If it feels finished, it is at rest; if you want one more note, it wants to move.' },
        ],
      }),
    ],
  },
  {
    title: 'Close calls',
    lessons: [
      closeCall('id-cc-3-4', '3rd or 4th', [4, 5], [
        'The **major 3rd** is **sweet**; the **4th** is **hollow**. The 4th is just a half step bigger.',
        'Song anchors: "**Oh when** the saints" starts with a major 3rd; "**Here comes** the bride" starts with a 4th.',
      ]),
      closeCall('id-cc-4-5', '4th or 5th', [5, 7], [
        'Both are **hollow**. The **4th** still sounds unfinished; the **5th** feels complete, like it could end a phrase.',
        'Song anchors: "**Here comes** the bride" is a 4th; "**Twin-kle** twinkle" is a 5th.',
      ]),
      closeCall('id-cc-5-8', '5th or octave', [7, 12], [
        'The **octave** sounds like the **same note**, just higher. The **5th** is clearly a different note.',
        'Song anchors: "**Twin-kle** twinkle" is a 5th; "**Some-where** over the rainbow" is an octave.',
      ]),
    ],
  },
  {
    title: 'Single note with base C',
    openStart: true, // stays open for players who reached it before the cue units were added
    allOpen: true, // the two modes, in either order
    lessons: [
      singleNote('id-sn-whites', 'Single note: white keys', WHITES.slice(1), 'the **white keys D to B**'),
      singleNote('id-sn-twelve', 'Single note: all keys', ALL_TWELVE.slice(1), '**C♯ to B**, black keys included'),
    ],
  },
  {
    title: 'Intervals',
    openStart: true, // open without finishing Greater / lesser first
    lessons: [
      {
        id: 'id-two-whites',
        title: 'Two white keys',
        theory: [
          'The app plays **two white keys** from **C to B** (`S` to `K`), **one after the other**. Press them back in the same order: the first note, then the second.',
          { list: [
            'The second note can be **higher or lower** than the first.',
            'A wrong key counts as a mistake. After two misses the answer glows.',
            'Press `B` to hear the two notes again.',
          ] },
          { tip: 'Hum the two notes (softly, or in your head) and feel whether your voice went up or down, and by a little or a lot. Find the first note, then step from it to the second.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'none',
          make: () => twoNoteRounds(WHITES, 12).flatMap(roundSteps),
        },
      },
    ],
  },
];

export const IDENTIFY_LESSONS = IDENTIFY_UNITS.flatMap((unit, u) =>
  unit.lessons.map((lesson, l) => ({ ...lesson, num: `${u + 1}.${l + 1}`, unit: u }))
);
