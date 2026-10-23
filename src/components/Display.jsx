import { INSTRUMENTS } from '../audio/instruments.js';

const signed = n => (n > 0 ? `+${n}` : String(n));

export default function Display({ voiceIndex, lastNote, octave, transpose, sustain, message }) {
  return (
    <div className="lcd">
      <div className="lcd-row">
        <span className="lcd-voice">
          {String(voiceIndex + 1).padStart(2, '0')} {INSTRUMENTS[voiceIndex].name.toUpperCase()}
        </span>
        <span className={'lcd-flag' + (sustain ? ' on' : '')}>SUS</span>
      </div>
      <div className="lcd-row lcd-big">
        <span className="lcd-note">{lastNote ?? '--'}</span>
        <span className="lcd-small">
          OCT {octave} &nbsp; TRN {signed(transpose)}
        </span>
      </div>
      <div className="lcd-row lcd-message">{message || ' '}</div>
    </div>
  );
}
