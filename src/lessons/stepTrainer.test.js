import { describe, it, expect } from 'vitest';
import { startSteps, stepReducer, currentStep, octaveShiftNeeded, starsForMistakes } from './stepTrainer.js';
import { parseNotes } from '../data/songs.js';

const step = text => ({ notes: parseNotes(text), label: text });
const press = (s, semitone, octave = 4, held = [], code = 'KeyX') =>
  stepReducer(s, { type: 'press', semitone, octave, code, held });

describe('stepTrainer', () => {
  it('advances on the right key and finishes', () => {
    let s = startSteps([step('E'), step('D')], 4);
    s = press(s, 4);
    expect(s.index).toBe(1);
    s = press(s, 2);
    expect(s.status).toBe('done');
    expect(currentStep(s)).toBeNull();
  });

  it('counts mistakes per step and overall', () => {
    let s = startSteps([step('E'), step('D')], 4);
    s = press(s, 0, 4, [], 'KeyA');
    s = press(s, 0, 4, [], 'KeyA');
    expect(s.stepMistakes).toBe(2);
    expect(s.wrong.code).toBe('KeyA');
    s = press(s, 4);
    expect(s.stepMistakes).toBe(0);
    expect(s.mistakes).toBe(2);
  });

  it("needs no octave shift for high C–F, since L ; ' Enter play them", () => {
    expect(octaveShiftNeeded(startSteps([step('C+')], 4), 4)).toBe(0);
    expect(octaveShiftNeeded(startSteps([step('F+')], 4), 4)).toBe(0);
    expect(octaveShiftNeeded(startSteps([step('G+')], 4), 4)).toBe(1);
  });

  it('requires the right octave', () => {
    let s = startSteps([step('G-')], 4);
    expect(octaveShiftNeeded(s, 4)).toBe(-1);
    s = press(s, 7, 4);
    expect(s.index).toBe(0);
    s = press(s, 7, 3);
    expect(s.status).toBe('done');
  });

  it('completes a chord only when all notes are held', () => {
    let s = startSteps([step('C E G')], 4);
    s = press(s, 0, 4, [{ semitone: 0, octave: 4 }]);
    s = press(s, 4, 4, [{ semitone: 0, octave: 4 }, { semitone: 4, octave: 4 }]);
    expect(s.index).toBe(0);
    s = press(s, 7, 4, [{ semitone: 0, octave: 4 }, { semitone: 4, octave: 4 }, { semitone: 7, octave: 4 }]);
    expect(s.status).toBe('done');
    expect(s.mistakes).toBe(0);
  });

  it('a wrong note during a chord is a mistake', () => {
    let s = startSteps([step('C E G')], 4);
    s = press(s, 2, 4, [{ semitone: 2, octave: 4 }]);
    expect(s.mistakes).toBe(1);
  });

  it('awards stars by mistakes', () => {
    expect(starsForMistakes(0, 10)).toBe(3);
    expect(starsForMistakes(2, 10)).toBe(2);
    expect(starsForMistakes(5, 10)).toBe(1);
  });
});

describe('D major chord step (keyboard drops the third key)', () => {
  const n = (semitone, oct = 0) => ({ semitone, oct });
  const D = { notes: [n(2), n(6), n(9)], label: 'D' };
  const E = { notes: [n(4), n(8), n(11)], label: 'E' };
  const press = (state, semitone, held = []) =>
    stepReducer(state, { type: 'press', semitone, octave: 4, code: 'x', held: held.map(s => ({ semitone: s, octave: 4 })) });

  it('stays on the chord after one key', () => {
    expect(press(startSteps([D, E], 4), 2).index).toBe(0);
  });

  it.each([[2, 9, 6], [2, 6, 9], [6, 9, 2]])('completes on %i + %i and reports %i as the note to fill in', (a, b, missing) => {
    const s = press(press(startSteps([D, E], 4), a), b, [a]);
    expect(s.index).toBe(1);
    expect(s.filled.notes.map(x => x.semitone)).toEqual([missing]);
  });

  it('does not count the third key as a mistake when the keyboard does catch it', () => {
    let s = press(press(startSteps([D, E], 4), 2), 6, [2]);
    s = press(s, 9, [2, 6]);
    expect(s.mistakes).toBe(0);
    expect(s.index).toBe(1);
  });

  it('still counts a truly wrong key, and stops forgiving once the next chord is done', () => {
    let s = press(press(startSteps([D, E, E], 4), 2), 9, [2]);
    expect(press(s, 0).mistakes).toBe(1);
    s = press(press(press(s, 4), 8, [4]), 11, [4, 8]);
    expect(press(s, 6).mistakes).toBe(1);
  });

  it('leaves the fill-in to the app when it already played the third note', () => {
    const first = press(startSteps([D, E], 4), 2);
    const s = stepReducer(first, { type: 'press', semitone: 9, octave: 4, code: 'x', held: [{ semitone: 2, octave: 4 }], chordFilled: true });
    expect(s.index).toBe(1);
    expect(s.filled).toBeFalsy();
  });

  it('leaves normal chords needing every key', () => {
    const s = press(press(startSteps([E, E], 4), 4), 8, [4]);
    expect(s.index).toBe(0);
    expect(s.filled).toBeFalsy();
  });
});

