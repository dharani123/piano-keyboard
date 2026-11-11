// Decoded songs the user deleted from the tab. The songs stay in library.js; this
// list just hides them, so "Restore" can bring them back. Synced like progress.
const KEY = 'desk-piano-hidden-songs';

export function loadHiddenSongs() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) return saved;
  } catch { /* storage unavailable or corrupt */ }
  return [];
}

export function saveHiddenSongs(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch { /* storage unavailable */ }
}

export const hideSong = (ids, id) => (ids.includes(id) ? ids : [...ids, id]);
export const visibleSongs = (songs, ids) => songs.filter(s => !ids.includes(s.id));
