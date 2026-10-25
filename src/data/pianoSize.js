// Piano size: Small is the compact office piano, Big a standard on-screen piano.

export const SIZE_MODES = [
  ['small', 'Small'],
  ['big', 'Big'],
];

const KEY = 'desk-piano-size';
export function loadSizeMode() {
  try {
    const m = localStorage.getItem(KEY);
    return SIZE_MODES.some(([id]) => id === m) ? m : 'small';
  } catch { return 'small'; }
}
export function saveSizeMode(mode) {
  try { localStorage.setItem(KEY, mode); } catch { /* storage blocked */ }
}
