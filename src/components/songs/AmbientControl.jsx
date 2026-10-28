import { useState } from 'react';
import { engine } from '../../audio/engine.js';
import { loadAmbientVolume, saveAmbientVolume } from '../../songs/ambient.js';

// Ambient music on/off plus its volume, which changes live while the pad plays
export default function AmbientControl({ on, onToggle }) {
  const [volume, setVolume] = useState(loadAmbientVolume);

  function change(v) {
    setVolume(v);
    saveAmbientVolume(v);
    engine.ambientVolume(v);
  }

  return (
    <div className="tanpura-control">
      <label className="unlock">
        <input type="checkbox" checked={on} onChange={e => onToggle(e.target.checked)} />
        Ambient music (soft chords in the raga)
      </label>
      <label className="unlock tanpura-volume">
        Volume
        <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e => change(Number(e.target.value))} />
        <span className="slider-val">{Math.round(volume * 100)}</span>
      </label>
    </div>
  );
}
