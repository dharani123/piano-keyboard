import { instrumentById } from './instruments.js';
import { VoiceManager } from './voiceManager.js';
import { pluckSamples } from './pluck.js';

// Signal chain:
//   voices → bus ─┬─────────────────────────→ master → compressor → speakers
//                 ├→ chorus delay (LFO) → wet ┘
//                 └→ reverb convolver  → wet ┘
//   dreamy voices also → dream send → long convolver → master
let ctx = null;
let bus, master, chorusWet, reverbWet, dreamIn;
const settings = { volume: 0.7, reverb: 0.25, chorus: 0 };

const voices = new VoiceManager(startVoice, stopVoice);

function ensure() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  ctx.addEventListener('statechange', checkAudio);
  startWatch();

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

  // A long, soft wash for the dream pop voices (their `space` send)
  const dream = ctx.createConvolver();
  dream.buffer = makeImpulse(5);
  const dreamTone = ctx.createBiquadFilter();
  dreamTone.type = 'lowpass';
  dreamTone.frequency.value = 4500;
  dreamIn = ctx.createGain();
  dreamIn.gain.value = 0.7;
  dreamIn.connect(dream).connect(dreamTone).connect(master);

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

// Soft-clipping curves for fuzz voices, one per drive amount
const fuzzCurves = new Map();
function fuzzCurve(drive) {
  if (!fuzzCurves.has(drive)) {
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
    }
    fuzzCurves.set(drive, curve);
  }
  return fuzzCurves.get(drive);
}

// The last note each gliding voice played, so the next one can slide from it
const GLIDE_WITHIN = 1.5; // seconds: a longer pause starts fresh, no slide
const lastGlide = new Map();

function startVoice(freq, instrumentId, now = ctx.currentTime) {
  const inst = instrumentById[instrumentId];
  if (inst.pluck) return startPluck(freq, inst, now);
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

  // partials go through the fuzz first, when the voice has one
  let into = filter;
  if (inst.drive) {
    const shaper = ctx.createWaveShaper();
    shaper.curve = fuzzCurve(inst.drive);
    shaper.oversample = '4x';
    shaper.connect(filter);
    into = shaper;
  }
  let glideFrom = null;
  if (inst.glide) {
    const last = lastGlide.get(instrumentId);
    if (last && now - last.at < GLIDE_WITHIN && last.freq !== freq) glideFrom = last.freq;
    lastGlide.set(instrumentId, { freq, at: now });
  }

  const sources = [];
  if (inst.phaser) {
    // Four all-pass stages swept by a slow LFO, mixed back with the dry sound
    // so the notches move: the classic phaser swirl
    const lfo = ctx.createOscillator();
    const sweep = ctx.createGain();
    lfo.frequency.value = inst.phaser.rate;
    sweep.gain.value = 900 * inst.phaser.depth;
    lfo.connect(sweep);
    let node = filter;
    for (let i = 0; i < 4; i++) {
      const ap = ctx.createBiquadFilter();
      ap.type = 'allpass';
      ap.frequency.value = 1000;
      ap.Q.value = 0.6;
      sweep.connect(ap.frequency);
      node = node.connect(ap);
    }
    node.connect(out);
    sources.push(lfo);
  }
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
  if (inst.space) {
    const send = ctx.createGain();
    send.gain.value = inst.space;
    out.connect(send).connect(dreamIn);
  }

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
    if (glideFrom) {
      osc.frequency.setValueAtTime(glideFrom * p.ratio, now);
      osc.frequency.exponentialRampToValueAtTime(freq * p.ratio, now + inst.glide);
    } else osc.frequency.value = freq * p.ratio;
    osc.detune.value = p.detune ?? 0;
    if (vibratoDepth) vibratoDepth.connect(osc.detune);
    g.gain.setValueAtTime(p.gain, now);
    if (p.fade) g.gain.exponentialRampToValueAtTime(0.0001, now + p.fade);
    osc.connect(g).connect(into);
    sources.push(osc);
  }

  for (const s of sources) {
    s.start(now);
    if (end) s.stop(end);
  }
  return { out, sources, release: env.release };
}

