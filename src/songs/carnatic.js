import { SHIFTS, playable } from '../data/keymap.js';

// Carnatic practice: the traditional beginner exercises (abhyasa gana), written
// in swaras and played in whichever raga is picked. One swara per beat (1st
// speed). "," holds the previous swara one more beat (karvai), S' is an upper
// octave swara, N. a lower octave one, "|" and "||" are bar marks (display only).
// Notation follows karnatik.com's beginner lessons (Mayamalavagowla, Purandara Dasa's order).

// The 72 melakarta (parent) ragas, in their traditional order. Each uses all
// seven swaras; the number fixes which Ri/Ga (by chakra) and Da/Ni (by place
// in the chakra) it takes, and 1–36 use Ma1, 37–72 Ma2.
const MELA_NAMES = [
  'Kanakangi', 'Ratnangi', 'Ganamurti', 'Vanaspati', 'Manavati', 'Tanarupi',
  'Senavati', 'Hanumatodi', 'Dhenuka', 'Natakapriya', 'Kokilapriya', 'Rupavati',
  'Gayakapriya', 'Vakulabharanam', 'Mayamalavagowla', 'Chakravakam', 'Suryakantam', 'Hatakambari',
  'Jhankaradhvani', 'Natabhairavi', 'Keeravani', 'Kharaharapriya', 'Gourimanohari', 'Varunapriya',
  'Mararanjani', 'Charukesi', 'Sarasangi', 'Harikambhoji', 'Shankarabharanam', 'Naganandini',
  'Yagapriya', 'Ragavardhini', 'Gangeyabhushani', 'Vagadheeswari', 'Shulini', 'Chalanata',
  'Salagam', 'Jalarnavam', 'Jhalavarali', 'Navaneetam', 'Pavani', 'Raghupriya',
  'Gavambodhi', 'Bhavapriya', 'Shubhapantuvarali', 'Shadvidhamargini', 'Suvarnangi', 'Divyamani',
  'Dhavalambari', 'Namanarayani', 'Kamavardhini', 'Ramapriya', 'Gamanashrama', 'Vishwambari',
  'Shamalangi', 'Shanmukhapriya', 'Simhendramadhyamam', 'Hemavati', 'Dharmavati', 'Neetimati',
  'Kantamani', 'Rishabhapriya', 'Latangi', 'Vachaspati', 'Kalyani', 'Chitrambari',
  'Sucharitra', 'Jyotiswarupini', 'Dhatuvardhani', 'Nasikabhushani', 'Kosalam', 'Rasikapriya',
];
// semitones of Ri+Ga per chakra, and of Da+Ni per place in a chakra
const RI_GA = [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]];
const DA_NI = [[8, 9], [8, 10], [8, 11], [9, 10], [9, 11], [10, 11]];
// Formal names where the everyday one is shorter (ids keep the everyday name)
const FULL_NAMES = { 29: 'Dheerashankarabharanam', 65: 'Mechakalyani' };
// The usual first ragas for a beginner, marked with a dot in the picker
const BASIC = [15, 22, 28, 29, 65];

export const RAGAS = Object.fromEntries(MELA_NAMES.map((name, i) => {
  const [R, G] = RI_GA[Math.floor(i / 6) % 6];
  const [D, N] = DA_NI[i % 6];
  const number = i + 1;
  return [name.toLowerCase(), {
    number,
    name,
    fullName: FULL_NAMES[number] ?? name,
    basic: BASIC.includes(number),
    semitones: { S: 0, R, G, M: i < 36 ? 5 : 6, P: 7, D, N },
  }];
}));
export const DEFAULT_RAGA = 'mayamalavagowla';

