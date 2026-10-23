import { describe, it, expect } from 'vitest';
import { parseSwaras, carnaticSongs, CARNATIC, RAGAS } from './carnatic.js';

const line = song => song.events.map(e => e.notes[0].name[0] + (e.beats > 1 ? `/${e.beats}` : '')).join(' ');

describe('parseSwaras', () => {
  it('maps swaras to the raga and holds notes on ","', () => {
    const { events, totalBeats } = parseSwaras("S R G , | P S'", 'mayamalavagowla');
    expect(events.map(e => [e.notes[0].semitone, e.notes[0].oct, e.beat, e.beats])).toEqual([
      [0, 0, 0, 1], [1, 0, 1, 1], [4, 0, 2, 2], [7, 0, 4, 1], [0, 1, 5, 1],
    ]);
    expect(totalBeats).toBe(6);
  });

  it('labels swaras with their full names', () => {
    const { events } = parseSwaras("S R G M P D N S'", 'mayamalavagowla');
    expect(events.map(e => e.notes[0].name)).toEqual(['Sa', 'Ri', 'Ga', 'Ma', 'Pa', 'Da', 'Ni', 'Ṡa']);
  });

  it('uses the white keys in Shankarabharanam', () => {
    const { events } = parseSwaras('R D', 'shankarabharanam');
    expect(events.map(e => e.notes[0].semitone)).toEqual([2, 9]);
  });

  it('rejects bad swaras', () => {
    expect(() => parseSwaras('S X', 'mayamalavagowla')).toThrow();
  });
});

describe('exercises', () => {
  it('has the 14 sarali varisais and fills whole Adi talam cycles', () => {
    expect(CARNATIC.filter(c => c.level === 'Sarali Varisai')).toHaveLength(14);
    for (const raga of Object.keys(RAGAS)) {
      for (const s of carnaticSongs(raga)) expect(s.totalBeats % 8, s.title).toBe(0);
    }
  });

  it('writes janta varisai 1 as doubled swaras up and back down', () => {
    const [j1] = carnaticSongs('mayamalavagowla').filter(s => s.id.startsWith('janta-1'));
    expect(line(j1).startsWith('S S R R G G M M R R G G M M P P')).toBe(true);
    expect(line(j1).endsWith('M M G G R R S S')).toBe(true);
    expect(j1.totalBeats).toBe(80);
  });

  it('writes janta varisai 2 with the turn-back shape', () => {
    const j2 = carnaticSongs('mayamalavagowla').find(s => s.id.startsWith('janta-2'));
    expect(line(j2).startsWith('S S R R G G R R S S R R G G M M')).toBe(true);
    expect(line(j2).endsWith('M M G G R R G G M M G G R R S S')).toBe(true);
  });
});
