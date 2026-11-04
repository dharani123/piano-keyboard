import { useCallback, useEffect, useRef, useState } from 'react';
import { engine } from './audio/engine.js';
import { frequency } from './audio/pitch.js';
import { INSTRUMENTS } from './audio/instruments.js';
import { keyForCode, MIN_OCTAVE, MAX_OCTAVE, MAX_TRANSPOSE, MIN_SHIFT, MAX_SHIFT } from './data/keymap.js';
import { dChordThird } from './data/dChord.js';
import { useKeyboard } from './hooks/useKeyboard.js';
import Piano from './components/Piano.jsx';
import Display from './components/Display.jsx';
import VoicePanel from './components/VoicePanel.jsx';
import Controls from './components/Controls.jsx';
import Lessons from './components/lessons/Lessons.jsx';
import { effectiveTranspose } from './ear/transposeLock.js';
import { COLOUR_MODES, loadColourMode, saveColourMode } from './data/colours.js';
import { SIZE_MODES, loadSizeMode, saveSizeMode } from './data/pianoSize.js';

// Shown on the display instead of the usual message while the browser holds the sound back
const AUDIO_MESSAGES = { suspended: 'SOUND PAUSED - CLICK ANYWHERE', stuck: 'SOUND STUCK - RESTARTING' };
// The player's keyboard can't register D + Y + J at once: two D major notes pressed
// this close together (ms) play the third too. Slower than this is a melody, not a chord.
const CHORD_WINDOW_MS = 120;
const CHORD_FILL_ID = 'd-chord-fill';
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Transpose is switched off for now (user's call): the control stays visible but
// greyed out, the arrows do nothing and everything plays at 0. Set true to bring it back.
const TRANSPOSE_ENABLED = false;

export default function App() {
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [octave, setOctave] = useState(4);
  const [storedTranspose, setTranspose] = useState(0);
  const [transposeLocks, setTransposeLocks] = useState(0);
  const transpose = TRANSPOSE_ENABLED ? effectiveTranspose(storedTranspose, transposeLocks) : 0;
  const [effects, setEffects] = useState({ volume: 0.7, reverb: 0.25, chorus: 0 });
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [pedalLatched, setPedalLatched] = useState(false);
  const [pressed, setPressed] = useState(() => new Set());
  const [lastNote, setLastNote] = useState(null);
  const [highlight, setHighlight] = useState(null); // { targets: [codes], wrong: code } from a lesson
  const [lessonStatus, setLessonStatus] = useState(null);
  const [lessonSlot, setLessonSlot] = useState(null); // element under the piano where exercises render
  const [fallSlot, setFallSlot] = useState(null); // element above the piano where song notes fall
  const [playSlot, setPlaySlot] = useState(null); // spot in the voice panel for a spare Start/Stop button
  // Keyboard layout shift (see keymap.js): the player's own Shift −/+ choice, unless a song tab
  // has set the layout it needs (songLayout, null when no song tab is open)
  const [userShift, setUserShift] = useState(() => {
    try { return clamp(parseInt(localStorage.getItem('desk-piano-shift'), 10) || 0, MIN_SHIFT, MAX_SHIFT); } catch { return 0; }
  });
  const [songLayout, setSongLayout] = useState(null);
  const layout = songLayout ?? userShift;
  const [audioStatus, setAudioStatus] = useState(() => engine.status());
  const [colourMode, setColourMode] = useState(loadColourMode);
  const [sizeMode, setSizeMode] = useState(loadSizeMode);
  const [hideOutlines, setHideOutlines] = useState(() => {
    try { return localStorage.getItem('desk-piano-hide-outlines') === '1'; } catch { return false; }
  });
  // synchronous copy (code -> { semitone, octave }), so key + mouse can't double-trigger
  const heldRef = useRef(new Map());
  const listeners = useRef(new Set());
  const chordFillOn = useRef(false); // the third note of a D major chord is sounding

  // Lessons listen to every note played; returns an unsubscribe function
  const subscribe = useCallback(fn => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  }, []);

  const sustainOn = spaceHeld || pedalLatched;

  useEffect(() => { engine.setSustain(sustainOn); }, [sustainOn]);
  // A key held across a layout change would never get its key-up note
  useEffect(() => releaseAll(), [layout]);
  useEffect(() => engine.onStatus(setAudioStatus), []);
  useEffect(() => {
    try { localStorage.setItem('desk-piano-shift', String(userShift)); } catch { /* storage blocked */ }
  }, [userShift]);
  useEffect(() => saveColourMode(colourMode), [colourMode]);
  useEffect(() => {
    saveSizeMode(sizeMode);
    // black keys and falling-note lanes are positioned from key sizes on resize
    window.dispatchEvent(new Event('resize'));
  }, [sizeMode]);
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
    const pressedAt = performance.now();
    const earlier = [...heldRef.current.values()];
    heldRef.current.set(code, { semitone: k.semitone, octave: oct, pressedAt });
    setPressed(new Set(heldRef.current.keys()));
    engine.noteOn(code, frequency(oct, k.semitone, transpose), INSTRUMENTS[voiceIndex].id);
    setLastNote(k.note + oct);
    stopChordFill(); // a third key got through after all, so the real note takes over
    const third = earlier.length === 1 && pressedAt - earlier[0].pressedAt <= CHORD_WINDOW_MS
      ? dChordThird(earlier[0], { semitone: k.semitone, octave: oct })
      : null;
    if (third) {
      engine.noteOn(CHORD_FILL_ID, frequency(third.octave, third.semitone, transpose), INSTRUMENTS[voiceIndex].id);
      chordFillOn.current = true;
    }
    const event = { semitone: k.semitone, octave: oct, code, time: engine.now(), held: [...heldRef.current.values()], chordFilled: !!third };
    for (const fn of listeners.current) fn(event);
  }

  function noteUp(code) {
    if (!heldRef.current.delete(code)) return;
    setPressed(new Set(heldRef.current.keys()));
    engine.noteOff(code);
    stopChordFill();
  }

  function stopChordFill() {
    if (!chordFillOn.current) return;
    chordFillOn.current = false;
    engine.noteOff(CHORD_FILL_ID);
  }

  function releaseAll() {
    chordFillOn.current = false;
    heldRef.current.clear();
    setPressed(new Set());
    setSpaceHeld(false);
    engine.allOff();
  }

  const shiftOctave = d => setOctave(o => clamp(o + d, MIN_OCTAVE, MAX_OCTAVE));
  const shiftTranspose = d => {
    if (TRANSPOSE_ENABLED && transposeLocks === 0) setTranspose(t => clamp(t + d, -MAX_TRANSPOSE, MAX_TRANSPOSE));
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
    playSlot,
    setLayout: setSongLayout,
    layout,
    // keys held right now, as { semitone, octave }
    getHeld: () => [...heldRef.current.values()],
  };

  return (
    <div className={`app colours-${colourMode}${colourMode === 'colour' ? ' colours-bw' : ''} size-${sizeMode}`}>
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
            message={AUDIO_MESSAGES[audioStatus] ?? lessonStatus ?? 'READY'}
          />
        </header>

        <div className="panels">
          <VoicePanel voiceIndex={voiceIndex} onSelect={setVoiceIndex} playSlotRef={setPlaySlot} />
          <Controls
            effects={effects}
            onEffect={(name, value) => setEffects(e => ({ ...e, [name]: value }))}
            octave={octave}
            onOctave={shiftOctave}
            transpose={transpose}
            onTranspose={shiftTranspose}
            transposeDisabled={!TRANSPOSE_ENABLED}
            shift={layout}
            onShift={d => setUserShift(s => clamp(s + d, MIN_SHIFT, MAX_SHIFT))}
            shiftDisabled={songLayout !== null}
            pedalLatched={pedalLatched}
            sustainOn={sustainOn}
            onPedal={() => setPedalLatched(l => !l)}
          />
        </div>

        <div className="piano-options">
          <select className="piano-option" value={sizeMode} onChange={e => setSizeMode(e.target.value)} aria-label="Piano size">
            {SIZE_MODES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select className="piano-option" value={colourMode} onChange={e => setColourMode(e.target.value)} aria-label="Piano colours">
            {COLOUR_MODES.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <label className="piano-option">
            <input type="checkbox" checked={hideOutlines} onChange={e => setHideOutlines(e.target.checked)} />
            Hide outlines
          </label>
        </div>
        <div className="fall-slot" ref={setFallSlot} />
        <Piano
          hideOutlines={hideOutlines}
          shift={layout}
          pressed={pressed}
          targetCodes={highlight?.targets ?? []}
          demoCodes={highlight?.demo ?? []}
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
