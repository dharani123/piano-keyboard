import { describe, it, test, expect } from 'vitest';
import { journeyLines, playAlongPlan, segmentAt, appNotes } from './relax.js';
import { carnaticSongs, geethamSongs } from './carnatic.js';

describe('journeyLines', () => {
  const lines = journeyLines(carnaticSongs('mayamalavagowla'));

  it('starts with Sarali 1 and keeps the traditional order', () => {
    expect(lines[0]).toMatchObject({ title: 'Sarali Varisai 1', line: 0, lines: 2 });
    expect(lines[0].events.map(e => e.notes[0].name).join(' ')).toBe('Sa Ri1 Ga Ma Pa Da1 Ni S\u0307a');
    expect(lines[1].events.map(e => e.notes[0].name).join(' ')).toBe('S\u0307a Ni Da1 Pa Ma Ga Ri1 Sa');
    expect(lines.at(-1).title).toBe('Dhatu Varisai 3');
    expect(lines[0].id).toBe('sarali-1@mayamalavagowla');
  });

  it('cuts every exercise into talam-cycle lines starting at beat 0', () => {
    for (const l of lines) {
      expect(l.events[0].beat).toBe(0);
      const end = l.events.at(-1).beat + l.events.at(-1).beats;
      expect(end).toBe(l.talam.beats);
    }
    expect(lines.every(l => l.totalBeats === 8)).toBe(true); // all in Adi talam
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

describe('appNotes', () => {
  const lines = journeyLines(carnaticSongs('shankarabharanam'));
  const s2 = lines.findIndex(l => l.title === 'Sarali Varisai 2');

  it('lists the notes the app plays, in time order, for the listening parts', () => {
    const plan = playAlongPlan(lines, s2, true);
    const notes = appNotes(lines, plan);
    expect(notes).toHaveLength(4 * 8);
    expect(notes[0]).toMatchObject({ beat: 0, beats: 1, semitone: 0, oct: 0 });
    expect(notes.every((n, i) => i === 0 || n.beat >= notes[i - 1].beat)).toBe(true);
    // first line is heard on beats 0-7, then the second line from beat 16
    expect(notes[8].beat).toBe(16);
  });

  it('plays nothing without listening', () => {
    expect(appNotes(lines, playAlongPlan(lines, s2, false))).toEqual([]);
  });
});

test('the geetham joins the Relax journey in its raga, one Matya cycle (10 beats) per line', () => {
  const lines = journeyLines([...carnaticSongs('shankarabharanam'), ...geethamSongs('shankarabharanam')]);
  const geetham = lines.filter(l => l.level === 'Geetham');
  expect(geetham).toHaveLength(11);
  expect(geetham.every(l => l.totalBeats === 10)).toBe(true);
  const plan = playAlongPlan(lines, lines.indexOf(geetham[0]), true);
  expect(plan.song.totalBeats).toBe(11 * 10 * 2);
});
