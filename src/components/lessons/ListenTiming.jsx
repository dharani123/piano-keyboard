import { useMemo, useState } from 'react';

// How listening exercises space their notes, set by the player with sliders and shared by
// every exercise that plays notes one after the other (choice, step and ear exercises):
//   gap  = seconds from one note's start to the next, the same between every pair
//   hold = seconds the last note rings
// (Until 2026-11-12 there was one slider per gap: 1→2, 2→3, ...) Every exercise opens with random
// values (the user's choice), so nothing is saved; Reset brings back the defaults, and Random
// and Reset change every slider shown.
// Random values follow a bell curve (Gaussian) around the default, `spread` = its standard
// deviation, so most land near it (since 2026-11-13; before, any value in the range was as likely).
const GAP = { min: 0.2, max: 1.2, initial: 0.5, spread: 0.15 };
const HOLD = { min: 0.1, max: 3, initial: 1, spread: 0.3 };
const STEP = 0.05;

// standard normal sample (Box-Muller)
const normal = () => Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

// a Gaussian value around `initial`, redrawn until it fits the slider, snapped to its step
const random = ({ min, max, initial, spread }) => {
  let v;
  do v = initial + normal() * spread; while (v < min || v > max);
  return Number((min + Math.round((v - min) / STEP) * STEP).toFixed(2));
};

// Fresh random values when an exercise opens. Done in the initial state, not an effect, so
// the first notes an exercise plays already use them.
const randomStart = () => ({ gap: random(GAP), hold: random(HOLD) });

function Slider({ label, title, range, value, onChange }) {
  return (
    <label className="gap-slider" title={title}>
      {label}
      {/* let go of focus after a drag, so B and the piano keys keep working */}
      <input type="range" min={range.min} max={range.max} step={STEP} value={value}
        onChange={e => onChange(Number(e.target.value))} onPointerUp={e => e.currentTarget.blur()} />
      <span className="gap-value">{value.toFixed(2)} s</span>
    </label>
  );
}

// The Gap slider sets the gap between notes. With Vary on (the default, since 2026-11-13) each
// gap in a question is its own bell-curve value around the slider (GAP.spread), drawn again for
// every new question (`key`) but kept for its replays; Vary off spaces every note evenly.
// `count` is unused for now (it set how many gap sliders showed).
// Returns { gap(i), starts(n), hold, sliders }: gap(i) = seconds after note i (0-based),
// starts(n) = each note's start offset in seconds, sliders = the controls to render.
const MAX_GAPS = 16;
export function useListenTiming(count = 2, key = 0) {
  const [initial] = useState(randomStart);
  const [gapValue, setGap] = useState(initial.gap);
  const [hold, setHold] = useState(initial.hold);
  const [vary, setVary] = useState(true);
  const offsets = useMemo(() => Array.from({ length: MAX_GAPS }, normal), [key]);
  const gap = i => {
    if (!vary) return gapValue;
    const v = Math.min(GAP.max, Math.max(GAP.min, gapValue + (offsets[i % MAX_GAPS] ?? 0) * GAP.spread));
    return Number((Math.round(v / STEP) * STEP).toFixed(2));
  };
  const starts = n => {
    const at = [0];
    for (let i = 1; i < n; i++) at.push(at[i - 1] + gap(i - 1));
    return at;
  };

  const randomise = e => {
    setGap(random(GAP));
    setHold(random(HOLD));
    e.currentTarget.blur();
  };
  const reset = e => {
    setGap(GAP.initial);
    setHold(HOLD.initial);
    e.currentTarget.blur();
  };

  const sliders = (
    <span className="listen-timing">
      <Slider label="Gap" title={vary ? 'Average time between the notes (each gap varies around it)' : 'Time between the notes'} range={GAP} value={gapValue} onChange={setGap} />
      <label className="gap-slider" title="Give every gap in a question its own random length around the Gap slider">
        <input type="checkbox" checked={vary} onChange={e => { setVary(e.target.checked); e.currentTarget.blur(); }} /> Vary gaps
      </label>
      <Slider label="Last note" title="How long the last note rings" range={HOLD} value={hold} onChange={setHold} />
      <button type="button" className="listen-random" onClick={randomise} title="Give both sliders a random value">🎲 Random</button>
      <button type="button" className="listen-reset" onClick={reset} title={`Gap back to ${GAP.initial} s, last note to ${HOLD.initial} s`}>↺ Reset</button>
    </span>
  );
  return { gap, starts, hold, sliders };
}
