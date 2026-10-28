import { useEffect, useState } from 'react';
import { RAGAS } from '../../songs/carnatic.js';

// The 72 melakartas as a left nav: two halves (Ma1 / Ma2), each with six
// chakras of six ragas that open like an accordion. A dot marks the beginner ones.
const CHAKRAS = ['Indu', 'Netra', 'Agni', 'Veda', 'Bana', 'Rutu', 'Rishi', 'Vasu', 'Brahma', 'Disi', 'Rudra', 'Aditya'];
const ALL = Object.entries(RAGAS);
const chakraOf = raga => Math.floor((RAGAS[raga].number - 1) / 6);

export default function RagaNav({ raga, disabled, onPick }) {
  const [open, setOpen] = useState(() => chakraOf(raga));
  useEffect(() => setOpen(chakraOf(raga)), [raga]);

  return (
    <nav className="raga-nav">
      {['Shuddha Madhyama · Ma', 'Prati Madhyama · Ma2'].map((half, h) => (
        <div key={half}>
          <div className="unit-title sub">{half}</div>
          {CHAKRAS.slice(h * 6, h * 6 + 6).map((chakra, i) => {
            const c = h * 6 + i;
            const isOpen = open === c;
            return (
              <div key={chakra} className={'chakra' + (isOpen ? ' open' : '') + (chakraOf(raga) === c ? ' current' : '')}>
                <button className="chakra-head" onClick={() => setOpen(isOpen ? null : c)}>
                  <span className="chakra-arrow">{isOpen ? '▾' : '▸'}</span>
                  {chakra}
                  <span className="chakra-range">{c * 6 + 1}–{c * 6 + 6}</span>
                </button>
                {isOpen && ALL.slice(c * 6, c * 6 + 6).map(([id, r]) => (
                  <button
                    key={id}
                    className={'lesson-link raga-link' + (id === raga ? ' active' : '')}
                    disabled={disabled}
                    title={r.fullName}
                    onClick={() => onPick(id)}
                  >
                    <span className="lesson-link-num">{r.number}</span>
                    <span className="lesson-link-title">{r.name}</span>
                    {r.basic && <span className="raga-basic">●</span>}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
