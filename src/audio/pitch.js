// C4 (middle C) = MIDI 60, A4 = 440 Hz
export function midiNote(octave, semitone, transpose = 0) {
  return 12 * (octave + 1) + semitone + transpose;
}

export function frequency(octave, semitone, transpose = 0) {
  return 440 * Math.pow(2, (midiNote(octave, semitone, transpose) - 69) / 12);
}
