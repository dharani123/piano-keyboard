import { keyAt } from '../../data/keymap.js';
import { RAGAS, swaraName } from '../../songs/carnatic.js';
import { starsFor } from '../../songs/best.js';

// Pieces shared by Relax and Practice, so switching mode keeps the same layout

// Carnatic speeds: 1.25 and 1.5 are stepping stones to 2nd speed (two swaras per beat)
export const CARNATIC_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
export const speedLabel = (v, carnatic) => (carnatic && v === 1 ? '1st speed' : carnatic && (v === 1.25 || v === 1.5) ? `${v} speed` : carnatic && v === 2 ? '2nd speed' : `${Math.round(v * 100)}%`);

const BLACK_SEMITONES = [1, 3, 6, 8, 10];
const SWARA_KEYS = ['S', 'R', 'G', 'M', 'P', 'D', 'N'];

// The song list on the left, grouped by level. `head` sits above the first
// level (the raga picker); a level with no songs shows only if it has a note.
export function SongList({ levels, songs, activeId, disabled, isLocked = () => false, best, mode, onPick, head, notes = {}, children }) {
  return (
    <aside className="song-list">
      {levels.filter(level => notes[level] || songs.some(s => s.level === level)).map((level, i) => (
        <div key={level} className="unit">
          {i === 0 && head}
          <div className={'unit-title' + (head ? ' sub' : '')}>{level}</div>
          {notes[level] && !songs.some(s => s.level === level) && <div className="song-note">{notes[level]}</div>}
          {songs.filter(s => s.level === level).map(s => (
            <button
              key={s.id}
              className={'lesson-link' + (s.id === activeId ? ' active' : '')}
              disabled={disabled || isLocked(s)}
              onClick={() => onPick(s)}
            >
              <span className="lesson-link-title">{s.title}</span>
              <span className="lesson-link-stars">
                {isLocked(s) ? '🔒' : '★'.repeat(starsFor(best, s.id, mode))}
              </span>
            </button>
          ))}
        </div>
      ))}
      {children}
    </aside>
  );
}

// Title, swara-to-key map and how the exercise is laid out
export function CarnaticInfo({ song, raga, layout }) {
  return (
    <>
      <div className="lesson-num">
        Carnatic · {RAGAS[raga].name} · {song.talam.name} talam · {song.bpm} BPM
      </div>
      <h2>{song.title}</h2>
      <div className="swara-map">
        {[...SWARA_KEYS.map(sw => RAGAS[raga].semitones[sw]), 12].map(semis => [swaraName(semis), song.sa + semis]).map(([name, pitch]) => {
          const semi = ((pitch % 12) + 12) % 12;
          const rel = Math.floor(pitch / 12);
          const k = keyAt(semi, rel, layout);
          return (
            <span key={name} className={BLACK_SEMITONES.includes(semi) ? 'sharp' : ''}>
              <b>{name}</b>{rel > 0 ? 'high ' : rel < 0 ? 'low ' : ''}{k.note.replace('#', '♯')}<kbd>{k.key}</kbd>
            </span>
          );
        })}
      </div>
      <p className="song-note">
        One swara per beat, {song.talam.beats} beats to a line (one round of {song.talam.name} talam).
        Longer bars are a karvai: hold the swara.
      </p>
      {song.sa !== 0 && (
        <p className="song-note">
          Sa sits on {keyAt(((song.sa % 12) + 12) % 12, Math.floor(song.sa / 12), layout).note.replace('#', '♯')} for this
          exercise (a different sruti), so every swara it needs is on your keyboard.
        </p>
      )}
      {layout !== 0 && (
        <p className="song-note">
          {layout > 0
            ? <>The keys slide two places right for this exercise, so the low swaras (dot below) fit: <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> = low G A B, middle C is on <kbd>F</kbd>.</>
            : <>The keys slide two places left for this exercise, so the high swaras fit: <kbd>A</kbd> = D, up to high A on <kbd>Enter</kbd>.</>}
          {' '}The piano below shows the new keys; it goes back to normal afterwards.
        </p>
      )}
    </>
  );
}
