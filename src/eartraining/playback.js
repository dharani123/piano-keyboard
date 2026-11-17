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
