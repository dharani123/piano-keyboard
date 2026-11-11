import { parseNotes } from '../data/songs.js';
import { keyAt, playable } from '../data/keymap.js';

// The Scales tab: all 24 scales, 12 major and 12 (natural) minor, one unit each,
// going up the keyboard from C: C major, C minor, D♭ major, C♯ minor, ...
// Every unit has the same lessons on its own scale: arohanam, avarohanam, both,
// the home chord and the scale in time. The main-chords and every-chord lessons are
// hidden for now (the user's choice, 2026-11-09): set SHOW_CHORD_LESSONS to bring them back.
// The in-time lesson is hidden too (the user's choice, 2026-11-10): set SHOW_IN_TIME.
const SHOW_CHORD_LESSONS = false;
const CHORD_LESSONS = ['main-chords', 'all-chords'];
const SHOW_IN_TIME = false;
//
// Each lesson sets `layout`: the keyboard layout (shift, see data/keymap.js) in
// which the whole scale fits, from its low root up to the root an octave higher.
// C to F use the normal layout, and so does B, from the low B on `A`; F♯ slides the
// keys up (shift −2); G to B♭ start an octave lower and slide the keys down (shift 2). LessonPage applies it while
// the lesson is open.
//
// Same lesson format as lessons/curriculum.js (theory blocks and exercises).

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const LETTERS = 'CDEFGAB';
const LETTER_SEMI = [0, 2, 4, 5, 7, 9, 11];
const ACCIDENTAL = { '-2': '♭♭', '-1': '♭', 0: '', 1: '♯', 2: '♯♯' };

// The note `steps` letters above the root, spelled for this scale (F♯ major has E♯)
function spell(rootName, semi, steps) {
  const li = (LETTERS.indexOf(rootName[0]) + steps) % 7;
  const diff = ((semi - LETTER_SEMI[li]) % 12 + 18) % 12 - 6;
  return LETTERS[li] + ACCIDENTAL[diff];
}

const KINDS = {
  major: {
    word: 'major',
    steps: [2, 2, 1, 2, 2, 2, 1],
    pattern: 'W W H W W W H',
    // chord quality on each degree: '' major, 'm' minor, '°' diminished
    qualities: ['', 'm', 'm', '', '', 'm', '°'],
    numerals: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
    mood: 'bright and happy',
    // swara names, as the app writes them relative to Sa (Ga2 = the lower Ga, etc.)
    swaras: ['Sa', 'Ri', 'Ga', 'Ma', 'Pa', 'Da', 'Ni'],
    main: [0, 3, 4, 0],
    mainName: 'I – IV – V – I',
  },
  minor: {
    word: 'minor',
    steps: [2, 1, 2, 2, 1, 2, 2],
    pattern: 'W H W W H W W',
    qualities: ['m', '°', '', 'm', 'm', '', ''],
    numerals: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
    mood: 'soft and a little sad',
    swaras: ['Sa', 'Ri', 'Ga2', 'Ma', 'Pa', 'Da1', 'Ni2'],
    main: [0, 3, 4, 0],
    mainName: 'i – iv – v – i',
  },
};
const CHORD_SHAPE = { '': [4, 3], m: [3, 4], '°': [3, 3] };
const QUALITY_WORD = { '': 'major', m: 'minor', '°': 'diminished' };

// Names chosen the way the keys are usually written (fewest sharps or flats)
const MAJOR_ROOTS = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const MINOR_ROOTS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'];
const ID_OF = { C: 'c', 'C♯': 'cs', 'D♭': 'db', D: 'd', 'E♭': 'eb', E: 'e', F: 'f', 'F♯': 'fs', G: 'g', 'G♯': 'gs', 'A♭': 'ab', A: 'a', 'B♭': 'bb', B: 'b' };

// The layout and starting pitch (semitones from middle C) where root..root+12 fits
export function placeScale(root) {
  for (const shift of [0, 2, -2]) {
    const keys = playable(shift);
    for (const low of [root, root - 12]) {
      if (Array.from({ length: 13 }, (_, i) => low + i).every(p => keys.has(p))) return { shift, low };
    }
  }
  throw new Error(`No layout fits the scale on ${NAMES[root]}`);
}

// Pitch → parse token (C, C#+, G-)
const token = p => NAMES[((p % 12) + 12) % 12] + (p >= 12 ? '+' : p < 0 ? '-' : '');
const keyName = (p, shift) => keyAt(((p % 12) + 12) % 12, Math.floor(p / 12), shift)?.key;

