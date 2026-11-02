import { prettyPitch, stepNote, soundingNotes, patternToItems, randomSeq, shuffle } from './notation.js';

// The Sheet Reading course: how to read staff notation, from the five lines
// up to the user's own Songscription sheet of "Namo Namo".
//
// Same shape as src/lessons/curriculum.js (theory blocks + exercise), plus:
//   theory { staff: <Staff props>, caption }       – a drawn staff
//   steps with step.staff                          – read the note(s) on the staff, press them
//   { type: 'choice', make: () => questions }      – multiple choice, see ChoiceExercise.jsx
//   { type: 'rhythm', ..., staff, hideLane }       – play a written rhythm in time
//
// Treble reading stays within C4–F5 (+ C♯5, D♯5): the keys you can press
// without Z/X. Bass-clef notes are an octave lower (press Z once).

const TREBLE_RANGE = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5'];

// One note on the staff per step; you press what you read
function readSteps(written, { keySig = 0, clef = 'treble', prompt = 'Play the note on the staff' } = {}) {
  return written.map(w => {
    const [{ sounding: [s] }] = soundingNotes([{ n: w }], keySig);
    return {
      notes: [stepNote(s)],
      label: '?',
      reveal: prettyPitch(s),
      prompt,
      staff: { clef, keySig, items: [{ n: w, d: 'w' }] },
    };
  });
}

// A written passage: step through its notes, the current one lit up.
// Tied-on notes are held, not played again, so they get no step.
function melodySteps(items, { keySig = 0, time = null, clef = 'treble', prompt = 'Play the **lit** note' } = {}) {
  const sounds = soundingNotes(items, keySig);
  return sounds
    .filter(({ index }) => {
      const prev = items.slice(0, index).findLast(it => it.n);
      return !prev?.tie;
    })
    .map(({ index, sounding }) => ({
      notes: sounding.map(stepNote),
      label: '?',
      reveal: sounding.map(prettyPitch).join('+'),
      prompt,
      staff: { clef, keySig, time, items: items.map((it, i) => (i === index ? { ...it, hl: true } : it)) },
    }));
}

// Quarter notes for a quick melody: 'C4 D4 E4 | F4 …' → staff items
const quarters = text => text.split(/\s+/).filter(Boolean).map(t => (t === '|' ? { bar: '|' } : { n: t, d: 'q' }));

const rhythm = (pattern, { bpm = 80, keySig = 0, time = [4, 4] } = {}) => ({
  type: 'rhythm',
  bpm,
  pattern,
  beatsPerBar: time[0] * (4 / time[1]),
  hideLane: true,
  staff: { keySig, time, items: [...patternToItems(pattern, keySig), { bar: '|.' }] },
});

const whole = (n, extra = {}) => ({ n, d: 'w', ...extra });

// ── Unit 1: the staff ────────────────────────────────────────────────────────

const unit1 = {
  title: 'The staff',
  lessons: [
    {
      id: 'sr-staff',
      title: 'Lines, spaces & the treble clef',
      theory: [
        'Music is written on a **staff**: five lines and the four spaces between them. Every line and every space is one note. The **higher** a note sits, the **higher** it sounds.',
        { staff: { items: [whole('E4'), whole('F4'), whole('G4'), whole('A4'), whole('B4'), whole('C5'), whole('D5'), whole('E5'), whole('F5')].map(it => ({ ...it, label: prettyPitch(it.n) })) }, caption: 'Going up the staff, line, space, line, space… is just the musical alphabet: E F G A B C D E F' },
        'The curly sign at the start is the **treble clef** 𝄞, also called the **G clef**. Its inner curl wraps around **line 2**, marking that line as **G** (your `H` key). Every other note is counted up or down from there.',
        'The treble clef is used for the **right hand**: the melody.',
        { tip: 'Each step up the staff (line → space or space → line) is one letter up, one white key to the right.' },
        'In the exercise the keys **glow**, so you can match each position on the staff to its key.',
      ],
      exercise: { type: 'steps', hint: 'glow', make: () => readSteps(['G4', 'A4', 'F4', 'G4', 'B4', 'E4', 'G4', 'A4', 'B4', 'F4']) },
    },
    {
      id: 'sr-lines',
      title: 'Line notes: E G B D F',
      theory: [
        'The five **lines**, from bottom to top, are **E G B D F**.',
        'Remember them with: **E**very **G**ood **B**oy **D**oes **F**ine.',
        { staff: { items: ['E4', 'G4', 'B4', 'D5', 'F5'].map(n => whole(n, { label: prettyPitch(n) })) }, caption: 'Line notes: the line runs through the middle of the notehead' },
        'On your keys: E = `F`, G = `H`, B = `K`, high D = `;`, high F = `Enter`.',
        'No glowing this time. Read the note, then press it. Two misses and the answer lights up.',
      ],
      exercise: { type: 'steps', hint: 'none', make: () => readSteps(randomSeq(['E4', 'G4', 'B4', 'D5', 'F5'], 15)) },
    },
    {
      id: 'sr-spaces',
      title: 'Space notes: F A C E',
      theory: [
        'The four **spaces**, from bottom to top, spell a word: **F A C E**.',
        { staff: { items: ['F4', 'A4', 'C5', 'E5'].map(n => whole(n, { label: prettyPitch(n) })) }, caption: 'Space notes: the notehead sits between two lines' },
        'On your keys: F = `G`, A = `J`, high C = `L`, high E = `\'`.',
        { tip: 'Look closely: if a line cuts through the notehead it is a line note. If the notehead fits between lines, it is a space note.' },
      ],
      exercise: { type: 'steps', hint: 'none', make: () => readSteps(randomSeq(['F4', 'A4', 'C5', 'E5'], 15)) },
    },
    {
      id: 'sr-ledger',
      title: 'Middle C & ledger lines',
      theory: [
        'Notes can go **below or above** the staff. They get their own short line called a **ledger line**.',
        '**Middle C** sits on **one ledger line below** the treble staff. That is your `S` key. **D** hangs just under the bottom line, in the space below it (`D` key).',
        { staff: { items: ['C4', 'D4', 'E4', 'F4', 'G4'].map(n => whole(n, { label: prettyPitch(n) })) }, caption: 'C D E F G: middle C on its ledger line, then D just below the staff' },
        'Higher notes use ledger lines above the staff the same way: A above the top line has one ledger line through it.',
      ],
      exercise: { type: 'steps', hint: 'none', make: () => readSteps(randomSeq(['C4', 'D4', 'E4', 'F4', 'G4'], 15)) },
    },
    {
      id: 'sr-all-treble',
      title: 'Every note, middle C to high F',
      theory: [
        'Time to mix them all: lines, spaces and middle C. That is the whole range your home row plays, from `S` to `Enter`.',
        { staff: { items: TREBLE_RANGE.map(n => whole(n, { label: prettyPitch(n) })) }, caption: 'Middle C up to high F' },
        { list: ['Lines: **E G B D F**', 'Spaces: **F A C E**', 'Ledger line below: **middle C**'] },
        { tip: 'Use landmarks: middle C (ledger line), G (the clef\'s curl, line 2), B (the middle line). Count from the nearest one.' },
      ],
      exercise: { type: 'steps', hint: 'none', make: () => readSteps(randomSeq(TREBLE_RANGE, 20)) },
    },
    {
      id: 'sr-shape',
      title: 'Reading by shape: steps & skips',
      theory: [
        'Good readers don\'t name every note. They read the **shape**:',
        { list: [
          '**Step**: line → next space (or space → next line). One key over.',
          '**Skip**: line → next line (or space → next space). Skip one key.',
          '**Same place**: repeat the note.',
        ] },
        { staff: { time: [4, 4], items: quarters('C4 D4 E4 F4 | G4 E4 C4 E4 | G4 G4 G4 G4') }, caption: 'Steps up, then skips down, then repeated notes' },
        'Read the first note, then just follow the ups and downs.',
      ],
      exercise: {
        type: 'steps',
        hint: 'none',
        make: () => melodySteps([...quarters('C4 D4 E4 F4 | G4 E4 C4 E4 | G4 F4 E4 D4 | C4 E4 G4 C5'), { bar: '|.' }], { time: [4, 4] }),
      },
    },
  ],
};

