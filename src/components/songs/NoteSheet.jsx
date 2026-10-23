import { keyAt } from '../../data/keymap.js';


// Every note of a song in order, so it can be read before playing: 8 beats per
// line, or one talam cycle for Carnatic, with its angas marked.
// A note's width follows its length; Carnatic karvai shows as "," after the swara.
export default function NoteSheet({ song }) {
  const perLine = song.talam?.beats ?? 8;
  const marks = song.talam?.marks ?? [];
  const keyFor = n => keyAt(n.semitone, n.oct, song.layout ?? 0)?.key ?? '';
  const lines = [];
  for (const e of song.events) {
    const i = Math.floor(e.beat / perLine + 1e-9);
    (lines[i] ??= []).push(e);
  }

  return (
    <div className="note-sheet">
      {lines.map((line, i) => line && (
        <div key={i} className="sheet-line">
          <span className="sheet-num">{i + 1}</span>
          {line.flatMap((e, j) => {
            const pos = e.beat - i * perLine;
            const prev = line[j - 1];
            const gap = pos - (prev ? prev.beat + prev.beats - i * perLine : 0);
            const mark = marks.includes(pos);
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
            const used = last.beat + last.beats - i * perLine;
            return used < perLine ? <span className="sheet-rest" style={{ flexGrow: perLine - used }} /> : null;
          })()}
        </div>
      ))}
    </div>
  );
}
