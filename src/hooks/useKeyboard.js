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

// Shift + 1–6 picks a voice; plain digits are notes on the number row
const voiceDigit = (code, shift) => shift && code.match(/^Digit([1-6])$/);
const noteFor = (code, shift) => (voiceDigit(code, shift) ? null : noteCodeFor(code));

export function keyAction(code, shift = false) {
  const note = noteFor(code, shift);
  if (note) return h => h.noteDown(note);
  if (code === 'Space') return h => h.sustain(true);
  if (code === 'KeyZ') return h => h.octave(-1);
  if (code === 'KeyX') return h => h.octave(1);
  if (code === 'ArrowLeft') return h => h.transpose(-1);
  if (code === 'ArrowRight') return h => h.transpose(1);
  const digit = voiceDigit(code, shift);
  if (digit) return h => h.voice(Number(digit[1]) - 1);
  return null;
}
