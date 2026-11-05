import { parseNotes } from '../data/songs.js';

// The course, in the order a piano teacher would take a beginner through it:
// orientation → rhythm → intervals & hand position → ear (name that note) → scales → chords →
// scales in depth → chords in depth → major & minor and dim/aug/sus on every note → feel-good major and minor chords. Songs live in the Western Music tab (Easy / Medium / Hard).
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
//      exercise.demo – list of chords behind a "Hear the whole loop" button
//   { type: 'rhythm', bpm, pattern }  – timed play-along, see rhythm.js
//   { type: 'ear', pool, count, reference, ... } – name the note you hear, see ear/rounds.js
//   { type: 'playlist', breakSeconds, lessons } – step lessons in a row, with a break between

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

// Same, but black keys named as flats (F major, minor keys)
const FLAT_NAME = { 'C#': 'D♭', 'D#': 'E♭', 'F#': 'G♭', 'G#': 'A♭', 'A#': 'B♭' };
const flatSteps = (text, extra = {}) =>
  notes(text).map(n => ({ notes: [n], label: FLAT_NAME[n.name] ?? n.name, phrase: n.phrase, ...extra }));

// Your keyboard key for each note (middle octave), for the mini-keyboard labels
const KEY_OF = { C: 'S', 'C#': 'E', D: 'D', 'D#': 'R', E: 'F', F: 'G', 'F#': 'Y', G: 'H', 'G#': 'U', A: 'J', 'A#': 'I', B: 'K' };
const keyLabels = names => Object.fromEntries(names.map(n => [n, KEY_OF[n]]));

const chordStep = (text, label, extra = {}) => {
  const ns = notes(text);
  return { notes: ns, label, listen: ns, chord: true, ...extra };
};

// ---- Unit 10: major & minor chord on every note, C to B ----
// Names are spelled the friendly way (E♭ not D♯ for minor 3rds, F for C♯'s E♯).
// B is played as F♯ B D♯ (2nd inversion) so it stays inside C4–high F.
const HIGH_KEY_OF = { C: 'L', 'C#': 'P', D: ';', 'D#': '[', E: "'", F: 'Enter' };
const keysFor = text => text.split(' ').map(t => (t.endsWith('+') ? HIGH_KEY_OF[t.slice(0, -1)] : KEY_OF[t])).join(' ');
const ROOT_CHORDS = [
  { id: 'c',  name: 'C',       major: 'C E G',     minor: 'C D# G',     majNames: 'C E G',    minNames: 'C E♭ G' },
  { id: 'cs', name: 'C♯ / D♭', major: 'C# F G#',   minor: 'C# E G#',    majNames: 'C♯ F G♯',  minNames: 'C♯ E G♯', note: 'The middle note of C♯ major is written E♯ in sheet music, but it is the same key as F.' },
  { id: 'd',  name: 'D',       major: 'D F# A',    minor: 'D F A',      majNames: 'D F♯ A',   minNames: 'D F A' },
  { id: 'eb', name: 'E♭ / D♯', major: 'D# G A#',   minor: 'D# F# A#',   majNames: 'E♭ G B♭',  minNames: 'E♭ G♭ B♭' },
  { id: 'e',  name: 'E',       major: 'E G# B',    minor: 'E G B',      majNames: 'E G♯ B',   minNames: 'E G B' },
  { id: 'f',  name: 'F',       major: 'F A C+',    minor: 'F G# C+',    majNames: 'F A C',    minNames: 'F A♭ C' },
  { id: 'fs', name: 'F♯ / G♭', major: 'F# A# C#+', minor: 'F# A C#+',   majNames: 'F♯ A♯ C♯', minNames: 'F♯ A C♯' },
  { id: 'g',  name: 'G',       major: 'G B D+',    minor: 'G A# D+',    majNames: 'G B D',    minNames: 'G B♭ D' },
  { id: 'ab', name: 'A♭ / G♯', major: 'G# C+ D#+', minor: 'G# B D#+',   majNames: 'A♭ C E♭',  minNames: 'A♭ C♭ E♭ (C♭ = the B key)' },
  { id: 'a',  name: 'A',       major: 'A C#+ E+',  minor: 'A C+ E+',    majNames: 'A C♯ E',   minNames: 'A C E' },
  { id: 'bb', name: 'B♭ / A♯', major: 'A# D+ F+',  minor: 'A# C#+ F+',  majNames: 'B♭ D F',   minNames: 'B♭ D♭ F' },
  { id: 'b',  name: 'B',       major: 'F# B D#+',  minor: 'F# B D+',    majNames: 'B D♯ F♯',  minNames: 'B D F♯', note: 'B is played with F♯ at the bottom (an inversion) so it fits on your keys. Same three notes, same chord.' },
];
const plain = text => text.split(' ').map(t => t.replace('+', ''));

function rootChordLesson(r, i) {
  const short = r.name.split(' ')[0];
  return {
    id: `chords-of-${r.id}`,
    title: `${r.name}: major & minor`,
    theory: [
      ...(i === 0 ? [
        'Every note on the piano has its own **major** and **minor** chord, and they are built with the same recipe from any starting key:',
        { list: [
          '**Major** = root, up **4** half steps, up **3** more (happy, bright)',
          '**Minor** = root, up **3** half steps, up **4** more (sad, soft)',
        ] },
        'The only difference is the **middle note**: in minor it moves down by one key. This unit walks the recipe up the keyboard one note at a time, from C to B.',
      ] : []),
      { list: [
        `**${short} major** = ${r.majNames} → **${keysFor(r.major)}**`,
        `**${short} minor** = ${r.minNames} → **${keysFor(r.minor)}**`,
      ] },
      { keys: { mark: plain(r.major), labels: Object.fromEntries(r.major.split(' ').map(t => [t.replace('+', ''), keysFor(t)])) }, caption: `${short} major: ${keysFor(r.major)}` },
      { keys: { mark: plain(r.minor), labels: Object.fromEntries(r.minor.split(' ').map(t => [t.replace('+', ''), keysFor(t)])) }, caption: `${short} minor: ${keysFor(r.minor)}` },
      ...(r.note ? [{ tip: r.note }] : [{ tip: 'Switch back and forth slowly and listen to the mood flip from happy to sad, with just one finger moving.' }]),
    ],
    exercise: {
      type: 'steps',
      hint: 'glow',
      make: () => [0, 1].flatMap(round => [
        chordStep(r.major, short, { prompt: `**${short} major**: ${r.majNames}`, phrase: round }),
        chordStep(r.minor, `${short}m`, { prompt: `**${short} minor**: ${r.minNames} (middle note down one key)`, phrase: round }),
      ]).concat([
        chordStep(r.major, short, { prompt: `Bright again: **${short} major**`, phrase: 2 }),
        chordStep(r.minor, `${short}m`, { prompt: `End soft: **${short} minor**`, phrase: 2 }),
      ]),
    },
  };
}

