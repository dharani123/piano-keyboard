import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { keyAt } from '../../data/keymap.js';
import { noteColourVars } from '../../data/colours.js';

export const FALL_HEIGHT = 230;
export const PX_PER_SECOND = 110;
const BLACK_SEMITONES = [1, 3, 6, 8, 10];

// The on-screen key for a note, `rel` octaves above the song's start octave, in keyboard layout `shift`
export const codeFor = (semitone, rel, shift = 0) => keyAt(semitone, rel, shift)?.code;

// Notes falling above the piano, each in the column of its key.
// play = a player.js state; base = the octave the song started in.
// gentle: missed notes just fade instead of turning red (Relax mode).
// listen: notes the app plays for you to hear (same shape as play.notes), drawn lighter
export default function FallingNotes({ slot, play, base, spb, shift = 0, gentle = false, listen = [] }) {
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
  }, [slot, shift]);

  if (!slot) return null;
  const pxPerBeat = PX_PER_SECOND * spb;
  return createPortal(
    <div className="fall" style={{ height: FALL_HEIGHT }}>
      {[...play.notes, ...listen.map(n => ({ ...n, listen: true }))].map((n, i) => {
        const lane = lanes[codeFor(n.semitone, n.octave - base, shift)];
        if (!lane) return null;
        const bottom = (n.beat - play.beat) * pxPerBeat;
        const height = Math.max(n.beats * pxPerBeat - 3, 8);
        if (bottom > FALL_HEIGHT || bottom + height < 0) return null;
        const black = BLACK_SEMITONES.includes(n.semitone);
        const cls = ['fall-note', black && 'sharp', n.listen && 'listen', n.hit && 'hit', n.holding && 'holding', n.missed && (gentle ? 'gone' : 'missed')]
          .filter(Boolean).join(' ');
        return (
          <div key={i} className={cls} style={{ ...noteColourVars(n.semitone), left: lane.left + 3, width: lane.width - 6, bottom, height }}>
            {n.name.replace('#', '♯')}
          </div>
        );
      })}
    </div>,
    slot
  );
}
