import { describe, it, expect } from 'vitest';
import { LESSONS, UNITS } from './curriculum.js';
import { parseRhythm, slotsOf, totalBeats } from './rhythm.js';
import { isDMajor } from '../data/dChord.js';
import { makeRounds, SEMI } from '../ear/rounds.js';

const OTHER_IDS = ["keys","alphabet","fingers","note-finder","beat","long-notes","rests","eighths","half-whole","steps-skips","c-position","c-major","sharps-flats","g-major","c-chord","major-minor","i-iv-v","scale-degrees","f-major","d-major","key-signatures","natural-minor","relative-minor","harmonic-minor","melodic-minor","pentatonic","chromatic","chord-qualities","build-triads","diatonic-triads","inversions","sus-chords","seventh-chords","pop-progression","minor-progression","ii-v-i","arpeggios","chords-of-c","chords-of-cs","chords-of-d","chords-of-eb","chords-of-e","chords-of-f","chords-of-fs","chords-of-g","chords-of-ab","chords-of-a","chords-of-bb","chords-of-b","more-chords-of-c","more-chords-of-cs","more-chords-of-d","more-chords-of-eb","more-chords-of-e","more-chords-of-f","more-chords-of-fs","more-chords-of-g","more-chords-of-ab","more-chords-of-a","more-chords-of-bb","more-chords-of-b","calm-sway","calm-home-and-back","calm-sunny-walk","calm-floating","calm-open-road","calm-golden-hour","calm-soft-sunrise","calm-wistful-smile","calm-long-drift","calm-up-and-back","calm-surprise-chords","calm-relax","calm-minor-slow-breath","calm-minor-evening-rain","calm-minor-quiet-walk","calm-minor-moonlight","calm-minor-night-road","calm-minor-old-photograph","calm-minor-before-dawn","calm-minor-far-away","calm-minor-long-night","calm-minor-up-and-back","calm-minor-surprise","calm-minor-relax","calm-mix-two-moods","calm-mix-warm-blanket","calm-mix-soft-landing","calm-mix-sunday-morning","calm-mix-slow-river","calm-mix-wistful","calm-mix-bittersweet","calm-mix-evening-glow","calm-mix-long-evening","calm-mix-up-and-back","calm-mix-surprise","calm-mix-relax","calm-sus-lean-and-settle","calm-sus-open-air","calm-sus-both-ways","calm-sus-coming-home","calm-sus-soft-lean","calm-sus-two-sighs","calm-sus-wide-open","calm-sus-long-settle","calm-sus-surprise","calm-sus-relax","calm-smooth-one-finger","calm-smooth-anchor","calm-smooth-home-and-back","calm-smooth-sunny-walk","calm-smooth-minor-drift","calm-smooth-open-road","calm-smooth-soft-sunrise","calm-smooth-bittersweet","calm-smooth-long-drift","calm-smooth-surprise","calm-smooth-relax","calm-rhythm-four-slow-beats","calm-rhythm-two-and-two","calm-rhythm-steady-steps","calm-rhythm-long-short-short","calm-rhythm-short-short-long","calm-rhythm-little-breath","calm-rhythm-slow-waltz","calm-rhythm-gentle-push","calm-rhythm-relax"];
const EAR_IDS = ['ear-cg', 'ear-e', 'ear-d', 'ear-f', 'ear-a', 'ear-b', 'ear-neighbours', 'ear-whites', 'ear-fs', 'ear-cs-ds', 'ear-gs-as', 'ear-twelve', 'ear-ref-sometimes', 'ear-ref-once', 'ear-octaves', 'ear-voices', 'ear-quick'];

