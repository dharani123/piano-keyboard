import { describe, it, expect } from 'vitest';
import { SHEET_LESSONS } from './curriculum.js';
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
});

describe('sheet reading course', () => {
  it('has unique ids, separate from the main course', () => {
    const ids = SHEET_LESSONS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => id.startsWith('sr-'))).toBe(true);
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
