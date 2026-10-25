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

// Tanpura on an exercise's Sa: Pa, Sa, Sa, low Sa
export function startTanpura(octave, sa, transpose) {
  const f = semi => frequency(octave, sa + semi, transpose);
  engine.droneStart([f(-5), f(0), f(0), f(-12)]);
}
