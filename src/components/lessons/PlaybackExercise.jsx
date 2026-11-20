import { useEffect, useRef, useState } from 'react';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { advanceFound } from '../../eartraining/playback.js';
import RichText from './RichText.jsx';
import { Slope } from './ChoiceExercise.jsx';
import { useListenTiming } from './ListenTiming.jsx';

// Play it back (Ear Training): the app plays a pattern, you play keys until your last notes
// are that pattern. Each swara you find shows with its name and the graph grows to it, and it
// stays found: wrong keys don't take it back (the user, 2026-11-20; advanceFound in playback.js).
// When all are in, a tick and Next. No mistakes are counted
// (the user, 2026-11-17). B = Hear again, N = Next.
// exercise = { type: 'playback', make: () => [{ prompt, play: notes, swaras: names }] }
export default function PlaybackExercise({ exercise, piano, onProgress, onComplete }) {
  const [questions] = useState(() => exercise.make());
  const [baseOctave] = useState(piano?.octave ?? 4);
  const [index, setIndex] = useState(0);
  const [found, setFound] = useState(0); // notes played in line so far
  const q = questions[index];
  const total = questions.length;
  const right = found === q.play.length;
  const timing = useListenTiming(q.play.length, index); // random Gap and Last note once per exercise

  useEffect(() => { onProgress(`${index + 1}/${total}`); }, [index]);

  function listen() {
    engine.cancelScheduled();
    const at = timing.starts(q.play.length);
    const start = engine.now() + 0.05;
    q.play.forEach((n, i) => {
      const len = i === q.play.length - 1 ? timing.hold : Math.min(0.8, timing.gap(i) * 0.9);
      engine.playNote(frequency(baseOctave + n.oct, n.semitone, 0), piano.instrumentId, start + at[i], len);
    });
  }
  useEffect(() => {
    const t = setTimeout(listen, index === 0 ? 300 : 500);
    return () => clearTimeout(t);
  }, [index]);
  useEffect(() => () => engine.cancelScheduled(), []);
  useEffect(() => piano.lockTranspose(), []);

  // every key you play goes into the listening window; wrong keys just sound
  const onNoteRef = useRef();
  onNoteRef.current = e => {
    if (right) return;
    setFound(f => advanceFound(f, { semitone: e.semitone, oct: e.octave - baseOctave }, q.play));
  };
  useEffect(() => piano.subscribe(e => onNoteRef.current(e)), [piano.subscribe]);

  function next() {
    engine.cancelScheduled();
    if (index + 1 >= total) {
      onComplete({ stars: 0, detail: `${total} patterns played back` });
      return;
    }
    setFound(0);
    setIndex(index + 1);
  }

  const onKeyRef = useRef();
  onKeyRef.current = e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return;
    if (e.code === 'KeyB') { e.preventDefault(); listen(); }
    if (e.code === 'KeyN' && right) { e.preventDefault(); next(); }
  };
  useEffect(() => {
    const onKey = e => onKeyRef.current(e);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="exercise choice">
      <div className="prompt"><RichText text={q.prompt} /></div>
      <div className="playback-slots">
        {right && '✔ '}
        {q.swaras.map((s, i) => <b key={i}>{i < found ? s : '?'}</b>)}
      </div>
      <div className="slope-option playback-graph">
        <Slope pitches={q.play.map(n => n.semitone + 12 * n.oct)} starts={timing.starts(q.play.length)} labels={q.swaras} near shown={found} />
      </div>
      <div className="exercise-hint">{right ? 'Right!' : found ? `Got ${found} of ${q.play.length}. Find the next swara.` : 'Play the swaras on the keys. Take as many tries as you like.'}</div>
      <div className="exercise-actions">
        <button onClick={listen}>🔊 Hear again <kbd>B</kbd></button>
        {right && <button className="primary" onClick={next}>Next <kbd>N</kbd></button>}
        {timing.sliders}
        <span className="counter">{index + 1} / {total}</span>
      </div>
      <div className="progress"><div className="progress-bar" style={{ width: `${((index + (right ? 1 : 0)) / total) * 100}%` }} /></div>
    </div>
  );
}