describe('curriculum', () => {
  it('has unique lesson ids', () => {
    expect(new Set(LESSONS.map(l => l.id)).size).toBe(LESSONS.length);
  });

  it('has 144 lessons', () => {
    expect(LESSONS).toHaveLength(144);
  });

  it('has the 17 ear lessons in order as unit 4', () => {
    expect(LESSONS.filter(l => l.unit === 3).map(l => l.id)).toEqual(EAR_IDS);
  });

  it('keeps every other lesson id, so saved stars survive', () => {
    expect(LESSONS.filter(l => l.unit !== 3).map(l => l.id)).toEqual(OTHER_IDS);
  });

  it('keeps step lessons inside the range playable without Z/X (C4 to high F)', () => {
    for (const l of LESSONS.filter(l => (l.unit === 6 || l.unit === 7 || l.unit >= 8) && l.exercise.make)) {
      for (const s of l.exercise.make()) for (const n of s.notes) {
        expect(n.oct * 12 + n.semitone, `${l.id} ${n.name}`).toBeGreaterThanOrEqual(0);
        expect(n.oct * 12 + n.semitone, `${l.id} ${n.name}`).toBeLessThanOrEqual(17);
      }
    }
  });

  it.each(LESSONS.map(l => [l.num, l]))('lesson %s builds a valid exercise', (_, lesson) => {
    expect(lesson.theory.length).toBeGreaterThan(0);
    const ex = lesson.exercise;
    if (ex.type === 'ear') {
      const rounds = makeRounds(ex);
      expect(rounds).toHaveLength(ex.count);
      const pool = ex.pool.map(n => SEMI[n]);
      for (const r of rounds) expect(pool).toContain(r.target);
      for (const n of ex.intro ?? []) expect(SEMI[n]).toBeTypeOf('number');
      return;
    }
    if (ex.type === 'rhythm') {
      expect(parseRhythm(ex.pattern).length).toBeGreaterThan(0);
      return;
    }
    if (ex.type === 'playlist') {
      expect(ex.lessons.length).toBeGreaterThan(0);
      for (const l of ex.lessons) expect(l.exercise.make?.() ?? parseRhythm(l.exercise.pattern)).not.toHaveLength(0);
      return;
    }
    const steps = ex.make();
    expect(steps.length).toBeGreaterThan(0);
    for (const s of steps) {
      expect(s.notes.length).toBeGreaterThan(0);
      for (const n of s.notes) expect(n.semitone).toBeTypeOf('number');
      expect(s.prompt ?? ex.prompt).toBeTruthy();
    }
  });
});

describe.each([
  ['Feel-good major chords', 4, 'C', 'calm-up-and-back', 'calm-surprise-chords', 'C D E F G A B', 'C'],
  ['Feel-good minor chords', 3, 'Am', 'calm-minor-up-and-back', 'calm-minor-surprise', 'Cm Dm Em Fm Gm Am Bm', 'Cm'],
])('%s unit', (title, third, home, walkId, surpriseId, sevenText, walkHome) => {
  const unit = UNITS.findIndex(u => u.title === title);
  const lessons = LESSONS.filter(l => l.unit === unit && l.exercise.type !== 'playlist');
  const pitch = n => n.oct * 12 + n.semitone;
  const rightKind = ns => {
    const pcs = ns.map(n => n.semitone % 12);
    return ns.length === 3 && pcs.some(r => pcs.includes((r + third) % 12) && pcs.includes((r + 7) % 12));
  };
  const seven = sevenText.split(' ');

  it('is one open unit of 11 lessons, playable in any order', () => {
    expect(UNITS[unit].allOpen).toBe(true);
    expect(UNITS[unit].openStart).toBe(true);
    expect(lessons).toHaveLength(11);
  });

  it.each(lessons.map(l => [l.title, l]))('%s uses only this kind of chord', (_, l) => {
    for (const s of l.exercise.make()) expect(rightKind(s.notes), s.label).toBe(true);
    for (const c of l.exercise.demo ?? []) expect(rightKind(c)).toBe(true);
  });

  it.each(lessons.map(l => [l.title, l]))('%s comes back home with no chord repeated in a row', (_, l) => {
    const steps = l.exercise.make();
    expect(steps.at(-1).label).toBe(l.id === walkId ? walkHome : home);
    steps.slice(1).forEach((s, i) => expect(s.label).not.toBe(steps[i].label));
  });

  it('uses normal order unless the top note would pass high D', () => {
    for (const l of lessons) for (const s of l.exercise.make()) {
      const ps = s.notes.map(pitch).sort((x, y) => x - y);
      const root = ps.find(p => ps.includes(p + third) || ps.includes(p + third - 12));
      expect(ps.at(-1), `${l.id} ${s.label}`).toBeLessThanOrEqual(14);
      if (root % 12 + 7 <= 14) expect(ps[0], `${l.id} ${s.label}`).toBe(root % 12);
    }
  });

  it('walks the seven white-key chords up and back down', () => {
    const l = lessons.find(x => x.id === walkId);
    expect(l.exercise.make().map(s => s.label)).toEqual([...seven, ...seven.slice(0, -1).reverse()]);
    expect(l.exercise.demo).toHaveLength(13);
  });

  it('shuffles all seven white-key chords evenly, differently each time', () => {
    const l = lessons.find(x => x.id === surpriseId);
    const runs = Array.from({ length: 200 }, () => l.exercise.make().map(s => s.label));
    for (const run of runs) {
      expect(run).toHaveLength(22);
      for (let r = 0; r < 3; r++) expect(run.slice(r * 7, r * 7 + 7).sort()).toEqual([...seven].sort());
      run.slice(1).forEach((c, i) => expect(c).not.toBe(run[i]));
      expect(run.at(-1)).toBe(home);
    }
    expect(new Set(runs.map(r => r.join())).size).toBeGreaterThan(190);
  });

  it('keeps surprise chords within a sixth of each other, whatever the random order', () => {
    const shape = s => s.notes.map(pitch).sort((x, y) => x - y);
    const steps = lessons.find(x => x.id === surpriseId).exercise.make();
    for (const a of steps) for (const b of steps) {
      shape(a).forEach((p, n) => expect(Math.abs(p - shape(b)[n]), `${a.label}→${b.label}`).toBeLessThanOrEqual(8));
    }
  });

  it('keeps the hand close in fixed loops: no note jumps more than a fifth between chords', () => {
    for (const l of lessons.filter(x => x.id !== surpriseId)) {
      const steps = l.exercise.make();
      steps.slice(1).forEach((s, i) => {
        const a = steps[i].notes.map(pitch).sort((x, y) => x - y);
        const b = s.notes.map(pitch).sort((x, y) => x - y);
        a.forEach((p, n) => expect(Math.abs(p - b[n]), `${l.id} ${steps[i].label}→${s.label}`).toBeLessThanOrEqual(7));
      });
    }
  });
});

