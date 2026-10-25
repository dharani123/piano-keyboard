import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { engine } from '../../audio/engine.js';
import { loadTanpura, saveTanpura, startTanpura } from '../../songs/tanpura.js';
import { keyAt } from '../../data/keymap.js';
import { SONG_LIBRARY } from '../../songs/library.js';
import { loadMySongs, saveMySongs } from '../../songs/mySongs.js';
import { RAGAS, DEFAULT_RAGA, CARNATIC_LEVELS, SWARA_NAMES, carnaticSongs } from '../../songs/carnatic.js';
import { loadBest, saveBest, isPassed } from '../../songs/best.js';
import ImportAudio from './ImportAudio.jsx';
import NoteSheet from './NoteSheet.jsx';
import RagaSelect from './RagaSelect.jsx';
import FallingNotes, { FALL_HEIGHT, PX_PER_SECOND, codeFor } from './FallingNotes.jsx';
import { createPlay, press, advance, score, pendingGroup, pitchKey } from '../../songs/player.js';
import { starsForAccuracy } from '../../lessons/rhythm.js';

const COUNT_IN = 4;
const SPEEDS = [0.5, 0.75, 1];
// Carnatic adds 1.25 and 1.5 speed (stepping stones) and 2nd speed: two swaras per beat
const CARNATIC_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const speedLabel = (v, carnatic) => (carnatic && v === 1 ? '1st speed' : carnatic && (v === 1.25 || v === 1.5) ? `${v} speed` : carnatic && v === 2 ? '2nd speed' : `${Math.round(v * 100)}%`);
// kind = which tab this is: 'western' or 'carnatic'
const LEVELS = { western: ['Easy', 'Medium', 'Chords', 'My songs'], carnatic: CARNATIC_LEVELS };
const BLACK_SEMITONES = [1, 3, 6, 8, 10];
const SWARA_KEYS = ['S', 'R', 'G', 'M', 'P', 'D', 'N'];
const RAGA_KEY = 'desk-piano-raga';
const MODES = {
  wait: { label: 'Wait for me', hint: 'The song stops at each note until you press it' },
  play: { label: 'Play along', hint: 'The song keeps going like the real thing' },
};
const MESSAGES = ['Keep practising, it gets easier!', 'Nice start!', 'Great playing!', 'Perfect! 🎉'];



