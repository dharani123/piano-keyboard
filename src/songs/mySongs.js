import { IMPORT_BPM } from './transcribe.js';

// Songs imported from the user's own audio files live in this browser only
const KEY = 'desk-piano-my-songs';

export function loadMySongs() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(saved)) return saved;
  } catch { /* storage unavailable or corrupt */ }
  return [];
}

export function saveMySongs(songs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(songs));
  } catch { /* storage unavailable */ }
}

export const makeMySong = (title, { events, totalBeats }) => ({
  id: `mine-${Date.now()}`,
  title,
  level: 'My songs',
  bpm: IMPORT_BPM,
  mine: true,
  events,
  totalBeats,
});
