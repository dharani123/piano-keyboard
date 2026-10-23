import { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../../audio/engine.js';
import { frequency } from '../../audio/pitch.js';
import { bySemitone } from '../../data/keymap.js';
import { parseRhythm, totalBeats, scoreRhythm, starsForAccuracy } from '../../lessons/rhythm.js';

const COUNT_IN = 4;
const BEATS_PER_BAR = 4;

export default function RhythmExercise({ exercise, piano, onProgress, onComplete }) {
  const events = useMemo(() => parseRhythm(exercise.pattern), [exercise.pattern]);
  const total = totalBeats(events);
  const spb = 60 / exercise.bpm;
  const [mode, setMode] = useState('ready'); // ready | demo | play
  const [beat, setBeat] = useState(null);
  const run = useRef(null); // { t0, base, mode, presses }
  const frame = useRef(0);
  const lit = useRef(null);
  const pianoRef = useRef(piano);
  pianoRef.current = piano;

  function light(code) {
    if (lit.current === code) return;
    lit.current = code;
    pianoRef.current.setHighlight(code ? { targets: [code], wrong: null } : null);
  }

  function stop() {
    cancelAnimationFrame(frame.current);
    engine.cancelScheduled();
    light(null);
    run.current = null;
  }
  useEffect(() => stop, []);
  useEffect(() => { onProgress(`${exercise.bpm} BPM`); }, []);

  useEffect(() => piano.subscribe(e => {
    const r = run.current;
    if (r?.mode === 'play') r.presses.push({ time: e.time - r.t0, semitone: e.semitone, octave: e.octave });
  }), [piano.subscribe]);

  function begin(nextMode) {
    stop();
    const now = engine.now();
    const t0 = now + 0.3 + COUNT_IN * spb;
    const base = piano.octave;
    for (let b = -COUNT_IN; b < Math.ceil(total); b++) {
      engine.click(t0 + b * spb, ((b % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR === 0);
    }
    if (nextMode === 'demo') {
      for (const e of events) {
        if (e.rest) continue;
        const freq = frequency(base + e.oct, e.semitone, piano.transpose);
        engine.playNote(freq, piano.instrumentId, t0 + e.beat * spb, e.beats * spb * 0.9);
      }
    }
    run.current = { t0, base, mode: nextMode, presses: [] };
    setMode(nextMode);
    onProgress(nextMode === 'demo' ? 'LISTEN...' : 'PLAY!');

    const tick = () => {
      const r = run.current;
      if (!r) return;
      const b = (engine.now() - r.t0) / spb;
      setBeat(b);
      // Demo lights the sounding note; play mode lights the next note to hit
      const target = r.mode === 'demo'
        ? events.find(e => !e.rest && b >= e.beat && b < e.beat + e.beats * 0.9)
        : events.find(e => !e.rest && b < e.beat + Math.min(e.beats, 1) * 0.5);
      light(target ? bySemitone[target.semitone].code : null);
      if (b > total + 0.6) return finish(r);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  function finish(r) {
    stop();
    setMode('ready');
    setBeat(null);
    onProgress(`${exercise.bpm} BPM`);
    if (r.mode !== 'play') return;
    const score = scoreRhythm(events, r.presses, spb, r.base);
    const count = grade => score.results.filter(x => x.grade === grade).length;
    const parts = [`Perfect ${count('perfect')}`, `Good ${count('good')}`, `A bit off ${count('ok')}`, `Missed ${count('miss')}`];
    if (score.extras) parts.push(`Extra ${score.extras}`);
    onComplete({
      stars: starsForAccuracy(score.accuracy),
      detail: `${Math.round(score.accuracy * 100)}% timing · ${parts.join(' · ')}`,
    });
  }

  const counting = beat !== null && beat < 0;
  const bars = Math.ceil(total / BEATS_PER_BAR);

  return (
    <div className="exercise">
      <div className="prompt">
        {mode === 'ready' && <>Tempo {exercise.bpm} BPM: listen first, then play along</>}
        {mode === 'demo' && <>Listen and watch the keys…</>}
        {mode === 'play' && (counting ? <>Get ready… <span className="count">{COUNT_IN + Math.floor(beat) + 1}</span></> : <>Play!</>)}
      </div>
      <div className="exercise-actions">
        <button onClick={() => begin('demo')} disabled={mode !== 'ready'}>🔊 Listen first</button>
        <button className="primary" onClick={() => begin('play')} disabled={mode !== 'ready'}>▶ Start</button>
        {mode !== 'ready' && <button onClick={() => { stop(); setMode('ready'); setBeat(null); }}>Stop</button>}
      </div>
      <div className="lane">
        {Array.from({ length: bars - 1 }, (_, i) => (
          <div key={i} className="barline" style={{ left: `${((i + 1) * BEATS_PER_BAR / total) * 100}%` }} />
        ))}
        {events.map((e, i) => (
          <div
            key={i}
            className={'lane-note' + (e.rest ? ' rest' : '')}
            style={{ left: `${(e.beat / total) * 100}%`, width: `calc(${(e.beats / total) * 100}% - 3px)` }}
          >
            {e.rest ? '𝄽' : <><b>{e.name.replace('#', '♯')}</b><small>{bySemitone[e.semitone].key}</small></>}
          </div>
        ))}
        {beat !== null && beat >= 0 && <div className="playhead" style={{ left: `${Math.min(beat / total, 1) * 100}%` }} />}
      </div>
    </div>
  );
}