// ── Unit 2: rhythm ───────────────────────────────────────────────────────────

const valueQuestions = () => shuffle([
  { item: { n: 'G4', d: 'w' }, name: 'whole note', beats: '4' },
  { item: { n: 'G4', d: 'h' }, name: 'half note', beats: '2' },
  { item: { n: 'G4', d: 'q' }, name: 'quarter note', beats: '1' },
  { item: { n: 'G4', d: 'e' }, name: 'eighth note', beats: '½' },
]).flatMap(({ item, name, beats }) => [
  {
    prompt: 'What is this note called?',
    staff: { items: [item] },
    options: ['whole note', 'half note', 'quarter note', 'eighth note'],
    answer: name,
    why: 'Hollow without a stem = whole · hollow with a stem = half · filled = quarter · filled with a flag = eighth.',
  },
  {
    prompt: 'How many beats does it last (in 4/4)?',
    staff: { items: [item] },
    options: ['4', '2', '1', '½'],
    answer: beats,
    why: 'Whole = 4, half = 2, quarter = 1, eighth = ½.',
  },
]);

const restQuestions = () => shuffle([
  { r: 'w', name: 'whole rest', beats: 'a whole bar (4)' },
  { r: 'h', name: 'half rest', beats: '2' },
  { r: 'q', name: 'quarter rest', beats: '1' },
  { r: 'e', name: 'eighth rest', beats: '½' },
]).map(({ r, name }) => ({
  prompt: 'Which rest is this?',
  staff: { items: [{ bar: '|' }, { r }, { bar: '|' }] },
  options: ['whole rest', 'half rest', 'quarter rest', 'eighth rest'],
  answer: name,
  why: 'Whole rest **hangs** below line 4 · half rest **sits** on the middle line · quarter = squiggle · eighth = a "7".',
})).concat([
  {
    prompt: 'This bar is in 4/4. How many beats of **silence** are in it?',
    staff: { time: [4, 4], items: [{ n: 'C5', d: 'q' }, { r: 'q' }, { r: 'h' }, { bar: '|' }] },
    options: ['1', '2', '3', '4'],
    answer: '3',
    why: 'Quarter rest (1) + half rest (2) = 3 beats of silence.',
  },
  {
    prompt: 'How many beats of silence here?',
    staff: { time: [4, 4], items: [{ r: 'h' }, { r: 'q' }, { r: 'e' }, { n: 'F4', d: 'e' }, { bar: '|' }] },
    options: ['2', '3', '3½', '4'],
    answer: '3½',
    why: 'Half (2) + quarter (1) + eighth (½) = 3½. This is bar 4 of your Namo Namo sheet!',
  },
]);

