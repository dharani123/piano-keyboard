import { describe, it, expect } from 'vitest';
import { EAR_UNITS, EAR_LESSONS, patternRounds, possiblePatterns } from './curriculum.js';
import { buildFlow, segmentAt, ROUNDS, REST_BEATS } from './flow.js';

const IDENTIFY = ['Identify 1 note', 'Identify 2 notes', 'Identify 3 notes', 'Identify 4 notes'];

describe('ear training', () => {
  it('has the three basic-pattern units, Sa Ri then adding Ga then Ma', () => {
    expect(EAR_UNITS.map(u => u.title)).toEqual([
      'Sa, Ri',
      'Sa, Ri, Ga',
      'Sa, Ri, Ga, Ma',
      'Sa, Ri, Ga, Ma, Pa',
    ]);
    expect(new Set(EAR_LESSONS.map(l => l.id)).size).toBe(EAR_LESSONS.length);
  });

  it('makes patterns of more than one swara, never the same twice running', () => {
    const rounds = patternRounds(['C', 'D'], 3, 300);
    rounds.forEach((r, i) => {
      expect(r).toHaveLength(3);
      expect(new Set(r).size).toBeGreaterThan(1);
      if (i > 0) expect(r.join()).not.toBe(rounds[i - 1].join());
    });
  });

  it('Identify 1 to 4 notes ask for the picture of 10 patterns, up to four different options each', () => {
    const pools = [[0, 2], [0, 2, 4], [0, 2, 4, 5], [0, 2, 4, 5, 7]];
    for (const lesson of EAR_LESSONS.filter(l => l.exercise.type === 'choice')) {
      const n = Number(lesson.id.at(-1));
      expect(lesson.title).toBe(n === 1 ? 'Identify 1 note' : `Identify ${n} notes`);
      const qs = lesson.exercise.make();
      expect(qs).toHaveLength(10);
      for (const q of qs) {
        expect(new Set(q.options).size).toBe(Math.min(4, possiblePatterns(pools[lesson.unit], n)));
        expect(q.options).toContain(q.answer);
        expect(q.play.map(x => x.semitone)).toEqual(q.slopes[q.answer]);
        for (const o of q.options) {
          expect(q.slopes[o]).toHaveLength(n);
          expect(q.swaras[o]).toHaveLength(n);
          q.slopes[o].forEach(p => expect(pools[lesson.unit]).toContain(p));
        }
      }
    }
  });

  it('pattern lessons fall from their own pattern on through the unit, all open', () => {
    const flow = id => {
      const { exercise } = EAR_LESSONS.find(l => l.id === id);
      expect(exercise.type).toBe('flow');
      return buildFlow(exercise.patterns, exercise.from);
    };
    const first = flow('et-sr-p1');
    expect(first.segments).toHaveLength(7);
    const swaras = (f, k) => f.song.events.filter(e => e.beat >= f.segments[k].start && e.beat < f.segments[k].end)
      .map(e => e.notes[0].name).join(' ');
    expect(swaras(first, 0)).toBe(`${'Sa Sa Sa Sa Ri Ri Ri Ri '.repeat(ROUNDS)}`.trim());
    expect(swaras(first, 6)).toBe(`${'Sa Ri Ri Sa Sa Ri Ri Sa '.repeat(ROUNDS)}`.trim());
    expect(first.segments[1].start).toBe(first.segments[0].end + REST_BEATS);
    const last = flow('et-sr-p7');
    expect(last.segments.map(s => s.index)).toEqual([6]);
    expect(last.song.totalBeats).toBe(8 * ROUNDS);
    expect(swaras(flow('et-srg-p6'), 0)).toBe(`${'Ga Ri Sa Ga Ri Sa '.repeat(ROUNDS)}`.trim());
    expect(swaras(flow('et-srgm-p1'), 0)).toBe(`${'Sa Sa Sa Sa Ri Ri Ri Ri Ga Ga Ga Ga Ma Ma Ma Ma '.repeat(ROUNDS)}`.trim());
    expect(EAR_UNITS[2].lessons).toHaveLength(11);
    expect(swaras(flow('et-srgmp-p7'), 0)).toBe(`${'Sa Ri Ga Ma Pa Pa Ma Ga Ri Sa '.repeat(ROUNDS)}`.trim());
    expect(EAR_UNITS.every(u => u.allOpen)).toBe(true);
    // only the Identify lessons keep stars
    expect(EAR_LESSONS.filter(l => !l.unscored).map(l => l.title)).toEqual(EAR_UNITS.flatMap(() => IDENTIFY));
    expect(EAR_UNITS[0].lessons.map(l => l.title)).toEqual([1, 2, 3, 4, 5, 6, 7].map(n => `Pattern ${n}`).concat(IDENTIFY));
  });

  it('knows which pattern is falling, the next one during a rest', () => {
    const { segments } = buildFlow([{ title: 'A', names: ['C', 'D'] }, { title: 'B', names: ['D', 'C'] }]);
    expect(segmentAt(segments, 0).title).toBe('A');
    expect(segmentAt(segments, segments[0].end + 1).title).toBe('B');
    expect(segmentAt(segments, 999).title).toBe('B');
  });
});

describe('ear training practice sizes', () => {
  it('one note from Sa, Ri gives two pictures; two notes may repeat a swara', () => {
    expect(possiblePatterns(['C', 'D'], 1)).toBe(2);
    expect(possiblePatterns(['C', 'D'], 2)).toBe(4);
    expect(possiblePatterns(['C', 'D'], 3)).toBe(6);
    const twos = patternRounds(['C', 'D'], 2, 400);
    expect(twos.some(([a, b]) => a === b)).toBe(true);
    const ones = patternRounds(['C', 'D'], 1, 400);
    expect(ones.some((r, i) => i > 0 && r[0] === ones[i - 1][0])).toBe(true);
  });
});
