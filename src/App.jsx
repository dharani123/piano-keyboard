import { useCallback, useEffect, useRef, useState } from 'react';
import { engine } from './audio/engine.js';
import { frequency } from './audio/pitch.js';
import { INSTRUMENTS } from './audio/instruments.js';
import { keyForCode, MIN_OCTAVE, MAX_OCTAVE, MAX_TRANSPOSE } from './data/keymap.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import Piano from './components/Piano.jsx';
import Display from './components/Display.jsx';
import VoicePanel from './components/VoicePanel.jsx';
import Controls from './components/Controls.jsx';
import Lessons from './components/lessons/Lessons.jsx';
import { effectiveTranspose } from './ear/transposeLock.js';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export default function App() {
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [octave, setOctave] = useState(4);
  const [storedTranspose, setTranspose] = useState(0);
  const [transposeLocks, setTransposeLocks] = useState(0);
  const transpose = effectiveTranspose(storedTranspose, transposeLocks);
  const [effects, setEffects] = useState({ volume: 0.7, reverb: 0.25, chorus: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [pedalLatched, setPedalLatched] = useState(false);
  const [pressed, setPressed] = useState(() => new Set());
  const [lastNote, setLastNote] = useState(null);
  const [highlight, setHighlight] = useState(null); // { targets: [codes], wrong: code } from a lesson
  const [lessonStatus, setLessonStatus] = useState(null);
  const [lessonSlot, setLessonSlot] = useState(null); // element under the piano where exercises render
  const [fallSlot, setFallSlot] = useState(null); // element above the piano where song notes fall
  const [layout, setLayout] = useState(0); // keyboard layout shift: 0, +2 (low notes) or -2 (high), see keymap.js
  const [hideOutlines, setHideOutlines] = useState(() => {
    try { return localStorage.getItem('desk-piano-hide-outlines') === '1'; } catch { return false; }
  });
  // synchronous copy (code -> { semitone, octave }), so key + mouse can't double-trigger
  const heldRef = useRef(new Map());
  const listeners = useRef(new Set());

  // Lessons listen to every note played; returns an unsubscribe function
  const subscribe = useCallback(fn => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const sustainOn = spaceHeld || pedalLatched;

  useEffect(() => { engine.setSustain(sustainOn); }, [sustainOn]);
  // A key held across a layout change would never get its key-up note
  useEffect(() => releaseAll(), [layout]);
  useEffect(() => {
    try { localStorage.setItem('desk-piano-hide-outlines', hideOutlines ? '1' : '0'); } catch { /* storage blocked */ }
  }, [hideOutlines]);
  useEffect(() => {
    for (const [name, value] of Object.entries(effects)) engine.set(name, value);
  }, [effects]);

  function noteDown(code) {
    if (heldRef.current.has(code)) return;
    const k = keyForCode(code, layout);
    if (!k) return; // a key this layout doesn't use
    const oct = octave + (k.octaveUp ?? 0);
    heldRef.current.set(code, { semitone: k.semitone, octave: oct });
    setPressed(new Set(heldRef.current.keys()));
    engine.noteOn(code, frequency(oct, k.semitone, transpose), INSTRUMENTS[voiceIndex].id);
    setLastNote(k.note + oct);
    const event = { semitone: k.semitone, octave: oct, code, time: engine.now(), held: [...heldRef.current.values()] };
    for (const fn of listeners.current) fn(event);
  }

  function noteUp(code) {
    if (!heldRef.current.delete(code)) return;
    setPressed(new Set(heldRef.current.keys()));
    engine.noteOff(code);
  }

  function releaseAll() {
    heldRef.current.clear();
    setPressed(new Set());
    setSpaceHeld(false);
    engine.allOff();
  }

  const shiftOctave = d => setOctave(o => clamp(o + d, MIN_OCTAVE, MAX_OCTAVE));
  const shiftTranspose = d => {
    if (transposeLocks === 0) setTranspose(t => clamp(t + d, -MAX_TRANSPOSE, MAX_TRANSPOSE));
  };

  // Returns the unlock function, so it can be an effect's cleanup
  const lockTranspose = useCallback(() => {
    setTransposeLocks(n => n + 1);
    return () => setTransposeLocks(n => n - 1);
  }, []);

  useKeyboard({
    noteDown,
    noteUp,
    releaseAll,
    sustain: setSpaceHeld,
    octave: shiftOctave,
    transpose: shiftTranspose,
    voice: setVoiceIndex,
  });

  const piano = {
    octave,
    transpose,
    instrumentId: INSTRUMENTS[voiceIndex].id,
    subscribe,
    lockTranspose,
    setHighlight,
    setStatus: setLessonStatus,
    slot: lessonSlot,
    fallSlot,
    setLayout,
    // keys held right now, as { semitone, octave }
    getHeld: () => [...heldRef.current.values()],
  };

  return (
    <div className="app">
      <div className="instrument">
        <header className="top">
          <div className="brand">
            <span className="brand-name">DESK PIANO</span>
            <span className="brand-model">EP-7</span>
          </div>
          <Display
            voiceIndex={voiceIndex}
            lastNote={lastNote}
            octave={octave}
            transpose={transpose}
            sustain={sustainOn}
            message={lessonStatus ?? 'READY'}
          />
        </header>

        <div className="panels">
          <VoicePanel voiceIndex={voiceIndex} onSelect={setVoiceIndex} />
          <Controls
            effects={effects}
            onEffect={(name, value) => setEffects(e => ({ ...e, [name]: value }))}
            octave={octave}
            onOctave={shiftOctave}
            transpose={transpose}
            onTranspose={shiftTranspose}
            pedalLatched={pedalLatched}
            sustainOn={sustainOn}
            onPedal={() => setPedalLatched(l => !l)}
          />
        </div>

        <label className="piano-option">
          <input type="checkbox" checked={hideOutlines} onChange={e => setHideOutlines(e.target.checked)} />
          Hide outlines
        </label>
        <div className="fall-slot" ref={setFallSlot} />
        <Piano
          hideOutlines={hideOutlines}
          shift={layout}
          pressed={pressed}
          targetCodes={highlight?.targets ?? []}
          wrongCode={highlight?.wrong}
          onDown={noteDown}
          onUp={noteUp}
        />
        <div className="lesson-slot" ref={setLessonSlot} />
      </div>

      <Lessons piano={piano} />

      <p className="help">
        Home row <kbd>S</kbd><kbd>D</kbd><kbd>F</kbd><kbd>G</kbd><kbd>H</kbd><kbd>J</kbd><kbd>K</kbd> = C D E F G A B
        · <kbd>L</kbd><kbd>;</kbd><kbd>'</kbd><kbd>Enter</kbd> = C D E F above
        &nbsp;·&nbsp; sharps <kbd>E</kbd><kbd>R</kbd> · <kbd>Y</kbd><kbd>U</kbd><kbd>I</kbd> · <kbd>P</kbd><kbd>[</kbd>
        &nbsp;·&nbsp; transpose <kbd>←</kbd><kbd>→</kbd>
      </p>
    </div>
  );
}
