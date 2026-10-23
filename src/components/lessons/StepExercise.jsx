import { useEffect, useReducer, useRef } from 'react';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { bySemitone, highBySemitone } from '../../data/keymap.js';
import {
  startSteps, stepReducer, currentStep, octaveShiftNeeded, starsForMistakes, HINT_AFTER,
} from '../../lessons/stepTrainer.js';
import RichText from './RichText.jsx';

// rel = the note's octave relative to the piano's current one
// The high-octave key (L ; ' Enter, P [) for a note one octave up, if it has one
const highKey = (n, rel) => (rel === 1 ? highBySemitone[n.semitone] : undefined);
const codeFor = (n, rel) => (highKey(n, rel) ?? bySemitone[n.semitone]).code;

export default function StepExercise({ exercise, piano, onProgress, onComplete }) {
  const [state, dispatch] = useReducer(stepReducer, null, () => startSteps(exercise.make(), piano.octave));
  const step = currentStep(state);
  const total = state.steps.length;
  const showGlow = step && (exercise.hint === 'glow' || state.stepMistakes >= HINT_AFTER);
  const shift = octaveShiftNeeded(state, piano.octave);
  const stripRef = useRef(null);

  useEffect(() => piano.subscribe(e => dispatch({ type: 'press', ...e })), [piano.subscribe]);

  useEffect(() => {
    if (!state.wrong) return;
    const t = setTimeout(() => dispatch({ type: 'clearWrong' }), 350);
    return () => clearTimeout(t);
  }, [state.wrong]);

  useEffect(() => {
    piano.setHighlight({
      targets: showGlow ? step.notes.map(n => codeFor(n, state.baseOctave + n.oct - piano.octave)) : [],
      wrong: state.wrong?.code ?? null,
    });
  }, [showGlow, step, state.wrong, piano.octave]);
  useEffect(() => () => { piano.setHighlight(null); engine.cancelScheduled(); }, []);

  useEffect(() => {
    onProgress(state.status === 'done' ? 'DONE!' : `${state.index + 1}/${total}`);
  }, [state.index, state.status]);

  // Ear training: play the prompt when a step that has one comes up
  function audition(ns, chord) {
    const start = engine.now() + 0.05;
    ns.forEach((n, i) => {
      const freq = frequency(state.baseOctave + n.oct, n.semitone, piano.transpose);
      engine.playNote(freq, piano.instrumentId, chord ? start : start + i * 0.55, chord ? 1.4 : 0.5);
    });
  }
  useEffect(() => {
    if (!step?.play) return;
    // short pause so the prompt doesn't collide with the note just played
    const t = setTimeout(() => audition(step.play, false), state.index === 0 ? 150 : 600);
    return () => clearTimeout(t);
  }, [state.index]);

  // Most recent prompt at or before the current step, for "Hear again"
  const replay = step && state.steps.slice(0, state.index + 1).findLast(s => s.play)?.play;

  useEffect(() => {
    if (state.status !== 'done') return;
    const stars = starsForMistakes(state.mistakes, total);
    const t = setTimeout(() => onComplete({
      stars,
      detail: state.mistakes === 0 ? 'No mistakes, perfect!' : `${state.mistakes} wrong ${state.mistakes === 1 ? 'press' : 'presses'}`,
    }), 700);
    return () => clearTimeout(t);
  }, [state.status]);

  // Keep the current step centred in the strip without scrolling the page
  useEffect(() => {
    const strip = stripRef.current;
    const el = strip?.children[state.index];
    if (el) strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.offsetWidth / 2, behavior: 'smooth' });
  }, [state.index]);

  return (
    <div className="exercise">
      <div className="prompt">
        {step ? <RichText text={step.prompt ?? exercise.prompt} /> : '🎉 Done!'}
      </div>
      <div className="exercise-hint">
        {shift > 0 && <>First go <b>octave up</b>: press <kbd>X</kbd></>}
        {shift < 0 && <>First go <b>octave down</b>: press <kbd>Z</kbd></>}
        {shift === 0 && step && exercise.hint === 'none' && (showGlow ? 'Here it is, the key is glowing.' : 'No glow this time. Two misses and you get a hint.')}
        {shift === 0 && step && exercise.hint === 'glow' && (step.notes.length > 1 ? 'Hold all the glowing keys together.' : '')}
      </div>
      <div className="exercise-actions">
        {replay && <button onClick={() => audition(replay, false)}>🔊 Hear again</button>}
        {step?.listen && <button onClick={() => audition(step.listen, step.chord)}>🔊 Hear it</button>}
        <span className="counter">{Math.min(state.index + 1, total)} / {total} · mistakes {state.mistakes}</span>
      </div>
      <div className="progress"><div className="progress-bar" style={{ width: `${(state.index / total) * 100}%` }} /></div>
      <div className="note-strip" ref={stripRef}>
        {state.steps.map((s, i) => {
          const done = i < state.index;
          const keyHint = exercise.hint === 'glow' && s.label !== '?';
          return (
            <span
              key={i}
              className={
                'strip-note' + (done ? ' played' : '') + (i === state.index && step ? ' current' : '') +
                (i > 0 && s.phrase !== undefined && s.phrase !== state.steps[i - 1].phrase ? ' phrase-start' : '')
              }
            >
              <b>{done ? (s.reveal ?? s.label) : s.label}</b>
              {keyHint && <small>{s.notes.map(n => (highKey(n, n.oct)?.key ?? bySemitone[n.semitone].key + (n.oct > 0 ? '↑' : n.oct < 0 ? '↓' : ''))).join('+')}</small>}
            </span>
          );
        })}
      </div>
    </div>
  );
}
