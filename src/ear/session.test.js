import { describe, it, expect } from 'vitest';
import { startSession, earReducer } from './session.js';

const round = target => ({ target, oct: 0, reference: true, voice: null });
const rounds = targets => targets.map(round);
const run = (state, ...actions) => actions.reduce(earReducer, state);
const ready = targets => run(startSession(rounds(targets)), { type: 'prompted' });

describe('earReducer', () => {
  it('ignores presses while the prompt is still playing', () => {
    const s = startSession(rounds([4, 2]));
    expect(earReducer(s, { type: 'press', semitone: 4 })).toBe(s);
  });

  it('records a right answer and advances to the next prompt', () => {
    let s = run(ready([4, 2]), { type: 'press', semitone: 16 });
    expect(s.last).toEqual({ answered: 16, correct: true });
    expect(s.answers).toEqual([{ target: 4, answered: 16 }]);
    expect(s.mistakes).toBe(0);
    s = earReducer(s, { type: 'advance' });
    expect(s.index).toBe(1);
    expect(s.phase).toBe('prompt');
  });

  it('counts a round with wrong presses as one mistake and waits for the fix', () => {
    let s = run(ready([4, 2]), { type: 'press', semitone: 2 });
    expect(s.phase).toBe('fix');
    expect(s.mistakes).toBe(1);
    expect(s.answers).toEqual([{ target: 4, answered: 2 }]);
    s = earReducer(s, { type: 'press', semitone: 5 });
    expect(s.mistakes).toBe(1);
    s = earReducer(s, { type: 'press', semitone: 4 });
    expect(s.last.correct).toBe(true);
    expect(s.answers).toHaveLength(1);
    expect(earReducer(s, { type: 'advance' }).index).toBe(1);
  });

  it('ignores presses after a right answer until advance', () => {
    const s = run(ready([4, 2]), { type: 'press', semitone: 4 });
    expect(earReducer(s, { type: 'press', semitone: 9 })).toBe(s);
  });

  it('treats a timeout as a wrong answer with nothing played', () => {
    const s = earReducer(ready([4, 2]), { type: 'timeout' });
    expect(s.phase).toBe('fix');
    expect(s.mistakes).toBe(1);
    expect(s.answers).toEqual([{ target: 4, answered: null }]);
    expect(earReducer(s, { type: 'timeout' })).toBe(s);
    const prompting = startSession(rounds([4]));
    expect(earReducer(prompting, { type: 'timeout' })).toBe(prompting);
  });

  it('finishes after the last round', () => {
    const s = run(ready([4]), { type: 'press', semitone: 4 }, { type: 'advance' });
    expect(s.phase).toBe('done');
  });

  it('replaces only the rounds still to come', () => {
    let s = ready([0, 2, 4, 5, 7, 9]);
    s = { ...s, index: 3 };
    s = earReducer(s, { type: 'replaceUpcoming', rounds: rounds([11, 11, 11, 11, 1, 1]) });
    expect(s.rounds.map(r => r.target)).toEqual([0, 2, 4, 5, 1, 1]);
  });
});
