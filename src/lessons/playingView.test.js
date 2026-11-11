import { describe, it, expect } from 'vitest';
import { playingViewDelta } from './playingView.js';

describe('playingViewDelta', () => {
  it('puts the keys 23% down a tall window', () => {
    const delta = playingViewDelta({ keysTop: 500, panelBottom: 1165, windowHeight: 1038 });
    expect(500 - delta).toBe(239);
  });

  it('scrolls back up to the same place when the keys are too high', () => {
    expect(100 - playingViewDelta({ keysTop: 100, panelBottom: 765, windowHeight: 1038 })).toBe(239);
  });

  it('keeps the whole panel on screen in a short window', () => {
    const delta = playingViewDelta({ keysTop: 300, panelBottom: 965, windowHeight: 700 });
    expect(965 - delta).toBe(684);
  });

  it('stays still when already in place', () => {
    expect(playingViewDelta({ keysTop: 230, panelBottom: 800, windowHeight: 1000 })).toBe(0);
  });
});
