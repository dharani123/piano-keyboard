import { useEffect, useRef, useState } from 'react';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { codeAt } from '../../data/keymap.js';
import { starsForMistakes } from '../../lessons/stepTrainer.js';
import RichText from './RichText.jsx';
import Staff from '../sheet/Staff.jsx';
import { useListenTiming } from './ListenTiming.jsx';

// Multiple-choice questions, optionally about a staff picture.
// exercise = { type: 'choice', make: () => [{ prompt, staff?, options: [...], answer, why? }] }
// `answer` is the correct option's text. A wrong pick counts as a mistake and
// shows `why`; the question stays until the right option is picked.
// Listening questions: `play` = notes (from parseNotes) played one after the other,
// spaced by the player's Gap slider (ListenTiming.jsx), the last one ringing for the Last note
// slider, when the question comes up and again on B / Hear again;
// `reveal` is shown once it's answered right, while the notes play again with their keys lit, then it moves on. exercise.keys = { KeyboardEvent.code: option }
// answers from the keyboard (arrow keys, so the piano keys stay free).
// C V N M pick the 1st to 4th option on screen (the user's choice, 2026-11-13: left hand stays
// near B for Hear again; none of them plays a note).
// q.slopes = { option: [pitches] }: the option is drawn as a line through dots, higher dots for higher notes.
// pitches are semitones 0-11 (C to B): the height is split into 12 rows, one per key, with a faint
// line for each, so every semitone is the same step up and the size of a jump can be counted.
const OPTION_KEYS = [['KeyC', 'C'], ['KeyV', 'V'], ['KeyN', 'N'], ['KeyM', 'M']];
const ROW = 7;
const TOP = 6;
// starts = each note's start time in seconds (the Gap sliders): the dots sit that far apart,
// PX_PER_SECOND wide, so a longer gap draws a wider step (scaled down to fit MAX_SPAN).
const PX_PER_SECOND = 72;
const MAX_SPAN = 216;
const SIDE = 14;
// labels (q.swaras, the Greater / lesser lessons): a swara name under each dot, on every option (the user, 2026-11-14)
const LABEL_H = 13;
function Slope({ pitches, starts, labels }) {
  const total = starts.at(-1) || 1;
  const span = Math.min(total * PX_PER_SECOND, MAX_SPAN);
  const x = i => (pitches.length === 1 ? SIDE : SIDE + (starts[i] / total) * span);
  const width = SIDE * 2 + (pitches.length === 1 ? 0 : span);
  const y = p => TOP + (11 - p) * ROW;
  const points = pitches.map((p, i) => `${x(i)},${y(p)}`).join(' ');
  const height = TOP * 2 + 11 * ROW + (labels ? LABEL_H : 0);
  return (
    <svg className="slope" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
      {[...Array(12).keys()].map(p => (
        <line key={p} x1="4" x2={width - 4} y1={y(p)} y2={y(p)} stroke="currentColor" strokeWidth="0.6" opacity={p === 0 ? 0.45 : 0.18} />
      ))}
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pitches.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r="3.5" fill="currentColor" />)}
      {labels?.map((l, i) => <text key={i} x={x(i)} y={height - 2} textAnchor="middle" fontSize="10" fill="currentColor">{l}</text>)}
    </svg>
  );
}

