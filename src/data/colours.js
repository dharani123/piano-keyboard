// Piano colour modes. Colour mode paints the white keys VIBGYOR from B down to C
// (C red … B violet); each black key gets a darker blend of its two neighbours.

export const COLOUR_MODES = [
  ['gray', 'Grayscale'],
  ['bw', 'Black & White'],
  ['colour', 'Colour'],
];

const KEY = 'desk-piano-colours';
export function loadColourMode() {
  try {
    const m = localStorage.getItem(KEY);
    return COLOUR_MODES.some(([id]) => id === m) ? m : 'gray';
  } catch { return 'gray'; }
}
export function saveColourMode(mode) {
  try { localStorage.setItem(KEY, mode); } catch { /* storage blocked */ }
}

// [fill, text] per white-key semitone
const WHITE = {
  0: ['#e53935', '#fff'], // C red
  2: ['#fb8c00', '#1b1408'], // D orange
  4: ['#fdd835', '#1b1408'], // E yellow
  5: ['#43a047', '#fff'], // F green
  7: ['#1e88e5', '#fff'], // G blue
  9: ['#3f51b5', '#fff'], // A indigo
  11: ['#8e24aa', '#fff'], // B violet
};

// CSS custom properties for a note: --nc fill, --nt text on that fill
export function noteColourVars(semitone) {
  const s = ((semitone % 12) + 12) % 12;
  if (WHITE[s]) return { '--nc': WHITE[s][0], '--nt': WHITE[s][1] };
  const blend = `color-mix(in srgb, ${WHITE[s - 1][0]}, ${WHITE[s + 1][0]})`;
  return { '--nc': `color-mix(in srgb, ${blend} 55%, #000)`, '--nt': '#fff' };
}
