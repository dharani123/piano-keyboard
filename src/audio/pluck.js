// Karplus-Strong plucked string: a short burst of noise circulating in a delay
// line one period long, losing a little brightness every trip, which is how a
// real string's tone mellows as it rings. Returns the samples of one pluck.
//
// A real string swings in two planes at very slightly different pitches and
// decay rates; mixing two such strings gives the slow shimmer that keeps a
// pluck from sounding electronic. Every call uses fresh noise, so no two
// plucks are identical.
//
// opts:
//   seconds   – length of the rendered note
//   ring      – seconds for the middle-C string to fade by 60 dB (higher notes fade sooner)
//   position  – where along the string it is plucked (0..0.5); near the end = brighter
//   softness  – 0..1 low-pass on the pluck itself; higher = rounder attack
//   jawari    – 0..1 gentle buzz from the veena's flat bridge
//   spread    – cents between the two planes of the string
export function pluckSamples(freq, sampleRate, opts = {}) {
  const { seconds = 5, ring = 6, position = 0.14, softness = 0.6, jawari = 0.05, spread = 1.5 } = opts;
  const length = Math.floor(sampleRate * seconds);
  const lean = Math.pow(2, spread / 2400);
  const a = string(freq * lean, sampleRate, length, ring, position, softness);
  const b = string(freq / lean, sampleRate, length, ring * 0.7, position * 1.2, softness);

  // Cheap tanh (accurate enough for a gentle saturation, much faster than Math.tanh)
  const soft = x => (x > 3 ? 1 : x < -3 ? -1 : (x * (27 + x * x)) / (27 + 9 * x * x));
  const bias = soft(0.3);
  const out = new Float32Array(length);
  let max = 0;
  for (let i = 0; i < length; i++) {
    const cur = 0.6 * a[i] + 0.4 * b[i];
    // Jawari: a soft, slightly lopsided saturation adds shimmering upper harmonics
    const s = cur + jawari * (soft(3 * cur + 0.3) - bias - cur);
    out[i] = s;
    if (Math.abs(s) > max) max = Math.abs(s);
  }
  if (max > 0) for (let i = 0; i < length; i++) out[i] /= max;
  return out;
}

// One plane of the string, not normalised
function string(freq, sampleRate, length, ring, position, softness) {
  const out = new Float32Array(length);

  // The loop delays by period - 0.5 (the averaging filter's half sample);
  // the integer part is the delay line, the fraction a first-order all-pass,
  // so every note is exactly in tune.
  const loop = sampleRate / freq - 0.5;
  let n = Math.floor(loop);
  let frac = loop - n;
  if (frac < 0.1) { n -= 1; frac += 1; } // keep the all-pass coefficient well behaved
  const apC = (1 - frac) / (1 + frac);

  // Per-trip loss for the wanted ring time; higher strings die faster
  const t60 = ring * Math.sqrt(261.63 / freq);
  const loss = Math.pow(10, -3 / (freq * t60));

  // Pluck: soft noise, then a comb that removes the harmonics the pluck
  // position cannot excite (that is what makes it hollow and warm)
  const line = new Float32Array(n);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp = lp * softness + (Math.random() * 2 - 1) * (1 - softness);
    line[i] = lp;
  }
  const shift = Math.max(1, Math.round(position * n));
  const excited = line.map((v, i) => v - line[(i - shift + n) % n]);

  let idx = 0;
  let prev = 0;
  let apX = 0;
  let apY = 0;
  for (let i = 0; i < length; i++) {
    const cur = excited[idx];
    const avg = loss * 0.5 * (cur + prev);
    prev = cur;
    const y = apC * avg + apX - apC * apY; // fractional-delay all-pass
    apX = avg;
    apY = y;
    excited[idx] = y;
    if (++idx === n) idx = 0;
    out[i] = cur;
  }
  return out;
}
