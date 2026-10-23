// Pure state machine for "press the right key(s)" exercises: note drills,
// patterns, ear training, chords and songs.
//
// A step is { notes: [{ semitone, oct }], label, ... }. One note = press it;
// several notes = a chord, complete once all of them are held together.
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
      const { semitone, octave, code, held = [] } = action;
      if (!targets.some(t => sameNote(state, t, semitone, octave))) {
        return {
          ...state,
          mistakes: state.mistakes + 1,
          stepMistakes: state.stepMistakes + 1,
          wrong: { code, n: (state.wrong?.n ?? 0) + 1 },
        };
      }
      const allHeld = targets.every(t =>
        (t.semitone === semitone && state.baseOctave + t.oct === octave) ||
        held.some(h => sameNote(state, t, h.semitone, h.octave))
      );
      if (!allHeld) return state; // part of a chord, keep going
      const index = state.index + 1;
      return {
        ...state,
        index,
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
export function octaveShiftNeeded(state, octave) {
  const step = currentStep(state);
  if (!step) return 0;
  const shift = state.baseOctave + step.notes[0].oct - octave;
  // L ; ' Enter (and P [) already play C–F one octave up
  return shift === 1 && step.notes.every(n => n.semitone <= 5 && n.oct === step.notes[0].oct) ? 0 : shift;
}

// Wrong presses per step allowed before the answer starts glowing
export const HINT_AFTER = 2;

export function starsForMistakes(mistakes, stepCount) {
  if (mistakes === 0) return 3;
  if (mistakes <= Math.ceil(stepCount * 0.15)) return 2;
  return 1;
}
