import { describe, it, expect } from 'vitest';
import { keyAction, leftShiftTap } from './useKeyboard.js';

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

  it('switches voice with Shift + 1–9, 0, −, =', () => {
    expect(run('Digit1', true)).toEqual([['voice', 0]]);
    expect(run('Digit7', true)).toEqual([['voice', 6]]);
    expect(run('Digit9', true)).toEqual([['voice', 8]]);
    expect(run('Digit0', true)).toEqual([['voice', 9]]);
    expect(run('Minus', true)).toEqual([['voice', 10]]);
    expect(run('Equal', true)).toEqual([['voice', 11]]);
  });

  it('does nothing on a plain digit', () => {
    expect(run('Digit5')).toEqual([]);
  });
});

describe('leftShiftTap', () => {
  it('fires when left Shift is pressed and released alone', () => {
    const tap = leftShiftTap();
    tap.keyDown('ShiftLeft');
    expect(tap.keyUp('ShiftLeft')).toBe(true);
  });

  it('does not fire for Shift+1, so voice picking still works', () => {
    const tap = leftShiftTap();
    tap.keyDown('ShiftLeft');
    tap.keyDown('Digit1');
    tap.keyUp('Digit1');
    expect(tap.keyUp('ShiftLeft')).toBe(false);
  });

  it('does not fire for right Shift', () => {
    const tap = leftShiftTap();
    tap.keyDown('ShiftRight');
    expect(tap.keyUp('ShiftRight')).toBe(false);
  });

  it('does not fire when left Shift joins Ctrl, Alt or Meta', () => {
    const tap = leftShiftTap();
    tap.keyDown('ShiftLeft', true);
    expect(tap.keyUp('ShiftLeft')).toBe(false);
  });

  it('does not re-arm on key repeat after another key cancelled the tap', () => {
    const tap = leftShiftTap();
    tap.keyDown('ShiftLeft');
    tap.keyDown('Digit1');
    tap.keyDown('ShiftLeft', false, true);
    expect(tap.keyUp('ShiftLeft')).toBe(false);
  });

  it('forgets a press when the window loses focus', () => {
    const tap = leftShiftTap();
    tap.keyDown('ShiftLeft');
    tap.reset();
    expect(tap.keyUp('ShiftLeft')).toBe(false);
  });
});
