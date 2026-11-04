import { describe, it, expect } from 'vitest';
import { LESSONS, UNITS } from './curriculum.js';
import { parseRhythm } from './rhythm.js';
import { makeRounds, SEMI } from '../ear/rounds.js';

const OTHER_IDS = ["keys","alphabet","fingers","note-finder","beat","long-notes","rests","eighths","half-whole","steps-skips","c-position","c-major","sharps-flats","g-major","c-chord","major-minor","i-iv-v","scale-degrees","f-major","d-major","key-signatures","natural-minor","relative-minor","harmonic-minor","melodic-minor","pentatonic","chromatic","chord-qualities","build-triads","diatonic-triads","inversions","sus-chords","seventh-chords","pop-progression","minor-progression","ii-v-i","arpeggios","chords-of-c","chords-of-cs","chords-of-d","chords-of-eb","chords-of-e","chords-of-f","chords-of-fs","chords-of-g","chords-of-ab","chords-of-a","chords-of-bb","chords-of-b","more-chords-of-c","more-chords-of-cs","more-chords-of-d","more-chords-of-eb","more-chords-of-e","more-chords-of-f","more-chords-of-fs","more-chords-of-g","more-chords-of-ab","more-chords-of-a","more-chords-of-bb","more-chords-of-b","calm-sway","calm-home-and-back","calm-sunny-walk","calm-floating","calm-open-road","calm-golden-hour","calm-soft-sunrise","calm-wistful-smile","calm-long-drift","calm-up-and-back","calm-surprise-chords","calm-relax","calm-minor-slow-breath","calm-minor-evening-rain","calm-minor-quiet-walk","calm-minor-moonlight","calm-minor-night-road","calm-minor-old-photograph","calm-minor-before-dawn","calm-minor-far-away","calm-minor-long-night","calm-minor-up-and-back","calm-minor-surprise"];
const EAR_IDS = ['ear-cg', 'ear-e', 'ear-d', 'ear-f', 'ear-a', 'ear-b', 'ear-neighbours', 'ear-whites', 'ear-fs', 'ear-cs-ds', 'ear-gs-as', 'ear-twelve', 'ear-ref-sometimes', 'ear-ref-once', 'ear-octaves', 'ear-voices', 'ear-quick'];

describe('curriculum', () => {
  it('has unique lesson ids', () => {
    expect(new Set(LESSONS.map(l => l.id)).size).toBe(LESSONS.length);
  });

  it('has 101 lessons', () => {
    expect(LESSONS).toHaveLength(101);
  });

  it('has the 17 ear lessons in order as unit 4', () => {
    expect(LESSONS.filter(l => l.unit === 3).map(l => l.id)).toEqual(EAR_IDS);
  });

  it('keeps every other lesson id, so saved stars survive', () => {
    expect(LESSONS.filter(l => l.unit !== 3).map(l => l.id)).toEqual(OTHER_IDS);
  });

  it('keeps step lessons inside the range playable without Z/X (C4 to high F)', () => {
    for (const l of LESSONS.filter(l => (l.unit === 6 || l.unit === 7 || l.unit >= 8) && l.exercise.type !== 'playlist')) {
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
      for (const l of ex.lessons) expect(l.exercise.make().length).toBeGreaterThan(0);
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

describe('Relax lesson', () => {
  const relax = LESSONS.find(l => l.id === 'calm-relax');
  const unit = LESSONS.filter(l => l.unit === relax.unit);

  it('comes last in the major unit and plays every other lesson in order, with 10 second breaks', () => {
    expect(relax.title).toBe('Relax');
    expect(unit.at(-1)).toBe(relax);
    expect(relax.exercise.breakSeconds).toBe(10);
    expect(relax.exercise.lessons.map(l => l.title)).toEqual(unit.slice(0, -1).map(l => l.title));
  });
});
