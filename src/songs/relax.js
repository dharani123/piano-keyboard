// Relax mode: every Carnatic exercise in the traditional order, cut into
// lines of one talam cycle (8 beats for Adi) that are heard, then played, one by one.

export const LINE_BEATS = 8;

// songs = carnaticSongs(raga), already in order
export function journeyLines(songs) {
  return songs.flatMap((song, exercise) => {
    const beats = song.talam?.beats ?? LINE_BEATS;
    const count = Math.ceil(song.totalBeats / beats);
    return Array.from({ length: count }, (_, line) => {
      const from = line * beats;
      const events = song.events
        .filter(e => e.beat >= from && e.beat < from + beats)
        .map(e => ({ ...e, beat: e.beat - from }));
      return { exercise, line, lines: count, id: song.id, title: song.title, events, totalBeats: beats, talam: song.talam, sa: song.sa ?? 0, layout: song.layout ?? 0 };
    });
  });
}

// Play-along: the rest of the current exercise as one continuous run.
// With listenFirst each line takes two talam cycles, the app playing it and
// you echoing it; without, the lines simply follow each other.
// Returns the song you play plus, per line, where its listen and play parts start.
export function playAlongPlan(lines, pos, listenFirst) {
  const { exercise } = lines[pos];
  const segments = [];
  const events = [];
  let beat = 0;
  for (let p = pos; p < lines.length && lines[p].exercise === exercise; p++) {
    const len = lines[p].totalBeats;
    const listenAt = listenFirst ? beat : null;
    const playAt = listenFirst ? beat + len : beat;
    segments.push({ pos: p, listenAt, playAt });
    for (const e of lines[p].events) events.push({ ...e, beat: e.beat + playAt });
    beat = playAt + len;
  }
  return { segments, song: { events, totalBeats: beat } };
}

// Every note the app itself plays in a play-along plan, in time order: each
// line during its listening part.
// The player schedules these a moment ahead, never all at once (hundreds of
// audio nodes waiting at once overload the browser's audio and silence it).
export function appNotes(lines, plan) {
  const notes = [];
  for (const seg of plan.segments) {
    const at = seg.listenAt;
    if (at === null) continue;
    for (const e of lines[seg.pos].events) {
      for (const n of e.notes) notes.push({ beat: at + e.beat, beats: e.beats, semitone: n.semitone, oct: n.oct, name: n.name });
    }
  }
  return notes.sort((a, b) => a.beat - b.beat);
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