const timeQuestions = () => [
  {
    prompt: 'How many beats are in each bar of this music?',
    staff: { time: [3, 4], items: quarters('C4 E4 G4 | G4 E4 C4') },
    options: ['2', '3', '4', '6'],
    answer: '3',
    why: 'The **top** number of the time signature is the number of beats in a bar.',
  },
  {
    prompt: 'In **4/4**, what does the bottom **4** mean?',
    staff: { time: [4, 4], items: [{ r: 'w' }, { bar: '|' }] },
    options: ['a quarter note gets one beat', 'there are 4 bars', 'play 4 times faster', 'the 4th note is loud'],
    answer: 'a quarter note gets one beat',
    why: 'Bottom number = which note counts as one beat: 4 = quarter note, 8 = eighth note, 2 = half note.',
  },
  {
    prompt: 'This bar is in 4/4 but is **one note short**. Which note completes it?',
    staff: { time: [4, 4], items: [{ n: 'E4', d: 'h' }, { n: 'G4', d: 'q' }, { bar: '|' }] },
    options: ['whole note', 'half note', 'quarter note', 'eighth note'],
    answer: 'quarter note',
    why: 'Half (2) + quarter (1) = 3. One more beat makes 4, so a quarter note.',
  },
  {
    prompt: 'What separates one bar from the next?',
    staff: { time: [4, 4], items: [...quarters('C4 D4 E4 F4'), { bar: '|' }, ...quarters('G4 A4 B4 C5'), { bar: '|.' }] },
    options: ['a bar line', 'a ledger line', 'a tie', 'a clef'],
    answer: 'a bar line',
    why: 'The thin vertical lines are **bar lines**. The thin + thick pair at the end is the **final** bar line.',
  },
  {
    prompt: 'Your Namo Namo sheet switches to **6/4**. How many beats are in each bar then?',
    staff: { time: [6, 4], items: [{ n: 'G4', d: 'h', dot: true }, { n: 'G4', d: 'h', dot: true }, { bar: '|' }] },
    options: ['4', '6', '8', '12'],
    answer: '6',
    why: '6/4 = six quarter-note beats per bar. Two dotted halves (3 + 3) fill it.',
  },
  {
    prompt: 'Does this bar add up correctly in 4/4?',
    staff: { time: [4, 4], items: [{ n: 'C5', d: 'h' }, { n: 'A4', d: 'h' }, { n: 'F4', d: 'q' }, { bar: '|' }] },
    options: ['yes, 4 beats', 'no, it has 5 beats', 'no, it has 3 beats'],
    answer: 'no, it has 5 beats',
    why: '2 + 2 + 1 = 5. One beat too many for 4/4.',
  },
];

const dotQuestions = () => [
  { item: { n: 'G4', d: 'h', dot: true }, answer: '3', why: 'A dot adds half the note\'s value: 2 + 1 = **3**.' },
  { item: { n: 'G4', d: 'q', dot: true }, answer: '1½', why: 'A dot adds half: 1 + ½ = **1½**.' },
  { item: { n: 'G4', d: 'e', dot: true }, answer: '¾', why: 'A dot adds half: ½ + ¼ = **¾**.' },
].map(({ item, answer, why }) => ({
  prompt: 'How many beats does this **dotted** note last?',
  staff: { items: [item] },
  options: ['¾', '1½', '2', '3'],
  answer,
  why,
})).concat([
  {
    prompt: 'These two notes are **tied**. How long do you hold the G?',
    staff: { time: [4, 4], items: [{ n: 'C4', d: 'h' }, { n: 'G4', d: 'h', tie: true }, { bar: '|' }, { n: 'G4', d: 'q' }, { n: 'E4', d: 'q' }, { n: 'C4', d: 'h' }, { bar: '|' }] },
    options: ['2 beats, then play it again', '3 beats, played once', '1 beat'],
    answer: '3 beats, played once',
    why: 'A tie joins two notes of the **same pitch**: play once and hold for both (2 + 1 = 3). Ties let a note cross a bar line.',
  },
  {
    prompt: 'What is the difference between a **tie** and a **slur**?',
    options: ['a tie joins the same pitch, a slur joins different pitches', 'they are the same thing', 'a tie makes notes louder'],
    answer: 'a tie joins the same pitch, a slur joins different pitches',
    why: 'Tie = same note, hold it. Slur = different notes, play them smoothly connected.',
  },
]);

