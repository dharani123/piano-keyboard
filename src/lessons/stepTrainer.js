import { keyAt } from '../data/keymap.js';
import { isDMajor } from '../data/dChord.js';
// Pure state machine for "press the right key(s)" exercises: note drills,
// patterns, ear training, chords and songs.
//
// A step is { notes: [{ semitone, oct }], label, ... }. One note = press it;
// several notes = a chord, complete once all of them are held together.
// D major is the exception: any two of its notes complete it (the player's keyboard
// can't register all three), and the app plays the rest, reported in state.filled.
// `baseOctave` is the octave the exercise started in; each note's `oct` is
// relative to it.

export function startSteps(steps, octave) {
  return { steps, index: 0, status: 'playing', baseOctave: octave, mistakes: 0, stepMistakes: 0, wrong: null };
}

const sameNote = (state, target, semitone, octave) =>
  target.semitone === semitone && state.baseOctave + target.oct === octave;

export function stepReducer(state, action) {
  switch (action.type) {
    case 'press': {
      if (state.status !== 'playing') return state;
      const targets = state.steps[state.index].notes;
      const { semitone, octave, code, held = [], chordFilled = false } = action;
      if (!targets.some(t => sameNote(state, t, semitone, octave))) {
        // the third key of a D major chord, arriving after the chord already counted
        if (state.grace?.some(t => sameNote(state, t, semitone, octave))) return state;
        return {
          ...state,
          mistakes: state.mistakes + 1,
          stepMistakes: state.stepMistakes + 1,
          wrong: { code, n: (state.wrong?.n ?? 0) + 1 },
        };
      }
      const isHeld = t =>
        (t.semitone === semitone && state.baseOctave + t.oct === octave) ||
        held.some(h => sameNote(state, t, h.semitone, h.octave));
      const anyTwo = isDMajor(targets);
      const heldCount = targets.filter(isHeld).length;
      if (heldCount < (anyTwo ? 2 : targets.length)) return state; // part of a chord, keep going
      const missing = targets.filter(t => !isHeld(t));
      const index = state.index + 1;
      return {
        ...state,
        index,
        grace: anyTwo ? targets : null,
        // notes still to play for you (chordFilled = App already played them with the keypress)
        filled: missing.length && !chordFilled ? { notes: missing, n: (state.filled?.n ?? 0) + 1 } : state.filled,
        status: index >= state.steps.length ? 'done' : 'playing',
        stepMistakes: 0,
        wrong: null,
      };
    }
    case 'clearWrong':
      return { ...state, wrong: null };
    default:
      return state;
  }
}

export function currentStep(state) {
  return state.status === 'playing' ? state.steps[state.index] : null;
}

// How many octaves the player needs to shift before the next step (+ = up)
// (none when every note already has a key in this layout, e.g. L ; ' Enter = C–F one octave up)
export function octaveShiftNeeded(state, octave, layout = 0) {
  const step = currentStep(state);
  if (!step) return 0;
  const shift = state.baseOctave + step.notes[0].oct - octave;
  return step.notes.every(n => keyAt(n.semitone, state.baseOctave + n.oct - octave, layout)) ? 0 : shift;
}

// Wrong presses per step allowed before the answer starts glowing
export const HINT_AFTER = 2;

export function starsForMistakes(mistakes, stepCount) {
  if (mistakes === 0) return 3;
  if (mistakes <= Math.ceil(stepCount * 0.15)) return 2;
  return 1;
}
