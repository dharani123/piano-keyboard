import { KEYS } from '../../data/keymap.js';
import { noteColourVars } from '../../data/colours.js';

const W = 34;
const H = 104;
const BW = 22;
const BH = 64;

// One-octave diagram of a real piano with some notes marked
export default function MiniKeys({ mark = [], labels = {} }) {
  const whites = KEYS.filter(k => k.type === 'white');
  const blacks = KEYS.filter(k => k.type === 'black');
  const isMarked = k => mark.includes(k.note);
  const label = k => labels[k.note] ?? (isMarked(k) ? k.note.replace('#', '♯') : null);

  return (
    <svg className="minikeys" viewBox={`0 0 ${W * 7 + 2} ${H + 2}`} role="img" aria-label={`Keyboard with ${mark.join(', ')} marked`}>
      {whites.map((k, i) => (
        <g key={k.code}>
          <rect style={noteColourVars(k.semitone)} x={1 + i * W} y={1} width={W - 2} height={H} rx={3} className={'mk-white' + (isMarked(k) ? ' marked' : '')} />
          {label(k) && <text x={1 + i * W + (W - 2) / 2} y={H - 8} className="mk-label">{label(k)}</text>}
        </g>
      ))}
      {blacks.map(k => {
        const x = 1 + (k.after + 1) * W - BW / 2 - 1;
        const text = label(k);
        return (
          <g key={k.code}>
            <rect style={noteColourVars(k.semitone)} x={x} y={1} width={BW} height={BH} rx={2} className={'mk-black' + (isMarked(k) ? ' marked' : '')} />
            {text && text.split(' ').map((t, j, all) => (
              <text key={j} x={x + BW / 2} y={BH - 6 - (all.length - 1 - j) * 11} className="mk-label mk-label-black">{t}</text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