const unit2 = {
  title: 'Rhythm',
  lessons: [
    {
      id: 'sr-note-values',
      title: 'Whole, half, quarter & eighth notes',
      theory: [
        'Where a note sits tells you **which** key. Its **shape** tells you **how long** to hold it.',
        { staff: { items: [
          { n: 'G4', d: 'w', label: '4' }, { n: 'G4', d: 'h', label: '2' }, { n: 'G4', d: 'q', label: '1' }, { n: 'G4', d: 'e', label: '½' },
        ] }, caption: 'Whole (4 beats) · half (2) · quarter (1) · eighth (½)' },
        { list: [
          '**Whole note**: hollow oval, no stem: **4 beats**',
          '**Half note**: hollow with a stem: **2 beats**',
          '**Quarter note**: filled with a stem: **1 beat**',
          '**Eighth note**: filled, stem and a **flag**: **½ beat**',
        ] },
        'Each one is **half as long** as the one before.',
        { tip: 'Stems can point up or down. That just keeps the page tidy (notes below the middle line usually have stems up) and doesn\'t change the sound.' },
      ],
      exercise: { type: 'choice', make: valueQuestions },
    },
    {
      id: 'sr-time-sig',
      title: 'Time signatures & bars',
      theory: [
        'Music is chopped into **bars** (also called measures) by **bar lines**. The **time signature**, two stacked numbers after the clef, says what fits in each bar:',
        { list: [
          '**Top number**: how many beats in a bar.',
          '**Bottom number**: which note gets one beat (4 = quarter note, 8 = eighth note).',
        ] },
        { staff: { time: [4, 4], items: [...quarters('C4 E4 G4 E4'), { bar: '|' }, { n: 'C4', d: 'h' }, { n: 'G4', d: 'h' }, { bar: '|' }, { n: 'C5', d: 'w' }, { bar: '|.' }] }, caption: '4/4: every bar adds up to 4 beats' },
        { list: ['**4/4**: 4 beats, the most common ("common time")', '**3/4**: 3 beats, a waltz', '**6/4**: 6 beats, used in your Namo Namo sheet', '**6/8**: 6 eighth notes, felt in two swaying groups'] },
        { tip: 'Every bar must add up to the top number. If a bar seems short, look for rests.' },
      ],
      exercise: { type: 'choice', make: timeQuestions },
    },
    {
      id: 'sr-read-rhythm',
      title: 'Play a written rhythm',
      theory: [
        'Now play straight from the staff, **in time**. No note boxes, just the music.',
        'The app counts in 4 clicks, then keeps the beat. The next key glows to help you at first, but try to read the **lengths** from the staff: hold half notes for 2 clicks and the whole note for 4.',
        { tip: 'Press **Listen first** to hear how it should sound.' },
      ],
      exercise: rhythm('C C D/2 | E E D/2 | E F G/2 | C/4', { bpm: 76 }),
    },
    {
      id: 'sr-rests',
      title: 'Rests: written silence',
      theory: [
        'A **rest** is a beat of silence. Every note length has a matching rest:',
        { staff: { items: [{ bar: '|' }, { r: 'w', label: 'whole' }, { bar: '|' }, { r: 'h', label: 'half' }, { r: 'q', label: '¼' }, { r: 'e', label: '⅛' }] }, caption: 'Whole rest · half rest · quarter rest · eighth rest' },
        { list: [
          '**Whole rest**: a block **hanging** from line 4. Means a whole bar of silence.',
          '**Half rest**: a block **sitting** on the middle line: 2 beats. (Think: a hat sits on your head.)',
          '**Quarter rest**: the squiggle: 1 beat.',
          '**Eighth rest**: looks like a "7": ½ beat.',
        ] },
        'Rests count just as much as notes. Keep counting in your head while you\'re silent.',
      ],
      exercise: { type: 'choice', make: restQuestions },
    },
    {
      id: 'sr-rests-play',
      title: 'Play rhythms with rests',
      theory: [
        'Play this one in time and **lift your finger** on every rest. The clicks keep going while you wait.',
        { tip: 'Count out loud: "1 2 3 4". On a rest, still say the number, just don\'t play.' },
      ],
      exercise: rhythm('C E G r | G E C r | E r E r | C/2 r/2', { bpm: 80 }),
    },
    {
      id: 'sr-eighths',
      title: 'Eighth notes, flags & beams',
      theory: [
        'Two eighth notes fit in **one beat**. Alone, an eighth note has a **flag**. In a group, the flags join into a thick **beam**.',
        { staff: { time: [4, 4], items: [{ n: 'G4', d: 'e' }, { gap: 6 }, { n: 'E4', d: 'e', beam: 's' }, { n: 'F4', d: 'e', beam: 'e' }, { n: 'G4', d: 'e', beam: 's' }, { n: 'A4', d: 'e', beam: 'e' }, { n: 'B4', d: 'q' }, { bar: '|' }] }, caption: 'A flagged eighth, then beamed pairs: each pair = 1 beat' },
        'Beams are grouped **by beat**, so you can see where each beat starts. Count eighths as **"1 and 2 and 3 and 4 and"**.',
        { tip: 'Two flags (or two beams) = a sixteenth note, ¼ beat. Four of them fit in one beat.' },
      ],
      exercise: rhythm('C C D/0.5 D/0.5 E | G/0.5 F/0.5 E/0.5 D/0.5 C/2 | E/0.5 E/0.5 E E/0.5 E/0.5 E | G/0.5 F/0.5 E/0.5 D/0.5 C/2', { bpm: 72 }),
    },
    {
      id: 'sr-dots-ties',
      title: 'Dots & ties',
      theory: [
        'Two ways to make a note longer:',
        { list: [
          'A **dot** after a note adds **half** of its value. Dotted half = 2 + 1 = **3 beats**. Dotted quarter = 1 + ½ = **1½**.',
          'A **tie** (a curve joining two notes of the **same pitch**) means play once and hold for both. Ties let a note last across a bar line.',
        ] },
        { staff: { time: [4, 4], items: [{ n: 'G4', d: 'h', dot: true, label: '3' }, { n: 'F4', d: 'q', label: '1' }, { bar: '|' }, { n: 'G4', d: 'h', tie: true, label: '2 +' }, { n: 'G4', d: 'h', label: '2 = 4' }, { bar: '|' }] }, caption: 'Dotted half + quarter, then a tie: the G is held for all 4 beats' },
        'Your Namo Namo sheet is full of both: the long G♯ is a **dotted half** (3 beats), and the long E\'s were notes **tied** across bars.',
      ],
      exercise: { type: 'choice', make: dotQuestions },
    },
    {
      id: 'sr-dots-play',
      title: 'Play dotted rhythms',
      theory: [
        'A waltz in **3/4**: three beats per bar. Hold each dotted half for **all 3** clicks, and feel the dotted quarter + eighth as "long-short".',
      ],
      exercise: rhythm('C E G | G/3 | F/1.5 E/0.5 D | C/3', { bpm: 84, time: [3, 4] }),
    },
  ],
};

// ── Unit 3: sharps, flats & naturals ─────────────────────────────────────────

const keySigQuestions = () => shuffle([
  [1, 'G major', 'F♯'], [2, 'D major', 'F♯ C♯'], [3, 'A major', 'F♯ C♯ G♯'], [4, 'E major', 'F♯ C♯ G♯ D♯'],
  [-1, 'F major', 'B♭'], [-2, 'B♭ major', 'B♭ E♭'], [-3, 'E♭ major', 'B♭ E♭ A♭'],
]).flatMap(([keySig, key, accs], i) => [
  {
    prompt: 'Which notes does this key signature change?',
    staff: { keySig, items: [{ gap: 30 }] },
    options: keySig > 0 ? ['F♯', 'F♯ C♯', 'F♯ C♯ G♯', 'F♯ C♯ G♯ D♯'] : ['B♭', 'B♭ E♭', 'B♭ E♭ A♭', 'B♭ E♭ A♭ D♭'],
    answer: accs,
    why: keySig > 0 ? 'Sharps always come in the order **F C G D A E B**. Count them and take that many.' : 'Flats always come in the order **B E A D G C F**. Count them and take that many.',
  },
  ...(i < 4 ? [{
    prompt: 'Which **major key** has this key signature?',
    staff: { keySig, items: [{ gap: 30 }] },
    options: [key, ...shuffle(['C major', 'G major', 'D major', 'A major', 'E major', 'F major', 'B♭ major'].filter(o => o !== key)).slice(0, 3)].sort(),
    answer: key,
    why: keySig > 0 ? 'Sharp keys: the key is a **half step above the last sharp**.' : 'Flat keys: the key is the **second-to-last flat** (one flat = F major).',
  }] : []),
]);

