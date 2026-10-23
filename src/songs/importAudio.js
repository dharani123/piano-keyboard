import { notesToSong } from './transcribe.js';

// Basic Pitch wants mono audio at 22 050 Hz
const MODEL_RATE = 22050;
const MODEL_URL = `${import.meta.env.BASE_URL}basic-pitch/model.json`;

// Decode an audio file, cut out [startSeconds, startSeconds + lengthSeconds]
// and resample it to mono 22 050 Hz.
async function loadClip(file, startSeconds, lengthSeconds) {
  const decoder = new AudioContext();
  const full = await decoder.decodeAudioData(await file.arrayBuffer());
  decoder.close();
  const start = Math.min(Math.max(0, startSeconds), full.duration);
  const length = Math.max(0.5, Math.min(lengthSeconds, full.duration - start));
  const offline = new OfflineAudioContext(1, Math.ceil(length * MODEL_RATE), MODEL_RATE);
  const src = offline.createBufferSource();
  src.buffer = full;
  src.connect(offline.destination);
  src.start(0, start, length);
  return offline.startRendering();
}

// Detect the notes of an audio file and turn them into a song.
// onProgress gets 0–1 while the model runs.
export async function songFromAudio(file, { startSeconds = 0, lengthSeconds = 60, onProgress = () => {} } = {}) {
  // Loaded on demand: the model library is big and only needed here
  const { BasicPitch, outputToNotesPoly, addPitchBendsToNoteEvents, noteFramesToTime } = await import('@spotify/basic-pitch');
  const clip = await loadClip(file, startSeconds, lengthSeconds);
  const frames = [];
  const onsets = [];
  const contours = [];
  const model = new BasicPitch(MODEL_URL);
  await model.evaluateModel(
    clip,
    (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c); },
    p => onProgress(p),
  );
  const notes = noteFramesToTime(addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets, 0.25, 0.25, 5)));
  return notesToSong(notes);
}