describe('Feel-good mixed chords unit', () => {
  const unit = UNITS.findIndex(u => u.title === 'Feel-good mixed chords');
  const lessons = LESSONS.filter(l => l.unit === unit && l.exercise.type !== 'playlist');
  const pitch = n => n.oct * 12 + n.semitone;
  const shape = s => s.notes.map(pitch).sort((x, y) => x - y);
  const hasThird = (ns, third) => {
    const pcs = ns.map(n => n.semitone % 12);
    return pcs.some(r => pcs.includes((r + third) % 12) && pcs.includes((r + 7) % 12));
  };
  const six = ['C', 'Dm', 'Em', 'F', 'G', 'Am'];
  const fixed = lessons.filter(l => l.id !== 'calm-mix-surprise');

  it('is one open unit of 11 lessons plus Relax', () => {
    expect(UNITS[unit].allOpen).toBe(true);
    expect(UNITS[unit].openStart).toBe(true);
    expect(lessons).toHaveLength(11);
  });

  it.each(lessons.map(l => [l.title, l]))('%s mixes major and minor chords', (_, l) => {
    const steps = l.exercise.make();
    for (const s of steps) expect(s.notes, s.label).toHaveLength(3);
    expect(steps.some(s => hasThird(s.notes, 4))).toBe(true);
    expect(steps.some(s => hasThird(s.notes, 3))).toBe(true);
    for (const s of steps) expect(hasThird(s.notes, 4) || hasThird(s.notes, 3), s.label).toBe(true);
  });

  it.each(lessons.map(l => [l.title, l]))('%s ends on C with no chord repeated in a row', (_, l) => {
    const steps = l.exercise.make();
    expect(steps.at(-1).label).toBe('C');
    steps.slice(1).forEach((s, i) => expect(s.label).not.toBe(steps[i].label));
  });

  it('stays at or below high D', () => {
    for (const l of lessons) for (const s of l.exercise.make()) expect(Math.max(...shape(s)), `${l.id} ${s.label}`).toBeLessThanOrEqual(14);
  });

  it('keeps the hand close in fixed loops: no note jumps more than a fifth between chords', () => {
    for (const l of fixed) {
      const steps = l.exercise.make();
      steps.slice(1).forEach((s, i) => {
        const a = shape(steps[i]);
        shape(s).forEach((p, n) => expect(Math.abs(p - a[n]), `${l.id} ${steps[i].label}→${s.label}`).toBeLessThanOrEqual(7));
      });
    }
  });

  it('walks the six calm chords of C major up and back down', () => {
    const l = lessons.find(x => x.id === 'calm-mix-up-and-back');
    expect(l.exercise.make().map(s => s.label)).toEqual([...six, ...six.slice(0, -1).reverse()]);
  });

  it('shuffles the six chords evenly, differently each time', () => {
    const l = lessons.find(x => x.id === 'calm-mix-surprise');
    const runs = Array.from({ length: 200 }, () => l.exercise.make().map(s => s.label));
    for (const run of runs) {
      expect(run).toHaveLength(19);
      for (let r = 0; r < 3; r++) expect(run.slice(r * 6, r * 6 + 6).sort()).toEqual([...six].sort());
      run.slice(1).forEach((c, i) => expect(c).not.toBe(run[i]));
    }
    expect(new Set(runs.map(r => r.join())).size).toBeGreaterThan(190);
  });
});

