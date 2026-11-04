import { describe, it, expect } from 'vitest';
import { dChordThird, isDMajor } from './dChord.js';

const n = (semitone, octave = 4) => ({ semitone, octave });

describe('dChordThird', () => {
  it.each([
    ['D F♯ gives A', n(2), n(6), n(9)],
    ['D A gives F♯', n(2), n(9), n(6)],
    ['F♯ A gives D', n(6), n(9), n(2)],
    ['A D gives F♯ on top', n(9), n(2, 5), n(6, 5)],
    ['F♯ D gives A between', n(6), n(2, 5), n(9)],
    ['A F♯ gives D between', n(9), n(6, 5), n(2, 5)],
  ])('%s', (_, a, b, third) => {
    expect(dChordThird(a, b)).toEqual(third);
    expect(dChordThird(b, a)).toEqual(third);
  });

  it('ignores any other pair', () => {
    expect(dChordThird(n(0), n(4))).toBeNull();
    expect(dChordThird(n(2), n(4))).toBeNull();
    expect(dChordThird(n(2), n(9, 5))).toBeNull(); // too far apart to be one hand's chord
  });
});

describe('isDMajor', () => {
  it('spots D major in any order or octave, and nothing else', () => {
    expect(isDMajor([n(2), n(6), n(9)])).toBe(true);
    expect(isDMajor([n(9), n(2), n(6)])).toBe(true);
    expect(isDMajor([n(2), n(5), n(9)])).toBe(false);
    expect(isDMajor([n(2), n(9)])).toBe(false);
  });
});
