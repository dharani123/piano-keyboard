// Keeps the app's saved progress (the `desk-piano-*` localStorage keys) in
// saved-progress.json in the project folder, via the dev server, so it can be
// committed and picked up on another laptop. The rest of the app keeps using
// localStorage as before; this just mirrors it to and from the file.

const PREFIX = 'desk-piano-';
// Imported songs stay in this browser only: they can be transcriptions of
// copyrighted recordings, and the repo is public.
const BROWSER_ONLY = ['desk-piano-my-songs'];
const synced = key => key.startsWith(PREFIX) && !BROWSER_ONLY.includes(key);
const URL = '/__progress';

function readLocal() {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!synced(key)) continue;
    const raw = localStorage.getItem(key);
    try { out[key] = JSON.parse(raw); } catch { out[key] = raw; }
  }
  return out;
}

let timer = null;
function saveSoon() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(readLocal(), null, 2) })
      .catch(() => { /* no dev server (e.g. a static build): browser storage still works */ });
  }, 500);
}

// Before the app starts: the file wins; with no file yet, this browser's progress seeds it.
export async function syncProgressWithFile() {
  try {
    const res = await fetch(URL);
    if (!res.ok) return;
    const saved = await res.json();
    const keys = Object.keys(saved);
    if (keys.length) {
      for (const key of keys.filter(synced)) {
        const v = saved[key];
        localStorage.setItem(key, typeof v === 'string' ? v : JSON.stringify(v));
      }
    } else {
      saveSoon();
    }
  } catch {
    return; // no dev server: keep browser-only storage
  }

  // From now on, mirror every progress write to the file
  const { setItem, removeItem } = Storage.prototype;
  Storage.prototype.setItem = function (key, value) {
    setItem.call(this, key, value);
    if (this === localStorage && synced(key)) saveSoon();
  };
  Storage.prototype.removeItem = function (key) {
    removeItem.call(this, key);
    if (this === localStorage && synced(key)) saveSoon();
  };
}
