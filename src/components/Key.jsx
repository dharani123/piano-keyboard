import { forwardRef } from 'react';

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
      onPointerDown={e => { e.preventDefault(); onDown(k.code); }}
      onPointerUp={() => onUp(k.code)}
      onPointerLeave={() => onUp(k.code)}
    >
      <span className="note-name">{k.note.replace('#', '♯')}</span>
    </div>
  );
});

export default Key;
