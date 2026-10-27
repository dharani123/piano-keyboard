import { describe, it, expect } from 'vitest';
import { parseSwaras, carnaticSongs, CARNATIC, CARNATIC_LEVELS, RAGAS } from './carnatic.js';
import { keyAt } from '../data/keymap.js';

const line = song => song.events.map(e => e.notes[0].swara + (e.beats > 1 ? `/${e.beats}` : '')).join(' ');

describe('parseSwaras', () => {
  it('maps swaras to the raga and holds notes on ","', () => {
    const { events, totalBeats } = parseSwaras("S R G , | P S'", 'mayamalavagowla');
    expect(events.map(e => [e.notes[0].semitone, e.notes[0].oct, e.beat, e.beats])).toEqual([
      [0, 0, 0, 1], [1, 0, 1, 1], [4, 0, 2, 2], [7, 0, 4, 1], [0, 1, 5, 1],
    ]);
    expect(totalBeats).toBe(6);
  });

  it('names swaras by key: white = plain, C♯ Ri1, D♯ Ga2, F♯ Ma2, G♯ Da1, A♯ Ni2', () => {
    const names = raga => parseSwaras("S R G M P D N S'", raga).events.map(e => e.notes[0].name);
    expect(names('mayamalavagowla')).toEqual(['Sa', 'Ri1', 'Ga', 'Ma', 'Pa', 'Da1', 'Ni', 'S\u0307a']);
    expect(names('shankarabharanam')).toEqual(['Sa', 'Ri', 'Ga', 'Ma', 'Pa', 'Da', 'Ni', 'S\u0307a']);
    expect(names('kanakangi')).toEqual(['Sa', 'Ri1', 'Ri', 'Ma', 'Pa', 'Da1', 'Da', 'S\u0307a']);
    expect(names('kalyani')).toEqual(['Sa', 'Ri', 'Ga', 'Ma2', 'Pa', 'Da', 'Ni', 'S\u0307a']);
    expect(names('kharaharapriya')).toEqual(['Sa', 'Ri', 'Ga2', 'Ma', 'Pa', 'Da', 'Ni2', 'S\u0307a']);
    expect(parseSwaras("R' N.", 'mayamalavagowla').events.map(e => e.notes[0].name)).toEqual(['R\u0307i1', 'N\u0323i']);
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
    expect(CARNATIC_LEVELS.map(l => CARNATIC.filter(c => c.level === l).length)).toEqual([14, 12, 3]);
    for (const raga of Object.keys(RAGAS)) {
      for (const s of carnaticSongs(raga)) expect(s.totalBeats % s.talam.beats, s.title).toBe(0);
    }
  });

  it('keeps every exercise on the home row with Sa on C', () => {
    for (const raga of Object.keys(RAGAS)) {
      for (const s of carnaticSongs(raga)) {
        for (const e of s.events) expect(keyAt(e.notes[0].semitone, e.notes[0].oct, s.layout), s.id).toBeTruthy();
        expect([s.sa, s.layout], s.id).toEqual([0, 0]);
      }
    }
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
});
