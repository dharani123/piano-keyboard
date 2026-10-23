// Ear training rounds: which note to play each round, and how to judge the answer.
//
// A round is { target: semitone 0-11, oct: octave offset from the start octave,
// reference: play C first?, voice: instrument id or null for the player's own }.
// Answers are judged by pitch class, so any octave of the right note counts.
import { SEMITONES } from '../data/keymap.js';
import { INSTRUMENTS } from '../audio/instruments.js';

export const SEMI = SEMITONES;

export const isCorrect = (target, pressedSemitone) => ((pressedSemitone % 12) + 12) % 12 === target;

const pickFrom = (list, rng) => list[Math.floor(rng() * list.length)];

function pickTarget(pool, focus, prev, rng) {
  let pick;
  for (let tries = 0; tries < 10; tries++) {
    pick = focus !== undefined && rng() < 0.5 ? focus : pickFrom(pool, rng);
    if (pick !== prev || pool.length < 2) break;
  }
  return pick;
}

// Targets only; octave/reference/voice are layered on afterwards
function targetsWithPairs(pairs, count, rng) {
  const out = [];
  while (out.length < count) {
    const [a, b] = pickFrom(pairs, rng).map(n => SEMI[n]);
    // the second note of a pair written low→high but numerically lower (B→C) sits an octave up
    const first = { target: a, oct: 0 };
    const second = { target: b, oct: b < a ? 1 : 0 };
    out.push(...(rng() < 0.5 ? [first, second] : [second, first]));
  }
  return out.slice(0, count);
}

export function makeRounds(config, rng = Math.random, voices = INSTRUMENTS.map(i => i.id)) {
  const { pool, count, focus, pairs, reference, octaves = [0], randomVoice = false } = config;
  let base;
  if (pairs) {
    base = targetsWithPairs(pairs, count, rng);
  } else {
    const semis = pool.map(n => SEMI[n]);
    const focusSemi = focus === undefined ? undefined : SEMI[focus];
    base = [];
    for (let i = 0; i < count; i++) {
      base.push({ target: pickTarget(semis, focusSemi, base.at(-1)?.target, rng), oct: pickFrom(octaves, rng) });
    }
  }
  return base.map((r, i) => ({
    ...r,
    reference: i === 0 || reference === 'every' || (reference === 'sometimes' && rng() < 0.5),
    voice: randomVoice ? pickFrom(voices, rng) : null,
  }));
}
