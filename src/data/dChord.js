// D major chord helper: the player's keyboard can't register D + Y + J at once, so two
// notes of a D major chord stand in for all three, everywhere in the app.
const D_MAJOR = [2, 6, 9]; // D, F♯, A

export const isDMajor = ns =>
  ns.length === 3 && D_MAJOR.every(pc => ns.some(n => n.semitone % 12 === pc));

// { interval between the two held notes: where the missing note sits }, per lowest note
const THIRD_NOTE = {
  2: { 4: hi => hi + 3, 7: (hi, lo) => lo + 4 },              // D F♯ → A, D A → F♯
  6: { 3: (hi, lo) => lo - 4, 8: (hi, lo) => lo + 3 },        // F♯ A → D, F♯ D → A
  9: { 5: hi => hi + 4, 9: (hi, lo) => lo + 5 },              // A D → F♯, A F♯ → D
};

// Given two held notes { semitone, octave }, the third note of the D major chord, or null
export function dChordThird(a, b) {
  const [lo, hi] = [a, b].map(n => n.octave * 12 + n.semitone).sort((x, y) => x - y);
  const place = THIRD_NOTE[lo % 12]?.[hi - lo];
  if (!place) return null;
  const pitch = place(hi, lo);
  return { semitone: ((pitch % 12) + 12) % 12, octave: Math.floor(pitch / 12) };
}