// ---- More chord types on every note, C to B (added 2026-11-03) ----
// Chords are built from half-step recipes and voiced inside C4–high F: if the top
// note is too high it moves down an octave to the bottom (an inversion).
const FRIENDLY = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
// deg = letter steps above the root for each note (3rd = 2, 5th = 4, 2nd = 1, 4th = 3)
const TRIAD = [0, 2, 4];
const CHORD_TYPES = {
  major: { ivs: [0, 4, 7], deg: TRIAD, sym: '', name: 'major' },
  minor: { ivs: [0, 3, 7], deg: TRIAD, sym: 'm', name: 'minor' },
  dim: { ivs: [0, 3, 6], deg: TRIAD, sym: '°', name: 'diminished' },
  aug: { ivs: [0, 4, 8], deg: TRIAD, sym: '+', name: 'augmented' },
  sus2: { ivs: [0, 2, 7], deg: [0, 1, 4], sym: 'sus2', name: 'sus2' },
  sus4: { ivs: [0, 5, 7], deg: [0, 3, 4], sym: 'sus4', name: 'sus4' },
};
// Proper music spelling: each chord note gets the right letter, then a sharp/flat to fit
const LETTERS = 'CDEFGAB';
const LETTER_SEMI = [0, 2, 4, 5, 7, 9, 11];
const ACCIDENTAL = { '-2': '♭♭', '-1': '♭', 0: '', 1: '♯', 2: '♯♯' }; // ♭♭ ♯♯ rather than 𝄫 𝄪, which many fonts lack
function spell(rootName, semi, steps) {
  const li = (LETTERS.indexOf(rootName[0]) + steps) % 7;
  const diff = ((semi - LETTER_SEMI[li]) % 12 + 18) % 12 - 6;
  return LETTERS[li] + ACCIDENTAL[diff];
}
function voiceChord(root, ivs) {
  const ps = ivs.map(i => root + i);
  while (Math.max(...ps) > 17) ps[ps.indexOf(Math.max(...ps))] -= 12;
  return ps.sort((a, b) => a - b);
}
function typedChord(root, type, short) {
  const t = CHORD_TYPES[type];
  const ps = voiceChord(root, t.ivs);
  const text = ps.map(p => ALL_TWELVE[p % 12] + (p >= 12 ? '+' : '')).join(' ');
  const inOrder = t.ivs.map((iv, n) => spell(FRIENDLY[root], (root + iv) % 12, t.deg[n])).join(' ');
  return { text, label: short + t.sym, name: `${short}${t.sym}`, notes: inOrder, keys: keysFor(text), title: t.name };
}
const chordLine = c => `**${c.name}** (${c.title}) = ${c.notes} → **${c.keys}**`;

function moreChordsLesson(r, i) {
  const short = r.name.split(' ')[0];
  const c = Object.fromEntries(['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'].map(t => [t, typedChord(ROOT_CHORDS.indexOf(r), t, short)]));
  const step = (k, prompt, phrase) => chordStep(c[k].text, c[k].label, { prompt, phrase });
  return {
    id: `more-chords-of-${r.id}`,
    title: `${r.name}: dim, aug & sus`,
    theory: [
      ...(i === 0 ? [
        'Major and minor are two ways of stacking notes. Four more recipes give you the rest of the basic chord colours:',
        { list: [
          '**Diminished (°)** = root + **3** + **3** half steps. Tense, spooky, wants to move.',
          '**Augmented (+)** = root + **4** + **4** half steps. Dreamy, floating, unresolved.',
          '**sus2** = root + **2** + **5**. The middle note drops to its neighbour: open and airy.',
          '**sus4** = root + **5** + **2**. The middle note rises to its neighbour: tension that wants to fall back to major.',
        ] },
        'Each lesson compares them with that note\'s major and minor chord, so you hear exactly what changes.',
      ] : []),
      { list: ['major', 'minor', 'dim', 'aug', 'sus2', 'sus4'].map(k => chordLine(c[k])) },
      { tip: i === 0
        ? 'Some notes get unusual names, like E♯ (the F key) or B♭♭ (double flat, the A key). Each chord note keeps its own letter, so the name changes but you press the same key.'
        : 'Hear the pattern: diminished = minor with the top note down one key; augmented = major with the top note up one key.' },
    ],
    exercise: {
      type: 'steps',
      hint: 'glow',
      make: () => [
        step('major', `**${short}** major, the reference`, 0),
        step('sus4', `**${short}sus4**: tension…`, 0),
        step('major', `…resolves to **${short}**`, 0),
        step('sus2', `**${short}sus2**: open and airy`, 0),
        step('major', `back to **${short}**`, 0),
        step('minor', `**${short}m**: minor`, 1),
        step('dim', `**${short}°**: minor with the top note down one key`, 1),
        step('major', `**${short}** major again`, 2),
        step('aug', `**${short}+**: major with the top note up one key`, 2),
        step('major', `and home to **${short}**`, 2),
      ],
    },
  };
}

// ---- Feel-good major and minor chords (added 2026-11-04) ----
// Calm loops made only of major chords, or only of minor chords. Chords stay in normal order and step up the
// keyboard, as long as the top note is no higher than high D. A♭, A, B♭, B, Am and Bm
// would go past that, so their top notes move down an octave (an inversion) until they fit.
const CALM_CHORDS = {
  C: { label: 'C', text: 'C E G', names: 'C E G' },
  D: { label: 'D', text: 'D F# A', names: 'D F♯ A' },
  Eb: { label: 'E♭', text: 'D# G A#', names: 'E♭ G B♭' },
  E: { label: 'E', text: 'E G# B', names: 'E G♯ B' },
  F: { label: 'F', text: 'F A C+', names: 'F A C' },
  G: { label: 'G', text: 'G B D+', names: 'G B D' },
  Ab: { label: 'A♭', text: 'D# G# C+', names: 'E♭ A♭ C' },
  A: { label: 'A', text: 'E A C#+', names: 'E A C♯' },
  Bb: { label: 'B♭', text: 'F A# D+', names: 'F B♭ D' },
  B: { label: 'B', text: 'D# F# B', names: 'D♯ F♯ B' },
  Cm: { label: 'Cm', text: 'C D# G', names: 'C E♭ G' },
  Csm: { label: 'C♯m', text: 'C# E G#', names: 'C♯ E G♯' },
  Dm: { label: 'Dm', text: 'D F A', names: 'D F A' },
  Em: { label: 'Em', text: 'E G B', names: 'E G B' },
  Fm: { label: 'Fm', text: 'F G# C+', names: 'F A♭ C' },
  Gm: { label: 'Gm', text: 'G A# D+', names: 'G B♭ D' },
  Am: { label: 'Am', text: 'E A C+', names: 'E A C' },
  Bm: { label: 'Bm', text: 'F# B D+', names: 'F♯ B D' },
};
const calmLine = k => {
  const c = CALM_CHORDS[k];
  return `**${c.label}** = ${c.names} → keys **${keysFor(c.text)}**`;
};
function calmPrompt(k, prev, last) {
  const { label, text } = CALM_CHORDS[k];
  if (!prev) return `Start on **${label}**, and take your time`;
  if (last) return `Home to **${label}**. Let it ring, then breathe out`;
  const before = CALM_CHORDS[prev].text.split(' ');
  const moved = text.split(' ').filter(t => !before.includes(t)).length;
  if (moved < 3) return `**${label}**: ${moved} finger${moved > 1 ? 's' : ''} move${moved > 1 ? '' : 's'}`;
  const height = t => notes(t).reduce((sum, n) => sum + n.oct * 12 + n.semitone, 0);
  return `**${label}**: your hand steps ${height(text) > height(CALM_CHORDS[prev].text) ? 'up' : 'down'}`;
}
const calmSteps = order => order.map(({ k, round }, i) => chordStep(CALM_CHORDS[k].text, CALM_CHORDS[k].label, {
  prompt: calmPrompt(k, order[i - 1]?.k, i === order.length - 1),
  phrase: round,
}));
function calmLesson({ id, title, loop, rounds, end = loop[0], theory, tip }) {
  // a loop that starts and ends on the same chord plays it once at the seam, not twice
  const body = loop.at(-1) === loop[0] ? loop.slice(0, -1) : loop;
  const onePass = [...body, end];
  return {
    id: `calm-${id}`,
    title,
    theory: [
      `**${onePass.map(k => CALM_CHORDS[k].label).join(' – ')}**`,
      theory,
      { list: [...new Set(onePass)].map(calmLine) },
      { tip },
    ],
    exercise: {
      type: 'steps',
      hint: 'glow',
      demo: onePass.map(k => notes(CALM_CHORDS[k].text)),
      make: () => {
        const order = Array.from({ length: rounds }, (_, round) => body.map(k => ({ k, round }))).flat();
        order.push({ k: end, round: rounds - 1 });
        return calmSteps(order);
      },
    },
  };
}

