import { describe, it, expect } from 'vitest';
import { pushPress, matchesPattern } from './playback.js';

const n = (semitone, oct = 0) => ({ semitone, oct });
const play = (notes, length) => notes.reduce((played, x) => pushPress(played, x, length), []);

describe('play it back', () => {
  const pattern = [n(0), n(4), n(2)]; // Sa Ga Ri

  it('matches once the last presses are the pattern, whatever came before', () => {
    expect(matchesPattern(play([n(0), n(4), n(2)], 3), pattern)).toBe(true);
    expect(matchesPattern(play([n(5), n(2), n(0), n(0), n(4), n(2)], 3), pattern)).toBe(true);
  });

  it('keeps listening until then', () => {
    expect(matchesPattern(play([n(0), n(4)], 3), pattern)).toBe(false);
    expect(matchesPattern(play([n(0), n(2), n(4)], 3), pattern)).toBe(false);
    expect(matchesPattern(play([n(0), n(4), n(2), n(5)], 3), pattern)).toBe(false);
  });

  it('needs the same octave', () => {
    expect(matchesPattern(play([n(0, 1), n(4), n(2)], 3), pattern)).toBe(false);
  });
});