// Talams: beats per cycle, and where each anga after the first starts
export const TALAMS = {
  adi: { name: 'Adi', beats: 8, marks: [4, 6], parts: '4 | 2 | 2' },
  dhruva: { name: 'Dhruva', beats: 14, marks: [4, 6, 10], parts: '4 | 2 | 4 | 4' },
  matya: { name: 'Matya', beats: 10, marks: [4, 6], parts: '4 | 2 | 4' },
  rupaka: { name: 'Rupaka', beats: 6, marks: [2], parts: '2 | 4' },
  jhampa: { name: 'Jhampa', beats: 10, marks: [7, 8], parts: '7 | 1 | 2' },
  triputa: { name: 'Triputa', beats: 7, marks: [3, 5], parts: '3 | 2 | 2' },
  ata: { name: 'Ata', beats: 14, marks: [5, 10, 12], parts: '5 | 5 | 2 | 2' },
  eka: { name: 'Eka', beats: 4, marks: [], parts: '4' },
};

// How swaras are shown: full names, a dot above for the upper octave (Ṡa), below for the lower (Ṇi)
export const SWARA_NAMES = { S: 'Sa', R: 'Ri', G: 'Ga', M: 'Ma', P: 'Pa', D: 'Da', N: 'Ni' };
const dotted = (swara, dot) => `${SWARA_NAMES[swara][0]}${dot}${SWARA_NAMES[swara].slice(1)}`;
const upperName = swara => dotted(swara, '̇');
const lowerName = swara => dotted(swara, '̣');

// karnatik.com style → ours: lowercase = middle octave, capital = upper,
// "n." = lower; "-" only joins swaras visually
const k = text => text.replace(/\s-\s/g, ' ').split(/\s+/).filter(Boolean).map(t =>
  /^[srgmpdn]$/.test(t) ? t.toUpperCase()
    : /^[SRGMPDN]$/.test(t) ? `${t}'`
      : /^[srgmpdn]\.$/.test(t) ? t.toUpperCase()
        : t).join(' ');
const lines = (...rows) => rows.map(k).join(' || ');

const SARALI = [
  "S R G M | P D | N S' || S' N D P | M G | R S",
  "S R S R | S R | G M || S R G M | P D | N S' || S' N S' N | S' N | D P || S' N D P | M G | R S",
  "S R G S | R G | S R || S R G M | P D | N S' || S' N D S' | N D | S' N || S' N D P | M G | R S",
  "S R G M | S R | G M || S R G M | P D | N S' || S' N D P | S' N | D P || S' N D P | M G | R S",
  "S R G M | P , | S R || S R G M | P D | N S' || S' N D P | M , | S' N || S' N D P | M G | R S",
  "S R G M | P D | S R || S R G M | P D | N S' || S' N D P | M G | S' N || S' N D P | M G | R S",
  "S R G M | P D | N , || S R G M | P D | N S' || S' N D P | M G | R , || S' N D P | M G | R S",
  "S R G M | P M | G R || S R G M | P D | N S' || S' N D P | M P | D N || S' N D P | M G | R S",
  "S R G M | P M | D P || S R G M | P D | N S' || S' N D P | M P | G M || S' N D P | M G | R S",
  "S R G M | P , | G M || P , , , | P , | , , || G M P D | N D | P M || G M P G | M G | R S",
  "S' , N D | N , | D P || D , P M | P , | P , || G M P D | N D | P M || G M P G | M G | R S",
  "S' S' N D | N N | D P || D D P M | P , | P , || G M P D | N D | P M || G M P G | M G | R S",
  "S R G R | G , | G M || P M P , | D P | D , || M P D P | D N | D P || M P D P | M G | R S",
  "S R G M | P , | P , || D D P , | M M | P , || D N S' , | S' N | D P || S' N D P | M G | R S",
];