// Each round plays all the chords once in a fresh random order. No chord comes twice in a
// row, and the last round doesn't end on home, so the final home chord is a real move.
function shuffledRounds(chords, rounds, home) {
  const out = [];
  for (let round = 0; round < rounds; round++) {
    let order;
    do {
      order = [...chords];
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    } while (order[0] === out.at(-1)?.k || (round === rounds - 1 && order.at(-1) === home));
    out.push(...order.map(k => ({ k, round })));
  }
  return out;
}

function surpriseLesson({ id, title, chords, home, theory, tip }) {
  return {
    id,
    title,
    theory: [theory, { list: chords.map(calmLine) }, { tip }],
    exercise: {
      type: 'steps',
      hint: 'glow',
      make: () => calmSteps([...shuffledRounds(chords, 3, home), { k: home, round: 2 }]),
    },
  };
}

const surpriseChordsLesson = surpriseLesson({
  id: 'calm-surprise-chords',
  title: 'Surprise chords',
  chords: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  home: 'C',
  theory: 'All seven white-key major chords in a random order, so your hands learn each shape on its own instead of remembering a sequence. Every chord comes up three times, and the order changes each time you play.',
  tip: 'Glance at the next chord name, find the shape, then press. Speed will come by itself. For D, any two of its keys are enough.',
});

const CALM_LESSONS = [
  {
    id: 'sway', title: 'Gentle sway', loop: ['C', 'F'], rounds: 4,
    theory: 'Two chords, rocking slowly like breathing in and out. C is home and F is a soft step away. Your hand steps up the keyboard, then back down.',
    tip: 'There is no timer here. Hold each chord until it has nearly faded, then move.',
  },
  {
    id: 'home-and-back', title: 'Home and back', loop: ['C', 'G', 'F', 'C'], rounds: 3,
    theory: 'You leave home, reach a little, and settle back. Ending F → C is the warm "amen" sound, which is why it feels so restful.',
    tip: 'Turn on the Sustain pedal (Space) and the chords will melt into each other.',
  },
  {
    id: 'sunny-walk', title: 'Sunny walk', loop: ['C', 'F', 'G', 'F'], rounds: 3,
    theory: 'An easy stroll up and back down. The chords climb from C to G, then step back through F, so nothing feels rushed.',
    tip: 'Try playing the bottom note first, then the other two, for a soft rolling sound.',
  },
  {
    id: 'floating', title: 'Floating', loop: ['C', 'D', 'F', 'C'], rounds: 3,
    theory: 'The D major chord brings in F♯, a note from outside C major. That one bright note makes the music lift off the ground for a moment before F brings it gently back down.',
    tip: 'Dream Keys or Chorus Pad suit this one nicely. Pick them in the Voice panel.',
  },
  {
    id: 'open-road', title: 'Open road', loop: ['C', 'Bb', 'F', 'C'], rounds: 3,
    theory: 'B♭ is also from outside C major, and it has a relaxed, windows-down feeling. Lots of easy-going rock songs lean on this move.',
    tip: 'B♭ is played with F at the bottom so it fits your keys. That F stays held on the way to the F chord.',
  },
  {
    id: 'golden-hour', title: 'Golden hour', loop: ['C', 'Eb', 'F', 'C'], rounds: 3,
    theory: 'E♭ sounds warm and a little nostalgic, like late evening light. F then opens things up again before you come home.',
    tip: 'Linger on the E♭ chord. It is the heart of this one.',
  },
  {
    id: 'soft-sunrise', title: 'Soft sunrise', loop: ['C', 'Ab', 'Bb', 'C'], rounds: 3,
    theory: 'A♭ dims the light for a moment, B♭ starts to climb, and C arrives like the sun coming up. This rise is a favourite ending in film music.',
    tip: 'The last step, B♭ → C, is the sunrise. Play it a touch slower than the others.',
  },
  {
    id: 'wistful-smile', title: 'Wistful smile', loop: ['C', 'E', 'F', 'C'], rounds: 3,
    theory: 'E major sounds bittersweet here, as if it wants to be sad but smiles instead. F lifts it, and C lets it all go.',
    tip: 'From E to F, all three fingers slide up by just one key.',
  },
  {
    id: 'long-drift', title: 'Long drift', loop: ['C', 'F', 'C', 'Bb', 'F', 'C', 'Ab', 'Bb', 'C', 'D', 'F', 'C'], rounds: 2,
    theory: 'A wind-down through the favourites: the sway, the open road, the sunrise and the float, one after another. Nothing to get right, just let it drift.',
    tip: 'Play this one as slowly as you like, ideally with Sustain on.',
  },
  {
    id: 'up-and-back', title: 'Up the white keys and back', loop: ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'A', 'G', 'F', 'E', 'D', 'C'], rounds: 1,
    theory: 'One long walk: the major chord on every white key, from C up to B, then all the way back down to C.',
    tip: 'A and B are played with their top notes moved down so they fit your keys, so your hand drops back there even though the chords keep climbing. For the D chord, any two of its keys are enough: the app plays the third.',
  },
];

const FEEL_GOOD_MAJOR = [...CALM_LESSONS.map(calmLesson), surpriseChordsLesson];

// A lesson that runs through other lessons in order, with a break between each
const playlistLesson = (id, title, theory, lessons) => ({
  id,
  title,
  theory,
  exercise: { type: 'playlist', breakSeconds: 10, lessons: lessons.map(({ title, exercise }) => ({ title, exercise })) },
});

