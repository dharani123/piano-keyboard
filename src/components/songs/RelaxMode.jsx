import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { RAGAS, DEFAULT_RAGA, CARNATIC_BPM, carnaticSongs } from '../../songs/carnatic.js';
import { journeyLines, playAlongPlan, segmentAt, loadRelaxPos, saveRelaxPos } from '../../songs/relax.js';
import { createPlay, press, advance, pendingGroup, pitchKey } from '../../songs/player.js';
import FallingNotes, { FALL_HEIGHT, PX_PER_SECOND, codeFor } from './FallingNotes.jsx';

const SPEEDS = [0.5, 0.75, 1];
const RAGA_KEY = 'desk-piano-raga';
const PAUSE_BETWEEN = 0.7; // seconds of quiet between lines
const BREATHER = 2; // seconds between exercises in play-along
const FLOWS = {
  wait: { label: 'Wait for me', hint: 'Each line waits for you to press every swara' },
  play: { label: 'Play along', hint: 'The varisai keeps flowing at a steady tempo; missed swaras just drift past' },
};

// No scores, no locks, no red keys: every varisai in order, each line heard
// first (optional) and then played at your own pace, over a tanpura drone.
export default function RelaxMode({ piano }) {
  const [raga, setRaga] = useState(() => {
    try { return RAGAS[localStorage.getItem(RAGA_KEY)] ? localStorage.getItem(RAGA_KEY) : DEFAULT_RAGA; } catch { return DEFAULT_RAGA; }
  });
  const lines = useMemo(() => journeyLines(carnaticSongs(raga)), [raga]);
  const exercises = useMemo(() => lines.filter(l => l.line === 0), [lines]);
  const [pos, setPos] = useState(() => Math.min(loadRelaxPos(), lines.length - 1));
  const [speed, setSpeed] = useState(0.75);
  const [drone, setDrone] = useState(true);
  const [listenFirst, setListenFirst] = useState(true);
  const [flow, setFlow] = useState('wait');
  const [step, setStep] = useState('idle'); // idle | listen | play | rest
  const [sounding, setSounding] = useState(-1); // event index heard right now
  const [, setFrame] = useState(0);
  const run = useRef(null); // { pos, play, base, spb, last }
  const frame = useRef(0);
  const timer = useRef(0);
  const lit = useRef('');
  const pianoRef = useRef(piano);
  pianoRef.current = piano;
  const line = lines[pos];

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
    engine.cancelScheduled();
    light([]);
    setSounding(-1);
    run.current = null;
  }

  function stop() {
    halt();
    engine.droneStop();
    setStep('idle');
    pianoRef.current.setStatus(null);
  }
  useEffect(() => stop, []);

  // Wrong keys just sound, like a real instrument: press() ignores them here
  useEffect(() => piano.subscribe(e => {
    const r = run.current;
    if (r?.play) press(r.play, e.semitone, e.octave);
  }), [piano.subscribe]);

  function start() {
    const base = piano.octave;
    if (drone) {
      const f = (oct, semi) => frequency(oct, semi, piano.transpose);
      engine.droneStart([f(base - 1, 7), f(base, 0), f(base, 0), f(base - 1, 0)]);
    }
    piano.setStatus(RAGAS[raga].name.slice(0, 14).toUpperCase());
    requestAnimationFrame(() => piano.fallSlot?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    playLine(pos, base);
  }

  function playLine(p, base) {
    halt();
    const l = lines[p];
    const spb = 60 / (CARNATIC_BPM * speed);
    if (flow === 'play') playAlong(p, base, spb);
    else if (listenFirst) listen(p, l, base, spb);
    else yourTurn(p, l, base, spb);
  }

  // The app plays the line first, lighting each key as it sounds
  function listen(p, l, base, spb) {
    setStep('listen');
    const t0 = engine.now() + 0.25;
    for (const e of l.events) {
      for (const n of e.notes) {
        engine.playNote(frequency(base + n.oct, n.semitone, pianoRef.current.transpose), pianoRef.current.instrumentId, t0 + e.beat * spb, e.beats * spb * 0.92);
      }
    }
    run.current = { pos: p, base, spb };
    const tick = () => {
      if (!run.current) return;
      const b = (engine.now() - t0) / spb;
      const i = l.events.findIndex(e => b >= e.beat && b < e.beat + e.beats);
      setSounding(i);
      light(i >= 0 ? l.events[i].notes.map(n => codeFor(n.semitone, n.oct)) : []);
      if (b > l.totalBeats + 0.3) {
        setSounding(-1);
        light([]);
        return yourTurn(p, l, base, spb);
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  // Falling notes that wait for you; when the line is done, on to the next
  function yourTurn(p, l, base, spb) {
    setStep('play');
    const play = createPlay(l, { mode: 'wait', baseOctave: base, secondsPerBeat: spb });
    play.beat = -FALL_HEIGHT / PX_PER_SECOND / spb * 0.6;
    run.current = { pos: p, play, base, spb, last: performance.now() };
    const tick = () => {
      const r = run.current;
      if (!r?.play) return;
      const t = performance.now();
      const held = new Set(pianoRef.current.getHeld().map(h => pitchKey(h.semitone, h.octave)));
      advance(r.play, Math.min((t - r.last) / 1000, 0.25) / r.spb, held);
      r.last = t;
      const next = pendingGroup(r.play).filter(n => n.beat - r.play.beat <= 1);
      light(next.map(n => codeFor(n.semitone, n.octave - r.base)));
      setFrame(f => f + 1);
      if (r.play.done) {
        light([]);
        setStep('rest');
        const np = goTo(p + 1);
        timer.current = setTimeout(() => playLine(np, base), PAUSE_BETWEEN * 1000);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  // Play-along: the rest of the exercise flows at tempo (call and response
  // when listening first), timed on the audio clock so it stays steady
  function playAlong(p, base, spb) {
    const plan = playAlongPlan(lines, p, listenFirst);
    const lead = listenFirst ? 1 : Math.max(2, FALL_HEIGHT / PX_PER_SECOND / spb);
    const tStart = engine.now() + lead * spb;
    for (const seg of plan.segments) {
      if (seg.listenAt === null) continue;
      for (const e of lines[seg.pos].events) {
        for (const n of e.notes) {
          engine.playNote(frequency(base + n.oct, n.semitone, pianoRef.current.transpose), pianoRef.current.instrumentId,
            tStart + (seg.listenAt + e.beat) * spb, e.beats * spb * 0.92);
        }
      }
    }
    const play = createPlay(plan.song, { mode: 'play', baseOctave: base, secondsPerBeat: spb });
    play.beat = -lead;
    run.current = { pos: p, play, base, spb, offset: plan.segments[0].playAt };
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
        light(i >= 0 ? l.events[i].notes.map(n => codeFor(n.semitone, n.oct)) : []);
      } else {
        setSounding(-1);
        const next = r.play.notes.filter(n => !n.hit && !n.missed && n.beat - r.play.beat <= 0.5);
        light(next.map(n => codeFor(n.semitone, n.octave - r.base)));
      }
      setFrame(f => f + 1);
      if (r.play.done) {
        light([]);
        setStep('rest');
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
  const fall = (step === 'play' || (flow === 'play' && step === 'listen')) && r?.play && (
    <FallingNotes slot={piano.fallSlot} play={r.play} base={r.base} spb={r.spb} gentle />
  );

  // The current line as swaras, the sounding one lit while listening
  const lineView = (
    <div className="relax-line">
      {line.events.map((e, i) => {
        const done = step === 'play' && r?.play?.notes.find(n => n.beat === e.beat + (r.offset ?? 0))?.hit;
        return (
          <span key={i} className={'relax-swara' + (i === sounding ? ' on' : '') + (done ? ' done' : '') + (e.beat === 4 || e.beat === 6 ? ' mark' : '')} style={{ flexGrow: e.beats }}>
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
        {step === 'play' && (flow === 'play' ? '🎹 Your turn: flow with it' : '🎹 Your turn: take your time')}
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
        {Object.entries(RAGAS).map(([id, rg]) => (
          <button key={id} className={raga === id ? 'active' : ''} disabled={active} onClick={() => pickRaga(id)}>{rg.name}</button>
        ))}
      </div>
      <div className="song-option">
        <span className="option-label">Mode</span>
        {Object.entries(FLOWS).map(([id, f]) => (
          <button key={id} className={flow === id ? 'active' : ''} disabled={active} onClick={() => setFlow(id)}>{f.label}</button>
        ))}
      </div>
      <p className="song-note">{FLOWS[flow].hint}{flow === 'play' && listenFirst ? ': the app plays a line, you echo it straight back, in rhythm' : ''}.</p>
      <div className="song-option">
        <span className="option-label">Speed</span>
        {SPEEDS.map(v => (
          <button key={v} className={speed === v ? 'active' : ''} disabled={active} onClick={() => setSpeed(v)}>
            {v === 1 ? '1st speed' : `${Math.round(v * 100)}%`}
          </button>
        ))}
      </div>
      <label className="unlock">
        <input type="checkbox" checked={drone} disabled={active} onChange={e => setDrone(e.target.checked)} />
        Tanpura drone (Sa–Pa)
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
