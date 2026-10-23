import { it, expect } from 'vitest';
import { effectiveTranspose } from './transposeLock.js';

it('is zero while any ear exercise holds a lock', () => {
  expect(effectiveTranspose(5, 1)).toBe(0);
  expect(effectiveTranspose(-3, 2)).toBe(0);
});

it('is the player\'s transpose when unlocked', () => {
  expect(effectiveTranspose(5, 0)).toBe(5);
});