// Rendered plucks, a few slightly different ones per instrument and pitch so
// repeated notes don't sound copy-pasted; a key only costs its first presses
const PLUCK_TAKES = 3;
const pluckCache = new Map();
function pluckBuffer(freq, inst) {
  const key = `${inst.id}:${freq.toFixed(2)}:${Math.floor(Math.random() * PLUCK_TAKES)}`;
  if (!pluckCache.has(key)) {
    const samples = pluckSamples(freq, ctx.sampleRate, inst.pluck);
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    pluckCache.set(key, buffer);
  }
  return pluckCache.get(key);
}

// A plucked-string note: rendered samples through the body and tone filters
function startPluck(freq, inst, now) {
  const { env, filter: f, body } = inst;
  const end = now + inst.pluck.seconds;
  const source = ctx.createBufferSource();
  source.buffer = pluckBuffer(freq, inst);
  if (inst.settle) {
    source.detune.setValueAtTime(inst.settle.cents, now);
    source.detune.setTargetAtTime(0, now, inst.settle.time);
  }

  const out = ctx.createGain();
  out.gain.setValueAtTime(0, now);
  out.gain.linearRampToValueAtTime(0.45 + Math.random() * 0.1, now + env.attack); // no two plucks quite as loud
  out.connect(bus);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.Q.value = f.q;
  filter.frequency.setValueAtTime(Math.min(freq * f.from, 18000), now);
  filter.frequency.exponentialRampToValueAtTime(Math.min(Math.max(freq * f.to, 300), 18000), now + f.time);
  filter.connect(out);

  const resonance = ctx.createBiquadFilter();
  resonance.type = 'peaking';
  resonance.frequency.value = body.freq;
  resonance.gain.value = body.gain;
  source.connect(resonance).connect(filter);

  source.start(now);
  source.stop(end);
  return { out, sources: [source], release: env.release };
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

// Ambient pad: slow chords, each swelling in over a few seconds and fading out
// under the next one. Soft triangle tones through a low-pass, into the reverb.
const CHORD_LEN = 9; // seconds each chord leads
const CHORD_FADE = 4; // seconds of swell in and of overlap with the next chord
let ambientTimer = null;
let ambientNext = 0;
let ambientGain = null;
let ambientArgs = null; // the running pad, restarted after a rebuild

function padChord(freqs, when) {
  const end = when + CHORD_LEN + CHORD_FADE;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(1 / freqs.length, when + CHORD_FADE);
  g.gain.setValueAtTime(1 / freqs.length, when + CHORD_LEN);
  g.gain.linearRampToValueAtTime(0.0001, end);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 900;
  filter.connect(g).connect(ambientGain);
  for (const freq of freqs) {
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(when);
      osc.stop(end + 0.1);
    }
  }
}

function wake() {
  ensure();
  if (ctx.state !== 'running' && ctx.state !== 'closed') ctx.resume().catch(() => { /* needs a click first */ });
}

// Chrome can pause the audio (no click yet, the sound device going to sleep,
// power saving) or leave it "running" with a clock that has stopped moving,
// which silences everything scheduled ahead (Relax runs on that clock). A
// watchdog spots both: it resumes, kicks a stuck device with a suspend and
// resume, and if the clock still won't move, builds a fresh audio context.
// The app shows the status on the display.
let status = 'off'; // off | running | suspended | stuck
const statusListeners = new Set();
const restartListeners = new Set(); // told when a fresh context replaced a stuck one
let watchTimer = null;
let lastClock = 0;
let lastWall = 0;
let stuckSince = null;
let lastKick = 0;
let kicking = false; // our own suspend/resume is in flight
let droneArgs = null; // the running drone, restarted after a rebuild

function setStatus(next) {
  if (status === next) return;
  status = next;
  console.warn(`[Desk Piano audio] ${next}`, ctx && { state: ctx.state, clock: ctx.currentTime.toFixed(2) });
  for (const fn of statusListeners) fn(next);
}

