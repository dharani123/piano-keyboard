// Turns detected notes (from Basic Pitch) into a falling-notes song:
// keep only the top line (the tune), drop the bass below middle C, fold every
// note into the on-screen range (middle C up to high F) and snap to a grid.

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const MIDDLE_C = 60;
const HIGH_F = 77;
export const IMPORT_BPM = 120;
const SLOT_BEATS = 0.25;
const MAX_GAP_BEATS = 4;

const fold = p => {
  while (p > HIGH_F) p -= 12;
  while (p < MIDDLE_C) p += 12;
  return p;
};

// notes: [{ startTimeSeconds, durationSeconds, pitchMidi, amplitude }]
export function notesToSong(notes, { minAmplitude = 0.3 } = {}) {
  const spb = 60 / IMPORT_BPM;
  const slotOf = s => Math.round(s / spb / SLOT_BEATS);
  const kept = notes.filter(n => n.pitchMidi >= MIDDLE_C && n.amplitude >= minAmplitude);
  if (!kept.length) return { events: [], totalBeats: 0 };

  // For every grid slot: the highest sounding pitch, and whether it starts there
  const slots = slotOf(Math.max(...kept.map(n => n.startTimeSeconds + n.durationSeconds))) + 1;
  const top = new Array(slots).fill(null);
  for (const n of kept) {
    const from = slotOf(n.startTimeSeconds);
    const to = Math.max(from + 1, slotOf(n.startTimeSeconds + n.durationSeconds));
    for (let i = from; i < to && i < slots; i++) {
      if (!top[i] || n.pitchMidi > top[i].pitch) top[i] = { pitch: n.pitchMidi, onset: i === from };
    }
  }

  // Join slots into notes; a fresh onset of the same pitch starts a new note
  const melody = [];
  top.forEach((t, i) => {
    const last = melody.at(-1);
    if (!t) return;
    if (last && last.pitch === t.pitch && last.end === i && !t.onset) last.end = i + 1;
    else melody.push({ pitch: t.pitch, start: i, end: i + 1 });
  });

  // Close long silences so the song doesn't sit empty
  const events = [];
  let beat = 0;
  let prevEnd = melody[0].start;
  for (const m of melody) {
    beat += Math.min((m.start - prevEnd) * SLOT_BEATS, MAX_GAP_BEATS);
    const beats = (m.end - m.start) * SLOT_BEATS;
    const p = fold(m.pitch);
    events.push({ beat, beats, notes: [{ name: NAMES[p % 12], semitone: p % 12, oct: Math.floor(p / 12) - 5 }] });
    beat += beats;
    prevEnd = m.end;
  }
  return { events, totalBeats: beat };
}