// Janta varisai: doubled swaras. Exercises 2–12 climb a shape up the scale and
// back down; `rise` writes the two lines of each step from the pair of lines given.
const SC = ['s', 'r', 'g', 'm', 'p', 'd', 'n', 'S'];
const DOWN = ['S', 'n', 'd', 'p', 'm', 'g', 'r', 's'];
const shift = (row, by, scale) => row.replace(/\b([srgmpdnS])\b/g, (_, c) => scale[scale.indexOf(c) + by]);
const rise = (a, b) => [
  ...[0, 1, 2, 3, 4].flatMap(i => [shift(a, i, SC), shift(b, i, SC)]),
  ...[0, 1, 2, 3, 4].flatMap(i => [shift(a.replace(/[srgmpdn]/g, c => DOWN[SC.indexOf(c)]), i, DOWN), shift(b.replace(/[srgmpdn]/g, c => DOWN[SC.indexOf(c)]), i, DOWN)]),
];
const PLAIN = 's s r r | g g | m m';
const JANTA = [
  lines('s s r r | g g | m m', 'p p d d | n n | S S', 'S S n n | d d | p p', 'm m g g | r r | s s'),
  lines(...[0, 1, 2, 3, 4].map(i => shift(PLAIN, i, SC)), ...[0, 1, 2, 3, 4].map(i => shift('S S n n | d d | p p', i, DOWN))),
  lines(...rise('s s r r | g g | r r', PLAIN)),
  lines(...rise('s s r - s | s r | s r', PLAIN)),
  lines(...rise('s s r r | g - s | r g', PLAIN)),
  lines(...rise('s s , r | r , | g g', PLAIN)),
  lines(...rise('s , s r | , r | g g', PLAIN)),
  lines(...rise('s s s r | r r | g g', PLAIN)),
  lines(...rise('s , r g | , s | r g', PLAIN)),
  lines(...rise('s r , g | , s | r g', PLAIN)),
  lines(...rise('s , r , | g - s | r g', PLAIN)),
  lines(...rise('s s m m | g g | r r', PLAIN)),
];

// Dhatu varisai: jumping (zig-zag) patterns
const DHATU = [
  lines(...rise('s s m m | r r | g g', PLAIN)),
  lines(...rise('s m g m | r g | s r', 's g r g | s r | g m')),
  lines(...rise('s r s g | r g | r m', 's m g r | s r | g m')),
];

// Mel sthayi: each one reaches one swara higher in the upper octave
const MEL_OPEN = ['s r g m | p d | n S', 'S , , , | S , | , ,'];
const MEL_TURN = 'S R S n | d p | m p';
const MEL_CLOSE = ['d n S R | S n | d p', 'S n d p | m g | r s'];
const MEL_PEAKS = ['d n S R | S S | R S', 'd n S R | G R | S R', 'd n S R | G M | G R', 'd n S R | G M | P M'];
const MEL = [
  lines(...MEL_OPEN, ...MEL_CLOSE),
  ...MEL_PEAKS.map((_, top) => lines(
    ...MEL_OPEN,
    ...MEL_PEAKS.slice(0, top + 1).reverse().flatMap((row, i) => [row, i === 0 && top === 3 ? 'G R S n | d p | m p' : MEL_TURN]),
    ...MEL_CLOSE,
  )),
];

// Mandra sthayi: each one reaches one swara lower in the lower octave (karnatik.com
// prints the climb back as "d n."; it is the lower Da, d.)
const MANDRA_OPEN = ['S n d p | m g | r s', 's , , , | s , | , ,'];
const MANDRA_TURN = 's n. s r | g m | p m';
const MANDRA_CLOSE = ['g r s n. | s r | g m', 's r g m | p d | n S'];
const MANDRA_DIPS = ['g r s n. | s s | n. s', 'g r s n. | d. n. | s n.', 'g r s n. | d. p. | d. n.', 'g r s n. | d. p. | m. p.'];
const MANDRA = [
  lines(...MANDRA_OPEN, ...MANDRA_CLOSE),
  ...MANDRA_DIPS.map((_, low) => lines(
    ...MANDRA_OPEN,
    ...MANDRA_DIPS.slice(0, low + 1).reverse().flatMap((row, i) => [row, i === 0 && low === 3 ? 'd. n. s r | g m | p m' : MANDRA_TURN]),
    ...MANDRA_CLOSE,
  )),
];

// Alankarams: the same climb and fall, set to each of the seven suladi talams
const ALANKARAM = [
  ['dhruva', 'Dhruva', 's r g m | g r | s r g r | s r g m'],
  ['matya', 'Matya', 's r g r | s r | s r g m'],
  ['rupaka', 'Rupaka', 's r | s r g m'],
  ['jhampa', 'Jhampa', 's r g s r s r | g | m ,'],
  ['triputa', 'Triputa', 's r g | s r | g m'],
  ['ata', 'Ata', 's r , g , | s , r g , | m , | m ,'],
  ['eka', 'Eka', 's r g m'],
].map(([talam, name, row]) => {
  const down = row.replace(/[srgmpdn]/g, c => DOWN[SC.indexOf(c)]);
  return { talam, name, swaras: lines(...[0, 1, 2, 3, 4].map(i => shift(row, i, SC)), ...[0, 1, 2, 3, 4].map(i => shift(down, i, DOWN))) };
});