function checkAudio() {
  if (!ctx || kicking) return;
  const wall = performance.now();
  const clock = ctx.currentTime;
  const wallGap = (wall - lastWall) / 1000;
  if (ctx.state !== 'running') {
    stuckSince = null;
    setStatus('suspended');
    wake();
  } else if (wallGap > 0.3 && clock - lastClock < wallGap * 0.2) {
    stuckSince ??= wall;
    setStatus('stuck');
    if (wall - stuckSince > 3000) rebuild();
    else if (wall - lastKick > 1000) {
      lastKick = wall;
      kicking = true;
      ctx.suspend().then(() => ctx.resume()).catch(() => { /* try again next tick */ }).finally(() => { kicking = false; });
    }
  } else if (wallGap > 0.3) {
    stuckSince = null;
    setStatus('running');
  }
  if (wallGap > 0.3) {
    lastClock = clock;
    lastWall = wall;
  }
}

function startWatch() {
  lastClock = ctx.currentTime;
  lastWall = performance.now();
  if (watchTimer) return;
  watchTimer = setInterval(checkAudio, 500);
  // A click or key press is what Chrome needs before it lets paused audio resume
  for (const type of ['pointerdown', 'keydown']) document.addEventListener(type, wake, { capture: true });
}

// Throw the stuck context away and start a new one (scheduled notes are lost;
// the drone carries on)
function rebuild() {
  const old = ctx;
  voices.allOff();
  for (const s of scheduled) s.cancel();
  scheduled = [];
  clearInterval(droneTimer);
  droneTimer = null;
  droneGain = null;
  clearInterval(ambientTimer);
  ambientTimer = null;
  ambientGain = null;
  pluckCache.clear(); // buffers belong to the old sample rate
  lastGlide.clear(); // its times are on the old clock
  ctx = null;
  stuckSince = null;
  old.close().catch(() => { /* already gone */ });
  ensure();
  if (droneArgs) engine.droneStart(...droneArgs);
  if (ambientArgs) engine.ambientStart(...ambientArgs);
  for (const fn of restartListeners) fn();
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
    droneArgs = [freqs, volume];
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
  // change the running drone's volume (0–1) smoothly
  droneVolume(volume) {
    if (droneArgs) droneArgs[1] = volume;
    if (droneGain) droneGain.gain.setTargetAtTime(0.05 * volume, ctx.currentTime, 0.1);
  },
  droneStop() {
    droneArgs = null;
    clearInterval(droneTimer);
    droneTimer = null;
    if (droneGain) {
      const g = droneGain;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => g.disconnect(), 2000);
      droneGain = null;
    }
  },
  // chords: a list of chords (each a list of frequencies), played in turn and looped
  ambientStart(chords, volume = 0.5) {
    wake();
    this.ambientStop();
    ambientArgs = [chords, volume];
    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.12 * volume;
    ambientGain.connect(bus);
    ambientNext = ctx.currentTime + 0.1;
    let i = 0;
    const schedule = () => {
      while (ambientNext < ctx.currentTime + 2) {
        padChord(chords[i++ % chords.length], ambientNext);
        ambientNext += CHORD_LEN;
      }
    };
    schedule();
    ambientTimer = setInterval(schedule, 500);
  },
  ambientVolume(volume) {
    if (ambientArgs) ambientArgs[1] = volume;
    if (ambientGain) ambientGain.gain.setTargetAtTime(0.12 * volume, ctx.currentTime, 0.1);
  },
  ambientStop() {
    ambientArgs = null;
    clearInterval(ambientTimer);
    ambientTimer = null;
    if (ambientGain) {
      const g = ambientGain;
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      setTimeout(() => g.disconnect(), 3000);
      ambientGain = null;
    }
  },
  // Audio status for the display: 'off' | 'running' | 'suspended' | 'stuck'
  status() {
    return status;
  },
  onStatus(fn) {
    statusListeners.add(fn);
    return () => statusListeners.delete(fn);
  },
  // The audio clock starts again from zero after a restart, so anything timed on it must start over
  onRestart(fn) {
    restartListeners.add(fn);
    return () => restartListeners.delete(fn);
  },
  set(name, value) {
    settings[name] = value;
    applySettings();
  },
};
