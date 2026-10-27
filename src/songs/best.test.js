import { describe, it, expect } from 'vitest';
import { isPassed, withRelaxFinish, starsFor } from './best.js';

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

  it('shows ★★★ for an exercise finished in Relax, even one finished before', () => {
    expect(starsFor(withRelaxFinish({ 'a:play': 1 }, 'a'), 'a', 'play')).toBe(3);
    expect(starsFor({ 'a:relax': 2 }, 'a', 'play')).toBe(3);
    expect(starsFor({ 'a:play': 2 }, 'a', 'play')).toBe(2);
    expect(starsFor({}, 'a', 'play')).toBe(0);
  });
});
