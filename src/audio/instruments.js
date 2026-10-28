// Each instrument is pure data that engine.js turns into Web Audio nodes.
//
// partials: oscillators stacked on the note's frequency
//   ratio  – multiple of the fundamental
//   gain   – relative loudness
//   type   – oscillator waveform (default 'sine')
//   detune – cents, for chorus-y thickness
//   fade   – seconds for this partial alone to die away (bell / tine attack)
// env: attack, decay (seconds to reach sustain level), sustain (0..1 of peak),
//      tail (if set, the note fades out over this many seconds even while held,
//      like a real piano string), release (seconds after key up)
// filter: low-pass cutoff as a multiple of the note frequency, sweeping from
//         `from` to `to` over `time` seconds
// pluck: render the note as a plucked string instead (see pluck.js for the
//        options); it fades by itself, so env only needs attack and release
// body: peaking boost (Hz, dB) for the instrument's wooden body
// space: extra send (0..1) into the long dream reverb, on top of the Reverb knob
// drive: soft-clipping fuzz amount (1 = clean-ish, higher = buzzier)
// glide: seconds to slide from the previous note's pitch (only right after one)
// phaser: slowly sweeping notches (rate Hz, depth 0..1) for psych-rock swirl
// settle: a plucked note starts `cents` sharp and relaxes to pitch (time constant, seconds)
export const INSTRUMENTS = [
  {
    id: 'piano',
    name: 'Grand Piano',
    partials: [
      { ratio: 1, gain: 1 },
      { ratio: 2, gain: 0.45 },
      { ratio: 3, gain: 0.2 },
      { ratio: 4, gain: 0.1 },
      { ratio: 5, gain: 0.05 },
    ],
    env: { attack: 0.005, decay: 0.4, sustain: 0.35, tail: 3.5, release: 0.25 },
    filter: { from: 8, to: 1.5, time: 1.5, q: 0.7 },
  },
  {
    id: 'epiano',
    name: 'Electric Piano',
    partials: [
      { ratio: 1, gain: 1 },
      { ratio: 2, gain: 0.12 },
      { ratio: 14, gain: 0.12, fade: 0.12 },
    ],
    env: { attack: 0.003, decay: 0.8, sustain: 0.45, tail: 4, release: 0.3 },
    filter: { from: 6, to: 3, time: 1, q: 0.7 },
    tremolo: { rate: 4.5, depth: 0.3 },
  },
  {
    // Dream pop keys: a washed-out, chorused electric piano with a slow
    // tremolo and a little tape wobble, floating in a long reverb
    id: 'dreamkeys',
    name: 'Dream Keys',
    partials: [
      { ratio: 1, gain: 0.7, detune: -7 },
      { ratio: 1, gain: 0.7, detune: 7 },
      { ratio: 2, gain: 0.12, type: 'triangle' },
      { ratio: 7, gain: 0.05, fade: 0.25 },
    ],
    env: { attack: 0.008, decay: 1.5, sustain: 0.5, tail: 7, release: 1.4 },
    filter: { from: 5, to: 2.2, time: 1.2, q: 0.6 },
    tremolo: { rate: 3.2, depth: 0.25 },
    vibrato: { rate: 0.6, depth: 5 },
    space: 0.6,
  },
  {
    id: 'synth',
    name: 'Synth Lead',
    partials: [
      { ratio: 1, gain: 1, type: 'sawtooth' },
      { ratio: 1, gain: 0.6, type: 'sawtooth', detune: 8 },
    ],
    env: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.2 },
    filter: { from: 10, to: 3, time: 0.4, q: 6 },
  },
  {
    id: 'strings',
    name: 'Strings',
    partials: [
      { ratio: 1, gain: 0.5, type: 'sawtooth', detune: -10 },
      { ratio: 1, gain: 0.5, type: 'sawtooth' },
      { ratio: 1, gain: 0.5, type: 'sawtooth', detune: 10 },
    ],
    env: { attack: 0.35, decay: 0.5, sustain: 0.85, release: 0.6 },
    filter: { from: 4, to: 4, time: 0.1, q: 1 },
    vibrato: { rate: 5, depth: 8 },
  },
  {
    // Dream pop synth: a glossy, chorused 80s-style poly synth with a soft
    // attack, a sub octave and a slow drift, also bathed in reverb
    id: 'hazesynth',
    name: 'Haze Synth',
    partials: [
      { ratio: 1, gain: 0.45, type: 'sawtooth', detune: -12 },
      { ratio: 1, gain: 0.45, type: 'sawtooth', detune: 12 },
      { ratio: 0.5, gain: 0.4, type: 'triangle' },
    ],
    env: { attack: 0.06, decay: 0.8, sustain: 0.7, release: 1.6 },
    filter: { from: 5, to: 2.2, time: 0.9, q: 1.5 },
    vibrato: { rate: 0.45, depth: 6 },
    space: 0.7,
  },
  {
    // Psych rock fuzz lead: square + saw driven into a soft clipper, warm
    // and buzzy, with a little vibrato so held notes sing
    id: 'fuzzlead',
    name: 'Fuzz Lead',
    partials: [
      { ratio: 1, gain: 0.6, type: 'square' },
      { ratio: 1, gain: 0.5, type: 'sawtooth', detune: 6 },
    ],
    env: { attack: 0.01, decay: 0.4, sustain: 0.75, release: 0.35 },
    filter: { from: 6, to: 3.5, time: 0.6, q: 1 },
    drive: 6,
    vibrato: { rate: 5.2, depth: 6 },
    space: 0.3,
  },
  {
    // Psych keys: a chorused electric piano swirling through a slow phaser
    id: 'phaserkeys',
    name: 'Phaser Keys',
    partials: [
      { ratio: 1, gain: 0.6, detune: -5 },
      { ratio: 1, gain: 0.6, detune: 5 },
      { ratio: 2, gain: 0.15, type: 'triangle' },
      { ratio: 14, gain: 0.08, fade: 0.1 },
    ],
    env: { attack: 0.004, decay: 1, sustain: 0.45, tail: 5, release: 0.6 },
    filter: { from: 6, to: 3, time: 1, q: 0.7 },
    phaser: { rate: 0.35, depth: 0.8 },
    space: 0.35,
  },
  {
    // Gliding mono-synth lead: each note slides up or down from the last one
    // you played (if it was recent), the woozy psych-pop synth line sound
    id: 'glidelead',
    name: 'Glide Lead',
    partials: [
      { ratio: 1, gain: 0.7, type: 'sawtooth' },
      { ratio: 1, gain: 0.4, type: 'triangle', detune: -8 },
      { ratio: 0.5, gain: 0.3, type: 'sine' },
    ],
    env: { attack: 0.02, decay: 0.5, sustain: 0.7, release: 0.5 },
    filter: { from: 5, to: 2.5, time: 0.5, q: 3 },
    glide: 0.12,
    space: 0.5,
  },
  {
    // A huge, slow chorus pad that opens up as you hold it, with a lazy phaser
    id: 'choruspad',
    name: 'Chorus Pad',
    partials: [
      { ratio: 1, gain: 0.5, type: 'sawtooth', detune: -15 },
      { ratio: 1, gain: 0.5, type: 'sawtooth', detune: 15 },
      { ratio: 2, gain: 0.2, type: 'sawtooth', detune: 5 },
    ],
    env: { attack: 0.5, decay: 1, sustain: 0.85, release: 2.5 },
    filter: { from: 2, to: 3.5, time: 2, q: 2 },
    vibrato: { rate: 0.3, depth: 4 },
    phaser: { rate: 0.15, depth: 0.6 },
    space: 0.8,
  },
];

export const instrumentById = Object.fromEntries(INSTRUMENTS.map(i => [i.id, i]));