const unit3 = {
  title: 'Sharps, flats & naturals',
  lessons: [
    {
      id: 'sr-accidentals',
      title: 'Sharps & flats on the staff',
      theory: [
        'A **sharp ♯** in front of a note raises it to the next key **right**. A **flat ♭** lowers it to the next key **left**.',
        { staff: { items: [whole('F4', { label: 'F' }), whole('F#4', { label: 'F♯' }), { gap: 6 }, whole('B4', { label: 'B' }), whole('Bb4', { label: 'B♭' }), { gap: 6 }, whole('E4', { label: 'E' }), whole('Eb4', { label: 'E♭' })] }, caption: 'The sign sits on the same line or space as the note it changes' },
        'The sign is written **before** the note but you read it **with** the note. "♯ then F" means **F♯**.',
        'Black keys on your keyboard: C♯ `E`, D♯ `R`, F♯ `Y`, G♯ `U`, A♯ `I` (and high C♯ `P`, high D♯ `[`).',
        { tip: 'Every black key has two names: F♯ = G♭, C♯ = D♭, and so on.' },
      ],
      exercise: { type: 'steps', hint: 'none', make: () => readSteps(randomSeq(['F#4', 'C#5', 'G#4', 'Bb4', 'Eb4', 'D#5', 'Ab4', 'Db5', 'C#4', 'Gb4'], 16)) },
    },
    {
      id: 'sr-naturals',
      title: 'The natural sign & the bar rule',
      theory: [
        'Two rules decide whether a note is sharp:',
        { list: [
          'An accidental lasts **until the end of the bar**. A second F in the same bar is still F♯, even without a sign.',
          'The **natural ♮** cancels a sharp or flat: back to the white key.',
        ] },
        { staff: { time: [4, 4], items: [
          { n: 'F#4', d: 'q', label: 'F♯' }, { n: 'G4', d: 'q', label: 'G' }, { n: 'F4', d: 'q', label: 'F♯!' }, { n: 'Fn4', d: 'q', label: 'F' }, { bar: '|' },
          { n: 'F4', d: 'q', label: 'F' }, { n: 'E4', d: 'q', label: 'E' }, { n: 'F#4', d: 'h', label: 'F♯' }, { bar: '|' },
        ] }, caption: 'The third note has no sign but is still F♯ (same bar). The ♮ cancels it. In the new bar everything resets.' },
        'In the exercise each note lights up in turn. Watch for signs earlier in the **same bar**!',
      ],
      exercise: {
        type: 'steps',
        hint: 'none',
        make: () => melodySteps([
          { n: 'F#4', d: 'q' }, { n: 'G4', d: 'q' }, { n: 'F4', d: 'q' }, { n: 'E4', d: 'q' }, { bar: '|' },
          { n: 'F4', d: 'q' }, { n: 'G4', d: 'q' }, { n: 'Bb4', d: 'q' }, { n: 'A4', d: 'q' }, { bar: '|' },
          { n: 'B4', d: 'q' }, { n: 'C#5', d: 'q' }, { n: 'C5', d: 'q' }, { n: 'Cn5', d: 'q' }, { bar: '|' },
          { n: 'C5', d: 'q' }, { n: 'G#4', d: 'q' }, { n: 'A4', d: 'q' }, { n: 'G4', d: 'q' }, { bar: '|.' },
        ], { time: [4, 4] }),
      },
    },
    {
      id: 'sr-key-sigs',
      title: 'Key signatures',
      theory: [
        'Instead of writing ♯ before every F, music puts the sharps (or flats) **once, right after the clef**. This is the **key signature**. It applies to that letter **in every octave, for the whole piece**.',
        'Each sharp sits **on the line or space of the note it changes**. Your Namo Namo sheet has four:',
        { staff: { keySig: 4, items: [{ gap: 10 }, whole('F5', { label: 'F' }), whole('C5', { label: 'C' }), whole('G4', { label: 'G' }), whole('D5', { label: 'D' })] }, caption: 'Four sharps: on the F line, C space, G space (above the staff) and D line → F♯ C♯ G♯ D♯' },
        { list: [
          'Sharps always arrive in the order **F C G D A E B** ("Father Charles Goes Down And Ends Battle").',
          'Flats always arrive in the order **B E A D G C F** (the same, backwards).',
          'So just **count** them: 4 sharps = F♯ C♯ G♯ D♯.',
        ] },
        { tip: 'Naming the key: for sharps, go a half step **above the last sharp** (D♯ → **E major**). For flats, the **second-to-last flat** is the key (B♭ E♭ → **B♭ major**).' },
      ],
      exercise: { type: 'choice', make: keySigQuestions },
    },
    {
      id: 'sr-key-sig-play',
      title: 'Playing in a key',
      theory: [
        'Now read notes **with** a key signature. The note has **no sign of its own**, so check the key signature to see if it is sharp or flat.',
        { staff: { keySig: 1, items: [whole('F4', { label: 'F♯!' }), whole('G4', { label: 'G' }), whole('F5', { label: 'F♯!' })] }, caption: 'G major (one sharp): every F is F♯, low or high' },
        'The exercise mixes **G major** (F♯), **D major** (F♯ C♯), **F major** (B♭) and **E major** (F♯ C♯ G♯ D♯, your Namo Namo key).',
      ],
      exercise: {
        type: 'steps',
        hint: 'none',
        make: () => shuffle([
          ...['F4', 'G4', 'D5', 'B4', 'E4', 'F4'].map(n => [1, n]),
          ...['C5', 'F4', 'D4', 'A4', 'C4'].map(n => [2, n]),
          ...['B4', 'A4', 'F4', 'C5'].map(n => [-1, n]),
          ...['G4', 'D5', 'E4', 'C5', 'F4', 'B4'].map(n => [4, n]),
        ]).flatMap(([keySig, n]) => readSteps([n], { keySig, prompt: 'Play the note: check the key signature!' })),
      },
    },
  ],
};

