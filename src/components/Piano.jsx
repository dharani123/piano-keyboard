import { useLayoutEffect, useRef } from 'react';
import { LAYOUTS } from '../data/keymap.js';
import Key from './Key.jsx';

// shift: which layout the keyboard is in (0 normal, +2 low, -2 high; see keymap.js)
export default function Piano({ hideOutlines, shift = 0, pressed, targetCodes, demoCodes = [], wrongCode, onDown, onUp }) {
  const whiteRefs = useRef([]);
  const blackRefs = useRef({});
  const all = LAYOUTS[shift];
  const white = all.filter(k => k.type === 'white');
  const black = all.filter(k => k.type === 'black');

  // Centre each black key on the border between its two white keys
  useLayoutEffect(() => {
    function place() {
      for (const k of black) {
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
  }, [shift]);

  const keyProps = k => ({
    k,
    pressed: pressed.has(k.code) || demoCodes.includes(k.code),
    target: targetCodes.includes(k.code),
    wrong: wrongCode === k.code,
    onDown,
    onUp,
  });

  return (
    <div className={'piano' + (hideOutlines ? ' no-outlines' : '')}>
      {white.map((k, i) => <Key key={k.code} ref={el => (whiteRefs.current[i] = el)} {...keyProps(k)} />)}
      {black.map(k => <Key key={k.code} ref={el => (blackRefs.current[k.code] = el)} {...keyProps(k)} />)}
    </div>
  );
}
