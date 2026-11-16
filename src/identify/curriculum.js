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
// Carnatic names for every key (Sa = C), shown under
// each option's picture and in the reveal (the user, 2026-11-14: white keys first, then all 12;
// black keys: the lower Ri Ga Da Ni are written small (ri ga da ni), F♯ is Ma♯ (since 2026-11-14)
const SWARA_OF = { C: 'Sa', 'C#': 'ri', D: 'Ri', 'D#': 'ga', E: 'Ga', F: 'Ma', 'F#': 'Ma♯', G: 'Pa', 'G#': 'da', A: 'Da', 'A#': 'ni', B: 'Ni' };
const swaraReveal = names => `**${names.map(pretty).join(' → ')}** (${names.map(x => SWARA_OF[x]).join(' ')})`;
const swaraLabels = options => Object.fromEntries(options.map(o => [o, o.split(' ').map(x => SWARA_OF[x])]));
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
const GL_GAP = 0.5; // the player's Gap slider (ListenTiming.jsx) overrides it
// Four slope pictures per question, one of each kind: a small step up, a big jump up, a
// small step down, a big jump down, in a random order. The right one is drawn from the
// notes played, the others from random pairs of their kind. Each option is two note
// names ("C E"); q.slopes gives their pitches. Distance 4 is left out so small (1-3
// semitones) and big (5 or more) look clearly different.
export const SLOPES = [
  { up: true, big: false }, { up: true, big: true }, { up: false, big: false }, { up: false, big: true },
];
export const slopeOf = ([a, b]) => SLOPES.find(k => k.up === b > a && k.big === Math.abs(b - a) >= 5);
const fitsSlope = ([a, b]) => a !== b && Math.abs(b - a) !== 4;

export function higherLowerQuestions(pool, count, random = Math.random) {
  const pairs = pool.flatMap(x => pool.map(y => [x, y]))
    .filter(names => fitsSlope(parseNotes(names.join(' ')).map(n => n.semitone)));
  const byKind = SLOPES.map(k => pairs.filter(names => slopeOf(parseNotes(names.join(' ')).map(n => n.semitone)) === k));
  const any = list => list[Math.floor(random() * list.length)];
  const questions = [];
  let last = null;
  while (questions.length < count) {
    const kind = Math.floor(random() * SLOPES.length);
    const names = any(byKind[kind]);
    if (names.join() === last) continue;
    last = names.join();
    const answer = names.join(' ');
    const options = shuffle(byKind.map((list, k) => (k === kind ? answer : any(list).join(' '))), random);
    questions.push({
      prompt: 'Two notes, one after the other. Which picture matches: **up or down**, and a **small step or a big jump**?',
      play: parseNotes(answer),
      gap: GL_GAP,
      options,
      slopes: Object.fromEntries(options.map(o => [o, parseNotes(o).map(n => n.semitone)])),
      swaras: swaraLabels(options),
      answer,
      reveal: swaraReveal(names),
    });
  }
  return questions;
}

const higherLower = (id, title, pool, range) => ({
  id,
  title,
  theory: [
    `The app plays **two notes** from ${range}, **one after the other**. You don't press the notes: pick the **picture** whose line matches.`,
    { list: [
      'There are four pictures: a **small step up**, a **big jump up**, a **small step down** and a **big jump down**, in a random order.',
      'Higher dots are higher notes. A gentle line is a small step (next key or two over); a steep line is a big jump.',
      'Click the picture. A wrong answer counts as a mistake; the question stays until you get it.',
      'Press `B` to hear the two notes again.',
      'Once you get it right, the notes play again with their keys lit, then the next question starts.',
    ] },
    { tip: 'Hum the two notes softly: did your voice go up or down, and did it slide or jump?' },
  ],
  exercise: {
    type: 'choice',
    make: () => higherLowerQuestions(pool, 15),
  },
});

