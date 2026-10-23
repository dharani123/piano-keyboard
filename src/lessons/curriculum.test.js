import { describe, it, expect } from 'vitest';
import { LESSONS } from './curriculum.js';
import { parseRhythm } from './rhythm.js';
import { makeRounds, SEMI } from '../ear/rounds.js';

const OTHER_IDS = ["keys","alphabet","fingers","note-finder","beat","long-notes","rests","eighths","half-whole","steps-skips","c-position","c-major","sharps-flats","g-major","c-chord","major-minor","i-iv-v","song-mary","song-twinkle","song-ode","song-jingle","song-birthday","song-twinkle-timed"];
const EAR_IDS = ['ear-cg', 'ear-e', 'ear-d', 'ear-f', 'ear-a', 'ear-b', 'ear-neighbours', 'ear-whites', 'ear-fs', 'ear-cs-ds', 'ear-gs-as', 'ear-twelve', 'ear-ref-sometimes', 'ear-ref-once', 'ear-octaves', 'ear-voices', 'ear-quick'];

describe('curriculum', () => {
  it('has unique lesson ids', () => {
    expect(new Set(LESSONS.map(l => l.id)).size).toBe(LESSONS.length);
  });

  it('has 40 lessons', () => {
    expect(LESSONS).toHaveLength(40);
  });

  it('has the 17 ear lessons in order as unit 4', () => {
    expect(LESSONS.filter(l => l.unit === 3).map(l => l.id)).toEqual(EAR_IDS);
  });

  it('keeps every other lesson id, so saved stars survive', () => {
    expect(LESSONS.filter(l => l.unit !== 3).map(l => l.id)).toEqual(OTHER_IDS);
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