export default function ChoiceExercise({ exercise, piano, onProgress, onComplete }) {
  const [questions] = useState(() => exercise.make());
  const [baseOctave] = useState(piano?.octave ?? 4);
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState([]); // options already tried on this question
  const [right, setRight] = useState(false);
  const q = questions[index];
  const total = questions.length;
  const timing = useListenTiming(q.play && !q.together ? q.play.length : 2, index);

  useEffect(() => { onProgress(`${Math.min(index + 1, total)}/${total}`); }, [index]);

  // show = light each key while it sounds (only once answered, so it doesn't give it away)
  const glowTimers = useRef([]);
  function clearGlow() {
    glowTimers.current.forEach(clearTimeout);
    glowTimers.current = [];
    piano.setHighlight(null);
  }
  function listen(question = q, show = right) {
    if (!question.play) return;
    engine.cancelScheduled();
    clearGlow();
    // together: every note at once, held a little longer; otherwise spaced by the Gap sliders
    const at = question.together ? question.play.map(() => 0) : timing.starts(question.play.length);
    const length = i => question.together ? 1.4
      : i === question.play.length - 1 ? timing.hold : Math.min(0.8, timing.gap(i) * 0.9);
    const start = engine.now() + 0.05;
    const codeOf = n => codeAt(n.semitone, baseOctave + n.oct - piano.octave, piano.layout);
    question.play.forEach((n, i) => {
      const len = length(i);
      engine.playNote(frequency(baseOctave + n.oct, n.semitone, 0), piano.instrumentId, start + at[i], len);
      if (!show) return;
      const targets = question.together ? question.play.map(codeOf) : [codeOf(n)];
      glowTimers.current.push(
        setTimeout(() => piano.setHighlight({ targets, wrong: null }), (50 + at[i] * 1000)),
        setTimeout(() => piano.setHighlight(null), (50 + (at[i] + len) * 1000)),
      );
    });
  }
  useEffect(() => {
    if (!q.play) return;
    const t = setTimeout(() => listen(q, false), index === 0 ? 300 : 500);
    return () => clearTimeout(t);
  }, [index]);
  useEffect(() => () => { engine.cancelScheduled(); clearGlow(); }, []);
  useEffect(() => { if (q.play) return piano.lockTranspose(); }, []);

  // B = Hear again; exercise.keys answer from the keyboard
  const onKeyRef = useRef();
  onKeyRef.current = e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return;
    if (e.code === 'KeyB' && !right) listen();
    const at = OPTION_KEYS.findIndex(([code]) => code === e.code);
    const option = exercise.keys?.[e.code] ?? (at !== -1 ? q.options[at] : undefined);
    if (option) { e.preventDefault(); pick(option); }
  };
  useEffect(() => {
    const onKey = e => onKeyRef.current(e);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  function pick(option) {
    if (right || wrong.includes(option)) return;
    if (option !== q.answer) {
      setWrong(w => [...w, option]);
      setMistakes(m => m + 1);
      return;
    }
    setRight(true);
    // listening questions: play the pair again with their keys lit, then move on once it has finished
    const replay = q.play ? (listen(q, true), q.together ? 1300 : timing.starts(q.play.length).at(-1) * 1000 + Math.max(1300, timing.hold * 1000 + 200)) : 0;
    setTimeout(next, Math.max(replay, wrong.length ? 1400 : 650));
  }

  function next() {
    clearGlow();
    engine.cancelScheduled();
    if (index + 1 >= total) {
      onComplete({
        stars: starsForMistakes(mistakes, total),
        detail: mistakes === 0 ? 'No mistakes, perfect!' : `${mistakes} wrong ${mistakes === 1 ? 'answer' : 'answers'}`,
      });
      return;
    }
    setIndex(index + 1);
    setWrong([]);
    setRight(false);
  }

  return (
    <div className="exercise choice">
      <div className="prompt"><RichText text={q.prompt} /></div>
      {q.staff && <Staff {...q.staff} scale={1.9} />}
      <div className="choice-options">
        {q.options.map((o, i) => (
          <button
            key={o}
            title={OPTION_KEYS[i] && `Key ${OPTION_KEYS[i][1]}`}
            className={'choice-option' + (wrong.includes(o) ? ' wrong' : '') + (right && o === q.answer ? ' right' : '')}
            onClick={() => pick(o)}
          >
            {q.slopes ? <Slope pitches={q.slopes[o]} starts={timing.starts(q.slopes[o].length)} labels={q.swaras?.[o]} /> : <RichText text={o} />}
            {OPTION_KEYS[i] && <kbd className="choice-key">{OPTION_KEYS[i][1]}</kbd>}
          </button>
        ))}
      </div>
      <div className="exercise-hint">
        {wrong.length > 0 && q.why ? <RichText text={q.why} /> : right ? <>✔ Right!{q.reveal && <> <RichText text={q.reveal} /></>}</> : ' '}
      </div>
      <div className="exercise-actions">
        {q.play && !right && <button onClick={() => listen()}>🔊 Hear again <kbd>B</kbd></button>}
        {q.play && !q.together && timing.sliders}
        <span className="counter">{index + 1} / {total} · mistakes {mistakes}</span>
      </div>
      <div className="progress"><div className="progress-bar" style={{ width: `${(index / total) * 100}%` }} /></div>
    </div>
  );
}
