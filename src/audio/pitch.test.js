import { describe, it, expect } from 'vitest';
import { frequency, midiNote } from './pitch.js';

describe('pitch', () => {
  it('maps middle C and A4', () => {
    expect(midiNote(4, 0)).toBe(60);
    expect(frequency(4, 9)).toBeCloseTo(440);
    expect(frequency(4, 0)).toBeCloseTo(261.63, 1);
  });

  it('octaves double the frequency', () => {
    expect(frequency(5, 9)).toBeCloseTo(880);
    expect(frequency(3, 9)).toBeCloseTo(220);
  });

  it('transpose shifts by semitones', () => {
    expect(frequency(4, 0, 2)).toBeCloseTo(frequency(4, 2));
    expect(frequency(4, 0, -12)).toBeCloseTo(frequency(3, 0));
  });
});
