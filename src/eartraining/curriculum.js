import { parseNotes } from '../data/songs.js';
import { buildFlow, ROUNDS } from './flow.js';

// The Ear Training tab: basic swara patterns (Sa = C). Each unit has seven fixed patterns
// that fall like Relax (exercise type 'flow', see flow.js), then four practice lessons (1 to 4
// swaras) that play random swaras and ask for the matching picture (type 'choice', like Identify Notes).
// Same lesson format as lessons/curriculum.js.

const SWARA_OF = { C: 'Sa', D: 'Ri', E: 'Ga', F: 'Ma', G: 'Pa' };
const KEY_OF = { C: 'S', D: 'D', E: 'F', F: 'G', G: 'H' };
// Notes are spaced like Identify Notes (ListenTiming.jsx): each lesson opens with a random
// Gap around 0.5 s, every gap varied, and the last note ringing around 1 s
const QUESTIONS = 10;

// `count` patterns of `n` notes from `pool`. Three or more notes are never all one swara
// (one or two may be: Sa Sa is a fair question). Never the same pattern twice running,
// except single notes, which stay truly random (with two swaras that rule would just alternate).
const allowsSame = n => n <= 2;
export const possiblePatterns = (pool, n) => pool.length ** n - (allowsSame(n) ? 0 : pool.length);
export function patternRounds(pool, n, count, random = Math.random) {
  const rounds = [];
  while (rounds.length < count) {
    const p = Array.from({ length: n }, () => pool[Math.floor(random() * pool.length)]);
    if ((!allowsSame(n) && new Set(p).size < 2) || (n > 1 && rounds.at(-1)?.join() === p.join())) continue;
    rounds.push(p);
  }
  return rounds;
}

// Swara letters for pattern text: 'SSRR' = Sa Sa Ri Ri
const NOTE_OF = { S: 'C', R: 'D', G: 'E', M: 'F', P: 'G' };
const fromLetters = text => [...text.replace(/\s/g, '')].map(c => NOTE_OF[c]);

const list = names => names.map(x => `**${SWARA_OF[x]}**`).join(names.length > 2 ? ', ' : ' and ')
  .replace(/, (?=[^,]*$)/, ' and ');
const keyPicture = pool => ({
  keys: { mark: pool, labels: Object.fromEntries(pool.map(x => [x, `${SWARA_OF[x]} ${KEY_OF[x]}`])) },
  caption: 'Sa is C, the `S` key.',
});

// A fixed pattern as falling notes, like Relax. The lesson starts at its own pattern and
// flows on through the rest of the unit (see eartraining/flow.js).
function patternLesson(id, num, pool, patterns) {
  return {
    id,
    title: `Pattern ${num}`,
    unscored: true, // no stars anywhere in Ear Training
    theory: [
      `The swaras of each pattern fall onto the keys: play each one as it reaches the piano. Pattern ${num} plays twice, then the next pattern starts by itself, on to the last one.`,
      keyPicture(pool),
      { sheet: buildFlow([patterns[num - 1]]).song, caption: `All notes in order · ${patterns[num - 1].names.length} swaras, played ${ROUNDS} times` },
      { list: [
        'Wrong keys just sound, nothing turns red.',
        '**Back**, **Again** and **Skip** move between patterns; `Space` stops and starts.',
        'Pick a speed: 75% is the relaxed one.',
      ] },
      { tip: 'Hum the swara names softly as you play them.' },
    ],
    exercise: { type: 'flow', patterns, from: num - 1 },
  };
}

// Practice: hear n swaras (1 to 5) from the unit's swaras, then pick the matching picture,
// like the Identify Notes tab: up to four line graphs, each a different pattern, swara names
// beside each dot (labelsNearDots, the user 2026-11-17, to tie the names to the ups and downs) (fewer when there aren't four patterns: one note from Sa, Ri has just two).
// Notes are spaced by the player's Gap / Last note sliders (ListenTiming.jsx).
export function patternQuestions(pool, n, count, random = Math.random) {
  const size = Math.min(4, possiblePatterns(pool, n));
  return patternRounds(pool, n, count, random).map(names => {
    const answer = names.join(' ');
    const options = new Set([answer]);
    while (options.size < size) options.add(patternRounds(pool, n, 1, random)[0].join(' '));
    const shuffled = [...options].map(o => [random(), o]).sort((x, y) => x[0] - y[0]).map(([, o]) => o);
    return {
      prompt: n === 1 ? 'One swara. Which picture matches?' : `${WORD[n][0].toUpperCase() + WORD[n].slice(1)} swaras, one after the other. Which picture matches?`,
      play: parseNotes(answer),
      options: shuffled,
      slopes: Object.fromEntries(shuffled.map(o => [o, parseNotes(o).map(x => x.semitone)])),
      swaras: Object.fromEntries(shuffled.map(o => [o, o.split(' ').map(x => SWARA_OF[x])])),
      labelsNearDots: true,
      answer,
      reveal: `**${names.map(x => SWARA_OF[x]).join(' → ')}**`,
    };
  });
}