function buildScale(rootName, root, kind) {
  const k = KINDS[kind];
  const { shift, low } = placeScale(root);
  const keys = playable(shift);
  // 8 pitches, root to root
  const pitches = [low];
  for (const s of k.steps) pitches.push(pitches.at(-1) + s);
  const names = pitches.map((p, i) => spell(rootName, ((p % 12) + 12) % 12, i % 7));
  const name = `${rootName} ${k.word}`;
  // Chord on each degree, kept inside the layout (top note drops an octave if needed)
  const chords = k.qualities.map((q, d) => {
    let ps = [pitches[d], pitches[d] + CHORD_SHAPE[q][0], pitches[d] + CHORD_SHAPE[q][0] + CHORD_SHAPE[q][1]];
    for (let tries = 0; ps.some(p => !keys.has(p)); tries++) {
      if (tries > 3) throw new Error(`No voicing for chord ${d + 1} of ${name}`);
      const top = Math.max(...ps);
      ps[ps.indexOf(top)] -= 12;
    }
    ps = ps.sort((a, b) => a - b);
    const spelled = [0, 2, 4].map(o => names[(d + o) % 7]);
    return { pitches: ps, label: names[d] + q, numeral: k.numerals[d], spelled, quality: q };
  });
  return { rootName, root, kind, k, shift, pitches, names, name, chords };
}

const stepsOf = (s, idx, extra = {}) => idx.map(i => {
  const [n] = parseNotes(token(s.pitches[i]));
  return { notes: [n], label: s.names[i], ...extra };
});
const chordStep = (s, c, extra = {}) => {
  const ns = parseNotes(c.pitches.map(token).join(' '));
  return { notes: ns, label: c.label, listen: ns, chord: true, ...extra };
};
const keysLine = s => s.pitches.map(p => keyName(p, s.shift)).join(' ');
const chordKeys = (s, c) => c.pitches.map(p => keyName(p, s.shift)).join(' ');
const chordLine = (s, c) => `**${c.label}** (${c.numeral}, ${QUALITY_WORD[c.quality]}) = ${c.spelled.join(' ')} → **${chordKeys(s, c)}**`;
const LAYOUT_NOTE = {
  0: 'Your keys are in the normal layout (`A` is the B just below middle C).',
  '-2': 'The keys slide up for this scale: `A` plays D, so the notes run higher along the row.',
  2: 'The keys slide down for this scale: `A` plays the low G, so the scale starts below middle C.',
};

function scaleKeys(s) {
  const labels = Object.fromEntries(s.pitches.slice(0, 7).map((p, i) => [NAMES[((p % 12) + 12) % 12], s.names[i]]));
  return { keys: { mark: Object.keys(labels), labels }, caption: `${s.name}: ${s.names.join(' ')}` };
}

const UP = [0, 1, 2, 3, 4, 5, 6, 7];
const DOWN = [7, 6, 5, 4, 3, 2, 1, 0];

