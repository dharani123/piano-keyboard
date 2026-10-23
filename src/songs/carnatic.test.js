import { describe, it, expect } from 'vitest';
import { parseSwaras, carnaticSongs, CARNATIC, CARNATIC_LEVELS, RAGAS } from './carnatic.js';
import { keyAt } from '../data/keymap.js';

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

  it('puts N. in the lower octave and moves everything with Sa', () => {
    const { events } = parseSwaras('N. S', 'mayamalavagowla');
    expect(events.map(e => [e.notes[0].name, e.notes[0].semitone, e.notes[0].oct])).toEqual([['N\u0323i', 11, -1], ['Sa', 0, 0]]);
    const moved = parseSwaras("S P S'", 'mayamalavagowla', -3);
    expect(moved.events.map(e => [e.notes[0].semitone, e.notes[0].oct])).toEqual([[9, -1], [4, 0], [9, 0]]);
  });

  it('rejects bad swaras', () => {
    expect(() => parseSwaras('S X', 'mayamalavagowla')).toThrow();
  });
});

describe('exercises', () => {
  it('has all 72 melakartas in order, with the Ma1/Ma2 split at 37', () => {
    const list = Object.values(RAGAS);
    expect(list.map(r => r.number)).toEqual(Array.from({ length: 72 }, (_, i) => i + 1));
    expect(RAGAS.mayamalavagowla.number).toBe(15);
    expect(RAGAS.shankarabharanam.number).toBe(29);
    expect(RAGAS.kalyani.number).toBe(65);
    expect(list.filter(r => r.semitones.M === 6)[0].number).toBe(37);
    expect(Object.values(RAGAS.hanumatodi.semitones)).toEqual([0, 1, 3, 5, 7, 8, 10]);
    expect(Object.values(RAGAS.rasikapriya.semitones)).toEqual([0, 3, 4, 6, 7, 10, 11]);
  });

  it('has the whole beginner course and fills whole talam cycles', () => {
    expect(CARNATIC_LEVELS.map(l => CARNATIC.filter(c => c.level === l).length)).toEqual([14, 12, 3, 5, 5, 7]);
    for (const raga of Object.keys(RAGAS)) {
      for (const s of carnaticSongs(raga)) expect(s.totalBeats % s.talam.beats, s.title).toBe(0);
    }
  });

  it('keeps every note on a key, sliding the keys before moving Sa', () => {
    for (const raga of Object.keys(RAGAS)) {
      for (const s of carnaticSongs(raga)) {
        for (const e of s.events) expect(keyAt(e.notes[0].semitone, e.notes[0].oct, s.layout), s.id).toBeTruthy();
        if (!/^(mel|mandra)-/.test(s.id)) expect([s.sa, s.layout], s.id).toEqual([0, 0]);
      }
    }
    const moved = carnaticSongs('mayamalavagowla').filter(s => s.sa || s.layout).map(s => `${s.id.split('@')[0]} ${s.sa} ${s.layout}`);
    expect(moved).toEqual(['mel-5 2 -2', 'mandra-1 0 2', 'mandra-2 0 2', 'mandra-3 0 2', 'mandra-4 0 2', 'mandra-5 2 2']);
  });

  it('writes janta varisais 1–3 as doubled swaras up and back down', () => {
    const [j1, j2, j3] = carnaticSongs('mayamalavagowla').filter(s => s.id.startsWith('janta-'));
    expect(line(j1)).toBe('S S R R G G M M P P D D N N S S S S N N D D P P M M G G R R S S');
    expect(line(j2).startsWith('S S R R G G M M R R G G M M P P')).toBe(true);
    expect(line(j2).endsWith('M M G G R R S S')).toBe(true);
    expect(j2.totalBeats).toBe(80);
    expect(line(j3).startsWith('S S R R G G R R S S R R G G M M')).toBe(true);
    expect(line(j3).endsWith('M M G G R R G G M M G G R R S S')).toBe(true);
  });

  it('sets each alankaram to its talam', () => {
    const al = carnaticSongs('mayamalavagowla').filter(s => s.level === 'Alankaram');
    expect(al.map(s => s.talam.beats)).toEqual([14, 10, 6, 10, 7, 14, 4]);
    expect(al.map(s => s.totalBeats / s.talam.beats)).toEqual([10, 10, 10, 10, 10, 10, 10]);
  });
});
