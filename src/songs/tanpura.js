import { engine } from '../audio/engine.js';
import { frequency } from '../audio/pitch.js';

// The tanpura on/off choice, shared by both Carnatic tabs
const KEY = 'desk-piano-tanpura';
export function loadTanpura() {
  try { return localStorage.getItem(KEY) !== '0'; } catch { return true; }
}
export function saveTanpura(on) {
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch { /* storage blocked */ }
}

// Tanpura volume 0–1, also shared; 0.5 is the original loudness
const VOLUME_KEY = 'desk-piano-tanpura-volume';
export function loadTanpuraVolume() {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0.5;
  } catch { return 0.5; }
}
export function saveTanpuraVolume(v) {
  try { localStorage.setItem(VOLUME_KEY, String(v)); } catch { /* storage blocked */ }
}

// Every page load starts with the tanpura on at 50%; changes last until reload
saveTanpura(true);
saveTanpuraVolume(0.5);

// Tanpura on an exercise's Sa: Pa, Sa, Sa, low Sa
export function startTanpura(octave, sa, transpose) {
  const f = semi => frequency(octave, sa + semi, transpose);
  engine.droneStart([f(-5), f(0), f(0), f(-12)], loadTanpuraVolume());
}