// Same idea in minor: most loops rest on Am, and every chord in them is minor.
const CALM_MINOR_LESSONS = [
  {
    id: 'minor-slow-breath', title: 'Slow breath', loop: ['Am', 'Dm'], rounds: 4,
    theory: 'Two soft chords, rocking slowly in and out. Minor chords sound quieter and more thoughtful than major ones, a good match for winding down.',
    tip: 'Am is played with E at the bottom so it fits your keys. Same notes, same chord.',
  },
  {
    id: 'minor-evening-rain', title: 'Evening rain', loop: ['Am', 'Em', 'Dm', 'Am'], rounds: 3,
    theory: 'Gentle and a little grey, like watching rain from indoors. The loop drifts away from Am, then Dm leads it softly home.',
    tip: 'The E key stays held from Am to Em. Turn on Sustain (Space) and let the chords blur together.',
  },
  {
    id: 'minor-quiet-walk', title: 'Quiet walk', loop: ['Am', 'Dm', 'Em', 'Dm'], rounds: 3,
    theory: 'An unhurried walk, up a little and back again. Nothing resolves too firmly, so it can keep going for as long as you like.',
    tip: 'From Dm to Em your hand steps up two keys. Keep the shape and just slide.',
  },
  {
    id: 'minor-moonlight', title: 'Moonlight', loop: ['Am', 'Bm', 'Dm', 'Am'], rounds: 3,
    theory: 'Bm brings in F♯, a note from outside the A minor scale, and the music seems to catch a little light before settling.',
    tip: 'From Am to Bm, all three fingers step up two keys together.',
  },
  {
    id: 'minor-night-road', title: 'Night road', loop: ['Am', 'Gm', 'Dm', 'Am'], rounds: 3,
    theory: 'Gm feels like a turn onto an empty road: B♭ darkens the sound without making it tense.',
    tip: 'Strings or Haze Synth suit this one nicely. Pick them in the Voice panel.',
  },
  {
    id: 'minor-old-photograph', title: 'Old photograph', loop: ['Am', 'Cm', 'Dm', 'Am'], rounds: 3,
    theory: 'Cm is the surprise here. It sounds far away and nostalgic, then Dm gently brings you back.',
    tip: 'From Cm to Dm, all three fingers step up two keys together.',
  },
  {
    id: 'minor-before-dawn', title: 'Before dawn', loop: ['Am', 'Fm', 'Gm', 'Am'], rounds: 3,
    theory: 'Fm is the darkest moment, Gm starts to rise, and Am arrives like the sky getting lighter.',
    tip: 'From Fm to Gm, all three fingers step up two keys together.',
  },
  {
    id: 'minor-far-away', title: 'Far away', loop: ['Am', 'Csm', 'Dm', 'Am'], rounds: 3,
    theory: 'C♯m sounds like a distant memory, then slips up one key into Dm. It is the strangest chord in this unit, and one of the prettiest.',
    tip: 'From C♯m to Dm, all three fingers slide up by just one key.',
  },
  {
    id: 'minor-long-night', title: 'Long night', loop: ['Am', 'Dm', 'Am', 'Gm', 'Dm', 'Am', 'Fm', 'Gm', 'Am', 'Bm', 'Dm', 'Am'], rounds: 2,
    theory: 'A wind-down through the favourites: the breath, the night road, the dawn and the moonlight, one after another. Nothing to get right, just let it drift.',
    tip: 'Play this one as slowly as you like, ideally with Sustain on.',
  },
  {
    id: 'minor-up-and-back', title: 'Up the white keys and back', loop: ['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm', 'Am', 'Gm', 'Fm', 'Em', 'Dm', 'Cm'], rounds: 1,
    theory: 'One long walk: the minor chord on every white key, from C up to B, then all the way back down to C.',
    tip: 'Am and Bm are played with their top notes moved down so they fit your keys, so your hand drops back there even though the chords keep climbing.',
  },
];

