import { useEffect, useRef, useState } from 'react';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { pushPress, matchesPattern } from '../../eartraining/playback.js';
import RichText from './RichText.jsx';
import { useListenTiming } from './ListenTiming.jsx';

// Play it back (Ear Training): the app plays a pattern, you play keys until your last notes
// are that pattern; then a tick and the swara names show and Next appears. No mistakes are
// counted (the user, 2026-11-17). B = Hear again, N = Next.
// exercise = { type: 'playback', make: () => [{ prompt, play: notes, reveal }] }
export default function PlaybackExercise({ exercise, piano, onProgress, onComplete }) {
  const [questions] = useState(() => exercise.make());
  const [baseOctave] = useState(piano?.octave ?? 4);
  const [index, setIndex] = useState(0);
  const [right, setRight] = useState(false);
  const played = useRef([]);
  const q = questions[index];
  const total = questions.length;
  const timing = useListenTiming(q.play.length, index);

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
    played.current = [];
    const t = setTimeout(listen, index === 0 ? 300 : 500);
    return () => clearTimeout(t);
  }, [index]);
  useEffect(() => () => engine.cancelScheduled(), []);
  useEffect(() => piano.lockTranspose(), []);

  // every key you play goes into the listening window; wrong keys just sound
  const onNoteRef = useRef();
  onNoteRef.current = e => {
    if (right) return;
    played.current = pushPress(played.current, { semitone: e.semitone, oct: e.octave - baseOctave }, q.play.length);
    if (matchesPattern(played.current, q.play)) setRight(true);
  };
  useEffect(() => piano.subscribe(e => onNoteRef.current(e)), [piano.subscribe]);

  function next() {
    engine.cancelScheduled();
    if (index + 1 >= total) {
      onComplete({ stars: 0, detail: `${total} patterns played back` });
      return;
    }
    setRight(false);
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
        {right ? <>✔ <RichText text={q.reveal} /></> : q.play.map((_, i) => <b key={i}>?</b>)}
      </div>
      <div className="exercise-hint">{right ? 'Right!' : 'Play the swaras on the keys. Take as many tries as you like.'}</div>
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
