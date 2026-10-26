import { useState } from 'react';
import { engine } from '../../audio/engine.js';
import { loadTanpuraVolume, saveTanpuraVolume } from '../../songs/tanpura.js';

// Tanpura on/off plus its volume, which changes live while the drone plays
export default function TanpuraControl({ on, onToggle }) {
  const [volume, setVolume] = useState(loadTanpuraVolume);

  function change(v) {
    setVolume(v);
    saveTanpuraVolume(v);
    engine.droneVolume(v);
  }

  return (
    <div className="tanpura-control">
      <label className="unlock">
        <input type="checkbox" checked={on} onChange={e => onToggle(e.target.checked)} />
        Tanpura drone (Sa–Pa)
      </label>
      <label className="unlock tanpura-volume">
        Volume
        <input type="range" min="0" max="1" step="0.05" value={volume} onChange={e => change(Number(e.target.value))} />
        <span className="slider-val">{Math.round(volume * 100)}</span>
      </label>
    </div>
  );
}
