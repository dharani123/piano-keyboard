import { describe, it, expect } from 'vitest';
import { keyAction } from './useKeyboard.js';

function run(code, shift = false) {
  const calls = [];
  const h = new Proxy({}, { get: (_, name) => (...args) => calls.push([name, ...args]) });
  keyAction(code, shift)?.(h, true);
  return calls;
}

describe('keyAction', () => {
  it('plays letter keys, and nothing on the number row or F-keys', () => {
    expect(run('KeyS')).toEqual([['noteDown', 'KeyS']]);
    expect(run('Digit1')).toEqual([]);
    expect(run('Backspace')).toEqual([]);
    expect(run('F11')).toEqual([]);
  });

  it('transposes with the left/right arrows, and [ is now a note', () => {
    expect(run('ArrowLeft')).toEqual([['transpose', -1]]);
    expect(run('ArrowRight')).toEqual([['transpose', 1]]);
    expect(run('BracketLeft')).toEqual([['noteDown', 'BracketLeft']]);
  });

  it('switches voice with Shift + 1–9, 0', () => {
    expect(run('Digit1', true)).toEqual([['voice', 0]]);
    expect(run('Digit7', true)).toEqual([['voice', 6]]);
    expect(run('Digit9', true)).toEqual([['voice', 8]]);
    expect(run('Digit0', true)).toEqual([['voice', 9]]);
  });

  it('does nothing on a plain digit', () => {
    expect(run('Digit5')).toEqual([]);
  });
});
