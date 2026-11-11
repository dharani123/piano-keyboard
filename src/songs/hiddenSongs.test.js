import { describe, it, expect } from 'vitest';
import { hideSong, visibleSongs } from './hiddenSongs.js';

describe('hidden songs', () => {
  it('hides a song once and leaves the rest in order', () => {
    const ids = hideSong(hideSong([], 'b'), 'b');
    expect(ids).toEqual(['b']);
    expect(visibleSongs([{ id: 'a' }, { id: 'b' }, { id: 'c' }], ids).map(s => s.id)).toEqual(['a', 'c']);
  });
});
