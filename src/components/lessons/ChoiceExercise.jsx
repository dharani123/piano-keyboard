import { useEffect, useRef, useState } from 'react';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { codeAt } from '../../data/keymap.js';
import { starsForMistakes } from '../../lessons/stepTrainer.js';
import RichText from './RichText.jsx';
import Staff from '../sheet/Staff.jsx';

// Multiple-choice questions, optionally about a staff picture.
// exercise = { type: 'choice', make: () => [{ prompt, staff?, options: [...], answer, why? }] }
// `answer` is the correct option's text. A wrong pick counts as a mistake and
// shows `why`; the question stays until the right option is picked.
// Listening questions: `play` = notes (from parseNotes) played one after the other,
// `gap` seconds apart, when the question comes up and again on B / Hear again;
// `reveal` is shown once it's answered right, while the notes play again with their keys lit, then it moves on. exercise.keys = { KeyboardEvent.code: option }
// answers from the keyboard (arrow keys, so the piano keys stay free).
// q.slopes = { option: [pitches] }: the option is drawn as a line through dots, higher dots for higher notes
function Slope({ pitches }) {
  const x = i => 14 + i * 36;
  const y = p => 44 - (p / 11) * 36;
  const points = pitches.map((p, i) => `${x(i)},${y(p)}`).join(' ');
  return (
    <svg className="slope" viewBox="0 0 100 52" width="100" height="52" aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {pitches.map((p, i) => <circle key={i} cx={x(i)} cy={y(p)} r="4.5" fill="currentColor" />)}
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
    // together: every note at once, held a little longer
    const gap = question.together ? 0 : question.gap ?? 1;
    const length = question.together ? 1.4 : Math.min(0.8, gap * 0.9);
    const start = engine.now() + 0.05;
    const codeOf = n => codeAt(n.semitone, baseOctave + n.oct - piano.octave, piano.layout);
    question.play.forEach((n, i) => {
      engine.playNote(frequency(baseOctave + n.oct, n.semitone, 0), piano.instrumentId, start + i * gap, length);
      if (!show) return;
      const targets = question.together ? question.play.map(codeOf) : [codeOf(n)];
      glowTimers.current.push(
        setTimeout(() => piano.setHighlight({ targets, wrong: null }), (50 + i * gap * 1000)),
        setTimeout(() => piano.setHighlight(null), (50 + (i * gap + length) * 1000)),
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
    const option = exercise.keys?.[e.code];
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
    const replay = q.play ? (listen(q, true), (q.together ? 0 : (q.play.length - 1) * (q.gap ?? 1)) * 1000 + 1300) : 0;
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
        {q.options.map(o => (
          <button
            key={o}
            className={'choice-option' + (wrong.includes(o) ? ' wrong' : '') + (right && o === q.answer ? ' right' : '')}
            onClick={() => pick(o)}
          >
            {q.slopes ? <Slope pitches={q.slopes[o]} /> : <RichText text={o} />}
          </button>
        ))}
      </div>
      <div className="exercise-hint">
        {wrong.length > 0 && q.why ? <RichText text={q.why} /> : right ? <>✔ Right!{q.reveal && <> <RichText text={q.reveal} /></>}</> : ' '}
      </div>
      <div className="exercise-actions">
        {q.play && !right && <button onClick={() => listen()}>🔊 Hear again <kbd>B</kbd></button>}
        <span className="counter">{index + 1} / {total} · mistakes {mistakes}</span>
      </div>
      <div className="progress"><div className="progress-bar" style={{ width: `${(index / total) * 100}%` }} /></div>
    </div>
  );
}
