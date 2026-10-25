import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { RAGAS, DEFAULT_RAGA, CARNATIC_BPM, carnaticSongs } from '../../songs/carnatic.js';
import { loadTanpura, saveTanpura, startTanpura } from '../../songs/tanpura.js';
import { journeyLines, playAlongPlan, appNotes, segmentAt, loadRelaxPos, saveRelaxPos } from '../../songs/relax.js';
import { createPlay, press, advance, pitchKey } from '../../songs/player.js';
import { markRelaxFinished } from '../../songs/best.js';
import RagaSelect from './RagaSelect.jsx';
import FallingNotes, { FALL_HEIGHT, PX_PER_SECOND, codeFor } from './FallingNotes.jsx';

const SPEEDS = [0.5, 0.75, 1];
const RAGA_KEY = 'desk-piano-raga';
const BREATHER = 2; // seconds between exercises
const LOOKAHEAD = 1.5; // seconds of the app's notes created ahead of time
const FEED_EVERY = 200; // ms between topping up (hidden tabs slow this to ~1 s, still inside the lookahead)

// No scores, no locks, no red keys: every varisai in order, flowing at a
// steady tempo over a tanpura drone, each line heard first (optional) and
// echoed straight back.
export default function RelaxMode({ piano }) {
  const [raga, setRaga] = useState(() => {
    try { return RAGAS[localStorage.getItem(RAGA_KEY)] ? localStorage.getItem(RAGA_KEY) : DEFAULT_RAGA; } catch { return DEFAULT_RAGA; }
  });
  const lines = useMemo(() => journeyLines(carnaticSongs(raga)), [raga]);
  const exercises = useMemo(() => lines.filter(l => l.line === 0), [lines]);
  const [pos, setPos] = useState(() => Math.min(loadRelaxPos(), lines.length - 1));
  const [speed, setSpeed] = useState(0.75);
  const [drone, setDrone] = useState(loadTanpura);
  const droneOn = useRef(drone); // read by tuneDrone mid-run
  const [guide, setGuide] = useState(true); // the app plays the swaras with you
  const [listenFirst, setListenFirst] = useState(true);
  const [step, setStep] = useState('idle'); // idle | listen | play | rest
  const [sounding, setSounding] = useState(-1); // event index heard right now
  const [, setFrame] = useState(0);
  const run = useRef(null); // { pos, play, base, spb, last }
  const frame = useRef(0);
  const timer = useRef(0);
  const feeder = useRef(0); // interval that schedules the app's notes just ahead
  const lit = useRef('');
  const droneSa = useRef(null); // the Sa the drone is sounding, null when off
  const pianoRef = useRef(piano);
  pianoRef.current = piano;
  const line = lines[pos];
  // Mel/Mandra Sthayi slide the keys two places for the whole exercise
  const layout = line.layout;
  useEffect(() => { piano.setLayout(layout); }, [layout]);
  useEffect(() => () => pianoRef.current.setLayout(0), []);

  function light(codes) {
    const id = codes.join();
    if (lit.current === id) return;
    lit.current = id;
    pianoRef.current.setHighlight(codes.length ? { targets: codes, wrong: null } : null);
  }

  function goTo(next) {
    const p = (next + lines.length) % lines.length;
    setPos(p);
    saveRelaxPos(p);
    return p;
  }

  function halt() {
    cancelAnimationFrame(frame.current);
    clearTimeout(timer.current);
    clearInterval(feeder.current);
    engine.cancelScheduled();
    light([]);
    setSounding(-1);
    run.current = null;
  }

  function stop() {
    halt();
    engine.droneStop();
    droneSa.current = null;
    setStep('idle');
    pianoRef.current.setStatus(null);
  }
  useEffect(() => stop, []);

  // Relax runs on the audio clock: if the engine had to restart it, replay the line
  const restartLine = useRef(null);
  restartLine.current = () => { if (run.current) playLine(run.current.pos, run.current.base); };
  useEffect(() => engine.onRestart(() => restartLine.current()), []);

  // Wrong keys just sound, like a real instrument: press() ignores them here
  useEffect(() => piano.subscribe(e => {
    const r = run.current;
    if (r?.play) press(r.play, e.semitone, e.octave);
  }), [piano.subscribe]);

  function start() {
    const base = piano.octave;
    piano.setStatus(RAGAS[raga].name.slice(0, 14).toUpperCase());
    requestAnimationFrame(() => piano.fallSlot?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    playLine(pos, base);
  }

  function tuneDrone(base, sa) {
    if (!droneOn.current || droneSa.current === sa) return;
    startTanpura(base, sa, pianoRef.current.transpose);
    droneSa.current = sa;
  }

  // The tanpura can be switched on or off at any time, even mid-exercise
  function toggleDrone(on) {
    setDrone(on);
    saveTanpura(on);
    droneOn.current = on;
    if (!on) {
      engine.droneStop();
      droneSa.current = null;
    } else if (step !== 'idle') {
      tuneDrone(run.current?.base ?? piano.octave, line.sa);
    }
  }

  function playLine(p, base) {
    halt();
    const l = lines[p];
    tuneDrone(base, l.sa);
    const spb = 60 / (CARNATIC_BPM * speed);
    playAlong(p, base, spb);
  }

  // Play-along: the rest of the exercise flows at tempo (call and response
  // when listening first), timed on the audio clock so it stays steady
  function playAlong(p, base, spb) {
    const plan = playAlongPlan(lines, p, listenFirst);
    const lead = Math.max(2, FALL_HEIGHT / PX_PER_SECOND / spb); // time for the first tiles to fall from the top
    const tStart = engine.now() + lead * spb;
    // The app's lines while you listen, and the swaras with you while you play (if guiding),
    // each created just before it sounds
    const queue = appNotes(lines, plan, guide);
    let next = 0;
    const feed = () => {
      const until = engine.now() + LOOKAHEAD;
      while (next < queue.length && tStart + queue[next].beat * spb < until) {
        const n = queue[next++];
        engine.playNote(frequency(base + n.oct, n.semitone, pianoRef.current.transpose), pianoRef.current.instrumentId,
          tStart + n.beat * spb, n.beats * spb * 0.92);
      }
    };
    feed();
    feeder.current = setInterval(feed, FEED_EVERY);
    const play = createPlay(plan.song, { mode: 'play', baseOctave: base, secondsPerBeat: spb });
    play.beat = -lead;
    // the lines you hear fall too, so you can watch them coming
    const listenNotes = listenFirst ? appNotes(lines, plan, false).map(n => ({ ...n, octave: base + n.oct })) : [];
    run.current = { pos: p, play, base, spb, offset: plan.segments[0].playAt, listenNotes };
    setStep(listenFirst ? 'listen' : 'play');

    const tick = () => {
      const r = run.current;
      if (!r?.play) return;
      const beat = (engine.now() - tStart) / spb;
      const held = new Set(pianoRef.current.getHeld().map(h => pitchKey(h.semitone, h.octave)));
      advance(r.play, beat - r.play.beat, held);
      const { seg, listening } = segmentAt(plan.segments, Math.max(beat, 0));
      r.offset = seg.playAt;
      if (seg.pos !== r.pos) { r.pos = seg.pos; goTo(seg.pos); }
      setStep(listening ? 'listen' : 'play');
      if (listening) {
        const l = lines[seg.pos];
        const i = l.events.findIndex(e => beat - seg.listenAt >= e.beat && beat - seg.listenAt < e.beat + e.beats);
        setSounding(i);
        light(i >= 0 ? l.events[i].notes.map(n => codeFor(n.semitone, n.oct, l.layout)) : []);
      } else {
        setSounding(-1);
        const next = r.play.notes.filter(n => !n.hit && !n.missed && n.beat - r.play.beat <= 0.5);
        light(next.map(n => codeFor(n.semitone, n.octave - r.base, lines[p].layout)));
      }
      setFrame(f => f + 1);
      if (r.play.done) {
        light([]);
        setStep('rest');
        // played to the end of the exercise: it counts as passed in Carnatic Music too
        markRelaxFinished(lines[plan.segments.at(-1).pos].id);
        const np = goTo(plan.segments.at(-1).pos + 1);
        timer.current = setTimeout(() => playLine(np, base), BREATHER * 1000);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  function jump(next) {
    const p = goTo(next);
    if (step !== 'idle') playLine(p, run.current?.base ?? piano.octave);
  }

  function pickRaga(next) {
    setRaga(next);
    try { localStorage.setItem(RAGA_KEY, next); } catch { /* storage unavailable */ }
  }

  const r = run.current;
  const active = step !== 'idle';
  const fall = (step === 'play' || step === 'listen') && r?.play && (
    <FallingNotes slot={piano.fallSlot} play={r.play} base={r.base} spb={r.spb} shift={line.layout} gentle listen={r.listenNotes} />
  );

  // The current line as swaras, the sounding one lit while listening
  const lineView = (
    <div className="relax-line">
      {line.events.map((e, i) => {
        const done = step === 'play' && r?.play?.notes.find(n => n.beat === e.beat + (r.offset ?? 0))?.hit;
        return (
          <span key={i} className={'relax-swara' + (i === sounding ? ' on' : '') + (done ? ' done' : '') + (line.talam?.marks.includes(e.beat) ? ' mark' : '')} style={{ flexGrow: e.beats }}>
            {e.notes[0].name}{' ,'.repeat(e.beats - 1)}
          </span>
        );
      })}
    </div>
  );

  const card = active && piano.slot && createPortal(
    <div className="slot-inner relax-card">
      <div className="slot-head">
        <span className="lesson-num">Relax</span> <b>{line.title}</b>
        <span className="song-meta">line {line.line + 1} of {line.lines} · {RAGAS[raga].name}</span>
      </div>
      <div className="relax-step">
        {step === 'listen' && '👂 Listen…'}
        {step === 'play' && '🎹 Your turn: flow with it'}
        {step === 'rest' && (pos > 0 && lines[pos].line === 0 ? `✨ Breathe… next: ${lines[pos].title}` : '…')}
      </div>
      {lineView}
      <div className="exercise-actions">
        <button onClick={() => jump(pos - 1)}>◀ Back a line</button>
        <button onClick={() => playLine(pos, r?.base ?? piano.octave)}>↻ Again</button>
        <button onClick={() => jump(pos + 1)}>Skip ▶</button>
        <button onClick={stop}>■ Stop</button>
      </div>
    </div>,
    piano.slot
  );

  const exerciseNow = line.exercise;
  return (
    <div className="relax">
      {fall}
      {card}
      <h2>Relax &amp; play 🌿</h2>
      <p className="song-note">
        All the varisais in Purandara Dasa&apos;s order, one line at a time. No scores, no locks: listen, play it back,
        and let your ear soak in each swara against the tanpura. You carry on from where you left off.
      </p>

      <div className="song-option">
        <span className="option-label">Raga</span>
        <RagaSelect raga={raga} disabled={active} onPick={pickRaga} />
      </div>
      <p className="song-note">The varisai keeps flowing at a steady tempo; missed swaras just drift past{listenFirst ? ': the app plays a line, you echo it straight back, in rhythm' : ''}.</p>
      <div className="song-option">
        <span className="option-label">Speed</span>
        {SPEEDS.map(v => (
          <button key={v} className={speed === v ? 'active' : ''} disabled={active} onClick={() => setSpeed(v)}>
            {v === 1 ? '1st speed' : `${Math.round(v * 100)}%`}
          </button>
        ))}
      </div>
      <label className="unlock">
        <input type="checkbox" checked={drone} onChange={e => toggleDrone(e.target.checked)} />
        Tanpura drone (Sa–Pa)
      </label>
      <label className="unlock">
        <input type="checkbox" checked={guide} disabled={active} onChange={e => setGuide(e.target.checked)} />
        Play the swaras with me
      </label>
      <label className="unlock">
        <input type="checkbox" checked={listenFirst} disabled={active} onChange={e => setListenFirst(e.target.checked)} />
        Listen to each line first, then play it back
      </label>

      <div className="relax-journey">
        <span className="option-label">Journey</span>
        <select value={exerciseNow} disabled={active} onChange={e => goTo(exercises[Number(e.target.value)] ? lines.indexOf(exercises[Number(e.target.value)]) : 0)}>
          {exercises.map((x, i) => <option key={i} value={i}>{x.title}</option>)}
        </select>
        <span className="song-note">exercise {exerciseNow + 1} of {exercises.length} · line {line.line + 1} of {line.lines}</span>
      </div>
      <div className="progress"><div className="progress-bar" style={{ width: `${((pos + 1) / lines.length) * 100}%` }} /></div>

      {!active && (
        <>
          <div className="sheet-title">Up next</div>
          {lineView}
          <button className="primary big" onClick={start}>▶ {pos === 0 ? 'Begin' : 'Carry on'}</button>
        </>
      )}
    </div>
  );
}
