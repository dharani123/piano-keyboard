import { describe, it, expect, beforeEach } from 'vitest';
import {
  emptyStats, loadStats, recordAnswer, accuracy, level, topConfusions, streak, weightFor, pickNext,
} from './stats.js';

const DAY = '2026-10-21';
const answerMany = (s, target, results) =>
  results.reduce((acc, ok) => recordAnswer(acc, target, ok ? target : (target + 1) % 12, DAY), s);

describe('recordAnswer', () => {
  it('records a wrong answer, its confusion and the day', () => {
    const s = recordAnswer(emptyStats(), 4, 2, DAY);
    expect(s.notes[4]).toEqual({ recent: [false], right: 0, wrong: 1 });
    expect(s.confusions[4][2]).toBe(1);
    expect(s.days).toEqual([DAY]);
  });

  it('records a timeout as wrong without a confusion', () => {
    const s = recordAnswer(emptyStats(), 4, null, DAY);
    expect(s.notes[4].wrong).toBe(1);
    expect(s.confusions[4]).toBeUndefined();
  });

  it('counts an octave-shifted answer as right', () => {
    expect(recordAnswer(emptyStats(), 4, 16, DAY).notes[4].right).toBe(1);
  });

  it('keeps only the last 50 answers', () => {
    const s = answerMany(emptyStats(), 0, Array(60).fill(true));
    expect(s.notes[0].recent).toHaveLength(50);
    expect(s.notes[0].right).toBe(60);
  });

  it('lists each practice day once', () => {
    let s = recordAnswer(emptyStats(), 0, 0, DAY);
    s = recordAnswer(s, 0, 0, DAY);
    s = recordAnswer(s, 0, 0, '2026-10-20');
    expect(s.days).toEqual(['2026-10-20', DAY]);
  });
});

describe('accuracy and level', () => {
  it('is new under 5 answers', () => {
    expect(level(answerMany(emptyStats(), 0, [true, true, true, true]), 0)).toBe('new');
  });
  it('is mastered at 90%+ over the last 20', () => {
    const s = answerMany(emptyStats(), 0, [...Array(18).fill(true), false, false]);
    expect(accuracy(s, 0)).toEqual({ rate: 0.9, n: 20 });
    expect(level(s, 0)).toBe('mastered');
  });
  it('is ok between 60% and 90%, weak below', () => {
    expect(level(answerMany(emptyStats(), 0, [...Array(15).fill(true), ...Array(5).fill(false)]), 0)).toBe('ok');
    expect(level(answerMany(emptyStats(), 0, [...Array(5).fill(true), ...Array(15).fill(false)]), 0)).toBe('weak');
  });
  it('only looks at the last 20 answers', () => {
    const s = answerMany(emptyStats(), 0, [...Array(30).fill(false), ...Array(20).fill(true)]);
    expect(accuracy(s, 0).rate).toBe(1);
  });
});

describe('topConfusions', () => {
  it('sorts confusions by count', () => {
    let s = emptyStats();
    for (let i = 0; i < 3; i++) s = recordAnswer(s, 2, 4, DAY);
    s = recordAnswer(s, 9, 11, DAY);
    for (let i = 0; i < 2; i++) s = recordAnswer(s, 5, 4, DAY);
    expect(topConfusions(s, 2)).toEqual([
      { target: 2, heardAs: 4, count: 3 },
      { target: 5, heardAs: 4, count: 2 },
    ]);
  });
});

describe('streak', () => {
  const s = { ...emptyStats(), days: ['2026-10-19', '2026-10-20', '2026-10-21'] };
  it('counts consecutive days ending today', () => expect(streak(s, '2026-10-21')).toBe(3));
  it('still counts when today has no practice yet', () => expect(streak(s, '2026-10-22')).toBe(3));
  it('resets after a missed day', () => expect(streak(s, '2026-10-23')).toBe(0));
  it('works across a month boundary', () => {
    expect(streak({ ...emptyStats(), days: ['2026-10-31', '2026-11-01'] }, '2026-11-01')).toBe(2);
  });
});

describe('weightFor', () => {
  it('boosts notes with few answers', () => expect(weightFor(emptyStats(), 0)).toBe(2));
  it('boosts notes that are always wrong', () => {
    expect(weightFor(answerMany(emptyStats(), 0, Array(20).fill(false)), 0)).toBe(4);
  });
});

describe('pickNext', () => {
  it('returns the only note in a one-note pool', () => {
    expect(pickNext(emptyStats(), [0], { prev: 0, followUp: null }).target).toBe(0);
  });

  it('does not repeat the previous note outside a follow-up', () => {
    for (let i = 0; i < 100; i++) {
      expect(pickNext(emptyStats(), [0, 7], { prev: 0, followUp: null }).target).toBe(7);
    }
  });

  it('favours the confused pair during a follow-up and counts it down', () => {
    let inPair = 0;
    for (let i = 0; i < 1000; i++) {
      const { target } = pickNext(emptyStats(), [0, 2, 4, 5, 7, 9, 11], { prev: 4, followUp: { pair: [4, 2], left: 3 } });
      if (target === 4 || target === 2) inPair++;
    }
    expect(inPair / 1000).toBeGreaterThan(0.5);
    let ctx = { prev: 4, followUp: { pair: [4, 2], left: 3 } };
    for (const left of [2, 1]) {
      ctx = pickNext(emptyStats(), [0, 2, 4], ctx).ctx;
      expect(ctx.followUp.left).toBe(left);
    }
    ctx = pickNext(emptyStats(), [0, 2, 4], ctx).ctx;
    expect(ctx.followUp).toBeNull();
  });

  it('picks weak notes more often', () => {
    const s = answerMany(emptyStats(), 4, Array(20).fill(false));
    let e = 0;
    for (let i = 0; i < 1000; i++) if (pickNext(s, [0, 4, 7], { prev: null, followUp: null }).target === 4) e++;
    expect(e / 1000).toBeGreaterThan(0.4); // weight 4 of 4+2+2
  });
});

describe('loadStats', () => {
  let store;
  beforeEach(() => {
    store = {};
    globalThis.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  });

  it('falls back to empty stats on corrupt data', () => {
    store['desk-piano-ear'] = '{bad json';
    expect(loadStats()).toEqual(emptyStats());
  });

  it('falls back to empty stats when nothing is saved', () => {
    expect(loadStats()).toEqual(emptyStats());
  });
});

describe('todayRounds', () => {
  it('counts answers given today only', async () => {
    const { todayRounds } = await import('./stats.js');
    let s = recordAnswer(emptyStats(), 0, 0, '2026-10-20');
    s = recordAnswer(s, 0, 0, DAY);
    s = recordAnswer(s, 2, 4, DAY);
    expect(todayRounds(s, DAY)).toBe(2);
    expect(todayRounds(s, '2026-10-22')).toBe(0);
  });
});
