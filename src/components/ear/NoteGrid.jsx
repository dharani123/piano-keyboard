import { KEYS } from '../../data/keymap.js';
import { accuracy, level } from '../../ear/stats.js';

// Grid column (of 14 half-columns) for each key, laid out like one octave of a piano
const whiteCol = {};
KEYS.filter(k => k.type === 'white').forEach((k, i) => { whiteCol[k.semitone] = i * 2 + 1; });
const colFor = k => (k.type === 'white' ? whiteCol[k.semitone] : whiteCol[k.semitone - 1] + 1);

// One octave coloured by how well each note is known
export default function NoteGrid({ stats }) {
  return (
    <div className="note-grid">
      {KEYS.map(k => {
        const { rate, n } = accuracy(stats, k.semitone);
        return (
          <div
            key={k.code}
            className={`ng-key ${k.type} ${level(stats, k.semitone)}`}
            style={{ gridColumn: `${colFor(k)} / span 2`, gridRow: k.type === 'black' ? 1 : 2 }}
            title={n ? `${Math.round(rate * 100)}% of the last ${n}` : 'Not practised yet'}
          >
            <b>{k.note.replace('#', '♯')}</b>
            <small>{n ? `${Math.round(rate * 100)}%` : '–'}</small>
          </div>
        );
      })}
    </div>
  );
}
