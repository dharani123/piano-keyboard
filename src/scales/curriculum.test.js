import { describe, it, expect } from 'vitest';
import { SCALES, SCALE_UNITS, SCALE_LESSONS, placeScale } from './curriculum.js';
import { keyAt } from '../data/keymap.js';
import { parseRhythm } from '../lessons/rhythm.js';

const playableIn = (n, shift) => keyAt(n.semitone, n.oct, shift) !== undefined;

describe('scales curriculum', () => {
  it('has 24 units, major and minor on each of the 12 notes', () => {
    expect(SCALE_UNITS).toHaveLength(24);
    expect(SCALE_UNITS.map(u => u.title).slice(0, 4)).toEqual(['C major', 'C minor', 'D♭ major', 'C♯ minor']);
    expect(SCALE_UNITS.every(u => u.openStart)).toBe(true);
  });

  it('has arohanam, avarohanam, both and home chord in every unit (chord and in-time lessons hidden)', () => {
    for (const u of SCALE_UNITS) {
      expect(u.lessons.map(l => l.id.replace(/^sc-[a-z]+-(major|minor)-/, ''))).toEqual(['up', 'down', 'both', 'home-chord']);
    }
  });

  it('has unique lesson ids, apart from the main course ones', () => {
    expect(new Set(SCALE_LESSONS.map(l => l.id)).size).toBe(SCALE_LESSONS.length);
    expect(SCALE_LESSONS.every(l => l.id.startsWith('sc-'))).toBe(true);
  });

  it('builds each scale from its step pattern', () => {
    for (const s of SCALES) {
      const steps = s.pitches.slice(1).map((p, i) => p - s.pitches[i]);
      expect(steps, s.name).toEqual(s.k.steps);
      expect(((s.pitches[0] % 12) + 12) % 12).toBe(s.root);
    }
  });

  it('spells each note on its own letter', () => {
    const byName = Object.fromEntries(SCALES.map(s => [s.name, s.names.join(' ')]));
    expect(byName['F♯ major']).toBe('F♯ G♯ A♯ B C♯ D♯ E♯ F♯');
    expect(byName['D♭ major']).toBe('D♭ E♭ F G♭ A♭ B♭ C D♭');
    expect(byName['A minor']).toBe('A B C D E F G A');
    expect(byName['G♯ minor']).toBe('G♯ A♯ B C♯ D♯ E F♯ G♯');
    for (const s of SCALES) expect(new Set(s.names.slice(0, 7).map(n => n[0])).size, s.name).toBe(7);
  });

  it('places C–F and B in the normal layout and the rest where they fit', () => {
    expect([0, 1, 2, 3, 4, 5].map(placeScale).every(p => p.shift === 0)).toBe(true);
    expect(placeScale(11)).toEqual({ shift: 0, low: -1 });
    expect(placeScale(6).shift).toBe(-2);
    expect([7, 8, 9, 10].map(placeScale).every(p => p.shift === 2 && p.low < 0)).toBe(true);
  });

  it.each(SCALE_LESSONS.map(l => [l.num, l.id, l]))('lesson %s (%s) is playable in its layout', (_, __, l) => {
    expect(l.theory.length).toBeGreaterThan(0);
    const ex = l.exercise;
    if (ex.type === 'rhythm') {
      const events = parseRhythm(ex.pattern).filter(e => !e.rest);
      expect(events).toHaveLength(16); // 8 up, 8 down (top Sa twice)
      for (const e of events) expect(playableIn(e, l.layout), `${e.name}${e.oct}`).toBe(true);
      return;
    }
    const steps = ex.make();
    expect(steps.length).toBeGreaterThan(0);
    for (const s of steps) {
      expect(s.prompt ?? ex.prompt).toBeTruthy();
      for (const n of s.notes) expect(playableIn(n, l.layout), `${s.label} ${n.name}${n.oct}`).toBe(true);
    }
  });

  it('builds chords of three different notes from the scale', () => {
    for (const s of SCALES) {
      const inScale = new Set(s.pitches.map(p => ((p % 12) + 12) % 12));
      for (const c of s.chords) {
        expect(new Set(c.pitches.map(p => ((p % 12) + 12) % 12)).size).toBe(3);
        for (const p of c.pitches) expect(inScale.has(((p % 12) + 12) % 12), `${s.name} ${c.label}`).toBe(true);
      }
    }
  });
});
