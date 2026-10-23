import { instrumentById } from './instruments.js';
import { VoiceManager } from './voiceManager.js';

// Signal chain:
//   voices → bus ─┬─────────────────────────→ master → compressor → speakers
//                 ├→ chorus delay (LFO) → wet ┘
//                 └→ reverb convolver  → wet ┘
let ctx = null;
let bus, master, chorusWet, reverbWet;
const settings = { volume: 0.7, reverb: 0.25, chorus: 0 };

const voices = new VoiceManager(startVoice, stopVoice);

function ensure() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();

  const compressor = ctx.createDynamicsCompressor();
  compressor.connect(ctx.destination);
  master = ctx.createGain();
  master.connect(compressor);

  bus = ctx.createGain();
  bus.connect(master);

  const chorusDelay = ctx.createDelay(0.05);
  chorusDelay.delayTime.value = 0.015;
  const chorusLfo = ctx.createOscillator();
  const chorusDepth = ctx.createGain();
  chorusLfo.frequency.value = 0.8;
  chorusDepth.gain.value = 0.004;
  chorusLfo.connect(chorusDepth).connect(chorusDelay.delayTime);
  chorusLfo.start();
  chorusWet = ctx.createGain();
  bus.connect(chorusDelay).connect(chorusWet).connect(master);

  const convolver = ctx.createConvolver();
  convolver.buffer = makeImpulse(2.5);
  reverbWet = ctx.createGain();
  bus.connect(convolver).connect(reverbWet).connect(master);

  applySettings();
}

// Exponentially decaying stereo noise: a cheap "concert hall" impulse response
function makeImpulse(seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
    }
  }
  return buffer;
}

function applySettings() {
  if (!ctx) return;
  const now = ctx.currentTime;
  master.gain.setTargetAtTime(settings.volume, now, 0.02);
  reverbWet.gain.setTargetAtTime(settings.reverb * 0.8, now, 0.02);
  chorusWet.gain.setTargetAtTime(settings.chorus, now, 0.02);
}

function startVoice(freq, instrumentId, now = ctx.currentTime) {
  const inst = instrumentById[instrumentId];
  const { env, filter: f } = inst;
  const totalGain = inst.partials.reduce((sum, p) => sum + p.gain, 0);
  const peak = 0.6 / totalGain;
  const end = env.tail ? now + env.tail + 0.1 : null;

  const out = ctx.createGain();
  out.gain.setValueAtTime(0, now);
  out.gain.linearRampToValueAtTime(peak, now + env.attack);
  out.gain.exponentialRampToValueAtTime(Math.max(peak * env.sustain, 0.0001), now + env.attack + env.decay);
  if (env.tail) out.gain.exponentialRampToValueAtTime(0.0001, now + env.tail);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = f.q;
  filter.frequency.setValueAtTime(Math.min(freq * f.from, 18000), now);
  filter.frequency.exponentialRampToValueAtTime(Math.min(Math.max(freq * f.to, 300), 18000), now + f.time);
  filter.connect(out);

  const sources = [];
  let dest = bus;
  if (inst.tremolo) {
    // Separate gain stage so the wobble never outlives the envelope
    const trem = ctx.createGain();
    trem.gain.value = 1 - inst.tremolo.depth / 2;
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = inst.tremolo.rate;
    depth.gain.value = inst.tremolo.depth / 2;
    lfo.connect(depth).connect(trem.gain);
    trem.connect(bus);
    dest = trem;
    sources.push(lfo);
  }
  out.connect(dest);

  let vibratoDepth = null;
  if (inst.vibrato) {
    const lfo = ctx.createOscillator();
    vibratoDepth = ctx.createGain();
    lfo.frequency.value = inst.vibrato.rate;
    vibratoDepth.gain.value = inst.vibrato.depth;
    lfo.connect(vibratoDepth);
    sources.push(lfo);
  }

  for (const p of inst.partials) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = p.type ?? 'sine';
    osc.frequency.value = freq * p.ratio;
    osc.detune.value = p.detune ?? 0;
    if (vibratoDepth) vibratoDepth.connect(osc.detune);
    g.gain.setValueAtTime(p.gain, now);
    if (p.fade) g.gain.exponentialRampToValueAtTime(0.0001, now + p.fade);
    osc.connect(g).connect(filter);
    sources.push(osc);
  }

  for (const s of sources) {
    s.start(now);
    if (end) s.stop(end);
  }
  return { out, sources, release: env.release };
}