describe.each([
  ['major', 'calm-relax', 'from Gentle sway to Surprise chords.'],
  ['minor', 'calm-minor-relax', 'from Slow breath to Surprise minor chords.'],
  ['mixed', 'calm-mix-relax', 'from Two moods to Surprise mixed chords.'],
  ['sus', 'calm-sus-relax', 'from Lean and settle to Surprise sus chords.'],
  ['smooth', 'calm-smooth-relax', 'from One finger to Surprise smooth chords.'],
  ['rhythm', 'calm-rhythm-relax', 'from Four slow beats to Gentle push.'],
])('Relax lesson in the %s unit', (_, id, span) => {
  const relax = LESSONS.find(l => l.id === id);
  const unit = LESSONS.filter(l => l.unit === relax.unit);

  it('names the first and last lessons', () => {
    expect(relax.theory[0]).toContain(span);
  });

  it('comes last and plays every other lesson in order, with 10 second breaks', () => {
    expect(relax.title).toBe('Relax');
    expect(unit.at(-1)).toBe(relax);
    expect(relax.exercise.breakSeconds).toBe(10);
    expect(relax.exercise.lessons.map(l => l.title)).toEqual(unit.slice(0, -1).map(l => l.title));
  });
});

describe.each([
  ['Feel-good sus chords', 9, 'calm-sus-surprise'],
  ['Feel-good smooth changes', 10, 'calm-smooth-surprise'],
])('%s unit', (title, count, surpriseId) => {
  const unit = UNITS.findIndex(u => u.title === title);
  const lessons = LESSONS.filter(l => l.unit === unit && l.exercise.make);
  const shape = s => s.notes.map(n => n.oct * 12 + n.semitone).sort((x, y) => x - y);

  it('is an open unit with every lesson playable in any order', () => {
    expect(UNITS[unit].allOpen).toBe(true);
    expect(UNITS[unit].openStart).toBe(true);
    expect(lessons).toHaveLength(count);
  });

  it.each(lessons.map(l => [l.title, l]))('%s has three-note chords and comes home with no chord repeated', (_, l) => {
    const steps = l.exercise.make();
    for (const s of steps) {
      expect(s.notes, s.label).toHaveLength(3);
      expect(shape(s).at(-1), `${l.id} ${s.label}`).toBeLessThanOrEqual(14);
    }
    expect(steps.at(-1).label).toBe(l.id === surpriseId ? 'C' : steps[0].label.replace(/sus[24]$/, ''));
    steps.slice(1).forEach((s, i) => expect(s.notes).not.toEqual(steps[i].notes));
  });

  it('shuffles differently each time, three times through', () => {
    const l = lessons.find(x => x.id === surpriseId);
    const pool = new Set(l.exercise.make().slice(0, -1).map(s => s.label)).size;
    expect(l.exercise.make()).toHaveLength(pool * 3 + 1);
    const runs = Array.from({ length: 100 }, () => l.exercise.make().map(s => s.label).join());
    expect(new Set(runs).size).toBeGreaterThan(90);
  });
});

