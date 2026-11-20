import { describe, it, expect } from 'vitest';
import { pushPress, matchesPattern, matchedPrefix, advanceFound } from './playback.js';

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

  it('counts the notes played in line so far, from the first', () => {
    expect(matchedPrefix(play([], 3), pattern)).toBe(0);
    expect(matchedPrefix(play([n(0)], 3), pattern)).toBe(1);
    expect(matchedPrefix(play([n(5), n(0), n(4)], 3), pattern)).toBe(2);
    expect(matchedPrefix(play([n(0), n(4), n(5)], 3), pattern)).toBe(0); // a wrong key breaks the line
    expect(matchedPrefix(play([n(0), n(4), n(0)], 3), pattern)).toBe(1);
    expect(matchedPrefix(play([n(0), n(4), n(2)], 3), pattern)).toBe(3);
    const sasa = [n(0), n(0), n(2)];
    expect(matchedPrefix(play([n(0), n(0), n(0)], 3), sasa)).toBe(2);
  });
});

describe('play it back, sticky progress', () => {
  const pattern = [n(0), n(4), n(2)]; // Sa Ga Ri
  const run = notes => notes.reduce((found, x) => advanceFound(found, x, pattern), 0);

  it('keeps each swara found and waits for the next, ignoring wrong keys', () => {
    expect(run([n(0)])).toBe(1);
    expect(run([n(0), n(5), n(2)])).toBe(1); // wrong keys don't undo Sa
    expect(run([n(0), n(5), n(4)])).toBe(2);
    expect(run([n(5), n(0), n(7), n(4), n(0), n(2)])).toBe(3);
    expect(run([n(0, 1)])).toBe(0); // same swara, other octave
    expect(run([n(0), n(4), n(2), n(0)])).toBe(3); // stops at the end
  });
});
