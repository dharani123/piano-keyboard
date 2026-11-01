import { useEffect, useRef } from 'react';
import { noteCodeFor } from '../data/keymap.js';

// Global computer-keyboard bindings. Handlers are read through a ref so the
// listeners are attached once but always see the latest app state.
export function useKeyboard(handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    // physical key → note code it is playing
    const down = new Map();

    function onKeyDown(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const h = ref.current;
      const action = keyAction(e.code, e.shiftKey);
      if (!action) return;
      e.preventDefault();
      // Stop a focused button/select from also reacting (e.g. Space "clicking" it)
      document.activeElement?.blur?.();
      if (e.repeat) return;
      const note = noteFor(e.code, e.shiftKey);
      if (note) down.set(e.code, note);
      action(h, true);
    }
    function onKeyUp(e) {
      const h = ref.current;
      const note = down.get(e.code);
      if (note) {
        down.delete(e.code);
        if (![...down.values()].includes(note)) h.noteUp(note);
      }
      if (e.code === 'Space') { e.preventDefault(); h.sustain(false); }
    }
    function onBlur() {
      down.clear();
      ref.current.releaseAll();
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}

// Shift + 1–9, 0, −, = picks a voice (0 = the 10th, − = the 11th, = = the 12th)
const VOICE_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'];
const voiceDigit = (code, shift) => (shift && VOICE_KEYS.includes(code) ? VOICE_KEYS.indexOf(code) : null);
const noteFor = (code, shift) => (voiceDigit(code, shift) !== null ? null : noteCodeFor(code));

export function keyAction(code, shift = false) {
  const note = noteFor(code, shift);
  if (note) return h => h.noteDown(note);
  if (code === 'Space') return h => h.sustain(true);
  if (code === 'KeyZ') return h => h.octave(-1);
  if (code === 'KeyX') return h => h.octave(1);
  if (code === 'ArrowLeft') return h => h.transpose(-1);
  if (code === 'ArrowRight') return h => h.transpose(1);
  const voice = voiceDigit(code, shift);
  if (voice !== null) return h => h.voice(voice);
  return null;
}
