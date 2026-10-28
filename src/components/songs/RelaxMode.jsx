import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { RAGAS, DEFAULT_RAGA, CARNATIC_BPM, CARNATIC_LEVELS, GEETHAM_LEVEL, carnaticSongs, shownSongs, geethamSongs, loadCarnaticPick, saveCarnaticPick } from '../../songs/carnatic.js';
import { loadTanpura, saveTanpura, startTanpura } from '../../songs/tanpura.js';
import { journeyLines, playAlongPlan, appNotes, segmentAt, loadRelaxPos, saveRelaxPos } from '../../songs/relax.js';
import { createPlay, press, advance, pitchKey } from '../../songs/player.js';
import { markRelaxFinished, loadBest } from '../../songs/best.js';
import NoteSheet from './NoteSheet.jsx';
import { SongList, CarnaticInfo, CARNATIC_SPEEDS, speedLabel } from './CarnaticParts.jsx';
import TanpuraControl from './TanpuraControl.jsx';
import AmbientControl from './AmbientControl.jsx';
import { loadAmbient, saveAmbient, startAmbient } from '../../songs/ambient.js';
import RagaNav from './RagaNav.jsx';
import FallingNotes, { FallSpace, FALL_HEIGHT, PX_PER_SECOND, codeFor } from './FallingNotes.jsx';

const RAGA_KEY = 'desk-piano-raga';
const VIEW_MARGIN = 20; // px left below the Relax card when Carry on scrolls to it
const BREATHER = 15; // seconds of break between exercises, counted down on screen
const LOOKAHEAD = 1.5; // seconds of the app's notes created ahead of time
const FEED_EVERY = 200; // ms between topping up (hidden tabs slow this to ~1 s, still inside the lookahead)

