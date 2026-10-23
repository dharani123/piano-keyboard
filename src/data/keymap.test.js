import { describe, it, expect } from 'vitest';
import { noteCodeFor, byCode, keyForCode, keyAt, LAYOUTS, playable } from './keymap.js';

const notes = (shift, codes) => codes.map(c => keyForCode(c, shift)?.note ?? '-').join(' ');
const HOME = ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'];
const UPPER = ['KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight'];

describe('normal layout', () => {
  it('lays C–B along S D F G H J K with no gap', () => {
    expect(['KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK'].map(c => byCode[c].note).join(' ')).toBe('C D E F G A B');
    expect(['KeyE', 'KeyR', 'KeyY', 'KeyU', 'KeyI'].map(c => byCode[c].note).join(' ')).toBe('C# D# F# G# A#');
    expect(byCode.KeyA).toBeUndefined();
  });

  it("continues into the next octave on L ; ' Enter, sharps on P [", () => {
    const high = ['KeyL', 'KeyP', 'Semicolon', 'BracketLeft', 'Quote', 'Enter'].map(c => byCode[c]);
    expect(high.map(k => k.note).join(' ')).toBe('C C# D D# E F');
    expect(high.every(k => k.octaveUp === 1)).toBe(true);
    expect(byCode.BracketRight).toBeUndefined();
  });

  it('runs middle C to high F in half steps', () => {
    expect([...playable(0)].sort((a, b) => a - b)).toEqual(Array.from({ length: 18 }, (_, i) => i));
  });
});

describe('shifted layouts', () => {
  it('+2 puts middle C on F and the low G A B on A S D', () => {
    expect(notes(2, HOME)).toBe('G A B C D E F G A B C D');
    expect(notes(2, UPPER)).toBe('G# A# - C# D# - F# G# A# - C#');
    expect(keyAt(0, 0, 2).code).toBe('KeyF');
    expect(keyAt(7, -1, 2).code).toBe('KeyA');
  });

  it('-2 runs the row from D up to the high A', () => {
    expect(notes(-2, HOME)).toBe('D E F G A B C D E F G A');
    expect(notes(-2, UPPER)).toBe('D# - F# G# A# - C# D# - F# G#');
    expect(keyAt(7, 1, -2).code).toBe('Quote');
  });

  it('places every black key between its two white keys', () => {
    for (const keys of Object.values(LAYOUTS)) {
      const whites = keys.filter(k => k.type === 'white');
      for (const b of keys.filter(k => k.type === 'black')) {
        expect(whites[b.after].octaveUp * 12 + whites[b.after].semitone + 1).toBe(b.octaveUp * 12 + b.semitone);
      }
    }
  });
});

describe('noteCodeFor', () => {
  it('only letters (and ; \' [ ] Enter) play notes', () => {
    expect(noteCodeFor('KeyS')).toBe('KeyS');
    expect(noteCodeFor('KeyA')).toBe('KeyA');
    expect(noteCodeFor('Digit3')).toBeNull();
    expect(noteCodeFor('F3')).toBeNull();
    expect(noteCodeFor('Backquote')).toBeNull();
    expect(noteCodeFor('KeyZ')).toBeNull();
  });
});
