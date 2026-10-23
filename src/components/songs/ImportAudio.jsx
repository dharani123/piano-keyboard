import { useState } from 'react';
import { songFromAudio } from '../../songs/importAudio.js';
import { makeMySong } from '../../songs/mySongs.js';

// Pick an audio file, choose which part, and turn it into a falling-notes song
export default function ImportAudio({ disabled, onImported }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(0);
  const [length, setLength] = useState(60);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const busy = progress !== null;

  function pick(f) {
    setFile(f);
    setError(null);
    if (f) setTitle(f.name.replace(/\.[^.]+$/, ''));
  }

  async function run() {
    setError(null);
    setProgress(0);
    try {
      const song = await songFromAudio(file, { startSeconds: start, lengthSeconds: length, onProgress: setProgress });
      if (!song.events.length) throw new Error('No notes found in that part of the file');
      onImported(makeMySong(title.trim() || file.name, song));
      setFile(null);
    } catch (e) {
      setError(e.message || 'Could not read that file');
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="import">
      <div className="unit-title">Import from audio</div>
      <input type="file" accept="audio/*" disabled={disabled || busy} onChange={e => pick(e.target.files[0] ?? null)} />
      {file && (
        <>
          <label>Name <input value={title} disabled={busy} onChange={e => setTitle(e.target.value)} /></label>
          <div className="import-range">
            <label>From <input type="number" min="0" value={start} disabled={busy} onChange={e => setStart(Number(e.target.value))} /> s</label>
            <label>Length <input type="number" min="5" max="300" value={length} disabled={busy} onChange={e => setLength(Number(e.target.value))} /> s</label>
          </div>
          {busy
            ? <div className="progress"><div className="progress-bar" style={{ width: `${progress * 100}%` }} /></div>
            : <button className="primary" disabled={disabled} onClick={run}>Find the notes</button>}
          {busy && <div className="song-note">Listening… {Math.round(progress * 100)}%</div>}
        </>
      )}
      {error && <div className="song-note import-error">{error}</div>}
      <div className="song-note">Works best on solo piano or one instrument. Keeps the top line only.</div>
    </div>
  );
}
