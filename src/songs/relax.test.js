import { describe, it, expect } from 'vitest';
import { journeyLines, playAlongPlan, segmentAt } from './relax.js';
import { carnaticSongs } from './carnatic.js';

describe('journeyLines', () => {
  const lines = journeyLines(carnaticSongs('mayamalavagowla'));

  it('starts with Sarali 1 and keeps the traditional order', () => {
    expect(lines[0]).toMatchObject({ title: 'Sarali Varisai 1', line: 0, lines: 2 });
    expect(lines[0].events.map(e => e.notes[0].name).join(' ')).toBe('Sa Ri Ga Ma Pa Da Ni S\u0307a');
    expect(lines[1].events.map(e => e.notes[0].name).join(' ')).toBe('S\u0307a Ni Da Pa Ma Ga Ri Sa');
    expect(lines.at(-1).title).toBe('Janta Varisai 2');
  });

  it('cuts every exercise into 8-beat lines starting at beat 0', () => {
    for (const l of lines) {
      expect(l.events[0].beat).toBe(0);
      const end = l.events.at(-1).beat + l.events.at(-1).beats;
      expect(end).toBe(8);
    }
  });

  it('keeps karvai inside its line', () => {
    const s5 = lines.filter(l => l.title === 'Sarali Varisai 5');
    expect(s5[0].events.map(e => e.beats)).toEqual([1, 1, 1, 1, 2, 1, 1]);
  });
});

describe('playAlongPlan', () => {
  const lines = journeyLines(carnaticSongs('shankarabharanam'));
  const s2 = lines.findIndex(l => l.title === 'Sarali Varisai 2');

  it('runs from the current line to the end of that exercise only', () => {
    const { segments, song } = playAlongPlan(lines, s2 + 1, false);
    expect(segments.map(s => s.pos)).toEqual([s2 + 1, s2 + 2, s2 + 3]);
    expect(segments.map(s => s.playAt)).toEqual([0, 8, 16]);
    expect(song.totalBeats).toBe(24);
    expect(song.events[0].beat).toBe(0);
  });

  it('puts a listening part before each line when listening first', () => {
    const { segments, song } = playAlongPlan(lines, s2, true);
    expect(segments.slice(0, 2)).toEqual([
      { pos: s2, listenAt: 0, playAt: 8 },
      { pos: s2 + 1, listenAt: 16, playAt: 24 },
    ]);
    expect(song.events[0].beat).toBe(8);
    expect(song.totalBeats).toBe(64);
    expect(segmentAt(segments, 3)).toMatchObject({ seg: { pos: s2 }, listening: true });
    expect(segmentAt(segments, 9)).toMatchObject({ seg: { pos: s2 }, listening: false });
    expect(segmentAt(segments, 17)).toMatchObject({ seg: { pos: s2 + 1 }, listening: true });
  });
});
