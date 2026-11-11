import { describe, it, expect } from 'vitest';
import { SONG_LIBRARY } from './library.js';
import { SCALES } from '../scales/curriculum.js';

describe('decoded songs', () => {
  const decoded = SONG_LIBRARY.filter(s => s.decoded);

  it('each names a scale from the Scales tab that holds (nearly) all its notes', () => {
    expect(decoded.length).toBeGreaterThan(0);
    for (const song of decoded) {
      const scale = SCALES.find(s => s.name === song.scale);
      expect(scale, `${song.id}: ${song.scale}`).toBeDefined();
      const inScale = new Set(scale.pitches.map(p => ((p % 12) + 12) % 12));
      const notes = song.events.flatMap(e => e.notes);
      const outside = notes.filter(n => !inScale.has(n.semitone)).length;
      expect(outside / notes.length, song.id).toBeLessThan(0.1);
    }
  });
});