function unitLessons(s) {
  const id = `sc-${ID_OF[s.rootName]}-${s.kind}`;
  const { k } = s;
  const tonic = s.chords[0];
  const intro = [
    `**${s.name}**: ${s.names.join(' ')}. On your keys: **${keysLine(s)}**.`,
    scaleKeys(s),
    LAYOUT_NOTE[s.shift],
  ];
  return [
    {
      id: `${id}-up`,
      title: 'Arohanam (going up)',
      theory: [
        `Every ${k.word} scale uses the same steps: **${k.pattern}** (W = whole step, two keys; H = half step, the very next key). Starting on ${s.rootName} gives:`,
        ...intro,
        { tip: 'Go slowly and say each note name as you press it.' },
      ],
      exercise: { type: 'steps', hint: 'glow', prompt: `Play ${s.name} going up`, make: () => [0, 1].flatMap(r => stepsOf(s, UP, { phrase: r })) },
      layout: s.shift,
    },
    {
      id: `${id}-down`,
      title: 'Avarohanam (coming down)',
      theory: [
        `Now the same notes from the top ${s.rootName} back down to ${s.rootName}: **${s.names.slice().reverse().join(' ')}**.`,
        ...intro.slice(1),
        { tip: 'Coming down is harder to remember. Picture the scale going up, then read it backwards.' },
      ],
      exercise: { type: 'steps', hint: 'glow', prompt: `Play ${s.name} coming down`, make: () => [0, 1].flatMap(r => stepsOf(s, DOWN, { phrase: r })) },
      layout: s.shift,
    },
    {
      id: `${id}-both`,
      title: 'Arohanam & avarohanam',
      theory: [
        `Up to the top Sa, then play that Sa again and come back down: **${s.names.join(' ')} · ${s.names.slice().reverse().join(' ')}**.`,
        { list: [
          `Arohanam: **${[...k.swaras, 'Sa'].join(' ')}**`,
          `Avarohanam: **${['Sa', ...k.swaras.slice().reverse()].join(' ')}**`,
        ] },
        ...intro.slice(1),
        { tip: 'Press the top Sa twice: once to finish going up, once to start coming down.' },
      ],
      exercise: {
        type: 'steps', hint: 'glow', prompt: `${s.name}, up and down`,
        make: () => [0, 1].flatMap(r => stepsOf(s, [...UP, ...DOWN], { phrase: r })),
      },
      layout: s.shift,
    },
    {
      id: `${id}-home-chord`,
      title: `Home chord: ${tonic.label}`,
      theory: [
        `The **home chord** of ${s.name} is built from notes 1, 3 and 5 of the scale: **${tonic.spelled.join(' ')}**. It sounds ${k.mood}, just like the scale.`,
        { list: [chordLine(s, tonic)] },
        'First play its notes one by one going up and back (an *arpeggio*), then press them together.',
      ],
      exercise: {
        type: 'steps', hint: 'glow', prompt: `Play the ${tonic.label} chord`,
        make: () => [
          ...stepsOf(s, [0, 2, 4, 7, 4, 2, 0], { phrase: 0 }),
          chordStep(s, tonic, { phrase: 1, prompt: `All together: **${tonic.label}**` }),
          chordStep(s, tonic, { phrase: 1, prompt: `Again: **${tonic.label}**` }),
          chordStep(s, tonic, { phrase: 1, prompt: `Once more: **${tonic.label}**` }),
        ],
      },
      layout: s.shift,
    },
    {
      id: `${id}-main-chords`,
      title: `Main chords: ${k.mainName}`,
      theory: [
        `Most simple songs in ${s.name} need only three chords: the ones on notes **1**, **4** and **5** of the scale.`,
        { list: k.main.slice(0, 3).map(d => chordLine(s, s.chords[d])) },
        `Play them in the order **${k.mainName}**: away from home and back.`,
      ],
      exercise: {
        type: 'steps', hint: 'glow', prompt: `${k.mainName} in ${s.name}`,
        make: () => [0, 1].flatMap(r => k.main.map(d => chordStep(s, s.chords[d], { phrase: r, prompt: `**${s.chords[d].label}** (${s.chords[d].numeral})` }))),
      },
      layout: s.shift,
    },
    {
      id: `${id}-all-chords`,
      title: 'Every chord of the scale',
      theory: [
        `Put a chord on each note of ${s.name}, using only notes from the scale, and you get seven chords:`,
        { list: s.chords.map(c => chordLine(s, c)) },
        'Walk them up and back down, listening to each one change colour.',
      ],
      exercise: {
        type: 'steps', hint: 'glow', prompt: `Every chord of ${s.name}`,
        make: () => [0, 1, 2, 3, 4, 5, 6, 5, 4, 3, 2, 1, 0].map((d, i) => chordStep(s, s.chords[d], { phrase: i < 7 ? 0 : 1, prompt: `**${s.chords[d].label}** (${s.chords[d].numeral})` })),
      },
      layout: s.shift,
    },
    {
      id: `${id}-in-time`,
      title: 'In time',
      theory: [
        `Arohanam and avarohanam of ${s.name} to a slow, steady beat: one note per click, with the top Sa played twice: **${[...k.swaras, 'Sa'].join(' ')} · ${['Sa', ...k.swaras.slice().reverse()].join(' ')}**.`,
        ...intro.slice(1),
        { tip: 'Listen to the demo first, then play along.' },
      ],
      exercise: {
        type: 'rhythm', bpm: 60,
        // 0 1 2 3 | 4 5 6 7 | 7 6 5 4 | 3 2 1 0: four beats a bar, the top Sa twice
        pattern: [[0, 1, 2, 3], [4, 5, 6, 7], [7, 6, 5, 4], [3, 2, 1, 0]].map(bar => bar.map(i => token(s.pitches[i])).join(' ')).join(' | '),
      },
      layout: s.shift,
    },
  ].filter(l => (SHOW_CHORD_LESSONS || !CHORD_LESSONS.some(c => l.id.endsWith(`-${c}`)))
    && (SHOW_IN_TIME || !l.id.endsWith('-in-time')));
}

export const SCALES = MAJOR_ROOTS.flatMap((major, root) => [buildScale(major, root, 'major'), buildScale(MINOR_ROOTS[root], root, 'minor')]);

export const SCALE_UNITS = SCALES.map(s => ({ title: s.name, openStart: true, lessons: unitLessons(s) }));

export const SCALE_LESSONS = SCALE_UNITS.flatMap((unit, u) =>
  unit.lessons.map((lesson, l) => ({ ...lesson, num: `${u + 1}.${l + 1}`, unit: u }))
);