const minorSurpriseLesson = surpriseLesson({
  id: 'calm-minor-surprise',
  title: 'Surprise minor chords',
  chords: ['Cm', 'Dm', 'Em', 'Fm', 'Gm', 'Am', 'Bm'],
  home: 'Am',
  theory: 'All seven white-key minor chords in a random order, so your hands learn each shape on its own. Every chord comes up three times, the order changes each time you play, and you finish on Am.',
  tip: 'Glance at the next chord name, find the shape, then press. Speed will come by itself.',
});

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
    // open even before Ear training is finished (user's choice): its first lesson is always unlocked
    openStart: true,
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
          { keys: { mark: ['C', 'E', 'G'], labels: keyLabels(['C', 'E', 'G']) }, caption: 'C major chord: S + F + H' },
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
    title: 'Scales in depth',
    lessons: [
      {
        id: 'scale-degrees',
        title: 'Scale degrees',
        theory: [
          'Every note of a scale has a **number** called its *degree*. In C major: C = 1, D = 2, E = 3, F = 4, G = 5, A = 6, B = 7, and the top C is 8 (or 1 again).',
          'The most important degrees also have names:',
          { list: [
            '**1 · Tonic**: home. Melodies love to end here.',
            '**4 · Subdominant**: moves away from home.',
            '**5 · Dominant**: the strongest pull back to 1.',
            '**7 · Leading note**: a half step below the tonic, so it *leans* up into it.',
          ] },
          'You already know these in sargam: **1 = Sa, 2 = Ri, 3 = Ga, 4 = Ma, 5 = Pa, 6 = Da, 7 = Ni**. A degree is just a Western swara number.',
          { keys: { mark: WHITES, labels: { C: '1', D: '2', E: '3', F: '4', G: '5', A: '6', B: '7' } }, caption: 'C major with degree numbers' },
          { tip: 'Thinking in numbers rather than letters is what lets musicians play the same tune in any key.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'none',
          make: () => randomSeq([1, 2, 3, 4, 5, 6, 7, 8], 14).map(d => {
            const n = note(d === 8 ? 'C+' : WHITES[d - 1]);
            return { notes: [n], label: String(d), prompt: `In C major, play degree **${d}**` };
          }),
        },
      },
      {
        id: 'f-major',
        title: 'The F major scale',
        theory: [
          'Start the **W W H W W W H** pattern on **F**. F G A are whole steps, but the 4th note must be only a *half* step above A. So instead of B we need **B♭**.',
          'F major is the key with **one flat: B♭**. G major had one sharp, and F major has one flat. They are mirror images.',
          { keys: { mark: ['F', 'G', 'A', 'A#', 'C', 'D', 'E'], labels: { 'A#': 'B♭' } }, caption: 'F major: F G A B♭ C D E F' },
          'On your keyboard: `G` `H` `J` `I` (B♭), then the high keys `L` `;` `\'` `Enter` for C D E F.',
          { tip: 'Call it **B♭**, not A♯. In F major every letter appears once (F G A B C D E), so the black key takes the B name.' },
        ],
        exercise: { type: 'steps', hint: 'glow', prompt: 'Play F major up and back down', make: () => flatSteps('F G A A# C+ D+ E+ F+ | E+ D+ C+ A# A G F') },
      },
      {
        id: 'd-major',
        title: 'The D major scale',
        theory: [
          'Now start on **D**. Follow **W W H W W W H** and two notes need raising: **F♯** and **C♯**.',
          'D major has **two sharps**. Notice the new sharp, C♯, is the leading note (degree 7) leaning up into D.',
          { keys: { mark: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'] }, caption: 'D major: D E F♯ G A B C♯ D' },
          'Keys: `D` `F` `Y` (F♯) `H` `J` `K`, then `P` for high C♯ and `;` for high D.',
        ],
        exercise: { type: 'steps', hint: 'glow', prompt: 'Play D major up and back down', make: () => noteSteps('D E F# G A B C#+ D+ | C#+ B A G F# E D') },
      },
      {
        id: 'key-signatures',
        title: 'Key signatures',
        theory: [
          'Every major key has its own set of sharps or flats, its **key signature**. Sheet music writes them once at the start of each line instead of on every note.',
          '**Sharp keys** step up by fifths. Each new key adds one sharp:',
          { list: ['**C**: none', '**G**: F♯', '**D**: F♯ C♯', '**A**: F♯ C♯ G♯', '**E**: F♯ C♯ G♯ D♯'] },
          '**Flat keys** step down by fifths. Each new key adds one flat:',
          { list: ['**F**: B♭', '**B♭**: B♭ E♭', '**E♭**: B♭ E♭ A♭', '**A♭**: B♭ E♭ A♭ D♭'] },
          'Sharps always arrive in the order **F C G D A E B**, and flats in the reverse order **B E A D G C F**. This loop of keys is called the **circle of fifths**.',
          { tip: 'Quick trick: the last sharp is the leading note. In A major the last sharp is G♯, one half step below A.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'none',
          make: () => [
            ['G major', 'F#'], ['D major', 'F# C#'], ['A major', 'F# C# G#'],
            ['F major', 'A#'], ['B♭ major', 'A# D#'], ['E♭ major', 'A# D# G#'],
          ].flatMap(([key, acc], phrase) => {
            const flat = key.startsWith('F') || key.includes('♭');
            const kind = flat ? 'flats' : 'sharps';
            return (flat ? flatSteps(acc) : noteSteps(acc)).map((st, i) => ({
              ...st, phrase, prompt: `**${key}**: play its ${kind} in order (${i + 1} of ${acc.split(' ').length})`,
            }));
          }),
        },
      },
      {
        id: 'natural-minor',
        title: 'The natural minor scale',
        theory: [
          'The **minor scale** has a darker, sadder sound. Its step pattern is **W H W W H W W**.',
          'Compare **C major** and **C minor**. Three notes drop a half step: **E → E♭, A → A♭, B → B♭**. The lowered 3rd (E♭) is what makes it sound minor.',
          { keys: { mark: ['C', 'D', 'D#', 'F', 'G', 'G#', 'A#'], labels: { 'D#': 'E♭', 'G#': 'A♭', 'A#': 'B♭' } }, caption: 'C minor: C D E♭ F G A♭ B♭ C' },
          'On your keyboard: `S` `D` `R` `G` `H` `U` `I` `L`.',
          'In sargam it is **Sa Ri Ga2 Ma Pa Da1 Ni2**, the raga **Natabhairavi**.',
        ],
        exercise: { type: 'steps', hint: 'glow', prompt: 'Play C minor up and back down', make: () => flatSteps('C D D# F G G# A# C+ | A# G# G F D# D C') },
      },
      {
        id: 'relative-minor',
        title: 'Relative minor',
        theory: [
          'Every major key has a **relative minor** that uses *exactly the same notes*. It just treats a different note as home: the **6th degree**.',
          { list: ['**C major** → **A minor**: all white keys', '**F major** → **D minor**: one flat, B♭', '**G major** → **E minor**: one sharp, F♯'] },
          'Same keys, different home, different mood. When D is home the B♭ sounds sad, but when F is home the same note sounds bright.',
          { keys: { mark: ['D', 'E', 'F', 'G', 'A', 'A#', 'C'], labels: { 'A#': 'B♭' } }, caption: 'D minor: D E F G A B♭ C D (the notes of F major)' },
          'First play **F major** from F, then **D minor** from D, and listen to how the home note changes the feeling.',
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            ...flatSteps('F G A A# C+ D+ E+ F+', { prompt: '**F major**: bright, home is F' }),
            ...flatSteps('D E F G A A# C+ D+', { prompt: '**D minor**: same notes, home is D', phrase: 1 }),
            ...flatSteps('C+ A# A G F E D', { prompt: 'Back down to D', phrase: 2 }),
          ],
        },
      },
      {
        id: 'harmonic-minor',
        title: 'The harmonic minor scale',
        theory: [
          'In natural minor the 7th note (B♭ in C minor) sits a *whole* step below home, so it doesn\'t pull home strongly. **Harmonic minor raises the 7th** back to B, a half step below C.',
          'This creates a wide gap of **three half steps** between A♭ and B. That gap gives harmonic minor its exotic, Middle-Eastern flavour.',
          { keys: { mark: ['C', 'D', 'D#', 'F', 'G', 'G#', 'B'], labels: { 'D#': 'E♭', 'G#': 'A♭' } }, caption: 'C harmonic minor: C D E♭ F G A♭ B C' },
          'Keys: `S` `D` `R` `G` `H` `U` `K` `L`. Feel the stretch from `U` to `K`.',
          'Carnatic twin: **Kiravani**, Sa Ri Ga2 Ma Pa Da1 Ni.',
        ],
        exercise: { type: 'steps', hint: 'glow', prompt: 'Play C harmonic minor up and back down', make: () => flatSteps('C D D# F G G# B C+ | B G# G F D# D C') },
      },
      {
        id: 'melodic-minor',
        title: 'The melodic minor scale',
        theory: [
          'Singers found the A♭–B gap awkward, so **melodic minor** smooths it out by raising *both* the 6th and the 7th **on the way up**: C D E♭ F G **A B** C.',
          'On the way **down** it returns to natural minor: C B♭ A♭ G F E♭ D C.',
          { keys: { mark: ['C', 'D', 'D#', 'F', 'G', 'A', 'B'], labels: { 'D#': 'E♭' } }, caption: 'C melodic minor going up: only the 3rd is lowered' },
          { tip: 'Going up it is just C major with a minor 3rd. Going down it is plain C minor.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            ...flatSteps('C D D# F G A B C+', { prompt: 'Up: raised 6th and 7th' }),
            ...flatSteps('A# G# G F D# D C', { prompt: 'Down: natural minor', phrase: 1 }),
          ],
        },
      },
      {
        id: 'pentatonic',
        title: 'Pentatonic scales',
        theory: [
          '**Penta** means five. A pentatonic scale leaves out the two notes most likely to clash, so almost anything you play on it sounds good. It is used in folk songs, blues and rock solos.',
          '**Major pentatonic** = degrees 1 2 3 5 6, which is **C D E G A**. That is raga **Mohanam** (Sa Ri Ga Pa Da)!',
          { keys: { mark: ['C', 'D', 'E', 'G', 'A'], labels: keyLabels(['C', 'D', 'E', 'G', 'A']) }, caption: 'C major pentatonic' },
          '**Minor pentatonic** = degrees 1 ♭3 4 5 ♭7, which is **C E♭ F G B♭**: the classic blues and rock sound. It is the raga **Suddha Dhanyasi** (Sa Ga2 Ma Pa Ni2).',
          { keys: { mark: ['C', 'D#', 'F', 'G', 'A#'], labels: { 'D#': 'E♭', 'A#': 'B♭' } }, caption: 'C minor pentatonic' },
          { tip: 'After the lesson, improvise freely on the major pentatonic. No note can sound wrong.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            ...noteSteps('C D E G A C+ | A G E D C', { prompt: '**Major pentatonic** (Mohanam)' }),
            ...flatSteps('C D# F G A# C+', { prompt: '**Minor pentatonic** (bluesy)', phrase: 2 }),
            ...flatSteps('A# G F D# C', { prompt: '**Minor pentatonic** back down', phrase: 3 }),
          ],
        },
      },
      {
        id: 'chromatic',
        title: 'The chromatic scale',
        theory: [
          'The **chromatic scale** uses **all twelve notes**, every key black and white, each a half step apart.',
          'It isn\'t in a key, it is the whole palette. Composers use pieces of it to slide smoothly between notes.',
          { keys: { mark: ALL_TWELVE }, caption: 'All 12 notes: the chromatic scale' },
          'On your keyboard it zig-zags between the two rows: `S` `E` `D` `R` `F` `G` `Y` `H` `U` `J` `I` `K` `L`.',
          { tip: 'Going up, name the black keys as sharps. Going down, name them as flats.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            ...noteSteps('C C# D D# E F F# G G# A A# B C+', { prompt: 'Up by half steps (sharps)' }),
            ...flatSteps('B A# A G# G F# F E D# D C# C', { prompt: 'Down by half steps (flats)', phrase: 1 }),
          ],
        },
      },
    ],
  },
  {
    title: 'Chords in depth',
    lessons: [
      {
        id: 'chord-qualities',
        title: 'The four triads',
        theory: [
          'Every triad is two intervals stacked up. Count the **half steps** between notes and you can build any chord:',
          { list: [
            '**Major** = 4 + 3 → C E G (bright)',
            '**Minor** = 3 + 4 → C E♭ G (sad)',
            '**Diminished** = 3 + 3 → C E♭ G♭ (tense, spooky)',
            '**Augmented** = 4 + 4 → C E G♯ (dreamy, unresolved)',
          ] },
          { keys: { mark: ['C', 'D#', 'F#'], labels: { 'D#': 'E♭', 'F#': 'G♭' } }, caption: 'C diminished: both gaps are 3 half steps' },
          'Use **Hear it** on each chord. Train your ear to tell the four moods apart.',
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [0, 1].flatMap(round => [
            chordStep('C E G', 'C', { prompt: '**Major**: 4 + 3', phrase: round }),
            chordStep('C D# G', 'Cm', { prompt: '**Minor**: 3 + 4', phrase: round }),
            chordStep('C D# F#', 'C°', { prompt: '**Diminished**: 3 + 3', phrase: round }),
            chordStep('C E G#', 'Caug', { prompt: '**Augmented**: 4 + 4', phrase: round }),
          ]),
        },
      },
      {
        id: 'build-triads',
        title: 'Build any triad',
        theory: [
          'Now build chords on other roots using the half-step counts. **Major = 4 + 3, minor = 3 + 4.**',
          'Example, **D major**: start on D, count 4 half steps up (D♯ E F **F♯**), then 3 more (G G♯ **A**). Result: **D F♯ A**.',
          { keys: { mark: ['D', 'F#', 'A'] }, caption: 'D major: D F♯ A' },
          { tip: 'Shortcut: build it on white keys first (every other key). On **D, E and A** that gives a *minor* chord, so raise the middle note for major. On **C, F and G** it gives a *major* chord, so lower the middle note for minor.' },
          'This time the keys **don\'t glow**. Work them out yourself. After two mistakes the answer lights up.',
        ],
        exercise: {
          type: 'steps',
          hint: 'none',
          make: () => [
            ['D F# A', 'D'], ['D F A', 'Dm'], ['E G# B', 'E'], ['E G B', 'Em'],
            ['G B D+', 'G'], ['G A# D+', 'Gm'], ['A C#+ E+', 'A'], ['A C+ E+', 'Am'],
            ['F A C+', 'F'], ['F G# C+', 'Fm'],
          ].map(([text, label], i) => chordStep(text, label, {
            prompt: `Build **${label.replace('m', ' minor').replace(/^([A-G])$/, '$1 major')}**`, phrase: Math.floor(i / 2),
          })),
        },
      },
      {
        id: 'diatonic-triads',
        title: 'Chords of the scale',
        theory: [
          'Build a triad on **every note of C major**, using only white keys, and you get seven chords. These are the chords that "belong" to the key:',
          { list: ['**I** C · **ii** Dm · **iii** Em · **IV** F · **V** G · **vi** Am · **vii°** B°'] },
          'Capital Roman numerals are major and small ones are minor. ° means diminished. The pattern **major, minor, minor, major, major, minor, diminished** is the same in *every* major key.',
          { keys: { mark: ['D', 'F', 'A'], labels: keyLabels(['D', 'F', 'A']) }, caption: 'ii = D minor: D F A' },
          'Your hand keeps the same shape (every other white key) and simply walks up the keyboard.',
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            chordStep('C E G', 'I', { prompt: '**I**: C major' }),
            chordStep('D F A', 'ii', { prompt: '**ii**: D minor' }),
            chordStep('E G B', 'iii', { prompt: '**iii**: E minor' }),
            chordStep('F A C+', 'IV', { prompt: '**IV**: F major' }),
            chordStep('G B D+', 'V', { prompt: '**V**: G major' }),
            chordStep('A C+ E+', 'vi', { prompt: '**vi**: A minor' }),
            chordStep('B D+ F+', 'vii°', { prompt: '**vii°**: B diminished' }),
            chordStep('A C+ E+', 'vi', { prompt: 'Back down: **vi**', phrase: 1 }),
            chordStep('F A C+', 'IV', { prompt: '**IV**', phrase: 1 }),
            chordStep('G B D+', 'V', { prompt: '**V**', phrase: 1 }),
            chordStep('C E G', 'I', { prompt: 'Home: **I**', phrase: 1 }),
          ],
        },
      },
      {
        id: 'inversions',
        title: 'Inversions',
        theory: [
          'An **inversion** keeps the same three notes but puts a different one at the bottom:',
          { list: [
            '**Root position**: C E G (root at the bottom)',
            '**1st inversion**: E G C (the 3rd at the bottom)',
            '**2nd inversion**: G C E (the 5th at the bottom)',
          ] },
          'It is still a C chord, just a different *colour*. Pianists choose inversions so the hand moves as little as possible between chords.',
          { keys: { mark: ['E', 'G', 'C'], labels: { C: 'C (top)' } }, caption: '1st inversion: E G + the high C' },
          { tip: 'To find the next inversion, take the bottom note and move it up an octave.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            chordStep('C E G', 'C', { prompt: '**C** root position' }),
            chordStep('E G C+', 'C/E', { prompt: '**C** 1st inversion' }),
            chordStep('G C+ E+', 'C/G', { prompt: '**C** 2nd inversion' }),
            chordStep('F A C+', 'F', { prompt: '**F** root position', phrase: 1 }),
            chordStep('A C+ F+', 'F/A', { prompt: '**F** 1st inversion', phrase: 1 }),
            chordStep('C F A', 'F/C', { prompt: '**F** 2nd inversion', phrase: 1 }),
            chordStep('A C+ E+', 'Am', { prompt: '**Am** root position', phrase: 2 }),
            chordStep('C E A', 'Am/C', { prompt: '**Am** 1st inversion', phrase: 2 }),
            chordStep('E A C+', 'Am/E', { prompt: '**Am** 2nd inversion', phrase: 2 }),
          ],
        },
      },
      {
        id: 'sus-chords',
        title: 'Suspended chords',
        theory: [
          'Take away the 3rd of a chord and replace it with a neighbour. The chord now sounds **open and undecided**, neither major nor minor. That is a **sus** (suspended) chord.',
          { list: ['**Csus2** = C **D** G (3rd lowered to the 2nd)', '**Csus4** = C **F** G (3rd raised to the 4th)'] },
          'A sus4 *wants* to fall back to the 3rd. Hear the tension release as you go **Csus4 → C**.',
          { keys: { mark: ['C', 'F', 'G'], labels: keyLabels(['C', 'F', 'G']) }, caption: 'Csus4: S + G + H' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [0, 1].flatMap(round => [
            chordStep('C F G', 'Csus4', { prompt: '**Csus4**: tension…', phrase: round }),
            chordStep('C E G', 'C', { prompt: '…release to **C**', phrase: round }),
            chordStep('C D G', 'Csus2', { prompt: '**Csus2**: open, airy', phrase: round }),
            chordStep('C E G', 'C', { prompt: 'and back to **C**', phrase: round }),
          ]).concat([
            chordStep('G C+ D+', 'Gsus4', { prompt: '**Gsus4**', phrase: 2 }),
            chordStep('G B D+', 'G', { prompt: 'resolves to **G**', phrase: 2 }),
          ]),
        },
      },
      {
        id: 'seventh-chords',
        title: 'Seventh chords',
        theory: [
          'Stack **one more third** on a triad and you get a four-note **seventh chord**. Sevenths add richness: jazz, soul and R&B are full of them.',
          { list: [
            '**Cmaj7** = C E G **B**: dreamy, soft',
            '**C7** (dominant 7th) = C E G **B♭**: bluesy, wants to move',
            '**Cm7** = C E♭ G **B♭**: mellow, smooth',
            '**G7** = G B D **F**: the V7 chord, pulls strongly home to C',
          ] },
          { keys: { mark: ['C', 'E', 'G', 'B'], labels: keyLabels(['C', 'E', 'G', 'B']) }, caption: 'Cmaj7: S + F + H + K' },
          { tip: 'Four fingers now: left pinky on the root, then every other key. If a chord doesn\'t register, your keyboard may not detect that many keys at once. Press them slightly one after another and hold.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            chordStep('C E G B', 'Cmaj7', { prompt: '**Cmaj7**: dreamy' }),
            chordStep('C E G A#', 'C7', { prompt: '**C7**: bluesy (B drops to B♭)' }),
            chordStep('C D# G A#', 'Cm7', { prompt: '**Cm7**: mellow (E drops to E♭ too)' }),
            chordStep('G B D+ F+', 'G7', { prompt: '**G7**: the dominant seventh', phrase: 1 }),
            chordStep('C E G', 'C', { prompt: '…resolving home to **C**', phrase: 1 }),
            chordStep('C E G B', 'Cmaj7', { prompt: 'Finish on **Cmaj7**', phrase: 1 }),
          ],
        },
      },
      {
        id: 'pop-progression',
        title: 'The pop progression: I – V – vi – IV',
        theory: [
          '**C – G – Am – F** (I – V – vi – IV) is the most famous chord loop in pop music. Hundreds of hit songs use it, usually one chord per bar, round and round.',
          '**Where the chords come from.** They are four of the seven "Chords of the scale" you already know. Number the notes of C major 1–7 and build a triad on 1, 5, 6 and 4:',
          { list: [
            '**I** = chord on note 1 (C) → **C** major = C E G',
            '**V** = chord on note 5 (G) → **G** major = G B D',
            '**vi** = chord on note 6 (A) → **A minor** = A C E (small numeral = minor)',
            '**IV** = chord on note 4 (F) → **F** major = F A C',
          ] },
          '**What each chord does.** The loop is a little story: *home → away → a sad twist → a warm lift → home*.',
          { list: [
            '**I (C): home.** Stable and at rest. The song "lives" here.',
            '**V (G): tension.** The strongest chord pulling back home. Your ear expects C next…',
            '**vi (Am): the surprise.** …but you get A minor instead. Am shares two notes with C (C and E), so it sounds *like* home, only darker. This moment is why the loop feels emotional.',
            '**IV (F): the lift.** Bright and open, like taking a breath. F → C is the soft "amen" ending, so it leads you naturally back to the start.',
          ] },
          'Three major chords and one minor chord give the mix of happy and sad that pop songs love: **bittersweet**.',
          '**Moving your hand.** Use these shapes (inversions) so the chords share notes and your fingers move as little as possible:',
          { list: [
            '**C** = C E G → keys **S F H**',
            '**G** = D G B (2nd inversion) → keys **D H K**. The biggest move: the whole hand shifts up.',
            '**Am** = C E A (1st inversion) → keys **S F J**. Every finger slides back down: D→C, G→E, B→A.',
            '**F** = C F A (2nd inversion) → keys **S G J**. Only the middle finger moves, E→F (one step).',
            'back to **C** = C E G → keys **S F H**. The bottom C stays; F→E and A→G each step down.',
          ] },
          { keys: { mark: ['D', 'G', 'B'], labels: keyLabels(['D', 'G', 'B']) }, caption: 'G as D G B: D + H + K' },
          { keys: { mark: ['C', 'E', 'A'], labels: keyLabels(['C', 'E', 'A']) }, caption: 'Am as C E A: S + F + J (two notes shared with C)' },
          { keys: { mark: ['C', 'F', 'A'], labels: keyLabels(['C', 'F', 'A']) }, caption: 'F as C F A: S + G + J (only E→F changed)' },
          '**The same loop in any key.** The Roman numerals are a recipe, not fixed notes. Count 1, 5, 6, 4 in any major scale:',
          { list: [
            '**C major:** C – G – Am – F (Let It Be, No Woman No Cry)',
            '**G major:** G – D – Em – C',
            '**D major:** D – A – Bm – G (With or Without You). Ram Ram, your decoded song, is in D and uses D, Bm and G from this family.',
            '**A major:** A – E – F♯m – D (Someone Like You)',
          ] },
          '**Same chords, different start.** Start the loop on another chord and the mood changes:',
          { list: [
            '**vi – IV – I – V** (Am – F – C – G): starts sad, then gets hopeful. Very common in modern pop.',
            '**I – vi – IV – V** (C – Am – F – G): the 1950s doo-wop loop. Same chords in a new order.',
            '**IV – I – V – vi** (F – C – G – Am): floats, never quite settles.',
          ] },
          { tip: 'Loop it slowly, 4 beats per chord, and hum any melody on top. You will start recognising songs everywhere. Watch the bottom note: C – D – C – C.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            ...[0, 1].flatMap(round => [
              chordStep('C E G', 'C', { prompt: round ? '**I**: C (home)' : '**I**: C. Home, at rest', phrase: round }),
              chordStep('D G B', 'G', { prompt: round ? '**V**: G (tension)' : '**V**: G. Whole hand up: tension, wants to go home…', phrase: round }),
              chordStep('C E A', 'Am', { prompt: round ? '**vi**: Am (the twist)' : '**vi**: Am. …but a sad twist instead (C and E stay the same)', phrase: round }),
              chordStep('C F A', 'F', { prompt: round ? '**IV**: F (the lift)' : '**IV**: F. Only E→F moves: the lift', phrase: round }),
            ]),
            chordStep('C E A', 'Am', { prompt: 'Start on the twist: **vi**: Am', phrase: 2 }),
            chordStep('C F A', 'F', { prompt: '**IV**: F', phrase: 2 }),
            chordStep('C E G', 'C', { prompt: '**I**: C', phrase: 2 }),
            chordStep('D G B', 'G', { prompt: '**V**: G (vi – IV – I – V: sad → hopeful)', phrase: 2 }),
            chordStep('G B D+', 'G', { prompt: 'Same loop in **G major**: **I** = G', phrase: 3 }),
            chordStep('D F# A', 'D', { prompt: '**V** = D (F♯ is the black key Y)', phrase: 3 }),
            chordStep('E G B', 'Em', { prompt: '**vi** = Em', phrase: 3 }),
            chordStep('C E G', 'C', { prompt: '**IV** = C', phrase: 3 }),
            chordStep('G B D+', 'G', { prompt: 'Home: **I** = G', phrase: 3 }),
          ],
        },
      },
      {
        id: 'minor-progression',
        title: 'A minor-key progression',
        theory: [
          'Minor keys have their own chords. In **C minor**: **i** = Cm, **iv** = Fm, and **V** = G major.',
          'Why is V *major* in a minor key? It borrows the raised 7th from **harmonic minor** (B instead of B♭). That B is the leading note, and it pulls strongly back to C.',
          { list: ['**Cm** = C E♭ G', '**Fm** = C F A♭ (2nd inversion)', '**G** = D G B (2nd inversion)', 'back to **Cm**'] },
          { keys: { mark: ['C', 'F', 'G#'], labels: { 'G#': 'A♭' } }, caption: 'Fm as C F A♭' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [0, 1].flatMap(round => [
            chordStep('C D# G', 'Cm', { prompt: '**i**: C minor', phrase: round }),
            chordStep('C F G#', 'Fm', { prompt: '**iv**: F minor', phrase: round }),
            chordStep('D G B', 'G', { prompt: '**V**: G major (from harmonic minor)', phrase: round }),
            chordStep('C D# G', 'Cm', { prompt: '**i**: home to C minor', phrase: round }),
          ]),
        },
      },
      {
        id: 'ii-v-i',
        title: 'Jazz ii – V – I',
        theory: [
          'The favourite move in jazz is **ii – V – I** with seventh chords: **Dm7 → G7 → Cmaj7**.',
          'Voice-leading makes it smooth: each chord changes only one or two notes.',
          { list: ['**Dm7** = D F A C', '**G7** = D F G B (inversion: only A→G and C→B move)', '**Cmaj7** = C E G B (D→C and F→E move down)'] },
          { keys: { mark: ['D', 'F', 'G', 'B'], labels: keyLabels(['D', 'F', 'G', 'B']) }, caption: 'G7 as D F G B' },
          { tip: 'Notice each finger slides down by a step or stays still. That is good voice-leading.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [0, 1].flatMap(round => [
            chordStep('D F A C+', 'Dm7', { prompt: '**ii**: Dm7', phrase: round }),
            chordStep('D F G B', 'G7', { prompt: '**V**: G7', phrase: round }),
            chordStep('C E G B', 'Cmaj7', { prompt: '**I**: Cmaj7', phrase: round }),
          ]),
        },
      },
      {
        id: 'arpeggios',
        title: 'Arpeggios',
        theory: [
          'An **arpeggio** is a chord spread out one note at a time, up and down. Pianists use arpeggios for flowing accompaniments, and they train your hand to *know* each chord shape.',
          'Play each chord as an arpeggio through two octaves of notes: **root, 3rd, 5th, root**, then back down.',
          { list: ['**C**: C E G C', '**Am**: A C E (high)', '**F**: F A C F (high)', '**G7**: G B D F'] },
          { tip: 'Keep it even, like a music box. Then try the same thing freely with the sustain pedal (Space) held down.' },
        ],
        exercise: {
          type: 'steps',
          hint: 'glow',
          make: () => [
            ...noteSteps('C E G C+ E+ C+ G E C', { prompt: '**C** arpeggio' }),
            ...noteSteps('A C+ E+ C+ A', { prompt: '**Am** arpeggio', phrase: 1 }),
            ...noteSteps('F A C+ F+ C+ A F', { prompt: '**F** arpeggio', phrase: 2 }),
            ...noteSteps('G B D+ F+ D+ B G', { prompt: '**G7** arpeggio', phrase: 3 }),
            ...noteSteps('E G C+', { prompt: 'Home to **C**', phrase: 4 }),
          ],
        },
      },
    ],
  },
  {
    title: 'Major & minor chords of all scales',
    // Added 2026-11-03 at the user's request: one lesson per note, C up to B, each with
    // the major and minor triad on that note. Open from the start so it can be played now.
    openStart: true,
    lessons: ROOT_CHORDS.map(rootChordLesson),
  },
  {
    title: 'Diminished, augmented & sus on every note',
    openStart: true,
    lessons: ROOT_CHORDS.map(moreChordsLesson),
  },
  {
    title: 'Feel-good major chords',
    // Added 2026-11-04: relaxing progressions, major chords only. Open from the start, and
    // every lesson stays open (allOpen) so you can pick whichever suits your mood.
    openStart: true,
    allOpen: true,
    lessons: [...FEEL_GOOD_MAJOR, playlistLesson('calm-relax', 'Relax', [
      'Sit back and play the whole unit, one lesson after another, from Gentle sway to Surprise chords.',
      'Each lesson plays as usual, with no timer. After each one you get a 10-second break, then the next starts by itself.',
      { tip: 'It takes a while, so pick a time when you can let it flow. Your stars here are the average across all the lessons.' },
    ], FEEL_GOOD_MAJOR)],
  },
  {
    title: 'Feel-good minor chords',
    openStart: true,
    allOpen: true,
    lessons: [...CALM_MINOR_LESSONS.map(calmLesson), minorSurpriseLesson],
  },
];

// Flat list with numbering, e.g. lesson.num = "2.3"
export const LESSONS = UNITS.flatMap((unit, u) =>
  unit.lessons.map((lesson, l) => ({ ...lesson, num: `${u + 1}.${l + 1}`, unit: u }))
);
export const lessonById = Object.fromEntries(LESSONS.map(l => [l.id, l]));
