import { describe, it, expect } from 'vitest';
import { noteCodeFor, byCode, shownCode, TOP_ROW } from './keymap.js';

describe('noteCodeFor', () => {
  it('keeps home-row and top-row keys as they are', () => {
    expect(noteCodeFor('KeyS')).toBe('KeyS');
    expect(noteCodeFor('KeyY')).toBe('KeyY');
  });

  it('makes the number row G A B | C–B | C D E F across three octaves', () => {
    const row = ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7',
      'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'];
    expect(row.map(c => byCode[c].note).join(' ')).toBe('G A B C D E F G A B C D E F');
    expect(row.map(c => byCode[c].octaveUp).join('')).toBe([-1, -1, -1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1].join(''));
  });

  it('puts each sharp on the F-key just after its digit (F3 = C#)', () => {
    const f = ['F1', 'F3', 'F4', 'F6', 'F7', 'F8', 'F10', 'F11'];
    expect(f.map(c => byCode[c].note).join(' ')).toBe('A# C# D# F# G# A# C# D#');
  });

  it('runs upward in half steps with no repeats', () => {
    const pitches = TOP_ROW.map(k => k.octaveUp * 12 + k.semitone);
    // only the low G# (no F-key between ` and 1) is skipped
    expect(pitches).toEqual([-5, -3, -2, -1, ...Array.from({ length: 18 }, (_, i) => i)]);
  });

  it('lights the on-screen key with the same note name', () => {
    expect(shownCode('Digit3')).toBe('KeyS');
    expect(shownCode('Digit0')).toBe('KeyL');
    expect(shownCode('F6')).toBe('KeyY');
    expect(shownCode('Backspace')).toBe('Enter');
    expect(shownCode('F11')).toBe('BracketLeft');
    expect(shownCode('KeyK')).toBe('KeyK');
  });

  it('lays C–B along S D F G H J K with no gap', () => {
    expect(['KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'].map(c => byCode[c].note).join(' ')).toBe('C D E F G A B');
    expect(['KeyE', 'KeyR', 'KeyY', 'KeyU', 'KeyI'].map(c => byCode[c].note).join(' ')).toBe('C# D# F# G# A#');
    expect(noteCodeFor('KeyA')).toBeNull();
  });

  it("continues into the next octave on L ; ' Enter, sharps on P [", () => {
    const high = ['KeyL', 'KeyP', 'Semicolon', 'BracketLeft', 'Quote', 'Enter'].map(c => byCode[c]);
    expect(high.map(k => k.note).join(' ')).toBe('C C# D D# E F');
    expect(high.every(k => k.octaveUp === 1)).toBe(true);
    expect(noteCodeFor('BracketRight')).toBeNull();
  });

  it("plays C one octave up on 'L'", () => {
    expect(noteCodeFor('KeyL')).toBe('KeyL');
    expect(byCode.KeyL).toMatchObject({ note: 'C', semitone: 0, octaveUp: 1 });
  });

  it('ignores keys that play nothing', () => {
    expect(noteCodeFor('KeyZ')).toBeNull();
    expect(noteCodeFor('F5')).toBeNull();
  });
});
