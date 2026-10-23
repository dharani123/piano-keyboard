// Tracks which notes are sounding and applies sustain-pedal rules.
// Kept free of Web Audio so it can be unit tested with stub start/stop functions.
export class VoiceManager {
  constructor(startVoice, stopVoice) {
    this.startVoice = startVoice;
    this.stopVoice = stopVoice;
    this.active = new Map(); // id -> { voice, held }
    this.sustain = false;
  }

  noteOn(id, ...args) {
    const existing = this.active.get(id);
    if (existing) this.stopVoice(existing.voice); // re-strike a sustained note
    this.active.set(id, { voice: this.startVoice(...args), held: true });
  }

  noteOff(id) {
    const entry = this.active.get(id);
    if (!entry) return;
    entry.held = false;
    if (!this.sustain) this.release(id);
  }

  setSustain(on) {
    this.sustain = on;
    if (on) return;
    for (const [id, entry] of this.active) {
      if (!entry.held) this.release(id);
    }
  }

  allOff() {
    for (const id of [...this.active.keys()]) this.release(id);
  }

  release(id) {
    this.stopVoice(this.active.get(id).voice);
    this.active.delete(id);
  }
}
