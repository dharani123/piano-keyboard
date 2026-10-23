// Lesson progress lives in this browser only: { stars: { lessonId: 0-3 }, unlockAll }
const KEY = 'desk-piano-progress';

// Stars needed to pass a lesson and unlock the next one
export const PASS_STARS = 2;
export const hasPassed = (progress, lessonId) => (progress.stars[lessonId] ?? 0) >= PASS_STARS;

export function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.stars === 'object') return { unlockAll: false, ...saved };
  } catch { /* storage unavailable or corrupt */ }
  return { stars: {}, unlockAll: false };
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch { /* storage unavailable */ }
}
