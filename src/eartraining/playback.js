// Play it back (Ear Training): the app plays a few swaras, you play keys freely until the
// last notes you played are the pattern, in order. Nothing counts as a mistake (the user,
// 2026-11-17): wrong keys just sound and the app keeps listening.
// Notes are { semitone, oct }, oct relative to the octave the lesson started in.

// The presses so far, keeping only as many as the pattern is long
export function pushPress(played, note, length) {
  return [...played, { semitone: note.semitone, oct: note.oct }].slice(-length);
}

// true once the last presses are the pattern, note for note (same key, same octave)
export function matchesPattern(played, pattern) {
  return played.length === pattern.length &&
    played.every((p, i) => p.semitone === pattern[i].semitone && p.oct === pattern[i].oct);
}

// How many of the pattern's notes you have played in line so far: the longest start of the
// pattern that your last presses end with (the user, 2026-11-19: each swara shows, and the graph
// grows, as soon as you have it, so you can open the pattern one note at a time).
// A wrong key breaks the line; play from the first swara again.
export function matchedPrefix(played, pattern) {
  const same = (p, n) => p.semitone === n.semitone && p.oct === n.oct;
  for (let k = Math.min(played.length, pattern.length); k > 0; k--) {
    const tail = played.slice(-k);
    if (tail.every((p, i) => same(p, pattern[i]))) return k;
  }
  return 0;
}

// Sticky progress (the user, 2026-11-20: "as I identify the notes, keep plotting the graph one
// by one"): a swara you have found stays found; only the next one is listened for, and wrong
// keys just sound. To go back to the line breaking on a wrong key, use matchedPrefix instead.
export function advanceFound(found, note, pattern) {
  const want = pattern[found];
  return want && note.semitone === want.semitone && note.oct === want.oct ? found + 1 : found;
}
