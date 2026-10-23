import { RAGAS } from '../../songs/carnatic.js';

// The 72 melakartas in order, grouped by chakra (six ragas each); a dot marks the beginner ones
const CHAKRAS = ['Indu', 'Netra', 'Agni', 'Veda', 'Bana', 'Rutu', 'Rishi', 'Vasu', 'Brahma', 'Disi', 'Rudra', 'Aditya'];
const ALL = Object.entries(RAGAS);

export default function RagaSelect({ raga, disabled, onPick }) {
  return (
    <select className="raga-pick" value={raga} disabled={disabled} onChange={e => onPick(e.target.value)}>
      {CHAKRAS.map((chakra, c) => (
        <optgroup key={chakra} label={`${chakra} chakra`}>
          {ALL.slice(c * 6, c * 6 + 6).map(([id, r]) => (
            <option key={id} value={id}>
              {r.basic ? '● ' : ''}{r.number} · {r.name}{r.fullName !== r.name ? ` (${r.fullName})` : ''}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
