// Falling-notes play-through of one song, measured in beats.
//   wait mode: time stops at each note until you press it
//   play mode: time keeps running like the real song
// The UI calls press() on every key down and advance() every frame with the
// keys currently held; score() grades hitting each note and holding it.

export const HIT_WINDOW_SECONDS = 0.25;
// Holding for this share of a note's length counts as a full hold
export const FULL_HOLD = 0.85;
const WRONG_PENALTY = 0.1;

export const pitchKey = (semitone, octave) => `${semitone}:${octave}`;

export function createPlay(song, { mode, baseOctave, secondsPerBeat }) {
  const notes = song.events.flatMap((ev, group) => ev.notes.map(n => ({
    group,
    beat: ev.beat,
    beats: ev.beats,
    name: n.name,
    semitone: n.semitone,
    octave: baseOctave + n.oct,
    hit: false,
    holding: false,
    held: 0,
    missed: false,
  })));
  return {
    mode,
    beat: 0,
    totalBeats: song.totalBeats,
    windowBeats: HIT_WINDOW_SECONDS / secondsPerBeat,
    notes,
    wrong: 0,
    done: false,
  };
}

// Returns the note that was hit, or null for a wrong key
export function press(state, semitone, octave) {
  const { beat, windowBeats, mode } = state;
  const note = state.notes.find(n =>
    !n.hit && !n.missed && n.semitone === semitone && n.octave === octave &&
    n.beat <= beat + windowBeats && (mode === 'wait' || n.beat >= beat - windowBeats));
  if (!note) {
    state.wrong++;
    return null;
  }
  note.hit = true;
  note.holding = true;
  return note;
}

// The first chord or note not fully pressed yet, as its notes
export function pendingGroup(state) {
  const first = state.notes.find(n => !n.hit && !n.missed);
  return first ? state.notes.filter(n => n.group === first.group) : [];
}

export function advance(state, dBeats, heldKeys) {
  let next = state.beat + dBeats;
  if (state.mode === 'wait') {
    const pending = pendingGroup(state);
    if (pending.length && next >= pending[0].beat) next = Math.max(state.beat, pending[0].beat);
  }
  for (const n of state.notes) {
    if (!n.holding) continue;
    if (!heldKeys.has(pitchKey(n.semitone, n.octave))) { n.holding = false; continue; }
    const overlap = Math.min(next, n.beat + n.beats) - Math.max(state.beat, n.beat);
    if (overlap > 0) n.held += overlap;
    if (next >= n.beat + n.beats) n.holding = false;
  }
  if (state.mode === 'play') {
    for (const n of state.notes) if (!n.hit && next > n.beat + state.windowBeats) n.missed = true;
  }
  state.beat = next;
  if (next >= state.totalBeats && !pendingGroup(state).length) state.done = true;
  return state;
}

export const holdShare = n => Math.min(1, n.held / (n.beats * FULL_HOLD));

export function score(state) {
  const { notes } = state;
  const hits = notes.filter(n => n.hit);
  const points = hits.reduce((sum, n) => sum + 0.5 + 0.5 * holdShare(n), 0);
  const accuracy = Math.max(0, (points - state.wrong * WRONG_PENALTY) / notes.length);
  return {
    accuracy,
    total: notes.length,
    hits: hits.length,
    fullHolds: hits.filter(n => holdShare(n) >= 1).length,
    missed: notes.length - hits.length,
    wrong: state.wrong,
  };
}
