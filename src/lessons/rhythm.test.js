import { describe, it, expect } from 'vitest';
import { parseRhythm, totalBeats, scoreRhythm, starsForAccuracy } from './rhythm.js';

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
