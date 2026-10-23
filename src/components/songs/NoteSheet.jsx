import { bySemitone, highBySemitone } from '../../data/keymap.js';

const BEATS_PER_LINE = 8;
// Adi talam: laghu (4 beats) | drutam (2) | drutam (2)
const ADI_MARKS = [4, 6];

const keyFor = n => (n.oct === 0 ? bySemitone[n.semitone] : highBySemitone[n.semitone])?.key ?? '';

// Every note of a song in order, 8 beats per line, so it can be read before playing.
// A note's width follows its length; Carnatic karvai shows as "," after the swara.
export default function NoteSheet({ song }) {
  const lines = [];
  for (const e of song.events) {
    const i = Math.floor(e.beat / BEATS_PER_LINE + 1e-9);
    (lines[i] ??= []).push(e);
  }

  return (
    <div className="note-sheet">
      {lines.map((line, i) => line && (
        <div key={i} className="sheet-line">
          <span className="sheet-num">{i + 1}</span>
          {line.flatMap((e, j) => {
            const pos = e.beat - i * BEATS_PER_LINE;
            const prev = line[j - 1];
            const gap = pos - (prev ? prev.beat + prev.beats - i * BEATS_PER_LINE : 0);
            const mark = song.carnatic && ADI_MARKS.includes(pos);
            const chord = e.notes.length > 1;
            const name = chord ? e.label ?? e.notes.map(n => n.name).join('') : e.notes[0].name.replace('#', '♯');
            const hold = song.carnatic ? ' ,'.repeat(Math.max(0, Math.round(e.beats) - 1)) : '';
            return [
              gap > 0.01 && <span key={`r${j}`} className="sheet-note rest" style={{ flexGrow: gap }}><b>𝄽</b><small>rest</small></span>,
              <span key={j} className={'sheet-note' + (mark ? ' mark' : '')} style={{ flexGrow: e.beats }}>
                <b>{name}{hold}</b>
                <small>{chord ? e.notes.map(keyFor).join(' ') : keyFor(e.notes[0])}</small>
              </span>,
            ].filter(Boolean);
          })}
          {/* keep short last lines at their true width */}
          {(() => {
            const last = line.at(-1);
            const used = last.beat + last.beats - i * BEATS_PER_LINE;
            return used < BEATS_PER_LINE ? <span className="sheet-rest" style={{ flexGrow: BEATS_PER_LINE - used }} /> : null;
          })()}
        </div>
      ))}
    </div>
  );
}
