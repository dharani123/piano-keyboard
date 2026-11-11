import { describe, it, expect } from 'vitest';
import { IDENTIFY_LESSONS, IDENTIFY_UNITS, twoNoteRounds, HIGHER, LOWER, shapeOf, STEP, LEAP, HOLLOW, SWEET, TENSE, REST, MOVE } from './curriculum.js';
import { playable } from '../data/keymap.js';

describe('identify notes', () => {
  it('makes pairs of two different white keys, going up and down, never the same pair twice running', () => {
    const rounds = twoNoteRounds(['C', 'D', 'E', 'F', 'G', 'A', 'B'], 200);
    expect(rounds).toHaveLength(200);
    rounds.forEach((r, i) => {
      expect(r[0]).not.toBe(r[1]);
      if (i > 0) expect(r.join()).not.toBe(rounds[i - 1].join());
    });
    const order = 'CDEFGAB';
    expect(rounds.some(([a, b]) => order.indexOf(a) < order.indexOf(b))).toBe(true);
    expect(rounds.some(([a, b]) => order.indexOf(a) > order.indexOf(b))).toBe(true);
  });

  it('plays each pair one after the other and asks for the notes in that order', () => {
    const steps = IDENTIFY_LESSONS.find(l => l.id === 'id-two-whites').exercise.make();
    expect(steps).toHaveLength(24);
    for (let i = 0; i < steps.length; i += 2) {
      const [first, second] = [steps[i], steps[i + 1]];
      expect(first.play).toEqual([first.notes[0], second.notes[0]]);
      expect(first.together).toBeUndefined();
      expect(second.play).toBeUndefined();
      for (const n of [first.notes[0], second.notes[0]]) {
        expect(n.oct).toBe(0);
        expect([0, 2, 4, 5, 7, 9, 11]).toContain(n.semitone);
      }
    }
  });

  it('greater / lesser asks whether the second note went higher or lower, with 7 or 12 keys', () => {
    for (const [id, pool] of [['id-gl-whites', [0, 2, 4, 5, 7, 9, 11]], ['id-gl-twelve', [...Array(12).keys()]]]) {
      const lesson = IDENTIFY_LESSONS.find(l => l.id === id);
      expect(lesson.exercise.type).toBe('choice');
      const qs = Array.from({ length: 20 }, () => lesson.exercise.make()).flat();
      const used = new Set();
      for (const q of qs) {
        const [a, b] = q.play;
        expect(q.gap).toBe(0.6);
        expect(q.options).toEqual([HIGHER, LOWER]);
        expect(q.options).toContain(q.answer);
        expect(q.answer).toBe(b.semitone > a.semitone ? HIGHER : LOWER);
        for (const n of [a, b]) { expect(pool).toContain(n.semitone); expect(n.oct).toBe(0); used.add(n.semitone); }
      }
      expect([...used].sort((x, y) => x - y)).toEqual(pool);
      expect(qs.some(q => q.answer === HIGHER) && qs.some(q => q.answer === LOWER)).toBe(true);
    }
  });

  it('greater / lesser with three notes offers four slope pictures, one per shape, the played one among them', () => {
    const lesson = IDENTIFY_LESSONS.find(l => l.id === 'id-gl-three');
    expect(lesson.exercise.type).toBe('choice');
    const qs = Array.from({ length: 20 }, () => lesson.exercise.make()).flat();
    const answerAt = new Set();
    const shapes = new Set();
    for (const q of qs) {
      expect(q.play).toHaveLength(3);
      expect(q.gap).toBe(0.6);
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);
      expect(q.slopes[q.answer]).toEqual(q.play.map(n => n.semitone));
      const optionShapes = q.options.map(o => q.slopes[o]);
      expect(new Set(optionShapes.map(p => shapeOf(p).join())).size).toBe(4);
      for (const p of optionShapes) {
        expect(p[0]).not.toBe(p[1]); expect(p[1]).not.toBe(p[2]);
        p.forEach(s => expect([0, 2, 4, 5, 7, 9, 11]).toContain(s));
      }
      q.play.forEach(n => expect(n.oct).toBe(0));
      answerAt.add(q.options.indexOf(q.answer));
      shapes.add(shapeOf(q.slopes[q.answer]).join());
    }
    expect(answerAt.size).toBe(4);
    expect(shapes.size).toBe(4);
  });

  it('single note plays C first every round, then a note from the white keys or all 12', async () => {
    const { makeRounds } = await import('../ear/rounds.js');
    for (const [id, pool] of [['id-sn-whites', [2, 4, 5, 7, 9, 11]], ['id-sn-twelve', [...Array(12).keys()].slice(1)]]) {
      const ex = IDENTIFY_LESSONS.find(l => l.id === id).exercise;
      expect(ex.type).toBe('ear');
      const rounds = Array.from({ length: 20 }, () => makeRounds(ex)).flat();
      expect(rounds.every(r => r.reference)).toBe(true);
      expect([...new Set(rounds.map(r => r.target))].sort((a, b) => a - b)).toEqual(pool);
    }
  });

  const questionsOf = id => {
    const lesson = IDENTIFY_LESSONS.find(l => l.id === id);
    expect(lesson.exercise.type).toBe('choice');
    return Array.from({ length: 30 }, () => lesson.exercise.make()).flat();
  };
  const pitch = n => n.oct * 12 + n.semitone;
  const distance = q => Math.abs(pitch(q.play[1]) - pitch(q.play[0]));

  it('orders the cue units from easiest to the full note naming', () => {
    expect(IDENTIFY_UNITS.map(u => u.title)).toEqual(['Greater / lesser', 'Step or leap', 'Hollow, sweet or tense',
      'At rest or wants to move', 'Close calls', 'Single note with base C', 'Intervals']);
    expect(IDENTIFY_UNITS[5].openStart).toBe(true);
  });

  it('every cue answer is one of its options, every option comes up, and keys cover the options', () => {
    for (const lesson of IDENTIFY_LESSONS.filter(l => /^id-(sl|feel|rest|cc)-/.test(l.id))) {
      const qs = questionsOf(lesson.id);
      const options = qs[0].options;
      expect(Object.values(lesson.exercise.keys).sort()).toEqual([...options].sort());
      for (const option of options) expect(qs.some(q => q.answer === option)).toBe(true);
      qs.forEach((q, i) => {
        expect(options).toContain(q.answer);
        expect(distance(q)).toBeGreaterThan(0);
        for (const n of q.play) expect(playable(0).has(pitch(n))).toBe(true);
        if (i > 0 && i % 15) expect(q.play.map(pitch).join()).not.toBe(qs[i - 1].play.map(pitch).join());
      });
    }
  });

  it('step or leap: a step is one or two semitones', () => {
    for (const id of ['id-sl-whites', 'id-sl-twelve']) {
      for (const q of questionsOf(id)) expect(q.answer).toBe(distance(q) <= 2 ? STEP : LEAP);
    }
    expect(questionsOf('id-sl-whites').every(q => q.play.every(n => [0, 2, 4, 5, 7, 9, 11].includes(n.semitone)))).toBe(true);
  });

  it('hollow, sweet or tense follows the interval, played together or one after the other', () => {
    const feel = d => [5, 7, 12].includes(d) ? HOLLOW : [3, 4, 8, 9].includes(d) ? SWEET : TENSE;
    for (const [id, together] of [['id-feel-together', true], ['id-feel-apart', false]]) {
      for (const q of questionsOf(id)) {
        expect(q.answer).toBe(feel(distance(q)));
        expect(q.together).toBe(together);
      }
    }
  });

  it('at rest or wants to move always starts on C', () => {
    for (const q of questionsOf('id-rest-whites')) {
      expect(pitch(q.play[0])).toBe(0);
      expect(q.answer).toBe([4, 7, 12].includes(pitch(q.play[1])) ? REST : MOVE);
    }
  });

  it('close calls go up by one of the two intervals', () => {
    for (const [id, pair] of [['id-cc-3-4', [4, 5]], ['id-cc-4-5', [5, 7]], ['id-cc-5-8', [7, 12]]]) {
      for (const q of questionsOf(id)) {
        const d = pitch(q.play[1]) - pitch(q.play[0]);
        expect(pair).toContain(d);
        expect(q.answer).toBe(q.options[pair.indexOf(d)]);
      }
    }
  });
});
