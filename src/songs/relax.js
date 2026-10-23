// Relax mode: every Carnatic exercise in the traditional order, cut into
// 8-beat lines (one Adi talam cycle) that are heard, then played, one by one.

export const LINE_BEATS = 8;

// songs = carnaticSongs(raga), already in order
export function journeyLines(songs) {
  return songs.flatMap((song, exercise) => {
    const count = Math.ceil(song.totalBeats / LINE_BEATS);
    return Array.from({ length: count }, (_, line) => {
      const from = line * LINE_BEATS;
      const events = song.events
        .filter(e => e.beat >= from && e.beat < from + LINE_BEATS)
        .map(e => ({ ...e, beat: e.beat - from }));
      return { exercise, line, lines: count, title: song.title, events, totalBeats: LINE_BEATS };
    });
  });
}

// Play-along: the rest of the current exercise as one continuous run.
// With listenFirst each line takes 16 beats, the app playing it (beats 0–8)
// and you echoing it (8–16); without, the lines simply follow each other.
// Returns the song you play plus, per line, where its listen and play parts start.
export function playAlongPlan(lines, pos, listenFirst) {
  const { exercise } = lines[pos];
  const segments = [];
  const events = [];
  let beat = 0;
  for (let p = pos; p < lines.length && lines[p].exercise === exercise; p++) {
    const listenAt = listenFirst ? beat : null;
    const playAt = listenFirst ? beat + LINE_BEATS : beat;
    segments.push({ pos: p, listenAt, playAt });
    for (const e of lines[p].events) events.push({ ...e, beat: e.beat + playAt });
    beat = playAt + LINE_BEATS;
  }
  return { segments, song: { events, totalBeats: beat } };
}

// Which segment a beat falls in, and whether it is the listening or playing part
export function segmentAt(segments, beat) {
  let seg = segments[0];
  for (const s of segments) if (beat >= (s.listenAt ?? s.playAt)) seg = s;
  return { seg, listening: seg.listenAt !== null && beat < seg.playAt };
}

// Where the user left off lives in this browser only
const KEY = 'desk-piano-relax';
export function loadRelaxPos() {
  try { return Number(JSON.parse(localStorage.getItem(KEY))?.pos) || 0; } catch { return 0; }
}
export function saveRelaxPos(pos) {
  try { localStorage.setItem(KEY, JSON.stringify({ pos })); } catch { /* storage unavailable */ }
}
