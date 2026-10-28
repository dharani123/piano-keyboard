import { engine } from '../audio/engine.js';
import { frequency } from '../audio/pitch.js';
import { RAGAS } from './carnatic.js';

// Ambient music for Relax: slow, soft chords built only from the raga's own
// swaras, so the pad never clashes with what is being played over it.

// On/off and volume (0–1), remembered like the tanpura's
const KEY = 'desk-piano-ambient';
const VOLUME_KEY = 'desk-piano-ambient-volume';
// off until switched on
export function loadAmbient() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
export function saveAmbient(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* storage blocked */ }
}
export function loadAmbientVolume() {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0.5;
  } catch { return 0.5; }
}
export function saveAmbientVolume(v) {
  try { localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* storage blocked */ }
}

const ORDER = ['S', 'R', 'G', 'M', 'P', 'D', 'N'];

// Chords as semitones above Sa: each is a swara with the raga's swaras two and
// four steps above it (stacked like thirds), plus its octave below as a soft
// bass. Only chords whose top note is a perfect fifth above the root are kept:
// they sound open and calm in every raga. The Sa chord is always one of them.
export function ambientChords(raga) {
  const semis = ORDER.map(s => RAGAS[raga].semitones[s]);
  const at = i => semis[i % 7] + 12 * Math.floor(i / 7);
  const chords = [];
  for (let i = 0; i < 7; i++) {
    const notes = [at(i), at(i + 2), at(i + 4)];
    if (notes[2] - notes[0] !== 7) continue;
    // keep the pad below the swaras: chords reaching past upper Sa drop an octave
    const shift = notes[2] > 12 ? -12 : 0;
    chords.push({ root: ORDER[i], notes: [notes[0] - 12, ...notes].map(n => n + shift) });
  }
  return chords;
}

// A gentle wandering order: back home to the Sa chord every other chord
export function ambientProgression(raga, length = 8, rand = Math.random) {
  const chords = ambientChords(raga);
  const home = chords.find(c => c.root === 'S');
  const others = chords.filter(c => c !== home);
  const out = [];
  let last = null;
  for (let i = 0; i < length; i++) {
    if (i % 2 === 0 || !others.length) out.push(home);
    else {
      const pool = others.length > 1 ? others.filter(c => c !== last) : others;
      last = pool[Math.floor(rand() * pool.length)];
      out.push(last);
    }
  }
  return out;
}

// Start (or retune) the pad an octave below the swaras, around the exercise's Sa
export function startAmbient(raga, octave, sa, transpose) {
  const chords = ambientProgression(raga).map(c => c.notes.map(n => frequency(octave - 1, sa + n, transpose)));
  engine.ambientStart(chords, loadAmbientVolume());
}
