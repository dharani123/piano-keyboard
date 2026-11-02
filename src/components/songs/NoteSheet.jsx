import { keyAt } from '../../data/keymap.js';


// Every note of a song in order, so it can be read before playing: 8 beats per
// line, or one talam cycle for Carnatic, with its angas marked.
// A note's width follows its length; Carnatic karvai shows as "," after the swara.
// Lines are a grid of 1/UNITS-beat columns, so every line lines up exactly with
// the beat ruler on top (1 2 3 … with a dot on each "and").
const UNITS = 8;
const span = (from, beats) => ({ gridColumn: `${2 + Math.round(from * UNITS)} / span ${Math.max(1, Math.round(beats * UNITS))}` });

export default function NoteSheet({ song }) {
  const perLine = song.talam?.beats ?? 8;
  const columns = { gridTemplateColumns: `22px repeat(${perLine * UNITS}, minmax(0, 1fr))` };
  const marks = song.talam?.marks ?? [];
  const keyFor = n => keyAt(n.semitone, n.oct, song.layout ?? 0)?.key ?? '';
  const lines = [];
  for (const e of song.events) {
    const i = Math.floor(e.beat / perLine + 1e-9);
    (lines[i] ??= []).push(e);
  }

  return (
    <div className="note-sheet">
      <div className="sheet-line sheet-ruler" style={columns} aria-hidden="true">
        {Array.from({ length: perLine }, (_, b) => [
          <span key={b} className="beat" style={span(b, 0.5)}>{b + 1}</span>,
          <span key={`and${b}`} className="and" style={span(b + 0.5, 0.5)}>·</span>,
        ])}
      </div>
      {lines.map((line, i) => line && (
        <div key={i} className="sheet-line" style={columns}>
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
              gap > 0.01 && <span key={`r${j}`} className="sheet-note rest" style={span(pos - gap, gap)}><b>𝄽</b><small>rest</small></span>,
              <span key={j} className={'sheet-note' + (mark ? ' mark' : '')} style={span(pos, e.beats)}>
                <b>{name}{hold}</b>
                <small>{chord ? e.notes.map(keyFor).join(' ') : keyFor(e.notes[0])}</small>
              </span>,
            ].filter(Boolean);
          })}
        </div>
      ))}
    </div>
  );
}
