import { useEffect } from 'react';
import { LAYOUTS } from '../data/keymap.js';

const TITLE = '✳ billing-api';

const CELL_CH = 6; // width of one white key, in characters
const INSET_CH = 1;

// The piano as text: sharps on the line above, each between its two white keys
function NoteRows({ shift, pressed }) {
  const all = LAYOUTS[shift];
  const white = all.filter(k => k.type === 'white');
  const black = all.filter(k => k.type === 'black');
  const note = (k, at, row) => (
    <span
      key={k.code}
      className={`camo-note camo-${row}${pressed.has(k.code) ? ' on' : ''}`}
      style={{ left: `${at * CELL_CH + INSET_CH}ch` }}
    >
      {k.note.replace('#', '♯')}
    </span>
  );
  return (
    <span className="camo-notes" style={{ width: `${white.length * CELL_CH}ch` }}>
      {black.map(k => note(k, k.after + 0.5, 'upper'))}
      {white.map((k, i) => note(k, i, 'lower'))}
    </span>
  );
}

const P = () => (
  <>
    <span className="camo-user">dev@workstation</span>:<span className="camo-path">~/projects/billing-api</span>${' '}
  </>
);

// Office cover: a fake terminal over the whole page. Nothing in it works except the ×.
// The app stays mounted underneath and keys are heard on the document, so the piano,
// a running lesson and the sound all carry on.
export default function Camouflage({ shift, pressed, onClose }) {
  useEffect(() => {
    const before = document.title; // the browser tab would give the game away
    document.title = TITLE;
    // the page's scrollbar would show at the window edge; losing it changes the page
    // width, and falling-note lanes re-measure on resize
    const root = document.documentElement;
    root.classList.add('camo-on');
    window.dispatchEvent(new Event('resize'));
    return () => {
      document.title = before;
      root.classList.remove('camo-on');
      window.dispatchEvent(new Event('resize'));
    };
  }, []);

  return (
    <div className="camo">
      <div className="camo-bar">
        <span className="camo-side">
          <span className="camo-tool">+</span>
        </span>
        <span className="camo-title">{TITLE}</span>
        <span className="camo-side camo-right">
          <span className="camo-tool">⌕</span>
          <span className="camo-tool">≡</span>
          <span className="camo-win">–</span>
          <span className="camo-win">▫</span>
          <button type="button" className="camo-win camo-close" onClick={onClose} aria-label="Close camouflage">×</button>
        </span>
      </div>
      <pre className="camo-body">
        <P />git status{'\n'}
        On branch feature/invoice-retry{'\n'}
        Your branch is up to date with 'origin/feature/invoice-retry'.{'\n'}
        {'\n'}
        Changes not staged for commit:{'\n'}
        {'  '}<span className="camo-red">modified:   src/services/invoiceRetry.ts</span>{'\n'}
        {'  '}<span className="camo-red">modified:   src/services/invoiceRetry.test.ts</span>{'\n'}
        {'\n'}
        <P />npm test -- invoiceRetry{'\n'}
        {'\n'}
        {'> '}billing-api@2.14.3 test{'\n'}
        {'> '}jest invoiceRetry{'\n'}
        {'\n'}
        <span className="camo-green">PASS</span> src/services/invoiceRetry.test.ts{'\n'}
        {'  '}invoiceRetry{'\n'}
        {'    '}<span className="camo-green">✓</span> retries a failed charge with backoff (41 ms){'\n'}
        {'    '}<span className="camo-green">✓</span> stops after the fifth attempt (12 ms){'\n'}
        {'    '}<span className="camo-green">✓</span> marks the invoice as past due (9 ms){'\n'}
        {'    '}<span className="camo-green">✓</span> skips invoices already paid (6 ms){'\n'}
        {'\n'}
        Tests:       <span className="camo-green">4 passed</span>, 4 total{'\n'}
        Time:        1.284 s{'\n'}
        {'\n'}
        <P />./queue-status --watch{'\n'}
        <NoteRows shift={shift} pressed={pressed} />
        <P /><span className="camo-cursor" />
      </pre>
    </div>
  );
}
