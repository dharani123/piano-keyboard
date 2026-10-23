import { describe, it, expect } from 'vitest';
import { keyAction } from './useKeyboard.js';

function run(code, shift = false) {
  const calls = [];
  const h = new Proxy({}, { get: (_, name) => (...args) => calls.push([name, ...args]) });
  keyAction(code, shift)?.(h, true);
  return calls;
}

describe('keyAction', () => {
  it('plays number-row and F-keys as their own notes', () => {
    expect(run('Digit1')).toEqual([['noteDown', 'Digit1']]);
    expect(run('Backspace')).toEqual([['noteDown', 'Backspace']]);
    expect(run('F11')).toEqual([['noteDown', 'F11']]);
  });

  it('transposes with the left/right arrows, and [ is now a note', () => {
    expect(run('ArrowLeft')).toEqual([['transpose', -1]]);
    expect(run('ArrowRight')).toEqual([['transpose', 1]]);
    expect(run('BracketLeft')).toEqual([['noteDown', 'BracketLeft']]);
  });

  it('switches voice with Shift + 1–6', () => {
    expect(run('Digit1', true)).toEqual([['voice', 0]]);
    expect(run('Digit6', true)).toEqual([['voice', 5]]);
  });

  it('no longer switches voice with a plain digit', () => {
    expect(run('Digit5')).toEqual([['noteDown', 'Digit5']]);
  });

  it('ignores F-keys that fall between E–F and B–C', () => {
    expect(run('F2')).toEqual([]);
    expect(run('F5')).toEqual([]);
    expect(run('F9')).toEqual([]);
    expect(run('F12')).toEqual([]);
  });
});
