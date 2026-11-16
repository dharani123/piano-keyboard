import { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../../audio/engine.js';
import { createPlay, press, advance, pitchKey } from '../../songs/player.js';
import { buildFlow, segmentAt, FLOW_BPM, FLOW_SPEEDS, DEFAULT_SPEED } from '../../eartraining/flow.js';
import FallingNotes, { FallSpace, FALL_HEIGHT, PX_PER_SECOND, codeFor } from '../songs/FallingNotes.jsx';

const SPEED_KEY = 'desk-piano-flow-speed';
function loadSpeed() {
  try { const v = Number(localStorage.getItem(SPEED_KEY)); return FLOW_SPEEDS.includes(v) ? v : DEFAULT_SPEED; } catch { return DEFAULT_SPEED; }
}

// Ear Training patterns as falling notes, like Relax: no listening first, wrong keys just
// sound, and it flows from the opened pattern on to the last one by itself.
// exercise = { type: 'flow', patterns: [{ title, names }], from }
export default function FlowExercise({ exercise, piano, onProgress, onComplete, registerStartStop }) {
  const { patterns } = exercise;
  const [from, setFrom] = useState(exercise.from ?? 0);
  const [speed, setSpeedState] = useState(loadSpeed);
  const [running, setRunning] = useState(false);
  const [, setFrame] = useState(0);
  const flow = useMemo(() => buildFlow(patterns, from), [patterns, from]);
  const spb = 60 / (FLOW_BPM * speed);
  const run = useRef(null); // { play, base, tStart }
  const frame = useRef(0);
  const lit = useRef('');
  const pianoRef = useRef(piano);
  pianoRef.current = piano;
  const shift = piano.layout ?? 0;

  function light(codes) {
    const id = codes.join();
    if (lit.current === id) return;
    lit.current = id;
    pianoRef.current.setHighlight(codes.length ? { targets: codes, wrong: null } : null);
  }

  function halt() {
    cancelAnimationFrame(frame.current);
    light([]);
    run.current = null;
    setRunning(false);
  }
  useEffect(() => halt, []);

  // Wrong keys just sound, like a real instrument
  useEffect(() => piano.subscribe(e => {
    const r = run.current;
    if (r) press(r.play, e.semitone, e.octave);
  }), [piano.subscribe]);

  function begin() {
    halt();
    const base = pianoRef.current.octave;
    const lead = Math.max(2, FALL_HEIGHT / PX_PER_SECOND / spb); // beats for the first tiles to fall
    const tStart = engine.now() + lead * spb;
    const play = createPlay(flow.song, { mode: 'play', baseOctave: base, secondsPerBeat: spb });
    play.beat = -lead;
    run.current = { play, base, tStart };
    setRunning(true);
    onProgress(`${Math.round(FLOW_BPM * speed)} BPM`);

    const tick = () => {
      const r = run.current;
      if (!r) return;
      const beat = (engine.now() - r.tStart) / spb;
      const held = new Set(pianoRef.current.getHeld().map(h => pitchKey(h.semitone, h.octave)));
      advance(r.play, beat - r.play.beat, held);
      const next = r.play.notes.filter(n => !n.hit && !n.missed && n.beat <= r.play.beat);
      light(next.map(n => codeFor(n.semitone, n.octave - r.base, shift)));
      setFrame(f => f + 1);
      if (r.play.done) {
        halt();
        onComplete({
          stars: 0, // pattern lessons are unscored
          detail: `${flow.segments.length} pattern${flow.segments.length > 1 ? 's' : ''} played, ${flow.segments[0].title} to ${flow.segments.at(-1).title}.`,
        });
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  // Start on open, and again whenever the speed or starting pattern changes
  useEffect(() => { begin(); }, [flow, spb]);

  const startStop = useRef();
  startStop.current = running ? halt : begin;
  useEffect(() => registerStartStop?.(() => startStop.current()), []);

  function setSpeed(v) {
    setSpeedState(v);
    try { localStorage.setItem(SPEED_KEY, String(v)); } catch { /* storage blocked */ }
  }

  const r = run.current;
  const seg = segmentAt(flow.segments, Math.max(r?.play.beat ?? 0, 0));
  const resting = r && r.play.beat >= 0 && r.play.beat < seg.start;
  const current = patterns[seg.index];
  const jump = i => { if (i === from) begin(); else if (i >= 0 && i < patterns.length) setFrom(i); };

  return (
    <div className="exercise">
      {running && r
        ? <FallingNotes slot={piano.fallSlot} play={r.play} base={r.base} spb={spb} shift={shift} gentle />
        : <FallSpace slot={piano.fallSlot} />}
      <div className="prompt">
        {!running ? 'Stopped' : resting ? <>✨ Next: <b>{current.title}</b></> : <>🎹 <b>{current.title}</b>: play the falling notes</>}
        <span className="song-meta"> · {seg.index + 1} of {patterns.length}</span>
      </div>
      <div className="exercise-actions">
        <button onClick={() => jump(seg.index - 1)} disabled={seg.index === 0}>◀ Back</button>
        <button onClick={() => jump(seg.index)}>↻ Again</button>
        <button onClick={() => jump(seg.index + 1)} disabled={seg.index + 1 >= patterns.length}>Skip ▶</button>
        {running
          ? <button onClick={halt}>■ Stop <kbd>Space</kbd></button>
          : <button className="primary" onClick={begin}>▶ Start <kbd>Space</kbd></button>}
        <span className="rhythm-speed">
          Speed
          {FLOW_SPEEDS.map(v => (
            <button key={v} className={speed === v ? 'active' : ''} onClick={() => setSpeed(v)}>{v * 100}%</button>
          ))}
        </span>
      </div>
    </div>
  );
}
