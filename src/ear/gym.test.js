import { describe, it, expect } from 'vitest';
import { gymPool, gymRounds, afterAnswer } from './gym.js';
import { emptyStats, DEFAULT_SETTINGS } from './stats.js';

const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const settings = over => ({ ...DEFAULT_SETTINGS, ...over });

describe('gymPool', () => {
  it('is all twelve notes on auto', () => expect(gymPool(settings())).toEqual(ALL));
  it('uses the custom pick', () => expect(gymPool(settings({ pool: [0, 4] }))).toEqual([0, 4]));
  it('falls back to all twelve when the custom pick is empty', () => {
    expect(gymPool(settings({ pool: [] }))).toEqual(ALL);
  });
});

describe('gymRounds', () => {
  it('builds rounds from the pool with no immediate repeats', () => {
    const { rounds } = gymRounds(emptyStats(), settings({ pool: [0, 7] }), 20, { prev: null, followUp: null }, 0);
    expect(rounds).toHaveLength(20);
    rounds.slice(1).forEach((r, i) => expect(r.target).not.toBe(rounds[i].target));
    for (const r of rounds) expect(r).toMatchObject({ oct: 0, reference: true, voice: null });
  });

  it('references only the session start with "start"', () => {
    const first = gymRounds(emptyStats(), settings({ reference: 'start' }), 5, { prev: null, followUp: null }, 0).rounds;
    expect(first.map(r => r.reference)).toEqual([true, false, false, false, false]);
    const later = gymRounds(emptyStats(), settings({ reference: 'start' }), 3, { prev: null, followUp: null }, 5).rounds;
    expect(later.map(r => r.reference)).toEqual([false, false, false]);
  });

  it('spreads over three octaves and random voices when asked', () => {
    const { rounds } = gymRounds(emptyStats(), settings({ octaves: 'three', randomVoice: true }), 60, { prev: null, followUp: null }, 0);
    expect(new Set(rounds.map(r => r.oct))).toEqual(new Set([-1, 0, 1]));
    for (const r of rounds) expect(r.voice).toBeTypeOf('string');
  });
});

describe('afterAnswer', () => {
  it('keeps upcoming rounds after a right answer', () => {
    const rounds = gymRounds(emptyStats(), settings(), 20, { prev: null, followUp: null }, 0).rounds;
    expect(afterAnswer(emptyStats(), settings(), rounds, 3, 4, 4)).toBe(rounds);
  });

  it('reshapes upcoming rounds around the confused pair after a wrong answer', () => {
    const rounds = gymRounds(emptyStats(), settings(), 20, { prev: null, followUp: null }, 0).rounds;
    const next = afterAnswer(emptyStats(), settings(), rounds, 3, 4, 2);
    expect(next).toHaveLength(20);
    expect(next.slice(0, 4)).toEqual(rounds.slice(0, 4));
    // 3 follow-up rounds at 50% from {4, 2} plus weighted picks: at least one should land in the pair over many tries
    let hits = 0;
    for (let i = 0; i < 200; i++) {
      const n = afterAnswer(emptyStats(), settings(), rounds, 3, 4, 2);
      if (n.slice(4, 7).some(r => r.target === 4 || r.target === 2)) hits++;
    }
    expect(hits / 200).toBeGreaterThan(0.8);
  });

  it('does not reshape after a timeout', () => {
    const rounds = gymRounds(emptyStats(), settings(), 20, { prev: null, followUp: null }, 0).rounds;
    expect(afterAnswer(emptyStats(), settings(), rounds, 3, 4, null)).toBe(rounds);
  });
});