// No scores, no locks, no red keys: every varisai in order, flowing at a
// steady tempo over a tanpura drone, each line heard first (optional) and
// echoed straight back.
export default function RelaxMode({ piano, modeSwitch }) {
  const [raga, setRaga] = useState(() => {
    try { return RAGAS[localStorage.getItem(RAGA_KEY)] ? localStorage.getItem(RAGA_KEY) : DEFAULT_RAGA; } catch { return DEFAULT_RAGA; }
  });
  const songs = useMemo(() => [...shownSongs(carnaticSongs(raga), raga), ...geethamSongs(raga)], [raga]);
  const lines = useMemo(() => journeyLines(songs), [songs]);
  // after a reload, start again from the first line of the varisai you were in
  // (or at the varisai last picked in Practice)
  const [pos, setPos] = useState(() => {
    const pick = loadCarnaticPick();
    const picked = lines.findIndex(l => l.line === 0 && l.id.split('@')[0] === pick);
    if (picked >= 0) return picked;
    const p = Math.min(loadRelaxPos(), lines.length - 1);
    return p - lines[p].line;
  });
  const [speed, setSpeed] = useState(0.75); // Relax starts at 75%
  const [best, setBest] = useState(loadBest); // stars shown in the varisai list
  const [drone, setDrone] = useState(loadTanpura);
  const droneOn = useRef(drone); // read by tuneDrone mid-run
  const [ambient, setAmbient] = useState(loadAmbient);
  const ambientOn = useRef(ambient);
  const [listenFirst, setListenFirst] = useState(true);
  const [step, setStep] = useState('idle'); // idle | listen | play | rest
  const [restLeft, setRestLeft] = useState(0); // seconds left in the break
  const [sounding, setSounding] = useState(-1); // event index heard right now
  const [, setFrame] = useState(0);
  const run = useRef(null); // { pos, play, base, spb, last }
  const frame = useRef(0);
  const timer = useRef(0);
  const feeder = useRef(0); // interval that schedules the app's notes just ahead
  const lit = useRef('');
  const droneSa = useRef(null); // the Sa the drone is sounding, null when off
  const ambientSa = useRef(null); // the Sa the ambient pad is built on, null when off
  const pianoRef = useRef(piano);
  pianoRef.current = piano;
  const line = lines[pos];
  // whatever Relax shows is what Practice opens on, and the other way round
  useEffect(() => { saveCarnaticPick(line.id); }, [line.id]);
  // an exercise that needs notes off the home row slides the keys two places for the whole exercise
  const layout = line.layout;
  useEffect(() => { piano.setLayout(layout); }, [layout]);
  useEffect(() => () => pianoRef.current.setLayout(0), []);

  // demo: the app is playing these keys, so show them held down instead of as targets
  function light(codes, demo = false) {
    const id = codes.join() + (demo ? ':demo' : '');
    if (lit.current === id) return;
    lit.current = id;
    pianoRef.current.setHighlight(!codes.length ? null : demo ? { targets: [], demo: codes, wrong: null } : { targets: codes, wrong: null });
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
    engine.ambientStop();
    ambientSa.current = null;
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
    // settle the view on the fall area, piano and the Relax card under it, the card's bottom near the bottom of the screen
    requestAnimationFrame(() => {
      const card = piano.slot;
      if (card) window.scrollTo({ top: window.scrollY + card.getBoundingClientRect().bottom + VIEW_MARGIN - window.innerHeight, behavior: 'smooth' });
    });
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

  // Ambient music keeps flowing across lines and breaks; it only restarts if Sa moves
  function tuneAmbient(base, sa) {
    if (!ambientOn.current || ambientSa.current === sa) return;
    startAmbient(raga, base, sa, pianoRef.current.transpose);
    ambientSa.current = sa;
  }

  function toggleAmbient(on) {
    setAmbient(on);
    saveAmbient(on);
    ambientOn.current = on;
    if (!on) {
      engine.ambientStop();
      ambientSa.current = null;
    } else if (step !== 'idle') {
      tuneAmbient(run.current?.base ?? piano.octave, line.sa);
    }
  }

  function playLine(p, base) {
    halt();
    const l = lines[p];
    tuneDrone(base, l.sa);
    tuneAmbient(base, l.sa);
    const spb = 60 / (CARNATIC_BPM * speed);
    playAlong(p, base, spb);
  }

  // Play-along: the rest of the exercise flows at tempo (call and response
  // when listening first), timed on the audio clock so it stays steady
  function playAlong(p, base, spb) {
    const plan = playAlongPlan(lines, p, listenFirst);
    const lead = Math.max(2, FALL_HEIGHT / PX_PER_SECOND / spb); // time for the first tiles to fall from the top
    const tStart = engine.now() + lead * spb;
    // The app's lines while you listen, each created just before it sounds
    const queue = appNotes(lines, plan);
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
    const listenNotes = listenFirst ? appNotes(lines, plan).map(n => ({ ...n, octave: base + n.oct })) : [];
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
        // the key is held while its note sounds, and let go just before the next one
        const down = i >= 0 && beat - seg.listenAt < l.events[i].beat + l.events[i].beats * 0.92;
        light(down ? l.events[i].notes.map(n => codeFor(n.semitone, n.oct, l.layout)) : [], true);
      } else {
        setSounding(-1);
        const next = r.play.notes.filter(n => !n.hit && !n.missed && n.beat <= r.play.beat);
        light(next.map(n => codeFor(n.semitone, n.octave - r.base, lines[p].layout)));
      }
      setFrame(f => f + 1);
      if (r.play.done) {
        // played to the end of the exercise: it counts as passed in Practice too
        light([]);
        setStep('rest');
        markRelaxFinished(lines[plan.segments.at(-1).pos].id);
        setBest(loadBest());
        // a short breather, then straight on to the next varisai
        const np = goTo(plan.segments.at(-1).pos + 1);
        const restEnd = Date.now() + BREATHER * 1000;
        const countdown = () => {
          const left = Math.ceil((restEnd - Date.now()) / 1000);
          if (left <= 0) { playLine(np, base); return; }
          setRestLeft(left);
          timer.current = setTimeout(countdown, 250);
        };
        countdown();
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
  const fall = (step === 'play' || step === 'listen') && r?.play
    ? <FallingNotes slot={piano.fallSlot} play={r.play} base={r.base} spb={r.spb} shift={line.layout} gentle listen={r.listenNotes} />
    : <FallSpace slot={piano.fallSlot} />;

  const startStop = active
    ? <button className="big" onClick={stop}>■ Stop</button>
    : <button className="primary big" onClick={start}>▶ Start</button>;
  // the same button again in the voice panel, so it is to hand at the top
  const spare = piano.playSlot && createPortal(
    <button className="voice-btn" onClick={active ? stop : start}>{active ? 'Stop' : 'Start'}</button>,
    piano.playSlot
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
        {step === 'rest' && `✨ Break… next: ${lines[pos].title} in ${restLeft}s`}
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
  // Same layout as Practice: the varisais on the left, the exercise on the right
  return (
    <div className="songs relax with-ragas">
      {fall}
      {spare}
      {card}
      <RagaNav raga={raga} disabled={active} onPick={pickRaga} />
      <SongList
        levels={[...CARNATIC_LEVELS, GEETHAM_LEVEL]}
        songs={songs}
        activeId={songs[exerciseNow].id}
        disabled={active}
        best={best}
        mode="play"
        onPick={s => goTo(lines.findIndex(l => l.id === s.id))}
        head={(
          <div className="carnatic-head">
            <div className="unit-title">Carnatic · {RAGAS[raga].number}. {RAGAS[raga].name}</div>
          </div>
        )}
      />

      <div className="song-setup">
        <CarnaticInfo song={songs[exerciseNow]} raga={raga} layout={layout} />

        {modeSwitch}

        <div className="song-option">
          <span className="option-label">Speed</span>
          {CARNATIC_SPEEDS.map(v => (
            <button key={v} className={speed === v ? 'active' : ''} disabled={active} onClick={() => setSpeed(v)}>
              {speedLabel(v, true)}
            </button>
          ))}
        </div>

        <TanpuraControl on={drone} onToggle={toggleDrone} />
        <AmbientControl on={ambient} onToggle={toggleAmbient} />
        <label className="unlock">
          <input type="checkbox" checked={listenFirst} disabled={active} onChange={e => setListenFirst(e.target.checked)} />
          Listen to each line first, then play it back
        </label>

        <p className="song-note">Long bars mean hold the key down until the bar has gone into the piano.</p>
        {startStop}

        <div className="sheet-title">
          All notes in order <span>· {songs[exerciseNow].events.length} notes · {line.totalBeats} beats per line (one {line.talam.name} talam cycle, {line.talam.parts})</span>
        </div>
        <NoteSheet song={songs[exerciseNow]} />
      </div>
    </div>
  );
}
