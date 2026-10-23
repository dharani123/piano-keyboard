import { useLayoutEffect, useRef } from 'react';
import { KEYS, HIGH_KEYS } from '../data/keymap.js';
import Key from './Key.jsx';

const ALL = [...KEYS, ...HIGH_KEYS];
const WHITE = ALL.filter(k => k.type === 'white');
const BLACK = ALL.filter(k => k.type === 'black');

export default function Piano({ hideOutlines, pressed, targetCodes, wrongCode, onDown, onUp }) {
  const whiteRefs = useRef([]);
  const blackRefs = useRef({});

  // Centre each black key on the border between its two white keys
  useLayoutEffect(() => {
    function place() {
      for (const k of BLACK) {
        const left = whiteRefs.current[k.after];
        const right = whiteRefs.current[k.after + 1];
        const el = blackRefs.current[k.code];
        const border = (left.offsetLeft + left.offsetWidth + right.offsetLeft) / 2;
        el.style.left = border - el.offsetWidth / 2 + 'px';
      }
    }
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  const keyProps = k => ({
    k,
    pressed: pressed.has(k.code),
    target: targetCodes.includes(k.code),
    wrong: wrongCode === k.code,
    onDown,
    onUp,
  });

  return (
    <div className={'piano' + (hideOutlines ? ' no-outlines' : '')}>
      {WHITE.map((k, i) => <Key key={k.code} ref={el => (whiteRefs.current[i] = el)} {...keyProps(k)} />)}
      {BLACK.map(k => <Key key={k.code} ref={el => (blackRefs.current[k.code] = el)} {...keyProps(k)} />)}
    </div>
  );
}
