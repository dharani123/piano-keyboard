import { useEffect, useReducer, useRef, useState } from 'react';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { bySemitone, SEMITONES } from '../../data/keymap.js';
import { starsForMistakes } from '../../lessons/stepTrainer.js';
import { makeRounds } from '../../ear/rounds.js';
import { startSession, earReducer, RIGHT_DELAY } from '../../ear/session.js';
import { loadStats, saveStats, recordAnswer, localDay } from '../../ear/stats.js';
import RichText from './RichText.jsx';

const GAP = 0.6; // seconds between reference C and the target, and between feedback notes
const LENGTH = 0.5;
const name = semitone => bySemitone[semitone].note.replace('#', '♯');

// Name-that-note exercise, used by ear lessons and the Ear Gym.
// `rounds` (Gym) overrides generating them from the exercise config; when the
// prop changes mid-session only the rounds still to come are swapped in.
export default function EarExercise({ exercise, piano, onProgress, onComplete, rounds: givenRounds, onAnswer }) {
  const [state, dispatch] = useReducer(earReducer, null, () => startSession(givenRounds ?? makeRounds(exercise)));
  const [baseOctave] = useState(piano.octave);
  const [introDone, setIntroDone] = useState(!exercise.intro);
  const lastPress = useRef(null);
  const round = state.rounds[state.index];
  const total = state.rounds.length;
  const voiceFor = r => r.voice ?? piano.instrumentId;

  useEffect(() => piano.lockTranspose(), []);
  useEffect(() => () => { piano.setHighlight(null); engine.cancelScheduled(); }, []);

  useEffect(() => piano.subscribe(e => {
    lastPress.current = e;
    dispatch({ type: 'press', semitone: e.semitone });
  }), [piano.subscribe]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (givenRounds) dispatch({ type: 'replaceUpcoming', rounds: givenRounds });
  }, [givenRounds]);

  // Ear exercises always sound at transpose 0 (the App holds it there while we're mounted)
  function play(semitone, oct, voice, at) {
    engine.playNote(frequency(baseOctave + oct, semitone, 0), voice, at, LENGTH);
  }
  function playRound(r, withReference) {
    const start = engine.now() + 0.05;
    if (withReference) play(0, 0, voiceFor(r), start);
    play(r.target, r.oct, voiceFor(r), withReference ? start + GAP : start);
    return withReference ? GAP : 0;
  }
  const hearC = () => play(0, 0, piano.instrumentId, engine.now() + 0.05);

  // Intro: each new note next to C, three times
  function playIntro() {
    let t = engine.now() + 0.1;
    for (const n of exercise.intro) {
      for (let i = 0; i < 3; i++) {
        if (n !== 'C') { play(0, 0, piano.instrumentId, t); t += GAP; }
        play(SEMITONES[n], 0, piano.instrumentId, t);
        t += GAP * 1.5;
      }
      t += GAP;
    }
  }
  useEffect(() => {
    if (introDone) return;
    const t = setTimeout(playIntro, 300);
    return () => { clearTimeout(t); engine.cancelScheduled(); };
  }, [introDone]);

  // Prompt: reference (if this round has one) then the target; keys count once it sounds
  useEffect(() => {
    if (!introDone || state.phase !== 'prompt') return;
    let ready;
    const t = setTimeout(() => {
      const wait = playRound(round, round.reference);
      ready = setTimeout(() => dispatch({ type: 'prompted' }), wait * 1000 + 50);
    }, state.index === 0 ? 300 : 500);
    return () => { clearTimeout(t); clearTimeout(ready); };
  }, [introDone, state.index, state.phase === 'prompt']);

  // Right: show it briefly, then move on
  useEffect(() => {
    if (!state.last?.correct) return;
    const t = setTimeout(() => dispatch({ type: 'advance' }), RIGHT_DELAY);
    return () => clearTimeout(t);
  }, [state.last]);

  // Wrong or too slow: your note, then the real one
  useEffect(() => {
    if (!state.last || state.last.correct) return;
    const start = engine.now() + 0.35;
    const press = lastPress.current;
    if (state.last.answered !== null && press) {
      engine.playNote(frequency(press.octave, press.semitone, 0), voiceFor(round), start, LENGTH);
    }
    play(round.target, round.oct, voiceFor(round), start + GAP);
  }, [state.last]);

  // First answer of each round goes to the stats (or to the Gym, which keeps its own)
  useEffect(() => {
    const answer = state.answers.at(-1);
    if (!answer) return;
    if (onAnswer) onAnswer(answer.target, answer.answered);
    else saveStats(recordAnswer(loadStats(), answer.target, answer.answered, localDay()));
  }, [state.answers.length]);

  useEffect(() => {
    if (state.phase !== 'answer' || !exercise.timeLimit) return;
    const t = setTimeout(() => dispatch({ type: 'timeout' }), exercise.timeLimit);
    return () => clearTimeout(t);
  }, [state.phase, state.index]);

  useEffect(() => {
    const glow = !introDone
      ? exercise.intro.map(n => bySemitone[SEMITONES[n]].code)
      : state.phase === 'fix' ? [bySemitone[round.target].code] : [];
    const wrong = state.last && !state.last.correct && state.last.answered !== null ? lastPress.current?.code : null;
    piano.setHighlight({ targets: glow, wrong });
  }, [introDone, state.phase, state.last]);

  useEffect(() => {
    onProgress(state.phase === 'done' ? 'DONE!' : introDone ? `${state.index + 1}/${total}` : 'LISTEN');
  }, [state.index, state.phase, introDone]);

  useEffect(() => {
    if (state.phase !== 'done') return;
    const m = state.mistakes;
    const t = setTimeout(() => onComplete({
      stars: starsForMistakes(m, total),
      detail: m === 0 ? 'No mistakes, perfect ear!' : `${m} of ${total} notes missed`,
      mistakes: m,
    }), 700);
    return () => clearTimeout(t);
  }, [state.phase]);

  if (!introDone) {
    return (
      <div className="exercise">
        <div className="prompt">
          Listen: {exercise.intro.map((n, i) => (
            <span key={n}>{i > 0 && ', '}{n === 'C' ? <b>C</b> : <>C → <b>{name(SEMITONES[n])}</b></>}</span>
          ))}
        </div>
        <div className="exercise-hint">Each new note is played next to C, three times. Play along on the glowing keys, and hum them.</div>
        <div className="exercise-actions">
          <button onClick={playIntro}>🔊 Play again</button>
          <button className="primary" onClick={() => { engine.cancelScheduled(); setIntroDone(true); }}>Start ▶</button>
        </div>
      </div>
    );
  }

  const last = state.last;
  return (
    <div className="exercise">
      <div className="prompt">
        {state.phase === 'done' ? '🎉 Done!' : <RichText text={exercise.prompt ?? 'Listen, then press the note you heard'} />}
      </div>
      <div className={'exercise-hint ear-feedback' + (last ? (last.correct ? ' right' : ' wrong') : '')}>
        {state.phase === 'prompt' && (round.reference ? 'Listen: C, then the mystery note…' : 'Listen…')}
        {state.phase === 'answer' && !last && 'Which note was it?'}
        {last?.correct && state.phase !== 'fix' && <>✓ <b>{name(round.target)}</b></>}
        {state.phase === 'fix' && !last?.correct && (
          last.answered === null
            ? <>Too slow! It was <b>{name(round.target)}</b>. Press it to go on.</>
            : <>You: <b>{name(last.answered % 12)}</b> → it was: <b>{name(round.target)}</b>. Press it to go on.</>
        )}
        {state.phase === 'fix' && last?.correct && <>That's <b>{name(round.target)}</b>.</>}
      </div>
      {exercise.timeLimit && state.phase === 'answer' && (
        <div className="progress"><div key={state.index} className="ear-timer" style={{ animationDuration: `${exercise.timeLimit}ms` }} /></div>
      )}
      <div className="exercise-actions">
        {state.phase !== 'done' && <button onClick={() => playRound(round, round.reference)}>🔊 Hear again</button>}
        {state.phase !== 'done' && exercise.reference !== 'every' && <button onClick={hearC}>🔊 Hear C</button>}
        <span className="counter">{Math.min(state.index + 1, total)} / {total} · mistakes {state.mistakes}</span>
      </div>
      <div className="progress"><div className="progress-bar" style={{ width: `${(state.index / total) * 100}%` }} /></div>
      <div className="note-strip">
        {state.rounds.map((r, i) => (
          <span key={i} className={'strip-note' + (i < state.index ? ' played' : '') + (i === state.index && state.phase !== 'done' ? ' current' : '')}>
            <b>{i < state.index ? name(r.target) : '?'}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
