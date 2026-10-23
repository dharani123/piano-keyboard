import { describe, it, expect } from 'vitest';
import { makeRounds, isCorrect } from './rounds.js';

// Small seeded PRNG so the statistical tests are repeatable
function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const share = (rounds, fn) => rounds.filter(fn).length / rounds.length;

describe('makeRounds', () => {
  it('draws from the pool with a reference every round and no repeats', () => {
    const rounds = makeRounds({ pool: ['C', 'G'], count: 12, reference: 'every' }, mulberry32(1));
    expect(rounds).toHaveLength(12);
    for (const r of rounds) {
      expect([0, 7]).toContain(r.target);
      expect(r.reference).toBe(true);
      expect(r.oct).toBe(0);
    }
    rounds.slice(1).forEach((r, i) => expect(r.target).not.toBe(rounds[i].target));
  });

  it('allows repeats when the pool has a single note', () => {
    const rounds = makeRounds({ pool: ['C'], count: 5, reference: 'every' }, mulberry32(1));
    expect(rounds.map(r => r.target)).toEqual([0, 0, 0, 0, 0]);
  });

  it('plays the focus note about half the time', () => {
    const rounds = makeRounds({ pool: ['C', 'E', 'G'], focus: 'E', count: 400, reference: 'every' }, mulberry32(2));
    const e = share(rounds, r => r.target === 4);
    expect(e).toBeGreaterThan(0.4);
    expect(e).toBeLessThan(0.6);
  });

  it('plays pairs back to back, with C above B', () => {
    const pairs = [['D', 'E'], ['B', 'C']];
    const rounds = makeRounds({ pool: ['D', 'E', 'B', 'C'], pairs, count: 16, reference: 'every' }, mulberry32(3));
    expect(rounds).toHaveLength(16);
    for (let k = 0; k < 16; k += 2) {
      const two = [rounds[k].target, rounds[k + 1].target].sort((a, b) => a - b);
      expect([[2, 4], [0, 11]]).toContainEqual(two);
      for (const r of [rounds[k], rounds[k + 1]]) expect(r.oct).toBe(r.target === 0 && two[1] === 11 ? 1 : 0);
    }
  });

  it('only references the first round with reference "start"', () => {
    const rounds = makeRounds({ pool: ['C', 'D', 'E'], count: 10, reference: 'start' }, mulberry32(4));
    expect(rounds.map(r => r.reference)).toEqual([true, ...Array(9).fill(false)]);
  });

  it('references about half the rounds with "sometimes", always the first', () => {
    const rounds = makeRounds({ pool: ['C', 'D', 'E'], count: 400, reference: 'sometimes' }, mulberry32(5));
    expect(rounds[0].reference).toBe(true);
    const s = share(rounds, r => r.reference);
    expect(s).toBeGreaterThan(0.4);
    expect(s).toBeLessThan(0.6);
  });

  it('spreads rounds over the given octaves', () => {
    const rounds = makeRounds({ pool: ['C', 'D', 'E'], count: 60, reference: 'start', octaves: [-1, 0, 1] }, mulberry32(6));
    expect(new Set(rounds.map(r => r.oct))).toEqual(new Set([-1, 0, 1]));
  });

  it('picks a voice per round only when randomVoice is on', () => {
    const voices = ['piano', 'organ'];
    const random = makeRounds({ pool: ['C', 'D'], count: 20, reference: 'every', randomVoice: true }, mulberry32(7), voices);
    for (const r of random) expect(voices).toContain(r.voice);
    const plain = makeRounds({ pool: ['C', 'D'], count: 5, reference: 'every' }, mulberry32(7), voices);
    for (const r of plain) expect(r.voice).toBeNull();
  });
});

describe('isCorrect', () => {
  it('matches pitch class in any octave', () => {
    expect(isCorrect(4, 4)).toBe(true);
    expect(isCorrect(4, 16)).toBe(true);
    expect(isCorrect(4, 5)).toBe(false);
  });
});