// ── Unit 4: reading real music ───────────────────────────────────────────────

// Namo Namo, bars 5–6 of the user's first Songscription sheet, as written
const NAMO_BARS = [
  { n: 'G4', d: 'q', above: 'F♯m7' }, { n: 'F4', d: 'e' }, { n: 'F4', d: 'q' }, { n: 'E4', d: 'e' }, { n: 'F4', d: 'q', tie: true }, { n: 'F4', d: 'q', dot: true }, { n: 'E4', d: 'e' }, { bar: '|' },
  { n: 'F4', d: 'q', dot: true, tie: true, above: 'A' }, { n: 'F4', d: 'q' }, { n: 'E4', d: 'e' }, { n: 'F4', d: 'q', dot: true, tie: true, above: 'B' }, { n: 'F4', d: 'q' }, { n: 'G4', d: 'e' }, { bar: '|' },
];

const unit4 = {
  title: 'Reading real music',
  lessons: [
    {
      id: 'sr-ode',
      title: 'Read a melody: Ode to Joy',
      theory: [
        'Your first full melody read straight from the staff. Each note lights up in turn. Read it, press it.',
        { staff: { time: [4, 4], items: [...quarters('E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4'), { n: 'E4', d: 'q', dot: true }, { n: 'D4', d: 'e' }, { n: 'D4', d: 'h' }, { bar: '|.' }] }, caption: 'Ode to Joy, first line' },
        { tip: 'Read the **shape**: it is almost all steps. Find the first note, then follow the ups and downs.' },
      ],
      exercise: {
        type: 'steps',
        hint: 'none',
        make: () => melodySteps([
          ...quarters('E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4'), { n: 'E4', d: 'q', dot: true }, { n: 'D4', d: 'e' }, { n: 'D4', d: 'h' }, { bar: '|' },
          ...quarters('E4 E4 F4 G4 | G4 F4 E4 D4 | C4 C4 D4 E4'), { n: 'D4', d: 'q', dot: true }, { n: 'C4', d: 'e' }, { n: 'C4', d: 'h' }, { bar: '|.' },
        ], { time: [4, 4] }),
      },
    },
    {
      id: 'sr-twinkle-time',
      title: 'Read & play in time: Twinkle',
      theory: [
        'Pitch **and** rhythm together, just from the staff: quarter notes for one beat, the half note at the end of each line for two.',
        { tip: 'Look a note ahead while you play. Your eyes should always be slightly in front of your fingers.' },
      ],
      exercise: rhythm('C C G G | A A G/2 | F F E E | D D C/2 | G G F F | E E D/2 | G G F F | E E D/2 | C C G G | A A G/2 | F F E E | D D C/2', { bpm: 84 }),
    },
    {
      id: 'sr-namo',
      title: 'Your song: Namo Namo (as written)',
      theory: [
        'Here are **bars 5–6 of your Songscription sheet**, exactly as written: in **6/4**, with **four sharps** in the key signature.',
        { staff: { keySig: 4, time: [6, 4], items: NAMO_BARS }, caption: 'Namo Namo, bars 5–6' },
        'Before you play, decode it:',
        { list: [
          'The notes sit on G, F and E, but the key signature makes **G → G♯ (`U`)** and **F → F♯ (`Y`)**. E stays E (`F`).',
          'The curves are **ties**: hold the note on, don\'t press it again. The exercise skips tied-on notes for you.',
          'The letters on top (F♯m7, A, B) are the **chords** the left hand plays underneath.',
        ] },
      ],
      exercise: { type: 'steps', hint: 'none', make: () => melodySteps(NAMO_BARS, { keySig: 4, time: [6, 4], prompt: 'Play the **lit** note (remember the 4 sharps!)' }) },
    },
  ],
};

// ── Unit 5: bass clef & grand staff ──────────────────────────────────────────

const BASS_RANGE = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3'];

const grandQuestions = () => shuffle([
  { upper: [{ n: 'C4', d: 'w' }], lower: [{ gap: 20 }], answer: 'middle C', why: 'One ledger line **below** the treble staff is middle C.' },
  { upper: [{ gap: 20 }], lower: [{ n: 'C4', d: 'w' }], answer: 'middle C', why: 'One ledger line **above** the bass staff is middle C too. Same key, written on the other staff.' },
  { upper: [{ n: 'G4', d: 'w' }], lower: [{ gap: 20 }], answer: 'G', why: 'Treble line 2 (where the clef curls) is G.' },
  { upper: [{ gap: 20 }], lower: [{ n: 'F3', d: 'w' }], answer: 'F', why: 'Bass line 4, between the clef\'s two dots, is F.' },
  { upper: [{ gap: 20 }], lower: [{ n: 'A3', d: 'w' }], answer: 'A', why: 'Bass top line is A ("**A**ll **C**ows **E**at **G**rass" for the spaces, "**G**ood **B**oys **D**o **F**ine **A**lways" for the lines).' },
  { upper: [{ n: 'E5', d: 'w' }], lower: [{ gap: 20 }], answer: 'E', why: 'Treble top space: F A C **E**.' },
]).map(({ upper, lower, answer, why }) => ({
  prompt: 'Which note is written here?',
  staff: { items: upper, lower },
  options: ['middle C', 'E', 'F', 'G', 'A'],
  answer,
  why,
})).concat([
  {
    prompt: 'On a grand staff, which hand usually plays the **bottom** staff?',
    staff: { items: [{ n: 'E4', d: 'h' }, { n: 'G4', d: 'h' }], lower: [{ n: 'C3', d: 'w' }] },
    options: ['left hand', 'right hand', 'both hands'],
    answer: 'left hand',
    why: 'Top staff (treble) = right hand, melody. Bottom staff (bass) = left hand, bass notes and chords.',
  },
  {
    prompt: 'What joins the two staves of a piano part?',
    staff: { items: [{ n: 'C5', d: 'w' }], lower: [{ n: 'C3', d: 'w' }] },
    options: ['a brace', 'a tie', 'a beam', 'a bar line only'],
    answer: 'a brace',
    why: 'The curly **brace** `{` on the left says "these two staves are played together by one player".',
  },
]);

