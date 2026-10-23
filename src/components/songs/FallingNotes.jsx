import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { bySemitone, highBySemitone } from '../../data/keymap.js';

export const FALL_HEIGHT = 230;
export const PX_PER_SECOND = 110;
const BLACK_SEMITONES = [1, 3, 6, 8, 10];

// The on-screen key for a note, `rel` octaves above the song's start octave
export const codeFor = (semitone, rel) => (rel === 0 ? bySemitone[semitone] : highBySemitone[semitone])?.code;

// Notes falling above the piano, each in the column of its key.
// play = a player.js state; base = the octave the song started in.
// gentle: missed notes just fade instead of turning red (Relax mode).
export default function FallingNotes({ slot, play, base, spb, gentle = false }) {
  const [lanes, setLanes] = useState({});

  // Lane positions: line each column up with its key on the piano below
  useLayoutEffect(() => {
    if (!slot) return;
    function measure() {
      const left = slot.getBoundingClientRect().left;
      const next = {};
      for (const el of document.querySelectorAll('.piano [data-code]')) {
        const r = el.getBoundingClientRect();
        next[el.dataset.code] = { left: r.left - left, width: r.width };
      }
      setLanes(next);
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [slot]);

  if (!slot) return null;
  const pxPerBeat = PX_PER_SECOND * spb;
  return createPortal(
    <div className="fall" style={{ height: FALL_HEIGHT }}>
      {play.notes.map((n, i) => {
        const lane = lanes[codeFor(n.semitone, n.octave - base)];
        if (!lane) return null;
        const bottom = (n.beat - play.beat) * pxPerBeat;
        const height = Math.max(n.beats * pxPerBeat - 3, 8);
        if (bottom > FALL_HEIGHT || bottom + height < 0) return null;
        const black = BLACK_SEMITONES.includes(n.semitone);
        const cls = ['fall-note', black && 'black', n.hit && 'hit', n.holding && 'holding', n.missed && (gentle ? 'gone' : 'missed')]
          .filter(Boolean).join(' ');
        return (
          <div key={i} className={cls} style={{ left: lane.left + 3, width: lane.width - 6, bottom, height }}>
            {n.name.replace('#', '♯')}
          </div>
        );
      })}
    </div>,
    slot
  );
}
