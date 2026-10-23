// Pure state machine for one ear-training session (a lesson or an Ear Gym set).
//
// phase: prompt (reference + target playing, keys ignored) → answer →
//        right: last.correct, wait for `advance` | wrong/timeout: fix (press the
//        real note to continue). Only the first answer of a round is recorded,
//        and a round costs at most one mistake.
import { isCorrect } from './rounds.js';

// ms to show "✓" before the next round
export const RIGHT_DELAY = 600;

export function startSession(rounds) {
  return { rounds, index: 0, phase: 'prompt', mistakes: 0, answers: [], last: null };
}

export function earReducer(state, action) {
  const round = state.rounds[state.index];
  switch (action.type) {
    case 'prompted':
      return state.phase === 'prompt' ? { ...state, phase: 'answer' } : state;
    case 'press': {
      if ((state.phase !== 'answer' && state.phase !== 'fix') || state.last?.correct) return state;
      const correct = isCorrect(round.target, action.semitone);
      if (state.phase === 'fix') {
        return correct ? { ...state, last: { answered: action.semitone, correct: true } } : state;
      }
      const answers = [...state.answers, { target: round.target, answered: action.semitone }];
      return correct
        ? { ...state, answers, last: { answered: action.semitone, correct: true } }
        : { ...state, answers, phase: 'fix', mistakes: state.mistakes + 1, last: { answered: action.semitone, correct: false } };
    }
    case 'timeout':
      if (state.phase !== 'answer' || state.last?.correct) return state;
      return {
        ...state,
        phase: 'fix',
        mistakes: state.mistakes + 1,
        answers: [...state.answers, { target: round.target, answered: null }],
        last: { answered: null, correct: false },
      };
    case 'advance': {
      if (!state.last?.correct) return state;
      const index = state.index + 1;
      return { ...state, index, phase: index >= state.rounds.length ? 'done' : 'prompt', last: null };
    }
    case 'replaceUpcoming':
      return { ...state, rounds: [...state.rounds.slice(0, state.index + 1), ...action.rounds.slice(state.index + 1)] };
    default:
      return state;
  }
}