const unit5 = {
  title: 'Bass clef & the grand staff',
  lessons: [
    {
      id: 'sr-bass-clef',
      title: 'The bass clef',
      theory: [
        'The left hand reads the **bass clef** 𝄢, also called the **F clef**. Its two dots sit either side of **line 4**, marking it as the **F below middle C**.',
        { staff: { clef: 'bass', items: BASS_RANGE.map(n => whole(n, { label: prettyPitch(n) })) }, caption: 'Bass clef: C D E F G A B, the octave below middle C' },
        { list: [
          'Lines, bottom to top: **G B D F A**, "**G**ood **B**oys **D**o **F**ine **A**lways".',
          'Spaces, bottom to top: **A C E G**, "**A**ll **C**ows **E**at **G**rass".',
        ] },
        'These notes are an **octave lower** than your home row. Press `Z` once when asked, and then `S`…`K` play C D E F G A B down there.',
        { tip: 'The bass clef is the treble clef shifted: the same line holds a different letter. Bass line 1 is G, treble line 1 is E.' },
      ],
      exercise: { type: 'steps', hint: 'none', make: () => readSteps(randomSeq(BASS_RANGE, 16), { clef: 'bass' }) },
    },
    {
      id: 'sr-grand-staff',
      title: 'The grand staff & middle C',
      theory: [
        'Piano music uses a **grand staff**: treble on top (right hand), bass below (left hand), joined by a **brace**.',
        { staff: { items: [{ n: 'C4', d: 'w', label: 'C' }, { n: 'E4', d: 'w', label: 'E' }, { n: 'G4', d: 'w', label: 'G' }], lower: [{ n: 'C3', d: 'w', label: 'C' }, { n: 'G3', d: 'w', label: 'G' }, { n: 'C4', d: 'w', label: 'C' }] }, caption: 'Middle C can be written in either staff: one ledger line below treble, or one above bass' },
        '**Middle C** sits exactly between them. It can be written on either staff, and it is the same key.',
        'Your Songscription sheets are grand staffs: the top staff is the melody we put in the app, the bottom staff is the left-hand bass.',
      ],
      exercise: { type: 'choice', make: grandQuestions },
    },
  ],
};

// ── Unit 6: symbols & expression ─────────────────────────────────────────────

const dynamicsQuestions = () => shuffle([
  ['pp', 'very soft'], ['p', 'soft'], ['mp', 'medium soft'], ['mf', 'medium loud'], ['f', 'loud'], ['ff', 'very loud'],
]).map(([dyn, meaning]) => ({
  prompt: 'How loud should this be played?',
  staff: { items: [{ n: 'E4', d: 'h', dyn }, { n: 'G4', d: 'h' }, { bar: '|' }] },
  options: ['very soft', 'soft', 'medium soft', 'medium loud', 'loud', 'very loud'],
  answer: meaning,
  why: '**p** = piano (soft), **f** = forte (loud), **m** = mezzo (medium). Doubling makes it "very".',
})).concat([
  {
    prompt: 'What does this wedge under the notes mean?',
    staff: { items: [...quarters('C4 E4 G4 C5'), { bar: '|' }], hairpins: [{ from: 0, to: 3, type: '<' }] },
    options: ['get gradually louder', 'get gradually softer', 'play faster', 'hold the notes'],
    answer: 'get gradually louder',
    why: 'A wedge opening to the right `<` is a **crescendo**: get louder. Closing `>` is a **diminuendo**: get softer.',
  },
  {
    prompt: 'And this wedge?',
    staff: { items: [...quarters('C5 G4 E4 C4'), { bar: '|' }], hairpins: [{ from: 0, to: 3, type: '>' }] },
    options: ['get gradually louder', 'get gradually softer', 'play faster', 'hold the notes'],
    answer: 'get gradually softer',
    why: 'Closing wedge `>` = **diminuendo** (decrescendo): get softer.',
  },
]);

const articulationQuestions = () => shuffle([
  { item: { n: 'G4', d: 'q', art: 'stacc' }, answer: 'short and detached (staccato)', why: 'A **dot above or below** the notehead (not after it) = **staccato**: short and bouncy.' },
  { item: { n: 'G4', d: 'q', art: 'accent' }, answer: 'stressed, a bit louder (accent)', why: 'The **>** sign is an **accent**: hit that note harder than the others.' },
  { item: { n: 'G4', d: 'h', art: 'fermata' }, answer: 'hold longer than written (fermata)', why: 'The "bird\'s eye" **fermata** means pause on the note as long as feels right.' },
]).map(({ item, answer, why }) => ({
  prompt: 'What does the mark on this note mean?',
  staff: { items: [item, { bar: '|' }] },
  options: ['short and detached (staccato)', 'stressed, a bit louder (accent)', 'hold longer than written (fermata)', 'play it twice'],
  answer,
  why,
})).concat([
  {
    prompt: 'Where is the dot of a **dotted** note, compared with a **staccato** dot?',
    staff: { items: [{ n: 'G4', d: 'q', dot: true, label: 'A' }, { gap: 10 }, { n: 'G4', d: 'q', art: 'stacc', label: 'B' }, { bar: '|' }] },
    options: ['A (beside) = longer · B (above/below) = shorter', 'they mean the same thing', 'A = louder · B = softer'],
    answer: 'A (beside) = longer · B (above/below) = shorter',
    why: 'Dot **beside** the head adds half the length. Dot **above or below** the head makes it short (staccato).',
  },
]);

