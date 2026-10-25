import { describe, it, expect } from 'vitest';
import { isPassed, withRelaxFinish } from './best.js';

describe('best stars', () => {
  it('passes an exercise with ★★ in either mode', () => {
    expect(isPassed({ 'a:wait': 2 }, 'a')).toBe(true);
    expect(isPassed({ 'a:play': 3 }, 'a')).toBe(true);
    expect(isPassed({ 'a:play': 1 }, 'a')).toBe(false);
    expect(isPassed({}, 'a')).toBe(false);
  });

  it('passes an exercise finished in Relax', () => {
    const best = withRelaxFinish({ 'b:play': 3 }, 'a');
    expect(isPassed(best, 'a')).toBe(true);
    expect(best['b:play']).toBe(3);
  });
});
