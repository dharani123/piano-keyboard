import { describe, it, expect } from 'vitest';
import { ambientChords, ambientProgression } from './ambient.js';
import { RAGAS } from './carnatic.js';

describe('ambient chords', () => {
  it('builds open chords from the raga’s own swaras in every raga', () => {
    for (const raga of Object.keys(RAGAS)) {
      const scale = new Set(Object.values(RAGAS[raga].semitones));
      const chords = ambientChords(raga);
      expect(chords.some(c => c.root === 'S'), raga).toBe(true);
      for (const c of chords) {
        for (const n of c.notes) expect(scale.has(((n % 12) + 12) % 12), raga).toBe(true);
        expect(c.notes[3] - c.notes[1], raga).toBe(7); // perfect fifth over the root
        expect(c.notes[1] - c.notes[0], raga).toBe(12); // soft bass an octave down
        expect(Math.max(...c.notes), raga).toBeLessThanOrEqual(12); // stays under the swaras
      }
    }
  });

  it('gives Shankarabharanam the plain major chords', () => {
    expect(ambientChords('shankarabharanam').map(c => c.root).join(' ')).toBe('S R G M P D');
    expect(ambientChords('shankarabharanam')[0].notes).toEqual([-12, 0, 4, 7]);
  });

  it('comes home to the Sa chord every other chord', () => {
    const prog = ambientProgression('kalyani', 8, () => 0.5);
    expect(prog).toHaveLength(8);
    prog.forEach((c, i) => { if (i % 2 === 0) expect(c.root).toBe('S'); });
  });
});