const structureQuestions = () => shuffle([
  {
    prompt: 'What does **♩ = 180** at the top of your Namo Namo sheet mean?',
    options: ['180 quarter-note beats per minute', 'the song lasts 180 seconds', 'play 180 notes', 'the 180th bar'],
    answer: '180 quarter-note beats per minute',
    why: 'It is the **tempo**: how many beats per minute. 180 is fast, 3 beats every second.',
  },
  {
    prompt: 'A chord symbol says **F♯m7**. What kind of chord is it?',
    options: ['F♯ minor seventh', 'F♯ major', 'F♯ played 7 times', 'F♯ for 7 beats'],
    answer: 'F♯ minor seventh',
    why: '**m** = minor, **7** = add the seventh. Letter alone (A, B, E) = a major chord.',
  },
  {
    prompt: 'The chord symbol **E/G♯** means…',
    options: ['an E chord with G♯ as the lowest note', 'play E then G♯', 'E or G♯, your choice', 'E divided by G♯'],
    answer: 'an E chord with G♯ as the lowest note',
    why: 'A **slash chord**: chord name / bass note. The left hand plays G♯ under an E major chord.',
  },
  {
    prompt: 'What do these signs at both ends of the bars mean?',
    staff: { items: [{ bar: '|:' }, ...quarters('C4 E4 G4 E4'), { bar: '|' }, { n: 'C4', d: 'w' }, { bar: ':|' }] },
    options: ['repeat the section between them', 'the end of the piece', 'play softly', 'change the key'],
    answer: 'repeat the section between them',
    why: 'Bar lines with **two dots** are **repeat signs**: play the part between them twice.',
  },
  {
    prompt: 'What does a thin line + thick line at the end mean?',
    staff: { items: [...quarters('G4 E4 D4 C4'), { bar: '|.' }] },
    options: ['the end of the piece', 'repeat from the start', 'a new section begins', 'pause briefly'],
    answer: 'the end of the piece',
    why: 'That is the **final bar line**. Two **thin** lines (a double bar) mark the end of a section instead.',
  },
  {
    prompt: 'On your Songscription sheet, what is the **teal** vertical line?',
    options: ['where the audio clip ended (not a music symbol)', 'a repeat sign', 'a very loud bar line', 'the key change'],
    answer: 'where the audio clip ended (not a music symbol)',
    why: 'Songscription draws it to show where the transcribed audio stopped. Real sheet music doesn\'t have it.',
  },
]);

const unit6 = {
  title: 'Symbols & expression',
  lessons: [
    {
      id: 'sr-dynamics',
      title: 'Dynamics: loud & soft',
      theory: [
        '**Dynamics** tell you how loud to play. They are Italian words, shortened to bold italic letters under the staff:',
        { list: [
          '***pp*** pianissimo: very soft', '***p*** piano: soft', '***mp*** mezzo-piano: medium soft',
          '***mf*** mezzo-forte: medium loud', '***f*** forte: loud', '***ff*** fortissimo: very loud',
        ] },
        { staff: { items: [{ n: 'C4', d: 'q', dyn: 'p' }, { n: 'E4', d: 'q' }, { n: 'G4', d: 'q' }, { n: 'C5', d: 'q' }, { bar: '|' }, { n: 'C5', d: 'w', dyn: 'f' }, { bar: '|' }] }, caption: 'Start soft (p), then loud (f)' },
        'Wedges called **hairpins** change the volume gradually: `<` crescendo (get louder), `>` diminuendo (get softer).',
        'Your Namo Namo sheet starts ***mf*** and the second one drops to ***mp***.',
      ],
      exercise: { type: 'choice', make: dynamicsQuestions },
    },
    {
      id: 'sr-articulation',
      title: 'Articulation: how to play each note',
      theory: [
        'Small marks on a note change **how** it is played:',
        { staff: { items: [{ n: 'G4', d: 'q', art: 'stacc', label: 'staccato' }, { gap: 18 }, { n: 'G4', d: 'q', art: 'accent', label: 'accent' }, { gap: 18 }, { n: 'G4', d: 'h', art: 'fermata', label: 'fermata' }, { bar: '|' }] } },
        { list: [
          '**Staccato** (dot above or below the head): short and detached.',
          '**Accent** (>): stress the note, a bit louder.',
          '**Fermata** (bird\'s eye 𝄐): hold it longer than written, a pause.',
          '**Slur** (curve over *different* notes): play smoothly connected. Don\'t confuse it with a **tie** (same note).',
        ] },
      ],
      exercise: { type: 'choice', make: articulationQuestions },
    },
    {
      id: 'sr-signposts',
      title: 'Tempo, chords & repeat signs',
      theory: [
        'The last few signposts on a page:',
        { list: [
          '**♩ = 180**: the **tempo**, beats per minute.',
          '**Chord symbols** above the staff: **A** = A major, **F♯m** = F♯ minor, **F♯m7** = minor seventh, **E/G♯** = E chord with G♯ in the bass.',
          '**Repeat signs**: bar lines with two dots. Play the section between them twice.',
          '**Double bar** (two thin lines): end of a section. **Final bar** (thin + thick): end of the piece.',
        ] },
        { staff: { items: [{ bar: '|:' }, { n: 'E4', d: 'h', above: 'C' }, { n: 'G4', d: 'h' }, { bar: '|' }, { n: 'F4', d: 'h', above: 'F' }, { n: 'A4', d: 'h' }, { bar: ':|' }, { n: 'C5', d: 'w', above: 'C' }, { bar: '|.' }] }, caption: 'Repeat the first two bars, then end on C' },
      ],
      exercise: { type: 'choice', make: structureQuestions },
    },
  ],
};

export const SHEET_UNITS = [unit1, unit2, unit3, unit4, unit5, unit6];

export const SHEET_LESSONS = SHEET_UNITS.flatMap((unit, u) =>
  unit.lessons.map((lesson, l) => ({ ...lesson, num: `${u + 1}.${l + 1}`, unit: u }))
);
