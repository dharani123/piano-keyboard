import { INSTRUMENTS } from '../audio/instruments.js';

// playSlotRef: a spot under the voices where the open song puts a second Start/Stop button
export default function VoicePanel({ voiceIndex, onSelect, playSlotRef }) {
  return (
    <div className="panel voice-panel">
      <div className="panel-title">Voice <kbd>Shift</kbd>+<kbd>1</kbd>–<kbd>0</kbd></div>
      {/* voice rows sized to fit; the last row (spare Start/Stop) takes the rest of the panel's height */}
      <div className="voices" style={{ gridTemplateRows: `repeat(${Math.ceil(INSTRUMENTS.length / 2)}, auto) 1fr` }}>
        {INSTRUMENTS.map((inst, i) => (
          <button
            key={inst.id}
            className={'voice-btn' + (i === voiceIndex ? ' active' : '')}
            onClick={() => onSelect(i)}
          >
            <span className="led" />
            <span className="voice-num">{(i + 1) % 10}</span>
            {inst.name}
          </button>
        ))}
        <div className="play-slot" ref={playSlotRef} />
      </div>
    </div>
  );
}