// Greater / lesser with a run of notes (3, 4, 5...): four slope pictures, each a different
// shape (up or down at every move), in a random order; pick the one that matches the notes
// played. Three notes have exactly four shapes (up-up, up-down, down-up, down-down), so all
// four show; longer runs show the played shape and three other random ones.
// Each option is note names ("C E G"); q.slopes gives their pitches for the picture.
export const shapeOf = pitches => pitches.slice(1).map((p, i) => p > pitches[i]);
const shapesOf = n => Array.from({ length: 2 ** (n - 1) }, (_, k) =>
  Array.from({ length: n - 1 }, (_, i) => !((k >> (n - 2 - i)) & 1)));

// different-neighbour notes from `pool` (names) that go `shape`, one note more than its moves;
// `maxStep` (semitones) caps every move, for the close-notes lesson
function runNotes(pool, shape, random, maxStep = Infinity) {
  const pitch = name => parseNotes(name)[0].semitone;
  for (;;) {
    const names = [pool[Math.floor(random() * pool.length)]];
    for (const up of shape) {
      const last = pitch(names.at(-1));
      const next = pool.filter(x => (up ? pitch(x) > last : pitch(x) < last) && Math.abs(pitch(x) - last) <= maxStep);
      if (!next.length) break;
      names.push(next[Math.floor(random() * next.length)]);
    }
    if (names.length === shape.length + 1) return names;
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

// `count` questions of `n` notes, each shape about as often, never the same notes twice in a row
export function runQuestions(pool, n, count, random = Math.random, maxStep = Infinity) {
  // a small pool can't make every shape: k moves the same way in a row need k + 1 different notes
  // (E F G alone can't climb or slide three times), so those shapes are left out
  const notes = new Set(pool.map(x => parseNotes(x)[0].semitone)).size;
  const longestRun = shape => Math.max(...shape.map((d, i) => {
    let k = 1;
    while (shape[i + k] === d) k++;
    return k;
  }));
  const shapes = shapesOf(n).filter(shape => longestRun(shape) < notes);
  const questions = [];
  let last = null;
  while (questions.length < count) {
    const shape = shapes[Math.floor(random() * shapes.length)];
    const names = runNotes(pool, shape, random, maxStep);
    if (names.join() === last) continue;
    last = names.join();
    const answer = names.join(' ');
    const others = shuffle(shapes.filter(s => s !== shape), random).slice(0, 3)
      .map(s => runNotes(pool, s, random, maxStep).join(' '));
    const options = shuffle([answer, ...others], random);
    questions.push({
      prompt: `${WORDS[n]} notes, one after the other. Which picture has the **same shape**?`,
      play: parseNotes(answer),
      gap: GL_GAP,
      options,
      slopes: Object.fromEntries(options.map(o => [o, parseNotes(o).map(x => x.semitone)])),
      swaras: swaraLabels(options),
      answer,
      reveal: swaraReveal(names),
    });
  }
  return questions;
}
export const threeNoteQuestions = (pool, count, random) => runQuestions(pool, 3, count, random);

const WORDS = { 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six' };

// opensOn = 'YYYY-MM-DD': the lesson stays locked until that day (see Course.jsx)
// maxStep (semitones): every move is at most this big (the close-notes lesson); count = questions
const higherLowerRun = (id, title, pool, range, n, opensOn, maxStep = Infinity, count = 15) => ({
  id,
  title,
  ...(opensOn && { opensOn }),
  theory: [
    `The app plays **${WORDS[n].toLowerCase()} notes** from ${range}, **one after the other**. Then pick the **picture** whose line goes the same way: at every move, from one note to the next, did it go **up** (increased) or **down** (decreased)?`,
    { list: [
      n === 3
        ? 'Every picture has a different shape: up then up, up then down (/\\), down then up (\\/), or down then down.'
        : `Every picture has a different shape: ${n - 1} moves, each up or down. Only one matches all of them.`,
      'Higher dots are higher notes; each row of the grid is one key. Click the picture you heard.',
      'A wrong answer counts as a mistake; the question stays until you get it.',
      `Press \`B\` to hear the ${WORDS[n].toLowerCase()} notes again.`,
      ...(maxStep < Infinity ? ['**Close notes:** every move is only **1 or 2 semitones** (next key, or one key skipped), so listen hard for tiny moves.'] : []),
    ] },
    { tip: n === 3
      ? 'Hum along softly and trace the shape with your hand: a climb, a hill, a valley or a slide down.'
      : 'Say "up" or "down" softly on each move while the notes play, then find the picture that matches your words.' },
  ],
  exercise: {
    type: 'choice',
    make: () => runQuestions(pool, n, count, Math.random, maxStep),
  },
});

// a lesson with one more theory block at the end
const withTheory = (lesson, block) => ({ ...lesson, theory: [...lesson.theory, block] });

// ---- Listening cues: one unit per cue, each a two- or three-way choice about a pair of notes ----

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const SWARAS = ['Sa', 'ri', 'Ri', 'ga', 'Ga', 'Ma', 'Ma♯', 'Pa', 'da', 'Da', 'ni', 'Ni'];
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
    '**Sweet**: full and warm. A 3rd or 6th (Sa–Ga, Sa–ga, Sa–Da, Sa–da).',
    '**Tense**: crunchy, rubbing, wants to move. A 2nd, 7th or tritone (Sa–Ri, Sa–Ni, Sa–Ma♯).',
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
  // Greater / lesser, one unit per note count (split 2026-11-13; it was one unit before).
  // Lessons keep their old id-gl-* ids so their stars stay. All open, in any order.
  {
    title: 'Two notes',
    allOpen: true,
    lessons: [
      higherLower('id-gl-whites', 'Two notes: white keys', WHITES, 'the **7 white keys**, C to B'),
      higherLower('id-gl-twelve', 'Two notes: all 12 keys', ALL_TWELVE, '**all 12 keys**, C to B with the black keys'),
    ],
  },
  {
    title: 'Three notes',
    allOpen: true,
    openStart: true,
    lessons: [
      higherLowerRun('id-gl-three', 'Three notes: white keys', WHITES, 'the **7 white keys**, C to B', 3),
      higherLowerRun('id-gl-three-twelve', 'Three notes: all 12 keys', ALL_TWELVE, '**all 12 keys**, C to B with the black keys', 3),
      higherLowerRun('id-gl-three-close', 'Three notes: 12 keys, close notes', ALL_TWELVE, '**all 12 keys**, C to B with the black keys', 3, undefined, 2),
      // the middle keys only, like Four notes: only E F G (the user, 2026-11-13)
      withTheory(higherLowerRun('id-three-efg', 'Three notes: only E F G', ['E', 'F', 'G'], 'just **E, F and G**', 3),
        { tip: 'E to F is the smallest step there is (one semitone); F to G is two. Up then up can only be E F G, and down then down only G F E.' }),
    ],
  },
  {
    // the user's plan (2026-11-13): practise four-note shapes deeply, adding one variation at a time
    title: 'Four notes',
    allOpen: true,
    openStart: true,
    lessons: [
      higherLowerRun('id-gl-four', 'Four notes: white keys', WHITES, 'the **7 white keys**, C to B', 4),
      higherLowerRun('id-gl-four-twelve', 'Four notes: all 12 keys', ALL_TWELVE, '**all 12 keys**, C to B with the black keys', 4),
      higherLowerRun('id-four-close', 'Four notes: 12 keys, close notes', ALL_TWELVE, '**all 12 keys**, C to B with the black keys', 4, undefined, 2),
      // the middle keys only: C D and A B were easy to tell apart (the user, 2026-11-13)
      withTheory(higherLowerRun('id-four-efg', 'Four notes: only E F G', ['E', 'F', 'G'], 'just **E, F and G**', 4),
        { tip: 'With only three keys it can never go the same way three times, so there are 6 shapes, not 8. E to F is the smallest step there is (one semitone); F to G is two.' }),
    ],
  },
  {
    // one more note at a time (the user's plan: no rushing), so these open on a date
    title: 'Five notes',
    allOpen: true,
    openStart: true,
    lessons: [
      higherLowerRun('id-gl-five', 'Five notes: white keys', WHITES, 'the **7 white keys**, C to B', 5, '2026-11-23'),
      higherLowerRun('id-gl-five-twelve', 'Five notes: all 12 keys', ALL_TWELVE, '**all 12 keys**, C to B with the black keys', 5, '2026-11-23'),
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
