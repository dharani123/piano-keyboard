import { useLayoutEffect, useRef } from 'react';
import { parsePitch, keySigSpots, beatsOf } from '../../sheet/notation.js';

// Draws real staff notation as SVG.
//
// <Staff clef="treble" keySig={4} time={[4, 4]} items={[...]} lower={[...]} />
//   keySig: +n sharps / -n flats. lower: bass-staff items → a grand staff.
// Items (left to right):
//   { n: 'E4' | ['G#4', 'B3'], d: 'w'|'h'|'q'|'e'|'s', dot, tie, beam: 's'|'m'|'e',
//     hl, label, art: 'stacc'|'accent'|'fermata', above: 'E/G♯', dyn: 'mf' }
//     (an accidental in the pitch, e.g. 'F#4' or 'Fn4', is drawn in front of the note)
//   { r: 'w'|'h'|'q'|'e'|'s', dot, hl, label, above, dyn }   rest
//   { bar: '|' | '||' | '|.' | '|:' | ':|' }                  bar line
//   { hairpin: '<' | '>', w }                                   crescendo / diminuendo
//   { gap: px }                                                 empty space
// hairpins={[{ from, to, type: '<' | '>' }]} draws a wedge under items `from`…`to`.
const S = 10; // distance between staff lines
const TOP = 46; // y of the top line of the upper staff
const GRAND_GAP = 4 * S + 46; // top line of the lower staff, relative to the upper one
const REF = { treble: parsePitch('E4').diatonic, bass: parsePitch('G2').diatonic }; // bottom line
const WIDTH = { w: 50, h: 40, q: 32, e: 26, s: 22 };
const GLYPH = { '#': '♯', b: '♭', n: '♮' };
const REST_GLYPH = { q: '\u{1D13D}', e: '\u{1D13E}', s: '\u{1D13F}' };
const MUSIC_FONT = 'NotoMusic, "Noto Music", serif';

function layout(items) {
  let x = 0;
  return items.map(item => {
    let w;
    if (item.bar) w = item.bar.length > 1 ? 20 : 16;
    else if (item.gap) w = item.gap;
    else if (item.hairpin) w = item.w ?? 60;
    else {
      w = WIDTH[item.d ?? item.r] + (item.dot ? 8 : 0);
      const heads = [].concat(item.n ?? []);
      if (heads.some(h => parsePitch(h).acc)) { x += 12; }
    }
    const at = item.hairpin || item.gap ? x : x + (item.bar ? 6 : 10);
    x += w;
    return { item, x: at, w };
  });
}

function StaffLines({ x1, x2, top }) {
  return Array.from({ length: 5 }, (_, i) => (
    <line key={i} x1={x1} x2={x2} y1={top + i * S} y2={top + i * S} className="st-line" />
  ));
}

function Clef({ clef, x, top }) {
  if (clef === 'bass') {
    return <text x={x} y={top + S * 1.0} className="st-glyph" style={{ fontSize: S * 3.6, fontFamily: MUSIC_FONT }} dominantBaseline="central">{'\u{1D122}'}</text>;
  }
  return <text x={x} y={top + S * 3} className="st-glyph" style={{ fontSize: S * 3.6, fontFamily: MUSIC_FONT }} dominantBaseline="central">{'\u{1D11E}'}</text>;
}

// Measured from Noto Music's ink (per 1 px of font size): where the visual
// centre sits above the baseline, so the sign lands on its line or space.
// A flat's centre is its round bowl, near the bottom of the glyph.
const ACC = { '#': { size: 2.8, lift: 0.175 }, n: { size: 3, lift: 0.095 }, b: { size: 3.4, lift: 0.14 } };

function Accidental({ acc, x, y }) {
  const { size, lift } = ACC[acc];
  const px = S * size;
  return (
    <text x={x} y={y + lift * px} className="st-glyph" style={{ fontSize: px, fontFamily: MUSIC_FONT }} textAnchor="middle">
      {GLYPH[acc]}
    </text>
  );
}

