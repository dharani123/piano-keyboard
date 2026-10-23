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
    id: 'organ',
    name: 'Organ',
    partials: [
      { ratio: 0.5, gain: 0.5 },
      { ratio: 1, gain: 1 },
      { ratio: 2, gain: 0.6 },
      { ratio: 3, gain: 0.3 },
      { ratio: 4, gain: 0.25 },
      { ratio: 6, gain: 0.15 },
      { ratio: 8, gain: 0.12 },
    ],
    env: { attack: 0.01, decay: 0.05, sustain: 0.9, release: 0.08 },
    filter: { from: 20, to: 20, time: 0.1, q: 0.5 },
    vibrato: { rate: 6, depth: 6 },
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
    id: 'bells',
    name: 'Bells',
    partials: [
      { ratio: 1, gain: 1 },
      { ratio: 2.76, gain: 0.5, fade: 2 },
      { ratio: 5.4, gain: 0.3, fade: 1 },
      { ratio: 8.93, gain: 0.15, fade: 0.5 },
    ],
    env: { attack: 0.002, decay: 1, sustain: 0.3, tail: 5, release: 1.5 },
    filter: { from: 20, to: 20, time: 0.1, q: 0.5 },
  },
];

export const instrumentById = Object.fromEntries(INSTRUMENTS.map(i => [i.id, i]));
