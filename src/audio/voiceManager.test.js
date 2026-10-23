import { describe, it, expect, beforeEach } from 'vitest';
import { VoiceManager } from './voiceManager.js';

describe('VoiceManager', () => {
  let started, stopped, vm;
  beforeEach(() => {
    started = [];
    stopped = [];
    let n = 0;
    vm = new VoiceManager(freq => { const v = { id: n++, freq }; started.push(v); return v; }, v => stopped.push(v.id));
  });

  it('stops a note on key up without sustain', () => {
    vm.noteOn('KeyA', 261);
    vm.noteOff('KeyA');
    expect(stopped).toEqual([0]);
    expect(vm.active.size).toBe(0);
  });

  it('keeps released notes ringing while sustain is down', () => {
    vm.setSustain(true);
    vm.noteOn('KeyA', 261);
    vm.noteOff('KeyA');
    expect(stopped).toEqual([]);
    vm.setSustain(false);
    expect(stopped).toEqual([0]);
  });

  it('does not stop still-held notes when sustain lifts', () => {
    vm.setSustain(true);
    vm.noteOn('KeyA', 261);
    vm.noteOn('KeyS', 293);
    vm.noteOff('KeyA');
    vm.setSustain(false);
    expect(stopped).toEqual([0]);
    expect([...vm.active.keys()]).toEqual(['KeyS']);
  });

  it('re-striking a sustained note replaces the old voice', () => {
    vm.setSustain(true);
    vm.noteOn('KeyA', 261);
    vm.noteOff('KeyA');
    vm.noteOn('KeyA', 261);
    expect(stopped).toEqual([0]);
    expect(vm.active.get('KeyA').voice.id).toBe(1);
  });

  it('allOff stops everything', () => {
    vm.noteOn('KeyA', 261);
    vm.noteOn('KeyS', 293);
    vm.allOff();
    expect(stopped.sort()).toEqual([0, 1]);
    expect(vm.active.size).toBe(0);
  });
});