// One staff's worth of items, already laid out
function Voice({ placed, clef, top, ink, hairpins = [] }) {
  const bottom = top + 4 * S;
  const yOf = d => bottom - (d - REF[clef]) * (S / 2);
  const stepOf = d => d - REF[clef];
  const out = [];

  // beam groups: index → group info
  const groups = [];
  let open = null;
  placed.forEach((p, i) => {
    const b = p.item.beam;
    if (b === 's') open = [i];
    else if (b === 'm' && open) open.push(i);
    else if (b === 'e' && open) { open.push(i); groups.push(open); open = null; }
  });
  const groupOf = {};
  for (const g of groups) {
    const ds = g.flatMap(i => [].concat(placed[i].item.n).map(h => parsePitch(h).diatonic));
    const avg = ds.reduce((a, b) => a + b, 0) / ds.length;
    const up = stepOf(avg) < 4;
    const ys = ds.map(yOf);
    const beamY = up ? Math.min(...ys) - 3.5 * S : Math.max(...ys) + 3.5 * S;
    for (const i of g) groupOf[i] = { up, beamY, group: g };
    const x1 = placed[g[0]].x + (up ? 5.2 : -5.2);
    const x2 = placed[g.at(-1)].x + (up ? 5.2 : -5.2);
    out.push(<rect key={`beam${g[0]}`} x={x1 - 0.8} y={up ? beamY : beamY - 4.5} width={x2 - x1 + 1.6} height={4.5} fill={ink(false)} />);
    if (g.every(i => placed[i].item.d === 's')) {
      out.push(<rect key={`beam2${g[0]}`} x={x1 - 0.8} y={up ? beamY + 7 : beamY - 11.5} width={x2 - x1 + 1.6} height={4.5} fill={ink(false)} />);
    }
  }

  for (const [k, h] of hairpins.entries()) {
    const y = bottom + 24;
    const a = placed[h.from].x - 6;
    const b = placed[h.to].x + 6;
    const [point, open] = h.type === '<' ? [a, b] : [b, a];
    out.push(<polyline key={`hp${k}`} points={`${open},${y - 5} ${point},${y} ${open},${y + 5}`} fill="none" stroke={ink(false)} strokeWidth={1.2} />);
  }

  placed.forEach((p, i) => {
    const { item, x } = p;
    const color = ink(item.hl);
    if (item.bar) {
      const t = item.bar;
      const line = (dx, w = 1.3) => <rect key={`${i}b${dx}`} x={x + dx} y={top} width={w} height={4 * S} fill={ink(false)} />;
      const dots = dx => [1.5, 2.5].map(k => <circle key={`${i}d${dx}${k}`} cx={x + dx} cy={top + k * S} r={1.8} fill={ink(false)} />);
      if (t === '|') out.push(line(0));
      if (t === '||') out.push(line(-3), line(1));
      if (t === '|.') out.push(line(-4), line(0, 4));
      if (t === '|:') out.push(line(-4, 4), line(2), ...dots(7));
      if (t === ':|') out.push(...dots(-9), line(-4), line(0, 4));
      return;
    }
    if (item.hairpin) {
      // the wedge opens towards the louder end
      const y = bottom + 24;
      const [point, open] = item.hairpin === '<' ? [x + 4, x + p.w - 6] : [x + p.w - 6, x + 4];
      out.push(<polyline key={i} points={`${open},${y - 5} ${point},${y} ${open},${y + 5}`} fill="none" stroke={ink(false)} strokeWidth={1.2} />);
      return;
    }
    if (item.gap) return;

    if (item.above) out.push(<text key={`ab${i}`} x={x - 4} y={top - 2.4 * S} className="st-above">{item.above}</text>);
    if (item.dyn) out.push(<text key={`dy${i}`} x={x - 6} y={bottom + 26} className="st-dyn">{item.dyn}</text>);

    if (item.r) {
      const r = item.r;
      if (r === 'w') out.push(<rect key={i} x={x - 6} y={top + S} width={12} height={S / 2} fill={color} />);
      else if (r === 'h') out.push(<rect key={i} x={x - 6} y={top + 2 * S - S / 2} width={12} height={S / 2} fill={color} />);
      else out.push(<text key={i} x={x} y={top + 2 * S} className="st-glyph" fill={color} style={{ fontSize: S * 4, fontFamily: MUSIC_FONT }} textAnchor="middle" dominantBaseline="central">{REST_GLYPH[r]}</text>);
      if (item.dot) out.push(<circle key={`rd${i}`} cx={x + 10} cy={top + 1.5 * S} r={1.8} fill={color} />);
      if (item.label) out.push(<text key={`lb${i}`} x={x} y={bottom + 2.2 * S} className="st-label" fill={color}>{item.label}</text>);
      return;
    }

    // a note or chord
    const heads = [].concat(item.n).map(h => ({ ...parsePitch(h), raw: h }));
    const ys = heads.map(h => yOf(h.diatonic));
    const steps = heads.map(h => stepOf(h.diatonic));
    const g = groupOf[i];
    const avg = steps.reduce((a, b) => a + b, 0) / steps.length;
    const up = g ? g.up : avg < 4;
    const hollow = item.d === 'w' || item.d === 'h';

    // ledger lines
    const lowest = Math.min(...steps);
    const highest = Math.max(...steps);
    for (let s = -2; s >= lowest; s -= 2) out.push(<line key={`ll${i}${s}`} x1={x - 9} x2={x + 9} y1={bottom - s * S / 2} y2={bottom - s * S / 2} className="st-ledger" />);
    for (let s = 10; s <= highest; s += 2) out.push(<line key={`lh${i}${s}`} x1={x - 9} x2={x + 9} y1={bottom - s * S / 2} y2={bottom - s * S / 2} className="st-ledger" />);

    heads.forEach((h, k) => {
      const y = ys[k];
      if (h.acc) out.push(<Accidental key={`ac${i}${k}`} acc={h.acc} x={x - 15} y={y} />);
      if (item.d === 'w') {
        out.push(<ellipse key={`h${i}${k}`} cx={x} cy={y} rx={6.6} ry={4.3} fill="none" stroke={color} strokeWidth={2.4} />);
      } else {
        out.push(<ellipse key={`h${i}${k}`} cx={x} cy={y} rx={5.6} ry={4.1} transform={`rotate(-20 ${x} ${y})`}
          fill={hollow ? 'none' : color} stroke={color} strokeWidth={hollow ? 1.7 : 0.6} />);
      }
      if (item.dot) {
        const onLine = steps[k] % 2 === 0;
        out.push(<circle key={`dt${i}${k}`} cx={x + 11} cy={onLine ? y - S / 2 : y} r={1.8} fill={color} />);
      }
    });

    // stem, flags
    if (item.d !== 'w') {
      const sx = x + (up ? 5.2 : -5.2);
      const from = up ? Math.max(...ys) : Math.min(...ys);
      const tip = g ? g.beamY : up ? Math.min(...ys) - 3.5 * S : Math.max(...ys) + 3.5 * S;
      out.push(<line key={`st${i}`} x1={sx} x2={sx} y1={from} y2={tip} stroke={color} strokeWidth={1.3} />);
      if (!g && (item.d === 'e' || item.d === 's')) {
        const flags = item.d === 's' ? [0, 7] : [0];
        for (const f of flags) {
          const fy = up ? tip + f : tip - f;
          const dir = up ? 1 : -1;
          out.push(<path key={`fl${i}${f}`} d={`M ${sx} ${fy} C ${sx + 1} ${fy + 7 * dir}, ${sx + 10} ${fy + 9 * dir}, ${sx + 7} ${fy + 19 * dir}`}
            fill="none" stroke={color} strokeWidth={2} />);
        }
      }
    }

    // tie to the next note
    if (item.tie) {
      const next = placed.slice(i + 1).find(q => q.item.n);
      if (next) {
        const y = ys[0];
        const dir = up ? 1 : -1;
        const x1 = x + 5;
        const x2 = next.x - 5;
        out.push(<path key={`ti${i}`} d={`M ${x1} ${y + 6 * dir} Q ${(x1 + x2) / 2} ${y + 15 * dir} ${x2} ${y + 6 * dir}`} fill="none" stroke={color} strokeWidth={1.4} />);
      }
    }

    // articulation, on the side away from the stem
    if (item.art === 'stacc') out.push(<circle key={`ar${i}`} cx={x} cy={up ? Math.max(...ys) + 9 : Math.min(...ys) - 9} r={1.9} fill={color} />);
    if (item.art === 'accent') out.push(<text key={`ar${i}`} x={x} y={up ? Math.max(...ys) + 13 : Math.min(...ys) - 9} className="st-accent" fill={color} textAnchor="middle" dominantBaseline="central">{'>'}</text>);
    if (item.art === 'fermata') out.push(<text key={`ar${i}`} x={x} y={Math.min(top - 10, Math.min(...ys) - 3.5 * S - 8)} className="st-glyph" fill={color} style={{ fontSize: S * 2.6, fontFamily: MUSIC_FONT }} textAnchor="middle" dominantBaseline="central">{'\u{1D110}'}</text>);

    if (item.label) {
      const ly = Math.max(bottom + 2.2 * S, Math.max(...ys) + (up || item.d === 'w' ? 2.2 : 4.5) * S);
      out.push(<text key={`lb${i}`} x={x} y={ly} className="st-label" fill={color}>{item.label}</text>);
    }
  });
  return out;
}