const WORD = { 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five' };
const EXAMPLE = { 2: '(Sa Sa)', 3: '(Sa Sa Ri)', 4: '(Sa Sa Ri Sa)', 5: '(Sa Sa Ri Sa Ri)' };
function identifyLesson(id, pool, n) {
  const what = n === 1 ? '**one swara**' : `**${WORD[n]} swaras**`;
  const it = n === 1 ? 'the swara' : `the ${WORD[n]} swaras`;
  return {
    id,
    title: `Identify ${n} note${n > 1 ? 's' : ''}`,
    unscored: true, // no stars or mistakes anywhere in Ear Training (the user, 2026-11-17: just chilling and learning)
    theory: [
      `The app plays ${what} from ${list(pool)}${n > 1 ? ', one after the other' : ''}. You don't press the notes: pick the **picture** that matches.`,
      keyPicture(pool),
      { list: [
        'Each picture is a different pattern. Higher dots are higher swaras, and the swara names are under the dots.',
        ...(n > 1 ? [`A swara can come more than once ${EXAMPLE[n]}: then the line stays flat.`] : []),
        'Click the picture. A wrong pick just turns red; the question stays until you get it.',
        `Press \`B\` to hear ${it} again.`,
      ] },
      { tip: n === 1
        ? 'Hum Sa softly in your head first, then hum the swara you hear: is it Sa, or higher?'
        : `Hum ${it} softly: did your voice stay, go up or go down at each move?` },
    ],
    exercise: {
      type: 'choice',
      noMistakes: true,
      make: () => patternQuestions(pool, n, QUESTIONS),
    },
  };
}

// Play it back (every unit, the user 2026-11-17): the app plays n swaras, you play
// keys until your last n notes are those swaras in order. No mistakes counted, so unscored;
// B = Hear again, N = Next (PlaybackExercise.jsx, eartraining/playback.js).
function playbackLesson(id, pool, n) {
  const swaras = n === 1 ? 'one swara' : `${WORD[n]} swaras`;
  return {
    id,
    title: `Play it back: ${n} note${n > 1 ? 's' : ''}`,
    unscored: true,
    theory: [
      n === 1
        ? `The app plays **one swara** from ${list(pool)}. Play it back on the keys.`
        : `The app plays **${swaras}** from ${list(pool)}, one after the other. Play them back on the keys, in the same order.`,
      keyPicture(pool),
      { list: [
        'Play as many keys as you like: wrong keys just sound, nothing counts as a mistake.',
        n === 1
          ? 'As soon as you play the swara you heard, a ✔ and its name show.'
          : `As soon as your last ${WORD[n]} notes are the swaras you heard, a ✔ and their names show.`,
        `Press \`B\` to hear ${n === 1 ? 'it' : 'them'} again, and \`N\` for the next one.`,
      ] },
      { tip: n === 1 ? 'Hum Sa softly first, then hum the swara you heard: is it Sa, or how far up?' : 'Hum the swaras softly first, then find them on the keys.' },
    ],
    exercise: {
      type: 'playback',
      make: () => patternRounds(pool, n, QUESTIONS).map(names => ({
        prompt: n === 1 ? 'One swara. Play it back.' : `${WORD[n][0].toUpperCase() + WORD[n].slice(1)} swaras, one after the other. Play them back.`,
        play: parseNotes(names.join(' ')),
        reveal: `**${names.map(x => SWARA_OF[x]).join(' → ')}**`,
      })),
    },
  };
}

// All open. Patterns go up in blocks of four, two and one, then down the same way, then up and down together
const unit = (title, key, pool, letters) => {
  const patterns = letters.map((text, i) => ({ title: `Pattern ${i + 1}`, names: fromLetters(text) }));
  // sections: subheadings in the lesson list, numbered 3.1, 3.2, 3.3 (the user, 2026-11-17)
  const sections = [
    ['Patterns', patterns.map((p, i) => patternLesson(`et-${key}-p${i + 1}`, i + 1, pool, patterns))],
    // Identify 5 notes was removed 2026-11-16 (the user: add it back later); WORD/EXAMPLE still cover 5
    ['Identify Notes', [1, 2, 3, 4].map(n => identifyLesson(`et-${key}-id${n}`, pool, n))],
    ['Play It Back', [1, 2, 3, 4].map(n => playbackLesson(`et-${key}-pb${n}`, pool, n))],
  ].filter(([, lessons]) => lessons.length);
  return {
    title,
    allOpen: true,
    lessons: sections.flatMap(([sectionTitle, lessons], section) =>
      lessons.map((l, k) => ({ ...l, section, sectionTitle, inSection: k }))),
  };
};

export const EAR_UNITS = [
  unit('Sa, Ri', 'sr', ['C', 'D'], [
    'SSSS RRRR',
    'SSRR SSRR',
    'SRSR SRSR',
    'RRRR SSSS',
    'RRSS RRSS',
    'RSRS RSRS',
    'SRRS SRRS',
  ]),
  unit('Sa, Ri, Ga', 'srg', ['C', 'D', 'E'], [
    'SSSS RRRR GGGG',
    'SSRRGG',
    'SRG SRG',
    'GGGG RRRR SSSS',
    'GGRRSS',
    'GRS GRS',
    'SRG RGS',
  ]),
  unit('Sa, Ri, Ga, Ma', 'srgm', ['C', 'D', 'E', 'F'], [
    'SSSS RRRR GGGG MMMM',
    'SSRRGGMM',
    'SRGM SRGM',
    'MMMM GGGG RRRR SSSS',
    'MMGGRRSS',
    'MGRS MGRS',
    'SRGM MGRS',
  ]),
  unit('Sa, Ri, Ga, Ma, Pa', 'srgmp', ['C', 'D', 'E', 'F', 'G'], [
    'SSSS RRRR GGGG MMMM PPPP',
    'SSRRGGMMPP',
    'SRGMP SRGMP',
    'PPPP MMMM GGGG RRRR SSSS',
    'PPMMGGRRSS',
    'PMGRS PMGRS',
    'SRGMP PMGRS',
  ]),
];

export const EAR_LESSONS = EAR_UNITS.flatMap((u, i) =>
  u.lessons.map(lesson => ({ ...lesson, num: `${i + 1}.${lesson.section + 1}.${lesson.inSection + 1}`, sectionNum: `${i + 1}.${lesson.section + 1}`, unit: i }))
);
