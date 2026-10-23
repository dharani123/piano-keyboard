import { describe, it, expect } from 'vitest';
import { parseSong } from './parse.js';
import { createPlay, press, advance, score, pitchKey } from './player.js';
import { SONG_LIBRARY } from './library.js';

const song = text => parseSong(text);
const held = (...pairs) => new Set(pairs.map(([s, o]) => pitchKey(s, o)));

describe('parseSong', () => {
  it('reads lengths, rests, chords and octave marks', () => {
    const { events, totalBeats } = parseSong('C D/2 | r C,E,G+/4');
    expect(events.map(e => [e.beat, e.beats, e.notes.map(n => n.name + n.oct)])).toEqual([
      [0, 1, ['C0']],
      [1, 2, ['D0']],
      [4, 4, ['C0', 'E0', 'G1']],
    ]);
    expect(totalBeats).toBe(8);
  });

  it('rejects bad notes', () => {
    expect(() => parseSong('H')).toThrow();
  });
});

describe('wait mode', () => {
  it('stops at a note until it is pressed', () => {
    const s = createPlay(song('r C/2'), { mode: 'wait', baseOctave: 4, secondsPerBeat: 0.5 });
    advance(s, 3, held());
    expect(s.beat).toBe(1);
    expect(press(s, 0, 4)).not.toBeNull();
    advance(s, 1, held([0, 4]));
    expect(s.beat).toBe(2);
  });

  it('needs every note of a chord before moving on', () => {
    const s = createPlay(song('C,E,G/2'), { mode: 'wait', baseOctave: 4, secondsPerBeat: 0.5 });
    press(s, 0, 4);
    press(s, 4, 4);
    advance(s, 1, held([0, 4], [4, 4]));
    expect(s.beat).toBe(0);
    press(s, 7, 4);
    advance(s, 1, held([0, 4], [4, 4], [7, 4]));
    expect(s.beat).toBe(1);
  });

  it('a held key does not count for the next repeat of that note', () => {
    const s = createPlay(song('C C'), { mode: 'wait', baseOctave: 4, secondsPerBeat: 0.5 });
    press(s, 0, 4);
    advance(s, 2, held([0, 4]));
    expect(s.beat).toBe(1);
  });
});

describe('play mode', () => {
  it('keeps going and marks notes you skip as missed', () => {
    const s = createPlay(song('C D'), { mode: 'play', baseOctave: 4, secondsPerBeat: 0.5 });
    advance(s, 2.5, held());
    expect(s.beat).toBe(2.5);
    expect(s.notes.every(n => n.missed)).toBe(true);
    expect(s.done).toBe(true);
  });

  it('only accepts presses close to the note', () => {
    const s = createPlay(song('r r C'), { mode: 'play', baseOctave: 4, secondsPerBeat: 0.5 });
    expect(press(s, 0, 4)).toBeNull();
    advance(s, 1.8, held());
    expect(press(s, 0, 4)).not.toBeNull();
  });
});

describe('score', () => {
  it('gives full marks for hitting and holding, half for a tap', () => {
    const s = createPlay(song('C/2 D/2'), { mode: 'play', baseOctave: 4, secondsPerBeat: 0.5 });
    press(s, 0, 4);
    advance(s, 2, held([0, 4]));
    press(s, 2, 4);
    advance(s, 0.1, held([2, 4]));
    advance(s, 2, held());
    const r = score(s);
    expect(r.hits).toBe(2);
    expect(r.fullHolds).toBe(1);
    expect(r.accuracy).toBeCloseTo((1 + 0.5 + 0.5 * (0.1 / 1.7)) / 2);
  });

  it('takes a little off for wrong keys', () => {
    const s = createPlay(song('C'), { mode: 'wait', baseOctave: 4, secondsPerBeat: 0.5 });
    press(s, 5, 4);
    press(s, 0, 4);
    advance(s, 1, held([0, 4]));
    expect(score(s).accuracy).toBeCloseTo(0.9);
  });
});

describe('song library', () => {
  it('keeps every note on the on-screen keys (C up to the high F)', () => {
    for (const s of SONG_LIBRARY) {
      for (const e of s.events) {
        for (const n of e.notes) {
          const ok = n.oct === 0 || (n.oct === 1 && n.semitone <= 5);
          expect(ok, `${s.title}: ${n.name}${n.oct}`).toBe(true);
        }
      }
    }
  });

  it('names every chord in the chord tracks', () => {
    for (const s of SONG_LIBRARY.filter(s => s.chords)) {
      expect(s.events.every(e => e.label)).toBe(true);
    }
  });
});
