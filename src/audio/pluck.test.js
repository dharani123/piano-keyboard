import { describe, it, expect } from 'vitest';
import { pluckSamples } from './pluck.js';

const RATE = 44100;

// Pitch by autocorrelation, refined with parabolic interpolation
function pitchOf(s, from, to) {
  const seg = s.subarray(from, to);
  let best = 0;
  let bestLag = 0;
  const score = lag => {
    let sum = 0;
    for (let i = 0; i + lag < seg.length; i++) sum += seg[i] * seg[i + lag];
    return sum;
  };
  for (let lag = 20; lag < 1000; lag++) {
    const c = score(lag);
    if (c > best) { best = c; bestLag = lag; }
  }
  const a = score(bestLag - 1);
  const b = score(bestLag);
  const c = score(bestLag + 1);
  return RATE / (bestLag + (a - c) / (2 * (a - 2 * b + c)));
}
const cents = (f, ref) => 1200 * Math.log2(f / ref);
const rms = s => Math.sqrt(s.reduce((sum, v) => sum + v * v, 0) / s.length);

describe('pluckSamples', () => {
  it('is in tune across the keyboard', () => {
    for (const f of [196, 261.63, 349.23, 523.25, 698.46]) {
      const s = pluckSamples(f, RATE, { seconds: 1, jawari: 0 });
      expect(Math.abs(cents(pitchOf(s, 4000, 12000), f))).toBeLessThan(3);
    }
  });

  it('rings and fades away', () => {
    const s = pluckSamples(261.63, RATE, { seconds: 4 });
    const early = rms(s.subarray(0, RATE / 4));
    const late = rms(s.subarray(3 * RATE, 3.25 * RATE));
    expect(late).toBeGreaterThan(0);
    expect(late).toBeLessThan(early * 0.5);
  });

  it('is normalised to a peak of 1', () => {
    const s = pluckSamples(440, RATE, { seconds: 1 });
    expect(Math.max(...s.map(Math.abs))).toBeCloseTo(1, 5);
  });
});
