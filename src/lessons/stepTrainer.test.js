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
