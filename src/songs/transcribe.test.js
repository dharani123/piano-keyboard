import { describe, it, expect } from 'vitest';
import { notesToSong } from './transcribe.js';

const n = (start, dur, pitch, amp = 0.8) => ({ startTimeSeconds: start, durationSeconds: dur, pitchMidi: pitch, amplitude: amp });
const names = song => song.events.map(e => e.notes[0].name + e.notes[0].oct + '@' + e.beat + '/' + e.beats);

describe('notesToSong', () => {
  it('keeps the top note of chords and drops the bass', () => {
    // C major chord over a low C bass, then a G melody note (120 BPM: 0.5 s = 1 beat)
    const song = notesToSong([n(0, 1, 48), n(0, 1, 60), n(0, 1, 64), n(0, 1, 67), n(1, 0.5, 72)]);
    expect(names(song)).toEqual(['G0@0/2', 'C1@2/1']);
    expect(song.totalBeats).toBe(3);
  });

  it('folds notes into middle C up to high F', () => {
    const song = notesToSong([n(0, 0.5, 84), n(0.5, 0.5, 79)]);
    expect(names(song)).toEqual(['C1@0/1', 'G0@1/1']);
  });

  it('splits repeated notes and shortens long silences', () => {
    const song = notesToSong([n(0, 0.5, 64), n(0.5, 0.5, 64), n(10, 0.5, 62)]);
    expect(names(song)).toEqual(['E0@0/1', 'E0@1/1', 'D0@6/1']);
  });

  it('ignores very quiet notes and handles nothing found', () => {
    expect(notesToSong([n(0, 1, 64, 0.1)]).events).toEqual([]);
  });
});