// scale: screen pixels per staff unit (1.45 in lesson notes, bigger in exercises)
// The x position of a moment in the music (in beats from the start), sliding evenly
// from one note or rest to the next; used for the playhead line in timed exercises
function beatToX(placed, beat, end) {
  const anchors = [];
  let b = 0;
  for (const p of placed) {
    const it = p.item;
    if (it.bar || it.gap || it.hairpin || !(it.d || it.r)) continue;
    anchors.push([b, p.x - 8]);
    b += beatsOf(it);
  }
  anchors.push([b, end]);
  if (beat <= 0) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    const [b1, x1] = anchors[i];
    const [b0, x0] = anchors[i - 1];
    if (beat <= b1) return x0 + (x1 - x0) * ((beat - b0) / (b1 - b0 || 1));
  }
  return end;
}

// playhead: beats from the start for a moving line across the staff (null = none)
export default function Staff({ clef = 'treble', keySig = 0, time = null, items = [], lower = null, hairpins, caption, scale = 1.45, playhead = null }) {
  const svgRef = useRef(null);
  const drawnRef = useRef(null);
  const grand = Boolean(lower);
  const clefW = 34;
  const keyW = keySig ? Math.abs(keySig) * 11 + 6 : 0;
  const timeW = time ? 24 : 0;
  const x0 = (grand ? 16 : 6) + clefW + keyW + timeW + 4;
  const upper = layout(items).map(p => ({ ...p, x: p.x + x0 }));
  const lowerPlaced = grand ? layout(lower).map(p => ({ ...p, x: p.x + x0 })) : [];
  const end = Math.max(...[...upper, ...lowerPlaced].map(p => p.x + p.w - (p.item.bar ? 6 : 10)), x0 + 30);
  const width = end + 6;
  const tops = grand ? [TOP, TOP + GRAND_GAP] : [TOP];
  const height = tops.at(-1) + 4 * S + 46;
  const ink = hl => (hl ? 'var(--accent)' : 'var(--text)');
  const left = grand ? 16 : 6;

  const head = (c, top) => (
    <g key={`head${top}`}>
      <StaffLines x1={left} x2={end} top={top} />
      <Clef clef={c} x={left + 3} top={top} />
      {keySigSpots(keySig, c).map((d, k) => (
        <Accidental key={k} acc={keySig > 0 ? '#' : 'b'} x={left + clefW + 8 + k * 11} y={top + 4 * S - (d - REF[c]) * (S / 2)} />
      ))}
      {time && [time[0], time[1]].map((t, k) => (
        <text key={k} x={left + clefW + keyW + 11} y={top + S + k * 2 * S} className="st-time" textAnchor="middle" dominantBaseline="central">{t}</text>
      ))}
    </g>
  );

  // Trim the empty space above and below to what was actually drawn
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const box = drawnRef.current?.getBBox();
    if (!svg || !box || !box.height) return;
    const y = Math.floor(box.y) - 4;
    const h = Math.ceil(box.height) + 8;
    svg.setAttribute('viewBox', `0 ${y} ${width} ${h}`);
    svg.style.width = `${width * scale}px`;
  });

  return (
    <figure className="staff-figure">
      <svg ref={svgRef} className="staff" viewBox={`0 0 ${width} ${height}`} style={{ width: width * scale }} role="img" aria-label={caption ?? 'Music staff'}>
        <g ref={drawnRef}>
        {head(grand ? 'treble' : clef, TOP)}
        {grand && head('bass', TOP + GRAND_GAP)}
        {grand && (
          <>
            <rect x={left} y={TOP} width={1.3} height={GRAND_GAP + 4 * S} fill="var(--text)" />
            <path d={`M ${left - 3} ${TOP} C ${left - 13} ${TOP + 12}, ${left - 3} ${TOP + GRAND_GAP / 2 - 6}, ${left - 12} ${TOP + (GRAND_GAP + 4 * S) / 2}
              C ${left - 3} ${TOP + GRAND_GAP / 2 + 4 * S + 6}, ${left - 13} ${TOP + GRAND_GAP + 4 * S - 12}, ${left - 3} ${TOP + GRAND_GAP + 4 * S}`}
              fill="none" stroke="var(--text)" strokeWidth={2.2} />
          </>
        )}
        <Voice placed={upper} clef={grand ? 'treble' : clef} top={TOP} ink={ink} hairpins={hairpins} />
        {grand && <Voice placed={lowerPlaced} clef="bass" top={TOP + GRAND_GAP} ink={ink} />}
        </g>
        {playhead !== null && (
          <rect
            className="st-playhead"
            x={beatToX(upper, playhead, end) - 1.2}
            y={TOP - 1.5 * S}
            width={2.4}
            height={tops.at(-1) - TOP + 7 * S}
            rx={1.2}
          />
        )}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