describe('Feel-good sus chords', () => {
  const lessons = LESSONS.filter(l => l.id.startsWith('calm-sus-') && l.exercise.make);
  const pcs = s => s.notes.map(n => n.semitone % 12);
  const rootOf = label => 'C D EF G A B'.indexOf(label[0]);

  it('builds every sus chord from root, fifth and a second or fourth', () => {
    for (const l of lessons) for (const s of l.exercise.make()) {
      const sus = s.label.match(/sus([24])$/);
      if (!sus) continue;
      const r = rootOf(s.label);
      expect(pcs(s).sort(), `${l.id} ${s.label}`).toEqual([r, (r + (sus[1] === '2' ? 2 : 5)) % 12, (r + 7) % 12].sort());
    }
  });

  it('moves one finger between a sus chord and its plain chord', () => {
    for (const l of lessons.filter(x => x.id !== 'calm-sus-surprise')) {
      const steps = l.exercise.make();
      steps.slice(1).forEach((s, i) => {
        const a = steps[i];
        if (a.label[0] !== s.label[0] || a.label.includes('sus') === s.label.includes('sus')) return;
        expect(pcs(s).filter(p => !pcs(a).includes(p)), `${l.id} ${a.label}→${s.label}`).toHaveLength(1);
      });
    }
  });

  it('keeps the hand close in fixed loops: no note jumps more than a fifth between chords', () => {
    for (const l of lessons.filter(x => x.id !== 'calm-sus-surprise')) {
      const steps = l.exercise.make();
      const shape = s => s.notes.map(n => n.oct * 12 + n.semitone).sort((x, y) => x - y);
      steps.slice(1).forEach((s, i) => shape(s).forEach((p, n) => {
        expect(Math.abs(p - shape(steps[i])[n]), `${l.id} ${steps[i].label}→${s.label}`).toBeLessThanOrEqual(7);
      }));
    }
  });
});

describe('Feel-good smooth changes', () => {
  const lessons = LESSONS.filter(l => l.id.startsWith('calm-smooth-') && l.exercise.make);
  const shape = s => s.notes.map(n => n.oct * 12 + n.semitone).sort((x, y) => x - y);
  const PCS = { C: [0, 4, 7], F: [5, 9, 0], G: [7, 11, 2], Am: [9, 0, 4], Dm: [2, 5, 9], Em: [4, 7, 11], 'A♭': [8, 0, 3], 'B♭': [10, 2, 5], Fm: [5, 8, 0] };

  it('plays the real notes of each named chord', () => {
    for (const l of lessons) for (const s of l.exercise.make()) {
      expect(s.notes.map(n => n.semitone % 12).sort(), `${l.id} ${s.label}`).toEqual([...PCS[s.label]].sort());
    }
  });

  it('never moves a finger more than a third between chords in fixed loops', () => {
    for (const l of lessons.filter(x => x.id !== 'calm-smooth-surprise')) {
      const steps = l.exercise.make();
      steps.slice(1).forEach((s, i) => shape(s).forEach((p, n) => {
        expect(Math.abs(p - shape(steps[i])[n]), `${l.id} ${steps[i].label}→${s.label}`).toBeLessThanOrEqual(4);
      }));
    }
  });
});

describe('Feel-good rhythms unit', () => {
  const unit = UNITS.findIndex(u => u.title === 'Feel-good rhythms');
  const lessons = LESSONS.filter(l => l.unit === unit && l.exercise.type === 'rhythm');
  const slots = l => slotsOf(parseRhythm(l.exercise.pattern));

  it('is the last unit: eight open lessons plus Relax', () => {
    expect(unit).toBe(UNITS.length - 1);
    expect(UNITS[unit].allOpen).toBe(true);
    expect(UNITS[unit].openStart).toBe(true);
    expect(lessons).toHaveLength(8);
  });

  it.each(lessons.map(l => [l.title, l]))('%s has three-note chords in range, and no D major', (_, l) => {
    for (const s of slots(l).filter(x => !x.rest)) {
      expect(s.notes).toHaveLength(3);
      for (const n of s.notes) {
        expect(n.oct * 12 + n.semitone).toBeLessThanOrEqual(14);
        expect(n.oct * 12 + n.semitone).toBeGreaterThanOrEqual(0);
      }
      expect(isDMajor(s.notes)).toBe(false);
    }
  });

  it.each(lessons.map(l => [l.title, l]))('%s has full bars, with a name on each', (_, l) => {
    const barBeats = l.exercise.beatsPerBar ?? 4;
    const total = totalBeats(parseRhythm(l.exercise.pattern));
    expect(total % barBeats).toBe(0);
    expect(Object.keys(l.exercise.labels).map(Number)).toEqual(Array.from({ length: total / barBeats }, (_, i) => i * barBeats));
  });

  it.each(lessons.map(l => [l.title, l]))('%s ends on one long home chord', (_, l) => {
    const all = slots(l).filter(x => !x.rest);
    expect(all.at(-1).beats).toBe(l.exercise.beatsPerBar ?? 4);
    expect(all.at(-1).notes.map(n => n.name)).toEqual(all[0].notes.map(n => n.name));
  });

  it('stays slow', () => {
    for (const l of lessons) expect(l.exercise.bpm).toBeLessThanOrEqual(84);
  });
});
