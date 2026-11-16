import { describe, it, expect } from 'vitest';
import { IDENTIFY_LESSONS, IDENTIFY_UNITS, twoNoteRounds, slopeOf, shapeOf, STEP, LEAP, HOLLOW, SWEET, TENSE, REST, MOVE } from './curriculum.js';
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

  it('greater / lesser with two notes offers four slope pictures, small and big, up and down', () => {
    for (const [id, pool] of [['id-gl-whites', [0, 2, 4, 5, 7, 9, 11]], ['id-gl-twelve', [...Array(12).keys()]]]) {
      const lesson = IDENTIFY_LESSONS.find(l => l.id === id);
      expect(lesson.exercise.type).toBe('choice');
      const qs = Array.from({ length: 20 }, () => lesson.exercise.make()).flat();
      const used = new Set();
      const answerAt = new Set();
      const kinds = new Set();
      for (const q of qs) {
        expect(q.play).toHaveLength(2);
        expect(q.gap).toBe(0.5);
        expect(q.options).toHaveLength(4);
        expect(q.options).toContain(q.answer);
        expect(q.slopes[q.answer]).toEqual(q.play.map(n => n.semitone));
        expect(new Set(q.options.map(o => slopeOf(q.slopes[o]))).size).toBe(4);
        q.options.forEach(o => q.slopes[o].forEach(s => expect(pool).toContain(s)));
        q.play.forEach(n => { expect(n.oct).toBe(0); used.add(n.semitone); });
        answerAt.add(q.options.indexOf(q.answer));
        kinds.add(slopeOf(q.slopes[q.answer]));
      }
      expect([...used].sort((x, y) => x - y)).toEqual(pool);
      expect(answerAt.size).toBe(4);
      expect(kinds.size).toBe(4);
    }
  });

  it('the E F G three-note lesson uses only E, F and G and all four shapes', () => {
    const lesson = IDENTIFY_LESSONS.find(l => l.id === 'id-three-efg');
    const qs = Array.from({ length: 20 }, () => lesson.exercise.make()).flat();
    const played = new Set();
    for (const q of qs) {
      expect(q.play).toHaveLength(3);
      expect(new Set(q.options.map(o => shapeOf(q.slopes[o]).join())).size).toBe(4);
      for (const o of q.options) q.slopes[o].forEach((p, i, all) => { expect([4, 5, 7]).toContain(p); if (i) expect(p).not.toBe(all[i - 1]); });
      played.add(shapeOf(q.slopes[q.answer]).join());
    }
    expect(played.size).toBe(4);
  });

  it('the E F G four-note lesson uses only E, F and G and every shape they can make', () => {
    const lesson = IDENTIFY_LESSONS.find(l => l.id === 'id-four-efg');
    const qs = Array.from({ length: 30 }, () => lesson.exercise.make()).flat();
    const played = new Set();
    for (const q of qs) {
      expect(q.play).toHaveLength(4);
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map(o => shapeOf(q.slopes[o]).join())).size).toBe(4);
      for (const o of q.options) q.slopes[o].forEach((p, i, all) => { expect([4, 5, 7]).toContain(p); if (i) expect(p).not.toBe(all[i - 1]); });
      played.add(shapeOf(q.slopes[q.answer]).join());
    }
    expect(played.size).toBe(6);
    expect(played.has('true,true,true')).toBe(false);
    expect(played.has('false,false,false')).toBe(false);
  });

  it('the close-notes three- and four-note lessons move only 1 or 2 semitones, every shape, four different pictures', () => {
    for (const [id, n] of [['id-gl-three-close', 3], ['id-four-close', 4]]) {
    const lesson = IDENTIFY_LESSONS.find(l => l.id === id);
    const qs = Array.from({ length: 20 }, () => lesson.exercise.make()).flat();
    const played = new Set();
    for (const q of qs) {
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options.map(o => shapeOf(q.slopes[o]).join())).size).toBe(4);
      for (const o of q.options) {
        const p = q.slopes[o];
        p.forEach(s => expect(s).toBeGreaterThanOrEqual(0));
        p.forEach(s => expect(s).toBeLessThanOrEqual(11));
        for (let i = 1; i < p.length; i++) expect([1, 2]).toContain(Math.abs(p[i] - p[i - 1]));
      }
      played.add(shapeOf(q.slopes[q.answer]).join());
    }
    expect(played.size).toBe(2 ** (n - 1));
    }
  });

  it('greater / lesser with three notes offers four slope pictures, one per shape, the played one among them', () => {
    for (const [id, pool] of [['id-gl-three', [0, 2, 4, 5, 7, 9, 11]], ['id-gl-three-twelve', [...Array(12).keys()]]]) {
    const lesson = IDENTIFY_LESSONS.find(l => l.id === id);
    expect(lesson.exercise.type).toBe('choice');
    const qs = Array.from({ length: 20 }, () => lesson.exercise.make()).flat();
    const answerAt = new Set();
    const shapes = new Set();
    for (const q of qs) {
      expect(q.play).toHaveLength(3);
      expect(q.gap).toBe(0.5);
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.answer);
      expect(q.slopes[q.answer]).toEqual(q.play.map(n => n.semitone));
      const optionShapes = q.options.map(o => q.slopes[o]);
      expect(new Set(optionShapes.map(p => shapeOf(p).join())).size).toBe(4);
      for (const p of optionShapes) {
        expect(p[0]).not.toBe(p[1]); expect(p[1]).not.toBe(p[2]);
        p.forEach(s => expect(pool).toContain(s));
      }
      q.play.forEach(n => expect(n.oct).toBe(0));
      answerAt.add(q.options.indexOf(q.answer));
      shapes.add(shapeOf(q.slopes[q.answer]).join());
    }
    expect(answerAt.size).toBe(4);
    expect(shapes.size).toBe(4);
    }
  });

  it('greater / lesser with four and five notes offers four different shapes, opening a week apart', () => {
    for (const [id, pool, n, opensOn] of [
      ['id-gl-four', [0, 2, 4, 5, 7, 9, 11], 4, undefined], ['id-gl-four-twelve', [...Array(12).keys()], 4, undefined],
      ['id-gl-five', [0, 2, 4, 5, 7, 9, 11], 5, '2026-11-23'], ['id-gl-five-twelve', [...Array(12).keys()], 5, '2026-11-23'],
    ]) {
      const lesson = IDENTIFY_LESSONS.find(l => l.id === id);
      expect(lesson.opensOn).toBe(opensOn);
      const qs = Array.from({ length: 20 }, () => lesson.exercise.make()).flat();
      const shapes = new Set();
      for (const q of qs) {
        expect(q.play).toHaveLength(n);
        expect(q.options).toHaveLength(4);
        expect(q.slopes[q.answer]).toEqual(q.play.map(x => x.semitone));
        const optionShapes = q.options.map(o => q.slopes[o]);
        expect(new Set(optionShapes.map(p => shapeOf(p).join())).size).toBe(4);
        for (const p of optionShapes) {
          expect(p).toHaveLength(n);
          p.forEach((s, i) => { expect(pool).toContain(s); if (i) expect(s).not.toBe(p[i - 1]); });
        }
        shapes.add(shapeOf(q.slopes[q.answer]).join());
      }
      expect(shapes.size).toBe(2 ** (n - 1));
    }
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
    expect(IDENTIFY_UNITS.map(u => u.title)).toEqual(['Two notes', 'Three notes', 'Four notes', 'Five notes', 'Step or leap', 'Hollow, sweet or tense',
      'At rest or wants to move', 'Close calls', 'Single note with base C', 'Intervals']);
    expect(IDENTIFY_UNITS.find(u => u.title === 'Single note with base C').openStart).toBe(true);
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
