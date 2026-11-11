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
    const tap = leftShiftTap();

    function onKeyDown(e) {
      tap.keyDown(e.code, e.ctrlKey || e.metaKey || e.altKey, e.repeat);
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
      if (tap.keyUp(e.code)) h.startStop();
    }
    function onBlur() {
      down.clear();
      tap.reset();
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

// Left Shift pressed and released on its own is Start/Stop. It acts on release, because until
// then the press could still turn into Shift+digit (pick a voice).
export function leftShiftTap() {
  let armed = false;
  return {
    keyDown(code, modified = false, repeat = false) {
      if (code !== 'ShiftLeft') armed = false;
      else if (!repeat) armed = !modified;
    },
    keyUp(code) {
      if (code !== 'ShiftLeft') return false;
      const tapped = armed;
      armed = false;
      return tapped;
    },
    reset() { armed = false; },
  };
}

// Shift + 1–9, 0, −, = picks a voice (0 = the 10th, − = the 11th, = = the 12th)
const VOICE_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'];
const voiceDigit = (code, shift) => (shift && VOICE_KEYS.includes(code) ? VOICE_KEYS.indexOf(code) : null);
const noteFor = (code, shift) => (voiceDigit(code, shift) !== null ? null : noteCodeFor(code));

export function keyAction(code, shift = false) {
  const note = noteFor(code, shift);
  if (note) return h => h.noteDown(note);
  // Space = Start / Stop / Try again, like a left Shift tap (it was the sustain pedal until 2026-11-09)
  if (code === 'Space') return h => h.startStop();
  if (code === 'KeyZ') return h => h.octave(-1);
  if (code === 'KeyX') return h => h.octave(1);
  if (code === 'ArrowLeft') return h => h.transpose(-1);
  if (code === 'ArrowRight') return h => h.transpose(1);
  const voice = voiceDigit(code, shift);
  if (voice !== null) return h => h.voice(voice);
  return null;
}
