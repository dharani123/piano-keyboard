import { useLayoutEffect, useRef } from 'react';
import { SWARA_BY_SEMITONE } from '../../songs/carnatic.js';

// A song's tune as one long line graph, under the piano (Find one by one and Play along, the
// user 2026-11-19). notes = findNotes(song): { semitone, oct, beat, beats }, one per event.
//   faint  = the first `faint` notes show as faint dots (Find: the notes found so far)
//   solid  = i => true for notes drawn solid with their swara names (Find: up to the cursor;
//            Play along: the notes you hit), joined by a line in the order they come
//   cursor = a dashed line after that note (Find only)
// Spaced by the song's beats, with a faint line at each bar (4 beats); it scrolls along to the
// newest solid note. Higher dots are higher notes, one row per semitone.
const PX_PER_BEAT = 30;
const ROW = 7;
const TOP = 6;
const SIDE = 14;
const LABEL_H = 13;

// the rows to draw: the song's lowest to highest note, at least an octave
export function graphRange(notes) {
  const ps = notes.map(n => n.semitone + 12 * n.oct);
  const lo = Math.min(...ps);
  return [lo, Math.max(Math.max(...ps), lo + 11)];
}

const aboveDot = (pitches, i) => {
  const prev = pitches[i - 1], next = pitches[i + 1];
  if (prev === undefined && next === undefined) return true;
  if (prev === undefined) return next < pitches[i];
  if (next === undefined) return prev < pitches[i];
  return prev + next <= 2 * pitches[i];
};

// barBeats = beats in a bar, for the bar lines (song.barBeats: 3.5 for a 7/8 song; default 4)
export default function SongGraph({ notes, faint = 0, solid, cursor = null, range = graphRange(notes), barBeats = 4 }) {
  const [lo, hi] = range;
  const box = useRef(null);
  const first = notes[0]?.beat ?? 0;
  const lastBeat = notes.at(-1) ? notes.at(-1).beat + notes.at(-1).beats : 4;
  const x = n => SIDE + (n.beat - first) * PX_PER_BEAT;
  const y = p => LABEL_H + TOP + (hi - p) * ROW;
  const width = SIDE * 2 + (lastBeat - first) * PX_PER_BEAT;
  const height = TOP * 2 + (hi - lo) * ROW + 2 * LABEL_H;
  const pitch = n => n.semitone + 12 * n.oct;
  const known = notes.slice(0, faint);
  const solidIdx = notes.map((_, i) => i).filter(i => solid(i));
  const played = solidIdx.map(i => notes[i]);
  // names go by the notes shown, above a dot the line rises into or peaks at, below otherwise
  const shownIdx = notes.map((_, i) => i).filter(i => i < faint || solid(i));
  const shownPitches = shownIdx.map(i => pitch(notes[i]));
  // keep the newest note in view
  const focus = cursor !== null ? notes[Math.max(cursor, 1) - 1] : played.at(-1);
  const focusKey = cursor !== null ? `${cursor}:${faint}` : solidIdx.length;
  useLayoutEffect(() => {
    const el = box.current;
    if (!el || !focus) return;
    const fx = x(focus);
    if (fx > el.scrollLeft + el.clientWidth - 60 || fx < el.scrollLeft + 20) el.scrollLeft = fx - el.clientWidth / 2;
  }, [focusKey]);
  const bars = [];
  for (let b = Math.ceil(first / barBeats) * barBeats; b <= lastBeat; b += barBeats) bars.push(b);
  return (
    <div className="find-graph" ref={box}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true">
        {Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).map(p => (
          <line key={p} x1="4" x2={width - 4} y1={y(p)} y2={y(p)} stroke="currentColor" strokeWidth="0.6" opacity={p % 12 === 0 ? 0.4 : 0.15} />
        ))}
        {bars.map(b => (
          <line key={b} x1={SIDE + (b - first) * PX_PER_BEAT} x2={SIDE + (b - first) * PX_PER_BEAT} y1={TOP} y2={height - TOP} stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
        ))}
        {known.length > 0 && <polyline points={known.map(n => `${x(n)},${y(pitch(n))}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeLinejoin="round" />}
        {known.map((n, i) => <circle key={i} cx={x(n)} cy={y(pitch(n))} r="2.5" fill="currentColor" opacity="0.3" />)}
        {played.length > 0 && <polyline points={played.map(n => `${x(n)},${y(pitch(n))}`).join(' ')} fill="none" stroke="var(--accent, currentColor)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {played.map((n, i) => <circle key={i} cx={x(n)} cy={y(pitch(n))} r="3.5" fill="var(--accent, currentColor)" />)}
        {cursor > 0 && (
          <line x1={x(notes[cursor - 1]) + 7} x2={x(notes[cursor - 1]) + 7} y1={TOP} y2={height - TOP} stroke="var(--accent, currentColor)" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.8" />
        )}
        {shownIdx.map((i, k) => {
          const n = notes[i];
          const on = solid(i);
          return (
            <text key={i} x={x(n)} y={aboveDot(shownPitches, k) ? y(pitch(n)) - 6 : y(pitch(n)) + 13} textAnchor="middle" fontSize="10"
              fontWeight={on ? 600 : undefined} opacity={on ? 1 : 0.4} fill="currentColor">{SWARA_BY_SEMITONE[n.semitone]}</text>
          );
        })}
      </svg>
    </div>
  );
}
