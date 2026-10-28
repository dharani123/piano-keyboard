import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { engine } from '../../audio/engine.js';
import { loadTanpura, saveTanpura, startTanpura } from '../../songs/tanpura.js';
import TanpuraControl from './TanpuraControl.jsx';
import AmbientControl from './AmbientControl.jsx';
import { loadAmbient, saveAmbient, startAmbient } from '../../songs/ambient.js';
import { SongList, CarnaticInfo, CARNATIC_SPEEDS, speedLabel } from './CarnaticParts.jsx';
import { SONG_LIBRARY } from '../../songs/library.js';
import { loadMySongs, saveMySongs } from '../../songs/mySongs.js';
import { RAGAS, DEFAULT_RAGA, CARNATIC_LEVELS, GEETHAM_LEVEL, carnaticSongs, shownSongs, geethamSongs, loadCarnaticPick, saveCarnaticPick } from '../../songs/carnatic.js';
import { loadBest, saveBest, isPassed } from '../../songs/best.js';
import ImportAudio from './ImportAudio.jsx';
import NoteSheet from './NoteSheet.jsx';
import RagaNav from './RagaNav.jsx';
import FallingNotes, { FallSpace, FALL_HEIGHT, PX_PER_SECOND, codeFor } from './FallingNotes.jsx';
import { createPlay, press, advance, score, pendingGroup, pitchKey } from '../../songs/player.js';
import { starsForAccuracy } from '../../lessons/rhythm.js';

const COUNT_IN = 4;
const SPEEDS = [0.5, 0.75, 1];
// kind = which tab this is: 'western' or 'carnatic'
const LEVELS = { western: ['Easy', 'Medium', 'Chords', 'My songs'], carnatic: [...CARNATIC_LEVELS, GEETHAM_LEVEL] };
const RAGA_KEY = 'desk-piano-raga';
const MODES = {
  wait: { label: 'Wait for me', hint: 'The song stops at each note until you press it' },
  play: { label: 'Play along', hint: 'The song keeps going like the real thing' },
};
const MESSAGES = ['Keep practising, it gets easier!', 'Nice start!', 'Great playing!', 'Perfect! 🎉'];