const set = (list, id, title, level) => list.map((swaras, i) => ({ id: `${id}-${i + 1}`, title: `${title} ${i + 1}`, level, swaras, talam: 'adi' }));
export const CARNATIC = [
  ...set(SARALI, 'sarali', 'Sarali Varisai', 'Sarali Varisai'),
  ...set(JANTA, 'janta', 'Janta Varisai', 'Janta Varisai'),
  ...set(DHATU, 'dhatu', 'Dhatu Varisai', 'Dhatu Varisai'),
  ...set(MEL, 'mel', 'Mel Sthayi', 'Mel Sthayi Varisai'),
  ...set(MANDRA, 'mandra', 'Mandra Sthayi', 'Mandra Sthayi Varisai'),
  ...ALANKARAM.map((a, i) => ({ id: `alankaram-${i + 1}`, title: `Alankaram ${i + 1} · ${a.name}`, level: 'Alankaram', swaras: a.swaras, talam: a.talam })),
];
export const CARNATIC_LEVELS = ['Sarali Varisai', 'Janta Varisai', 'Dhatu Varisai', 'Mel Sthayi Varisai', 'Mandra Sthayi Varisai', 'Alankaram'];
export const CARNATIC_BPM = 70;

// "S R G ," → falling-notes events in the given raga, with Sa `sa` semitones from C
export function parseSwaras(text, raga, sa = 0) {
  const semis = RAGAS[raga].semitones;
  const events = [];
  let beat = 0;
  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (token === '|' || token === '||') continue;
    if (token === ',') {
      if (!events.length) throw new Error('Karvai "," before any swara');
      events.at(-1).beats += 1;
    } else {
      const m = token.match(/^([SRGMPDN])(['.])?$/);
      if (!m) throw new Error(`Bad swara "${token}"`);
      const [, swara, mark] = m;
      const pitch = sa + semis[swara] + (mark === "'" ? 12 : mark === '.' ? -12 : 0);
      const name = mark === "'" ? upperName(swara) : mark === '.' ? lowerName(swara) : SWARA_NAMES[swara];
      events.push({ beat, beats: 1, notes: [{ name, semitone: ((pitch % 12) + 12) % 12, oct: Math.floor(pitch / 12) }] });
    }
    beat += 1;
  }
  return { events, totalBeats: beat };
}

// Sa stays on C unless an exercise needs a note the keyboard doesn't have.
// First the keys slide two places (low or high layout, see keymap.js); only if
// neither fits does Sa move, to the nearest key that fits, white keys first.
const SA_CHOICES = [0, -1, 2, -3, 4, 5, -5, 1, -2, 3, -4, 6, -6];
const PLAYABLE = Object.fromEntries(SHIFTS.map(s => [s, playable(s)]));
export function fitKeys(swaras, raga) {
  for (const sa of SA_CHOICES) {
    const pitches = parseSwaras(swaras, raga, sa).events.map(e => e.notes[0].oct * 12 + e.notes[0].semitone);
    const layout = SHIFTS.find(s => pitches.every(p => PLAYABLE[s].has(p)));
    if (layout !== undefined) return { sa, layout };
  }
  return { sa: 0, layout: 0 };
}

// The exercises as songs in one raga; ids carry the raga so stars are kept per raga
export const carnaticSongs = raga => CARNATIC.map(c => {
  const { sa, layout } = fitKeys(c.swaras, raga);
  return {
    ...c,
    id: `${c.id}@${raga}`,
    bpm: CARNATIC_BPM,
    carnatic: true,
    sa,
    layout,
    talam: TALAMS[c.talam],
    ...parseSwaras(c.swaras, raga, sa),
  };
});