function stopVoice(voice, now = ctx.currentTime) {
  const gain = voice.out.gain;
  if (gain.cancelAndHoldAtTime) {
    gain.cancelAndHoldAtTime(now);
  } else {
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
  }
  gain.setTargetAtTime(0, now, voice.release / 4);
  for (const s of voice.sources) {
    try { s.stop(now + voice.release + 0.1); } catch { /* already stopped */ }
  }
}

// Notes and metronome clicks scheduled ahead of time (lesson demos, ear
// training), kept so a lesson can cancel them when it is left early.
let scheduled = [];

function track(entry) {
  const now = ctx.currentTime;
  scheduled = scheduled.filter(s => s.end > now);
  scheduled.push(entry);
}

function click(when, accent) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = accent ? 1760 : 1180;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(accent ? 0.25 : 0.14, when + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
  osc.connect(g).connect(master);
  osc.start(when);
  osc.stop(when + 0.06);
  track({ end: when + 0.06, cancel: () => { try { osc.stop(); } catch { /* not started */ } } });
}

// Tanpura: a soft pluck cycle Pa, Sa, Sa, low Sa, repeating, under the playing
const DRONE_GAP = 1.1;
let droneTimer = null;
let droneNext = 0;
let droneGain = null;

function pluck(freq, when) {
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 1400;
  filter.Q.value = 3;
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(1, when + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, when + DRONE_GAP * 3.6);
  filter.connect(g).connect(droneGain);
  for (const detune of [-4, 4]) {
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(filter);
    osc.start(when);
    osc.stop(when + DRONE_GAP * 3.7);
  }
}

function wake() {
  ensure();
  if (ctx.state === 'suspended') ctx.resume();
}

export const engine = {
  noteOn(id, freq, instrumentId) {
    wake();
    voices.noteOn(id, freq, instrumentId);
  },
  now() {
    wake();
    return ctx.currentTime;
  },
  // Play a note on its own (not tied to a key) starting at `when` for `duration` seconds
  playNote(freq, instrumentId, when, duration) {
    wake();
    const start = Math.max(when ?? ctx.currentTime, ctx.currentTime);
    const voice = startVoice(freq, instrumentId, start);
    stopVoice(voice, start + duration);
    track({ end: start + duration + voice.release + 0.2, cancel: () => stopVoice(voice) });
  },
  click(when, accent = false) {
    wake();
    click(Math.max(when, ctx.currentTime), accent);
  },
  cancelScheduled() {
    if (!ctx) return;
    for (const s of scheduled) s.cancel();
    scheduled = [];
  },
  noteOff(id) {
    if (ctx) voices.noteOff(id);
  },
  setSustain(on) {
    if (ctx) voices.setSustain(on);
    else voices.sustain = on;
  },
  allOff() {
    if (ctx) voices.allOff();
  },
  // freqs = the pluck cycle, e.g. [Pa, Sa, Sa, low Sa]; volume 0–1
  droneStart(freqs, volume = 0.5) {
    wake();
    this.droneStop();
    droneGain = ctx.createGain();
    droneGain.gain.value = 0.05 * volume;
    droneGain.connect(bus);
    droneNext = ctx.currentTime + 0.1;
    let i = 0;
    const schedule = () => {
      while (droneNext < ctx.currentTime + 2) {
        pluck(freqs[i++ % freqs.length], droneNext);
        droneNext += DRONE_GAP;
      }
    };
    schedule();
    droneTimer = setInterval(schedule, 500);
  },
  droneStop() {
    clearInterval(droneTimer);
    droneTimer = null;
    if (droneGain) {
      const g = droneGain;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => g.disconnect(), 2000);
      droneGain = null;
    }
  },
  set(name, value) {
    settings[name] = value;
    applySettings();
  },
};
