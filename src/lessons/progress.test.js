import { describe, it, expect } from 'vitest';
import { hasPassed, PASS_STARS } from './progress.js';

describe('hasPassed', () => {
  const progress = { stars: { a: 1, b: 2, c: 3 } };

  it('needs two stars to pass', () => {
    expect(PASS_STARS).toBe(2);
    expect(hasPassed(progress, 'a')).toBe(false);
    expect(hasPassed(progress, 'b')).toBe(true);
    expect(hasPassed(progress, 'c')).toBe(true);
  });

  it('an unplayed lesson has not passed', () => {
    expect(hasPassed(progress, 'never')).toBe(false);
  });
});