export default function SongsMode({ piano, kind }) {
  const [songId, setSongId] = useState(null);
  const [modeChoice, setMode] = useState('wait');
  const [speed, setSpeed] = useState(1);
  const [metronome, setMetronome] = useState(true);
  const [drone, setDrone] = useState(loadTanpura); // tanpura under Carnatic exercises
  const [best, setBest] = useState(loadBest);
  const [mySongs, setMySongs] = useState(loadMySongs);
  const [raga, setRaga] = useState(() => {
    try { return RAGAS[localStorage.getItem(RAGA_KEY)] ? localStorage.getItem(RAGA_KEY) : DEFAULT_RAGA; } catch { return DEFAULT_RAGA; }
  });
  const carnatic = useMemo(() => carnaticSongs(raga), [raga]);
  const [phase, setPhase] = useState('pick'); // pick | playing | result
  const [result, setResult] = useState(null);
  const [, setFrame] = useState(0);
  const run = useRef(null); // { play, song, base, spb, last }
  const frame = useRef(0);
  const lit = useRef('');
  const pianoRef = useRef(piano);
  pianoRef.current = piano;
  const allSongs = kind === 'carnatic' ? carnatic : [...SONG_LIBRARY, ...mySongs];
  const song = allSongs.find(s => s.id === songId) ?? allSongs[0];
  const speeds = song.carnatic ? CARNATIC_SPEEDS : SPEEDS;
  // Carnatic exercises are always played along at tempo
  const mode = kind === 'carnatic' ? 'play' : modeChoice;
  // Mel/Mandra Sthayi slide the keys two places while they're picked
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
    const near = play.mode === 'wait'
      ? pendingGroup(play).filter(n => n.beat - play.beat <= 1)
      : play.notes.filter(n => !n.hit && !n.missed && n.beat - play.beat <= 0.5);
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

  function quit() {
    stop();
    setPhase('pick');
  }

  const r = run.current;
  const fall = phase === 'playing' && r && (
    <FallingNotes slot={piano.fallSlot} play={r.play} base={r.base} spb={r.spb} shift={r.song.layout ?? 0} />
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
    <div className="songs">
      {fall}
      {bar}
      <aside className="song-list">
        {LEVELS[kind].map(level => (
          <div key={level} className="unit">
            {level === CARNATIC_LEVELS[0] && (
              <div className="carnatic-head">
                <div className="unit-title">Carnatic · {RAGAS[raga].number}. {RAGAS[raga].name}</div>
                <RagaSelect raga={raga} disabled={phase === 'playing'} onPick={pickRaga} />
              </div>
            )}
            <div className={'unit-title' + (CARNATIC_LEVELS.includes(level) ? ' sub' : '')}>{level}</div>
            {level === 'My songs' && !mySongs.length && <div className="song-note">Import an audio file below</div>}
            {allSongs.filter(s => s.level === level).map(s => (
              <button
                key={s.id}
                className={'lesson-link' + (s.id === songId ? ' active' : '')}
                disabled={phase === 'playing' || isLocked(s)}
                onClick={() => pickSong(s)}
              >
                <span className="lesson-link-title">{s.title}</span>
                <span className="lesson-link-stars">
                  {isLocked(s) ? '🔒' : best[`${s.id}:${mode}`] ? '★'.repeat(best[`${s.id}:${mode}`]) : ''}
                </span>
              </button>
            ))}
          </div>
        ))}
        {kind === 'western' && <ImportAudio disabled={phase === 'playing'} onImported={addMySong} />}
      </aside>

      <div className="song-setup">
        <div className="lesson-num">
          {song.carnatic ? `Carnatic · ${RAGAS[raga].name} · ${song.talam.name} talam` : song.level} · {song.mine ? 'from your audio file' : `${song.bpm} BPM`}
        </div>
        <h2>{song.title}</h2>
        {song.carnatic && (
          <>
            <div className="swara-map">
              {[...SWARA_KEYS.map(sw => [SWARA_NAMES[sw], song.sa + RAGAS[raga].semitones[sw]]), [`S\u0307a`, song.sa + 12]].map(([name, pitch]) => {
                const semi = ((pitch % 12) + 12) % 12;
                const rel = Math.floor(pitch / 12);
                const k = keyAt(semi, rel, layout);
                return (
                  <span key={name} className={BLACK_SEMITONES.includes(semi) ? 'sharp' : ''}>
                    <b>{name}</b>{rel > 0 ? 'high ' : rel < 0 ? 'low ' : ''}{k.note.replace('#', '♯')}<kbd>{k.key}</kbd>
                  </span>
                );
              })}
            </div>
            <p className="song-note">
              One swara per beat, {song.talam.beats} beats to a line (one round of {song.talam.name} talam).
              Longer bars are a karvai: hold the swara. Get ★★ to open the next exercise; then try it faster.
            </p>
            {song.sa !== 0 && (
              <p className="song-note">
                Sa sits on {keyAt(((song.sa % 12) + 12) % 12, Math.floor(song.sa / 12), layout).note.replace('#', '♯')} for this
                exercise (a different sruti), so every swara it needs is on your keyboard.
              </p>
            )}
            {layout !== 0 && (
              <p className="song-note">
                {layout > 0
                  ? <>The keys slide two places right for this exercise, so the low swaras (dot below) fit: <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> = low G A B, middle C is on <kbd>F</kbd>.</>
                  : <>The keys slide two places left for this exercise, so the high swaras fit: <kbd>A</kbd> = D, up to high A on <kbd>Enter</kbd>.</>}
                {' '}The piano below shows the new keys; it goes back to normal afterwards.
              </p>
            )}
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
        <p className="song-note">{MODES[mode].hint}.</p>

        <div className="song-option">
          <span className="option-label">Speed</span>
          {speeds.map(v => (
            <button key={v} className={speed === v ? 'active' : ''} disabled={phase === 'playing'} onClick={() => setSpeed(v)}>
              {speedLabel(v, song.carnatic)}
            </button>
          ))}
        </div>

        {song.carnatic && (
          <label className="unlock">
            <input type="checkbox" checked={drone} onChange={e => toggleDrone(e.target.checked)} />
            Tanpura drone (Sa–Pa)
          </label>
        )}
        {mode === 'play' && (
          <label className="unlock">
            <input type="checkbox" checked={metronome} disabled={phase === 'playing'} onChange={e => setMetronome(e.target.checked)} />
            Metronome clicks
          </label>
        )}

        <p className="song-note">Long bars mean hold the key down until the bar has gone into the piano.</p>
        {phase === 'playing'
          ? <button className="big" onClick={quit}>■ Stop</button>
          : <button className="primary big" onClick={begin}>▶ Start</button>}

        <div className="sheet-title">
          All notes in order <span>· {song.events.length} {song.chords ? 'chords' : 'notes'} · {song.talam?.beats ?? 8} beats per line{song.carnatic ? ` (one ${song.talam.name} talam cycle, ${song.talam.parts})` : ''}</span>
        </div>
        <NoteSheet song={song} />
      </div>
    </div>
  );
}
