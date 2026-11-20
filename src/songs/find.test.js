import { describe, it, expect } from 'vitest';
import { findNotes, step, isNext } from './find.js';
import { parseSong } from './parse.js';

describe('find one by one', () => {
  it('takes the top note of a chord, with its beat', () => {
    const song = parseSong('C E/2 | C,E,G/4');
    expect(findNotes(song)).toEqual([
      { semitone: 0, oct: 0, beat: 0, beats: 1 },
      { semitone: 4, oct: 0, beat: 1, beats: 2 },
      { semitone: 7, oct: 0, beat: 3, beats: 4 },
    ]);
    expect(findNotes(parseSong('B,C+'))[0]).toMatchObject({ semitone: 0, oct: 1 });
  });

  it('moves the cursor on the next note only, and finds the note after the last one found', () => {
    const notes = findNotes(parseSong('E G F D')).map(n => ({ semitone: n.semitone, oct: n.oct }));
    const play = (state, ...keys) => keys.reduce((st, k) => step(st, notes, k, 0), state);
    expect(play({ run: 0, found: 0 }, 4)).toEqual({ run: 1, found: 1 });
    expect(play({ run: 0, found: 0 }, 4, 0, 2, 7)).toEqual({ run: 2, found: 2 }); // wrong keys change nothing
    expect(play({ run: 2, found: 2 }, 4)).toEqual({ run: 2, found: 2 }); // only the next note after the cursor counts
    expect(play({ run: 0, found: 2 }, 4, 7)).toEqual({ run: 2, found: 2 }); // from the start again
    expect(play({ run: 1, found: 2 }, 5)).toEqual({ run: 1, found: 2 }); // the 3rd note is only found in line
    expect(play({ run: 1, found: 2 }, 7, 5)).toEqual({ run: 3, found: 3 });
    expect(play({ run: 3, found: 3 }, 2)).toEqual({ run: 4, found: 4 });
    expect(play({ run: 4, found: 4 }, 2)).toEqual({ run: 4, found: 4 }); // the end
  });

  it('needs the same key in the same octave', () => {
    const note = { semitone: 2, oct: 0 };
    expect(isNext(note, 2, 0)).toBe(true);
    expect(isNext(note, 2, 1)).toBe(false);
    expect(isNext(note, 4, 0)).toBe(false);
    expect(isNext(undefined, 2, 0)).toBe(false);
  });
});
