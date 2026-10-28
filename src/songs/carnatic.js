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

// How swaras are shown (the user's own names): each key above Sa has one name,
// whatever role it plays in the raga. White keys take the plain swara (D = Ri,
// E = Ga …); C♯ = Ri1, D♯ = Ga2, F♯ = Ma2, G♯ = Da1, A♯ = Ni2.
// A dot above marks the upper octave (Ṡa), below the lower (Ṇi).
export const SWARA_BY_SEMITONE = ['Sa', 'Ri1', 'Ri', 'Ga2', 'Ga', 'Ma', 'Ma2', 'Pa', 'Da1', 'Da', 'Ni2', 'Ni'];
const dotted = (name, dot) => `${name[0]}${dot}${name.slice(1)}`;
// semis = semitones above Sa (may be negative or past the octave)
export const swaraName = semis => {
  const name = SWARA_BY_SEMITONE[((semis % 12) + 12) % 12];
  return semis >= 12 ? dotted(name, '̇') : semis < 0 ? dotted(name, '̣') : name;
};

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

const set = (list, id, title, level) => list.map((swaras, i) => ({ id: `${id}-${i + 1}`, title: `${title} ${i + 1}`, level, swaras, talam: 'adi' }));
export const CARNATIC = [
  ...set(SARALI, 'sarali', 'Sarali Varisai', 'Sarali Varisai'),
  ...set(JANTA, 'janta', 'Janta Varisai', 'Janta Varisai'),
  ...set(DHATU, 'dhatu', 'Dhatu Varisai', 'Dhatu Varisai'),
];
export const CARNATIC_LEVELS = ['Sarali Varisai', 'Janta Varisai', 'Dhatu Varisai'];
// Levels the app offers right now: Sarali in every raga first, Janta/Dhatu come back later.
// Shankarabharanam already gets the full course (all Janta + Dhatu).
export const SHOWN_LEVELS = ['Sarali Varisai'];
export const FULL_COURSE_RAGAS = ['shankarabharanam'];
export const shownSongs = (songs, raga) =>
  FULL_COURSE_RAGAS.includes(raga) ? songs : songs.filter(s => SHOWN_LEVELS.includes(s.level));
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
      const name = swaraName(pitch - sa);
      events.push({ beat, beats: 1, notes: [{ name, swara, semitone: ((pitch % 12) + 12) % 12, oct: Math.floor(pitch / 12) }] });
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

// Home ragas get all 12 janta varisais; every other raga gets 6 of them, picked
// at random but fixed per raga (seeded by its id), so its list never reshuffles
export const HOME_RAGAS = ['mayamalavagowla', 'shankarabharanam'];
export const JANTA_PICK = 6;
function seeded(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function jantaFor(raga) {
  const all = CARNATIC.filter(c => c.level === 'Janta Varisai').map(c => c.id);
  if (HOME_RAGAS.includes(raga)) return all;
  const rand = seeded(raga);
  const picked = [...all];
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  const keep = new Set(picked.slice(0, JANTA_PICK));
  return all.filter(id => keep.has(id)); // back in the traditional order
}

// An exercise as a song in one raga; ids carry the raga so stars are kept per raga
function asSong(c, raga) {
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
}

export const carnaticSongs = raga => {
  const janta = new Set(jantaFor(raga));
  return CARNATIC.filter(c => c.level !== 'Janta Varisai' || janta.has(c.id)).map(c => asSong(c, raga));
};

// Geethams belong to one raga each, so they only show in that raga (Carnatic
// Music tab only, not Relax). Sree Govinda (Purandara Dasa), notation from
// Shanmukhapriya School of Music; one line = one Matya talam cycle (4 | 2 | 4).
// Line 4 ends on upper Sa (the sheet prints a plain S; museyb.blogspot.com has Ṡ).
const GEETHAMS = [
  {
    id: 'geetham-sree-govinda',
    title: 'Sree Govinda',
    level: 'Geetham',
    raga: 'shankarabharanam',
    talam: 'matya',
    swaras: [
      "S' , S' N | D N | S' N D P",   // shree gō – vin – da
      'M G M P | D P | M G R S',      // harē madhu sūdana
      'S S P , | M G | M R G ,',      // vanamālā
      "S S S' , | S' S' | D N , S'",  // garuda dwaja mukunda
      "G' R' S' N | D N | S' N D P",  // shreedhara shree raghupathe
      "S' , , , | , , | S' N D P",    // san – karshana
      'M G M P | , P | M G R S',      // sundarānga jaya jaya
      "G' R' N S' | , D | N N P D",   // shree rāma seethā –
      'D M P , | P M | G R G ,',      // – bhirāma
      "S R G M | P , | D N S' ,",     // māmpāhi
      "G' R' S' N | D P | M G R S",   // pattābhirāma
    ].join(' || '),
  },
];
export const GEETHAM_LEVEL = 'Geetham';

// The exercise last picked in Relax or Practice (id without the raga), so
// switching between the two keeps the same varisai selected
const PICK_KEY = 'desk-piano-carnatic-pick';
export function loadCarnaticPick() {
  try { return localStorage.getItem(PICK_KEY); } catch { return null; }
}
export function saveCarnaticPick(id) {
  try { localStorage.setItem(PICK_KEY, id.split('@')[0]); } catch { /* storage blocked */ }
}

export const geethamSongs = raga => GEETHAMS.filter(g => g.raga === raga).map(g => asSong(g, raga));
