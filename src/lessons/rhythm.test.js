import { describe, it, expect } from 'vitest';
import { parseRhythm, totalBeats, slotsOf, scoreRhythm, starsForAccuracy } from './rhythm.js';

describe('parseRhythm', () => {
  it('reads lengths, rests and bars', () => {
    const ev = parseRhythm('C D/2 | r E/0.5');
    expect(ev.map(e => [e.name, e.beat, e.beats, e.rest, e.bar])).toEqual([
      ['C', 0, 1, false, 0],
      ['D', 1, 2, false, 0],
      ['r', 3, 1, true, 1],
      ['E', 4, 0.5, false, 1],
    ]);
    expect(totalBeats(ev)).toBe(4.5);
  });
});

describe('chords in a rhythm', () => {
  const ev = parseRhythm('C,E,G+/2 r/1 F/1');

  it('puts every chord note on the same beat and counts its length once', () => {
    expect(ev.map(e => [e.name, e.oct, e.beat, e.beats])).toEqual([
      ['C', 0, 0, 2], ['E', 0, 0, 2], ['G', 1, 0, 2], ['r', 0, 2, 1], ['F', 0, 3, 1],
    ]);
    expect(totalBeats(ev)).toBe(4);
  });

  it('gathers a chord into one slot', () => {
    expect(slotsOf(ev).map(s => [s.beat, s.beats, s.rest, s.notes.length])).toEqual([
      [0, 2, false, 3], [2, 1, true, 1], [3, 1, false, 1],
    ]);
  });

  it('scores each chord note, and a dropped note counts as missed', () => {
    const { results } = scoreRhythm(parseRhythm('C,E,G/2'), [
      { time: 0.01, semitone: 0, octave: 4 },
      { time: 0.02, semitone: 4, octave: 4 },
    ], 0.5, 4);
    expect(results.map(r => r.grade)).toEqual(['perfect', 'perfect', 'miss']);
  });

  it('rejects a bad note inside a chord', () => {
    expect(() => parseRhythm('C,H,G')).toThrow();
  });
});

describe('ties in a rhythm', () => {
  it('makes one held note, across a bar line too', () => {
    const ev = parseRhythm('C G/2~ | G/2 E');
    expect(ev.map(e => [e.name, e.beat, e.beats])).toEqual([['C', 0, 1], ['G', 1, 4], ['E', 5, 1]]);
    expect(totalBeats(ev)).toBe(6);
  });

  it('chains through several notes', () => {
    expect(parseRhythm('G/2~ G~ G/0.5').map(e => e.beats)).toEqual([3.5]);
  });

  it('asks for one press, so a second press is an extra', () => {
    const presses = [{ time: 0, semitone: 7, octave: 4 }, { time: 1, semitone: 7, octave: 4 }];
    const { results, extras } = scoreRhythm(parseRhythm('G~ G'), presses, 0.5, 4);
    expect(results.map(r => r.grade)).toEqual(['perfect']);
    expect(extras).toBe(1);
  });

  it('refuses a tie between different notes', () => {
    expect(() => parseRhythm('C~ D')).toThrow();
  });
});

describe('scoreRhythm', () => {
  const ev = parseRhythm('C C r G');
  const spb = 0.5;

  it('grades by timing and ignores rests', () => {
    const { results, accuracy, extras } = scoreRhythm(ev, [
      { time: 0.01, semitone: 0, octave: 4 },
      { time: 0.6, semitone: 0, octave: 4 },
      { time: 1.5, semitone: 7, octave: 4 },
    ], spb, 4);
    expect(results.map(r => r.grade)).toEqual(['perfect', 'good', 'perfect']);
    expect(extras).toBe(0);
    expect(accuracy).toBeCloseTo((1 + 0.8 + 1) / 3);
  });

  it('marks missed notes and penalises extra presses', () => {
    const { results, extras } = scoreRhythm(ev, [
      { time: 0, semitone: 0, octave: 4 },
      { time: 1.0, semitone: 2, octave: 4 }, // wrong note during the rest
    ], spb, 4);
    expect(results.map(r => r.grade)).toEqual(['perfect', 'miss', 'miss']);
    expect(extras).toBe(1);
  });

  it('one press cannot satisfy two notes', () => {
    const { results } = scoreRhythm(ev, [{ time: 0.25, semitone: 0, octave: 4 }], spb, 4);
    expect(results.filter(r => r.grade !== 'miss')).toHaveLength(1);
  });

  it('star thresholds', () => {
    expect(starsForAccuracy(0.95)).toBe(3);
    expect(starsForAccuracy(0.75)).toBe(2);
    expect(starsForAccuracy(0.55)).toBe(1);
    expect(starsForAccuracy(0.3)).toBe(0);
  });
});
