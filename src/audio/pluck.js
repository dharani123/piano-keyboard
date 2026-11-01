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

const JAWARI_DEPTH = 0.04;

// One plane of the string, not normalised. shape (veena only):
//   brightness – leans the loss filter towards the newest sample, so fewer
//                highs are lost per trip
//   buzz       – a one-sided bridge inside the loop that bends the swing on
//                one side, scaled to the string's recent level
function string(freq, sampleRate, length, ring, position, softness, shape = {}) {
  const { brightness = 0, buzz = 0 } = shape;
  const out = new Float32Array(length);
  const tilt = 0.5 - 0.4 * brightness; // filter = (1 - tilt)·new + tilt·previous

  // The loop delays by period - tilt (the loss filter's own delay);
  // the integer part is the delay line, the fraction a first-order all-pass,
  // so every note is exactly in tune.
  const loop = sampleRate / freq - tilt;
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

  // The bridge follows the string's recent swing, so it keeps grazing it
  // however quiet the note gets
  let level = 0;
  let dc = 0;
  const fade = Math.exp(-1 / (sampleRate * 0.05));

  let idx = 0;
  let prev = 0;
  let apX = 0;
  let apY = 0;
  for (let i = 0; i < length; i++) {
    let cur = excited[idx];
    if (buzz > 0) {
      // a lopsided curve on one side only: adds back upper harmonics each
      // trip without eating the note's energy
      level = Math.max(Math.abs(cur), level * fade);
      if (cur > 0 && level > 1e-9) cur += JAWARI_DEPTH * buzz * (cur * cur / level - 0.4 * cur);
      dc += (cur - dc) * 0.002; // the bend only pushes one way; don't let it drift
      cur -= dc;
    }
    const avg = loss * ((1 - tilt) * cur + tilt * prev);
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

// A veena note: two string planes as above, but with the parts that make a
// real veena sound alive rather than electronic.
//
// opts (on top of seconds, ring, position, softness, spread):
//   brightness  – 0..1 less damping per trip; steel strings keep their highs
//   buzz        – 0..1 jawari: the string grazes the flat bridge on every
//                 swing, so the buzzy upper harmonics keep coming back as it rings
//   nail        – 0..1 loudness of the fingernail click at the start
//   sympathetic – Hz of the side (tala) strings that ring along softly
//   coupling    – how strongly the side strings pick up the note
//   body        – wooden resonator modes [{ freq, q, gain }]; bodyMix 0..1
export function veenaSamples(freq, sampleRate, opts = {}) {
  const {
    seconds = 7, ring = 7, position = 0.11, softness = 0.4, spread = 1.2,
    brightness = 0.5, buzz = 0.5, nail = 0.3,
    sympathetic = [], coupling = 0.002, body = [], bodyMix = 0.4,
  } = opts;
  const length = Math.floor(sampleRate * seconds);
  const lean = Math.pow(2, spread / 2400);
  const shape = { brightness, buzz };
  const a = string(freq * lean, sampleRate, length, ring, position, softness, shape);
  const b = string(freq / lean, sampleRate, length, ring * 0.75, position * 1.25, softness, shape);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) out[i] = 0.6 * a[i] + 0.4 * b[i];

  // Fingernail: a few milliseconds of bright, high-passed noise
  const clickLen = Math.floor(sampleRate * 0.004);
  let hp = 0;
  let last = 0;
  for (let i = 0; i < clickLen; i++) {
    const n = Math.random() * 2 - 1;
    hp = 0.7 * (hp + n - last);
    last = n;
    out[i] += nail * hp * (1 - i / clickLen);
  }

  // Side strings: tuned loops the note keeps feeding, so only the harmonics
  // they share with it build up, the faint halo behind a veena
  const halo = new Float32Array(length);
  for (const f of sympathetic) {
    const n = Math.max(2, Math.round(sampleRate / f - 0.5));
    const loss = Math.pow(10, -3 / (f * 9));
    const line = new Float32Array(n);
    let idx = 0;
    let prev = 0;
    for (let i = 0; i < length; i++) {
      const cur = line[idx];
      line[idx] = loss * 0.5 * (cur + prev) + coupling * out[i];
      prev = cur;
      if (++idx === n) idx = 0;
      halo[i] += cur;
    }
  }

  // Kudam: the big wooden pot, a handful of resonances that colour every note
  const wood = new Float32Array(length);
  for (const { freq: mf, q, gain } of body) {
    const w = (2 * Math.PI * mf) / sampleRate;
    const r = Math.exp(-w / (2 * q));
    const c1 = 2 * r * Math.cos(w);
    const c2 = -r * r;
    const g = (1 - r) * gain;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < length; i++) {
      const y = g * out[i] + c1 * y1 + c2 * y2;
      y2 = y1;
      y1 = y;
      wood[i] += y;
    }
  }

  let max = 0;
  for (let i = 0; i < length; i++) {
    const s = out[i] + halo[i] + bodyMix * wood[i];
    out[i] = s;
    if (Math.abs(s) > max) max = Math.abs(s);
  }
  if (max > 0) for (let i = 0; i < length; i++) out[i] /= max;
  return out;
}
