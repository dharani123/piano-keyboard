import { forwardRef } from 'react';
import { noteColourVars } from '../data/colours.js';
import { SWARA_BY_SEMITONE } from '../songs/carnatic.js';

const Key = forwardRef(function Key({ k, pressed, target, wrong, onDown, onUp }, ref) {
  const className = [
    'key',
    k.type,
    pressed && 'down',
    target && 'target',
    wrong && 'wrong',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={ref}
      data-code={k.code}
      className={className}
      style={noteColourVars(k.semitone)}
      onPointerDown={e => { e.preventDefault(); onDown(k.code); }}
      onPointerUp={() => onUp(k.code)}
      onPointerLeave={() => onUp(k.code)}
    >
      <span className="note-name">{k.note.replace('#', '♯')}</span>
      {/* the Carnatic name under the note, Sa = C (the user, 2026-11-14) */}
      <span className="swara-name">{SWARA_BY_SEMITONE[k.semitone % 12]}</span>
    </div>
  );
});

export default Key;
