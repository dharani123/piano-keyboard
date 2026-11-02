import { describe, it, expect } from 'vitest';
import { LESSONS } from './curriculum.js';
import { parseRhythm } from './rhythm.js';
import { makeRounds, SEMI } from '../ear/rounds.js';

const OTHER_IDS = ["keys","alphabet","fingers","note-finder","beat","long-notes","rests","eighths","half-whole","steps-skips","c-position","c-major","sharps-flats","g-major","c-chord","major-minor","i-iv-v","scale-degrees","f-major","d-major","key-signatures","natural-minor","relative-minor","harmonic-minor","melodic-minor","pentatonic","chromatic","chord-qualities","build-triads","diatonic-triads","inversions","sus-chords","seventh-chords","pop-progression","minor-progression","ii-v-i","arpeggios"];
const EAR_IDS = ['ear-cg', 'ear-e', 'ear-d', 'ear-f', 'ear-a', 'ear-b', 'ear-neighbours', 'ear-whites', 'ear-fs', 'ear-cs-ds', 'ear-gs-as', 'ear-twelve', 'ear-ref-sometimes', 'ear-ref-once', 'ear-octaves', 'ear-voices', 'ear-quick'];

describe('curriculum', () => {
  it('has unique lesson ids', () => {
    expect(new Set(LESSONS.map(l => l.id)).size).toBe(LESSONS.length);
  });

  it('has 54 lessons', () => {
    expect(LESSONS).toHaveLength(54);
  });

  it('has the 17 ear lessons in order as unit 4', () => {
    expect(LESSONS.filter(l => l.unit === 3).map(l => l.id)).toEqual(EAR_IDS);
  });

  it('keeps every other lesson id, so saved stars survive', () => {
    expect(LESSONS.filter(l => l.unit !== 3).map(l => l.id)).toEqual(OTHER_IDS);
  });

  it('keeps step lessons inside the range playable without Z/X (C4 to high F)', () => {
    for (const l of LESSONS.filter(l => l.unit === 6 || l.unit === 7)) {
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
    const steps = ex.make();
    expect(steps.length).toBeGreaterThan(0);
    for (const s of steps) {
      expect(s.notes.length).toBeGreaterThan(0);
      for (const n of s.notes) expect(n.semitone).toBeTypeOf('number');
      expect(s.prompt ?? ex.prompt).toBeTruthy();
    }
  });
});
