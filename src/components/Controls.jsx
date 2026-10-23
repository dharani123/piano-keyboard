function Slider({ label, value, onChange }) {
  return (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min="0" max="1" step="0.01" value={value} onChange={e => onChange(Number(e.target.value))} />
      <span className="slider-val">{Math.round(value * 100)}</span>
    </label>
  );
}

function Stepper({ label, hint, value, display, onStep }) {
  return (
    <div className="stepper">
      <span>{label} {hint}</span>
      <div className="stepper-row">
        <button onClick={() => onStep(-1)}>−</button>
        <span className="stepper-val">{display ?? value}</span>
        <button onClick={() => onStep(1)}>+</button>
      </div>
    </div>
  );
}

export default function Controls({ effects, onEffect, octave, onOctave, transpose, onTranspose, pedalLatched, sustainOn, onPedal }) {
  return (
    <div className="panel controls">
      <div className="panel-title">Effects</div>
      <Slider label="Volume" value={effects.volume} onChange={v => onEffect('volume', v)} />
      <Slider label="Reverb" value={effects.reverb} onChange={v => onEffect('reverb', v)} />
      <Slider label="Chorus" value={effects.chorus} onChange={v => onEffect('chorus', v)} />
      <div className="steppers">
        <Stepper label="Octave" hint={<><kbd>Z</kbd><kbd>X</kbd></>} value={octave} onStep={onOctave} />
        <Stepper
          label="Transpose"
          hint={<><kbd>←</kbd><kbd>→</kbd></>}
          value={transpose}
          display={transpose > 0 ? `+${transpose}` : transpose}
          onStep={onTranspose}
        />
      </div>
      <button className={'pedal' + (sustainOn ? ' on' : '')} onClick={onPedal}>
        Sustain pedal {pedalLatched ? '(locked on)' : ''}
        <small>hold <kbd>Space</kbd> or click to lock</small>
      </button>
    </div>
  );
}
