import { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { findNotes, step, loadFind, saveFind } from '../../songs/find.js';
import SongGraph, { graphRange } from './SongGraph.jsx';

// Find one by one (Decoded songs): see songs/find.js. Rendered in the instrument's slot while
// the mode runs. The cursor is the end of the solid line (run): C V N M = hear the next 1, 2,
// 3, 4 notes after it; B or Backspace = move the cursor back one
// note, greying it out, so you can hear the tune in blocks (the user, 2026-11-19).
const HEAR_KEYS = [['KeyC', 'C'], ['KeyV', 'V'], ['KeyN', 'N'], ['KeyM', 'M']];
const BACK_KEYS = ['KeyB', 'Backspace'];

export default function FindPanel({ song, piano, speed, onQuit }) {
  const notes = useMemo(() => findNotes(song), [song]);
  const total = notes.length;
  // found = notes decoded so far (saved); run = notes played in line from the start.
  // It opens with the line at the last note found, so you can carry on straight away.
  const [state, setStateRaw] = useState(() => {
    const found = Math.min(loadFind()[song.id] ?? 0, total);
    return { run: found, found };
  });
  const { run, found } = state;
  const [base] = useState(piano.octave);
  const allDone = found >= total;
  const spb = 60 / (song.bpm * speed);
  const range = useMemo(() => graphRange(notes), [notes]);

  function setState(next) {
    setStateRaw(next);
    if (next.found !== found) saveFind({ ...loadFind(), [song.id]: next.found });
  }

  // the next k notes after the cursor, found or not, with the song's own rhythm at the speed
  // picked (the cursor's own note before them was tried 2026-11-19 and removed the same day)
  function hear(k) {
    engine.cancelScheduled();
    const g = notes.slice(run, Math.min(run + k, total));
    if (!g.length) return;
    const t0 = engine.now() + 0.05;
    for (const n of g) {
      engine.playNote(frequency(base + n.oct, n.semitone, piano.transpose), piano.instrumentId,
        t0 + (n.beat - g[0].beat) * spb, Math.min(n.beats * spb * 0.95, 1.6));
    }
  }
  useEffect(() => () => engine.cancelScheduled(), []);

  const onNoteRef = useRef();
  onNoteRef.current = e => {
    const next = step(state, notes, e.semitone, e.octave - base);
    if (next.run !== run || next.found !== found) setState(next);
  };
  useEffect(() => piano.subscribe(e => onNoteRef.current(e)), [piano.subscribe]);

  // the cursor back one note; the notes after it stay found, greyed out
  function back() {
    if (run > 0) setState({ run: run - 1, found });
  }
  // the cursor back to the start of the song; everything found stays found
  function fromStart() {
    setState({ run: 0, found });
  }
  function startOver() {
    setState({ run: 0, found: 0 });
  }

  const onKeyRef = useRef();
  onKeyRef.current = e => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return;
    if (BACK_KEYS.includes(e.code)) { e.preventDefault(); back(); return; }
    const k = HEAR_KEYS.findIndex(([code]) => code === e.code);
    if (k >= 0) { e.preventDefault(); hear(k + 1); }
  };
  useEffect(() => {
    const onKey = e => onKeyRef.current(e);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="find-panel">
      <p className="find-prompt">
        {allDone ? <>✔ You found all {total} notes of this song!</>
          : <>Found <b>{found}</b> of {total} notes. Play the note after the cursor: the line grows, and a new note shows when you hit it. Other keys just sound. <kbd>B</kbd> moves the cursor back a note.</>}
      </p>
      <SongGraph notes={notes} faint={found} solid={i => i < run} cursor={run} range={range} barBeats={song.barBeats} />
      <div className="exercise-actions">
        {HEAR_KEYS.slice(0, Math.min(4, total - run)).map(([, key], i) => (
          <button key={key} onClick={() => hear(i + 1)}>🔊 {i + 1} <kbd>{key}</kbd></button>
        ))}
        <button onClick={back} disabled={run === 0}>⌫ Back <kbd>B</kbd></button>
        <button onClick={fromStart} disabled={run === 0}>⏮ From start</button>
        {found > 0 && <button onClick={startOver}>↺ Start over</button>}
        <button onClick={onQuit}>Stop</button>
      </div>
      <div className="progress"><div className="progress-bar" style={{ width: `${(found / total) * 100}%` }} /></div>
    </div>
  );
}
