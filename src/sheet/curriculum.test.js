import { describe, it, expect } from 'vitest';
import { SHEET_LESSONS, SHEET_UNITS } from './curriculum.js';
import { parseRhythm } from '../lessons/rhythm.js';
import { soundingNotes, patternToItems, parsePitch, beatsOf } from './notation.js';

describe('notation', () => {
  it('parses pitches', () => {
    expect(parsePitch('C4')).toMatchObject({ semitone: 0, oct: 0, diatonic: 28 });
    expect(parsePitch('Bb3')).toMatchObject({ semitone: 10, oct: -1 });
    expect(parsePitch('F#5')).toMatchObject({ semitone: 6, oct: 1, name: 'F#' });
  });

  it('applies key signatures and the bar rule', () => {
    const items = [{ n: 'F#4' }, { n: 'F4' }, { n: 'Fn4' }, { n: 'F4' }, { bar: '|' }, { n: 'F4' }];
    expect(soundingNotes(items).map(s => s.sounding[0])).toEqual(['F#4', 'F#4', 'F4', 'F4', 'F4']);
    expect(soundingNotes([{ n: 'F4' }, { n: 'G4' }, { n: 'C5' }], 4).map(s => s.sounding[0])).toEqual(['F#4', 'G#4', 'C#5']);
  });

  it('turns rhythm patterns into staff items that add up', () => {
    const items = patternToItems('C D/0.5 E/0.5 F/2 | r/1.5 G/0.5 A/2');
    const beats = items.filter(i => !i.bar).reduce((sum, i) => sum + beatsOf(i), 0);
    expect(beats).toBe(8);
    expect(items[1].beam).toBe('s');
  });

  it('writes a tied note on both sides of the bar line', () => {
    const items = patternToItems('C/2 G/2~ | G/2 E/2');
    expect(items.filter(i => i.n).map(i => [i.n, i.d, Boolean(i.tie)])).toEqual([
      ['C4', 'h', false], ['G4', 'h', true], ['G4', 'h', false], ['E4', 'h', false],
    ]);
  });
});

describe('sheet reading course', () => {
  it('has unique ids, separate from the main course', () => {
    const ids = SHEET_LESSONS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => id.startsWith('sr-'))).toBe(true);
  });

  it('keeps the old lessons in order after Rhythm practise, with Sharps still open', () => {
    expect(SHEET_UNITS.map(u => u.title)).toEqual([
      'The staff', 'Rhythm', 'Rhythm practise', 'Sharps, flats & naturals', 'Reading real music', 'Bass clef & the grand staff', 'Symbols & expression',
    ]);
    expect(SHEET_UNITS[3].openStart).toBe(true);
  });

  it.each(SHEET_LESSONS.map(l => [l.num, l]))('lesson %s builds a valid exercise', (_, lesson) => {
    expect(lesson.theory.length).toBeGreaterThan(0);
    const ex = lesson.exercise;
    if (ex.type === 'rhythm') {
      const events = parseRhythm(ex.pattern);
      const total = events.reduce((s, e) => s + e.beats, 0);
      expect(total % ex.beatsPerBar).toBe(0);
      return;
    }
    if (ex.type === 'choice') {
      const qs = ex.make();
      expect(qs.length).toBeGreaterThan(2);
      for (const q of qs) {
        expect(q.options).toContain(q.answer);
        expect(new Set(q.options).size).toBe(q.options.length);
      }
      return;
    }
    const steps = ex.make();
    expect(steps.length).toBeGreaterThan(0);
    for (const s of steps) {
      expect(s.staff).toBeTruthy();
      for (const n of s.notes) {
        expect(n.semitone).toBeTypeOf('number');
        // playable without Z/X (treble), or one octave down (bass clef)
        const pos = n.oct * 12 + n.semitone;
        if (s.staff.clef === 'bass') expect(n.oct).toBe(-1);
        else { expect(pos).toBeGreaterThanOrEqual(0); expect(pos).toBeLessThanOrEqual(17); }
      }
    }
  });
});

describe('Rhythm practise unit', () => {
  const lessons = SHEET_LESSONS.filter(l => l.unit === 2);
  const LEVELS = ['Easy', 'Medium', 'Hard', 'Advanced'];

  it('is open, and goes from easy to advanced', () => {
    expect(SHEET_UNITS[2].allOpen).toBe(true);
    expect(SHEET_UNITS[2].openStart).toBe(true);
    const levels = lessons.map(l => LEVELS.indexOf(l.title.split(':')[0]));
    expect(levels.every(n => n >= 0)).toBe(true);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
    expect(new Set(levels).size).toBe(4);
  });

  it.each(lessons.map(l => [l.title, l]))('%s uses only white keys, in range and in timed form', (_, l) => {
    expect(l.exercise.type).toBe('rhythm');
    expect(l.exercise.pattern).not.toContain('#');
    for (const e of parseRhythm(l.exercise.pattern).filter(x => !x.rest)) {
      const pos = e.oct * 12 + e.semitone;
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThanOrEqual(17);
    }
  });

  it.each(lessons.map(l => [l.title, l]))('%s has full bars of the written length', (_, l) => {
    const items = l.exercise.staff.items.filter(i => i.bar !== '|.');
    let beats = 0;
    for (const item of [...items, { bar: '|' }]) {
      if (item.bar) { expect(beats).toBe(l.exercise.beatsPerBar); beats = 0; }
      else beats += beatsOf(item);
    }
  });

  it.each(lessons.map(l => [l.title, l]))('%s ties only matching notes, and beams no rests', (_, l) => {
    const items = l.exercise.staff.items.filter(i => !i.bar);
    items.forEach((item, i) => {
      if (item.tie) expect(items[i + 1].n).toBe(item.n);
      if (item.r) expect(item.beam).toBeUndefined();
    });
  });

  it('plays a tied note with one press and the right length', () => {
    const ties = lessons.find(l => l.id === 'sr-rp-ties');
    expect(parseRhythm(ties.exercise.pattern).map(e => e.beats)).toEqual([1, 1, 1, 2, 1, 2, 1, 1, 4, 2]);
  });
});
