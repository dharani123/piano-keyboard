// Carnatic practice: the traditional beginner exercises, written in swaras
// and played in whichever raga is picked. One swara per beat (1st speed),
// 8 beats = one cycle of Adi talam. "," holds the previous swara one more
// beat (karvai), S' is the upper Sa, "|" and "||" are bar marks (display only).

export const RAGAS = {
  mayamalavagowla: { name: 'Mayamalavagowla', semitones: { S: 0, R: 1, G: 4, M: 5, P: 7, D: 8, N: 11 } },
  shankarabharanam: { name: 'Shankarabharanam', semitones: { S: 0, R: 2, G: 4, M: 5, P: 7, D: 9, N: 11 } },
};
export const DEFAULT_RAGA = 'mayamalavagowla';
// How swaras are shown: full names, with a dot above for the upper octave (Ṡa)
export const SWARA_NAMES = { S: 'Sa', R: 'Ri', G: 'Ga', M: 'Ma', P: 'Pa', D: 'Da', N: 'Ni' };
const upperName = swara => `${SWARA_NAMES[swara][0]}̇${SWARA_NAMES[swara].slice(1)}`;

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

// Janta varisai: every swara played twice, climbing then coming back down
const SCALE = ['S', 'R', 'G', 'M', 'P', 'D', 'N', "S'"];
const doubled = idx => idx.map(i => `${SCALE[i]} ${SCALE[i]}`).join(' ');
const climb = (shape, from, to) => {
  const lines = [];
  for (let i = from; i <= to; i++) lines.push(doubled(shape.map(d => i + d)));
  return lines;
};
// descending = the same shapes mirrored from the upper Sa
const mirror = shape => shape.map(d => -d);
const descend = (shape, from, to) => {
  const lines = [];
  for (let i = from; i >= to; i--) lines.push(doubled(mirror(shape).map(d => i + d)));
  return lines;
};
const JANTA = [
  [...climb([0, 1, 2, 3], 0, 4), ...descend([0, 1, 2, 3], 7, 3)],
  [
    ...climb([0, 1, 2, 1], 0, 4).flatMap((l, k) => [l, doubled([0, 1, 2, 3].map(d => k + d))]),
    ...descend([0, 1, 2, 1], 7, 3).flatMap((l, k) => [l, doubled([0, 1, 2, 3].map(d => 7 - k - d))]),
  ],
].map(lines => lines.join(' || '));

export const CARNATIC = [
  ...SARALI.map((swaras, i) => ({ id: `sarali-${i + 1}`, title: `Sarali Varisai ${i + 1}`, level: 'Sarali Varisai', swaras })),
  ...JANTA.map((swaras, i) => ({ id: `janta-${i + 1}`, title: `Janta Varisai ${i + 1}`, level: 'Janta Varisai', swaras })),
];
export const CARNATIC_LEVELS = ['Sarali Varisai', 'Janta Varisai'];
export const CARNATIC_BPM = 70;

// "S R G ," → falling-notes events in the given raga; labels are the swaras
export function parseSwaras(text, raga) {
  const semis = RAGAS[raga].semitones;
  const events = [];
  let beat = 0;
  for (const token of text.split(/\s+/).filter(Boolean)) {
    if (token === '|' || token === '||') continue;
    if (token === ',') {
      if (!events.length) throw new Error('Karvai "," before any swara');
      events.at(-1).beats += 1;
    } else {
      const m = token.match(/^([SRGMPDN])(')?$/);
      if (!m) throw new Error(`Bad swara "${token}"`);
      const [, swara, upper] = m;
      events.push({ beat, beats: 1, notes: [{ name: upper ? upperName(swara) : SWARA_NAMES[swara], semitone: semis[swara], oct: upper ? 1 : 0 }] });
    }
    beat += 1;
  }
  return { events, totalBeats: beat };
}

// The exercises as songs in one raga; ids carry the raga so stars are kept per raga
export const carnaticSongs = raga => CARNATIC.map(c => ({
  ...c,
  id: `${c.id}@${raga}`,
  bpm: CARNATIC_BPM,
  carnatic: true,
  ...parseSwaras(c.swaras, raga),
}));
