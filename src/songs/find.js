// Find one by one (Decoded songs, the user 2026-11-19): decode a song yourself, like Play it
// back in Ear Training but on the real song. C V N M play the next 1 to 4 notes after the cursor
// (the end of the line), and B steps the cursor back. A long graph plots each note
// as you play it in line from the start of the song. Playing the note after the last one found
// finds it. Only the next note after the cursor counts (the user, 2026-11-19): any other key just
// sounds and the cursor stays (the song's first note no longer restarts the line; use B or the
// From start button).
// How far you got (found) is saved per song, so you can decode a bit at a time.

const KEY = 'desk-piano-find-progress';

// The melody as single notes: the top note of any chord
export function findNotes(song) {
  return song.events.map(e => {
    const top = e.notes.reduce((a, b) => (b.semitone + 12 * b.oct > a.semitone + 12 * a.oct ? b : a));
    return { semitone: top.semitone, oct: top.oct, beat: e.beat, beats: e.beats };
  });
}

// One key played. run = the cursor (notes played in line), found = notes found so far.
// The next note after the cursor moves it on (and finds a new note when it passes found);
// anything else changes nothing.
export function step({ run, found }, notes, semitone, oct) {
  if (isNext(notes[run], semitone, oct)) return { run: run + 1, found: Math.max(found, run + 1) };
  return { run, found };
}

// true when the key you played is the next note to find (same key, same octave)
export const isNext = (note, semitone, oct) => !!note && note.semitone === semitone && note.oct === oct;

export function loadFind() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
export function saveFind(progress) {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* storage unavailable */ }
}