export default function SongsMode({ piano, kind, modeSwitch }) {
  const [songId, setSongId] = useState(null);
  const [modeChoice, setMode] = useState('wait');
  const [speed, setSpeed] = useState(1); // Practice starts at 1st speed
  const [metronome, setMetronome] = useState(kind !== 'carnatic'); // off by default in Carnatic Practice
  const [drone, setDrone] = useState(loadTanpura); // tanpura under Carnatic exercises
  const [ambient, setAmbient] = useState(loadAmbient); // soft chords in the raga, shared with Relax
  const [best, setBest] = useState(loadBest);
  const [mySongs, setMySongs] = useState(loadMySongs);
  const [raga, setRaga] = useState(() => {
    try { return RAGAS[localStorage.getItem(RAGA_KEY)] ? localStorage.getItem(RAGA_KEY) : DEFAULT_RAGA; } catch { return DEFAULT_RAGA; }
  });
  const carnatic = useMemo(() => [...shownSongs(carnaticSongs(raga), raga), ...geethamSongs(raga)], [raga]);
  const [phase, setPhase] = useState('pick'); // pick | playing | result
  const [result, setResult] = useState(null);
  const [, setFrame] = useState(0);
  const run = useRef(null); // { play, song, base, spb, last }
  const frame = useRef(0);
  const lit = useRef('');
  const pianoRef = useRef(piano);
  pianoRef.current = piano;
  const allSongs = kind === 'carnatic' ? carnatic : [...SONG_LIBRARY, ...mySongs];
  // until you pick one, Carnatic opens on the varisai last picked in Relax (if it isn't locked)
  const lastPick = kind === 'carnatic' && songId === null ? carnatic.findIndex(s => s.id.split('@')[0] === loadCarnaticPick()) : -1;
  const lastPickOpen = lastPick === 0 || (lastPick > 0 && (isPassed(best, carnatic[lastPick - 1].id) || isPassed(best, carnatic[lastPick].id)));
  const song = allSongs.find(s => s.id === songId) ?? (lastPickOpen ? carnatic[lastPick] : allSongs[0]);
  // (not when it fell back to the first one because the Relax pick is locked here, so Relax keeps its place)
  useEffect(() => { if (song.carnatic && (songId !== null || lastPickOpen)) saveCarnaticPick(song.id); }, [song.id]);
  const speeds = song.carnatic ? CARNATIC_SPEEDS : SPEEDS;
  // Carnatic exercises are always played along at tempo
  const mode = kind === 'carnatic' ? 'play' : modeChoice;
  // an exercise that needs notes off the home row slides the keys two places while it's picked
  const layout = song.layout ?? 0;
  useEffect(() => { piano.setLayout(layout); }, [layout]);
  useEffect(() => () => pianoRef.current.setLayout(0), []);

  // Carnatic exercises open in order, like a teacher: pass one (★★, or finish it in Relax) to open the next
  const passed = id => isPassed(best, id);
  // (an exercise already passed stays open, e.g. after new ones were slotted in before it)
  const isLocked = s => {
    const i = carnatic.findIndex(c => c.id === s.id);
    return i > 0 && !passed(carnatic[i - 1].id) && !passed(s.id);
  };

  const nextSong = allSongs[allSongs.indexOf(song) + 1];

  function pickSong(s) {
    setSongId(s.id);
    setPhase('pick');
    if (!(s.carnatic ? CARNATIC_SPEEDS : SPEEDS).includes(speed)) setSpeed(1);
  }
  function pickRaga(next) {
    setRaga(next);
    try { localStorage.setItem(RAGA_KEY, next); } catch { /* storage unavailable */ }
    if (song.carnatic) setSongId(song.id.replace(/@.*/, `@${next}`));
  }

  function updateMySongs(next) {
    setMySongs(next);
    saveMySongs(next);
  }
  function addMySong(s) {
    updateMySongs([...mySongs, s]);
    setSongId(s.id);
    setPhase('pick');
  }
  function deleteMySong() {
    updateMySongs(mySongs.filter(s => s.id !== song.id));
    setSongId(SONG_LIBRARY[0].id);
  }

  function light(targets, wrong = null) {
    const id = targets.join() + '|' + wrong;
    if (lit.current === id) return;
    lit.current = id;
    pianoRef.current.setHighlight(targets.length || wrong ? { targets, wrong } : null);
  }

  function stop() {
    cancelAnimationFrame(frame.current);
    engine.cancelScheduled();
    engine.droneStop();
    engine.ambientStop();
    light([]);
    run.current = null;
    pianoRef.current.setStatus(null);
  }
  useEffect(() => stop, []);

  useEffect(() => piano.subscribe(e => {
    const r = run.current;
    if (!r) return;
    if (!press(r.play, e.semitone, e.octave)) light(targetsOf(r), e.code);
  }), [piano.subscribe]);

  function targetsOf(r) {
    const { play } = r;
    // a key lights up the moment its falling note reaches it
    const near = play.mode === 'wait'
      ? pendingGroup(play).filter(n => n.beat <= play.beat)
      : play.notes.filter(n => !n.hit && !n.missed && n.beat <= play.beat);
    return near.map(n => codeFor(n.semitone, n.octave - r.base, r.song.layout ?? 0)).filter(Boolean);
  }

  function begin() {
    stop();
    const spb = 60 / (song.bpm * speed);
    const base = piano.octave;
    const play = createPlay(song, { mode, baseOctave: base, secondsPerBeat: spb });
    // start with the first notes at the top of the fall area
    const leadBeats = Math.max(COUNT_IN, FALL_HEIGHT / PX_PER_SECOND / spb);
    play.beat = -leadBeats;
    const now = engine.now();
    if (song.carnatic && drone) startTanpura(base, song.sa, piano.transpose);
    if (song.carnatic && ambient) startAmbient(raga, base, song.sa, piano.transpose);
    if (mode === 'play' && metronome) {
      const t0 = now + leadBeats * spb;
      for (let b = -COUNT_IN; b < Math.ceil(song.totalBeats); b++) engine.click(t0 + b * spb, b % 4 === 0);
    }
    const started = performance.now();
    run.current = { play, song, base, spb, started, startBeat: play.beat, last: started };
    setResult(null);
    setPhase('playing');
    piano.setStatus(`${song.title.slice(0, 14).toUpperCase()}`);
    requestAnimationFrame(() => piano.fallSlot?.scrollIntoView({ block: 'start', behavior: 'smooth' }));

    const tick = () => {
      const r = run.current;
      if (!r) return;
      // page clock, so the notes still move if the browser keeps audio asleep.
      // Play-along follows the clock exactly (stays with the metronome); wait
      // mode steps by frame, capped so a stalled tab doesn't jump ahead.
      const t = performance.now();
      const held = new Set(pianoRef.current.getHeld().map(h => pitchKey(h.semitone, h.octave)));
      const dBeats = r.play.mode === 'play'
        ? r.startBeat + (t - r.started) / 1000 / r.spb - r.play.beat
        : Math.min((t - r.last) / 1000, 0.25) / r.spb;
      r.last = t;
      advance(r.play, dBeats, held);
      light(targetsOf(r));
      setFrame(f => f + 1);
      if (r.play.done) return finish(r);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  function finish(r) {
    const s = score(r.play);
    const stars = starsForAccuracy(s.accuracy);
    const id = `${r.song.id}:${r.play.mode}`;
    const nextBest = { ...best, [id]: Math.max(stars, best[id] ?? 0) };
    setBest(nextBest);
    saveBest(nextBest);
    stop();
    setResult({ ...s, stars });
    setPhase('result');
  }

  // The tanpura can be switched on or off at any time, even mid-exercise
  function toggleDrone(on) {
    setDrone(on);
    saveTanpura(on);
    const r = run.current;
    if (!r) return;
    if (on) startTanpura(r.base, r.song.sa, piano.transpose);
    else engine.droneStop();
  }

  function toggleAmbient(on) {
    setAmbient(on);
    saveAmbient(on);
    const r = run.current;
    if (!r) return;
    if (on) startAmbient(raga, r.base, r.song.sa, piano.transpose);
    else engine.ambientStop();
  }

  function quit() {
    stop();
    setPhase('pick');
  }

  const r = run.current;
  const fall = phase === 'playing' && r
    ? <FallingNotes slot={piano.fallSlot} play={r.play} base={r.base} spb={r.spb} shift={r.song.layout ?? 0} />
    : <FallSpace slot={piano.fallSlot} />;

  const startStop = phase === 'playing'
    ? <button className="big" onClick={quit}>■ Stop</button>
    : <button className="primary big" onClick={begin}>▶ Start</button>;
  // the same button again in the voice panel, so it is to hand at the top
  const spare = piano.playSlot && createPortal(
    <button className="voice-btn" onClick={phase === 'playing' ? quit : begin}>{phase === 'playing' ? 'Stop' : 'Start'}</button>,
    piano.playSlot
  );

  const progress = r ? Math.max(0, Math.min(1, r.play.beat / r.play.totalBeats)) : 0;
  const chordNow = r && song.chords
    ? song.events.findLast(e => e.beat <= Math.max(r.play.beat, 0) + 0.01)?.label
    : null;
  const live = r && score(r.play);

  const bar = phase !== 'pick' && piano.slot && createPortal(
    <div className="slot-inner">
      <div className="slot-head">
        <span className="lesson-num">Song</span> <b>{song.title}</b>
        <span className="song-meta">{MODES[mode].label} · {speedLabel(speed, song.carnatic)}</span>
      </div>
      {phase === 'playing' && live && (
        <div className="song-live">
          {chordNow && <span className="chord-now">Chord: <b>{chordNow}</b></span>}
          <span>Hit {live.hits}/{live.total}</span>
          {r.play.beat < 0 && <span className="muted">Get ready…</span>}
          <div className="progress"><div className="progress-bar" style={{ width: `${progress * 100}%` }} /></div>
          <button onClick={quit}>Stop</button>
        </div>
      )}
      {phase === 'result' && result && (
        <div className="result">
          <div className="result-stars">
            {[0, 1, 2].map(i => <span key={i} className={i < result.stars ? 'on' : ''}>★</span>)}
          </div>
          <p className="result-msg">{MESSAGES[result.stars]}</p>
          <p className="result-detail">
            {Math.round(result.accuracy * 100)}% · Hit {result.hits}/{result.total} · Held full length {result.fullHolds}
            {' '}· Missed {result.missed}{result.wrong ? ` · Wrong keys ${result.wrong}` : ''}
          </p>
          <div className="result-actions">
            <button className="primary" onClick={begin}>↻ Play again</button>
            {nextSong && !isLocked(nextSong) && (
              <button onClick={() => { quit(); pickSong(nextSong); }}>Next: {nextSong.title} →</button>
            )}
            <button onClick={quit}>Pick another song</button>
          </div>
        </div>
      )}
    </div>,
    piano.slot
  );

  return (
    <div className={'songs' + (kind === 'carnatic' ? ' with-ragas' : '')}>
      {fall}
      {spare}
      {bar}
      {kind === 'carnatic' && <RagaNav raga={raga} disabled={phase === 'playing'} onPick={pickRaga} />}
      <SongList
        levels={LEVELS[kind]}
        songs={allSongs}
        activeId={song.id}
        disabled={phase === 'playing'}
        isLocked={isLocked}
        best={best}
        mode={mode}
        onPick={pickSong}
        notes={kind === 'western' ? { 'My songs': 'Import an audio file below' } : {}}
        head={kind === 'carnatic' && (
          <div className="carnatic-head">
            <div className="unit-title">Carnatic · {RAGAS[raga].number}. {RAGAS[raga].name}</div>
          </div>
        )}
      >
        {kind === 'western' && <ImportAudio disabled={phase === 'playing'} onImported={addMySong} />}
      </SongList>

      <div className="song-setup">
        {song.carnatic ? <CarnaticInfo song={song} raga={raga} layout={layout} /> : (
          <>
            <div className="lesson-num">{song.level} · {song.mine ? 'from your audio file' : `${song.bpm} BPM`}</div>
            <h2>{song.title}</h2>
          </>
        )}
        {song.mine && (
          <p className="song-note">
            Notes worked out from your recording ({song.events.length} notes): the top line only, folded into
            middle C to high F. Expect some wrong or extra notes.{' '}
            <button className="link inline" disabled={phase === 'playing'} onClick={deleteMySong}>Delete this song</button>
          </p>
        )}
        {song.chords && (
          <p className="song-note">
            Chord track: hold each chord with three fingers for its full length (C → F, then Am → Em → G).
            The tune on top is yours to find by ear.
          </p>
        )}

        {modeSwitch}
        {kind !== 'carnatic' && (
          <div className="song-option">
            <span className="option-label">Mode</span>
            {Object.entries(MODES).map(([id, m]) => (
              <button key={id} className={mode === id ? 'active' : ''} disabled={phase === 'playing'} onClick={() => setMode(id)}>
                {m.label}
              </button>
            ))}
          </div>
        )}
        {kind !== 'carnatic' && <p className="song-note">{MODES[mode].hint}.</p>}

        <div className="song-option">
          <span className="option-label">Speed</span>
          {speeds.map(v => (
            <button key={v} className={speed === v ? 'active' : ''} disabled={phase === 'playing'} onClick={() => setSpeed(v)}>
              {speedLabel(v, song.carnatic)}
            </button>
          ))}
        </div>

        {song.carnatic && (
          <>
            <TanpuraControl on={drone} onToggle={toggleDrone} />
            <AmbientControl on={ambient} onToggle={toggleAmbient} />
          </>
        )}
        {mode === 'play' && (
          <label className="unlock">
            <input type="checkbox" checked={metronome} disabled={phase === 'playing'} onChange={e => setMetronome(e.target.checked)} />
            Metronome clicks
          </label>
        )}

        <p className="song-note">Long bars mean hold the key down until the bar has gone into the piano.</p>
        {startStop}

        <div className="sheet-title">
          All notes in order <span>· {song.events.length} {song.chords ? 'chords' : 'notes'} · {song.talam?.beats ?? 8} beats per line{song.carnatic ? ` (one ${song.talam.name} talam cycle, ${song.talam.parts})` : ''}</span>
        </div>
        <NoteSheet song={song} />
      </div>
    </div>
  );
}
