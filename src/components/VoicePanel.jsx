import { INSTRUMENTS } from '../audio/instruments.js';

export default function VoicePanel({ voiceIndex, onSelect }) {
  return (
    <div className="panel">
      <div className="panel-title">Voice <kbd>Shift</kbd>+<kbd>1</kbd>–<kbd>7</kbd></div>
      <div className="voices">
        {INSTRUMENTS.map((inst, i) => (
          <button
            key={inst.id}
            className={'voice-btn' + (i === voiceIndex ? ' active' : '')}
            onClick={() => onSelect(i)}
          >
            <span className="led" />
            <span className="voice-num">{i + 1}</span>
            {inst.name}
          </button>
        ))}
      </div>
    </div>
  );
}
