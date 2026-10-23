// Ear Gym session rounds: adaptive picks (stats.pickNext) shaped by the
// player's settings. After a wrong answer the rounds still to come are re-picked
// so the confused pair comes straight back.
import { INSTRUMENTS } from '../audio/instruments.js';
import { pickNext } from './stats.js';

const ALL = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const FOLLOW_UP_ROUNDS = 3;

export const gymPool = settings => (settings.pool === 'auto' || !settings.pool.length ? ALL : settings.pool);

const pickFrom = (list, rng) => list[Math.floor(rng() * list.length)];

// firstIndex: where these rounds start in the session (only round 0 gets a "start" reference)
export function gymRounds(stats, settings, count, ctx, firstIndex, rng = Math.random) {
  const pool = gymPool(settings);
  const rounds = [];
  for (let k = 0; k < count; k++) {
    const i = firstIndex + k;
    const pick = pickNext(stats, pool, ctx, rng);
    ctx = pick.ctx;
    rounds.push({
      target: pick.target,
      oct: settings.octaves === 'three' ? pickFrom([-1, 0, 1], rng) : 0,
      reference: i === 0 || settings.reference === 'every' || (settings.reference === 'sometimes' && rng() < 0.5),
      voice: settings.randomVoice ? pickFrom(INSTRUMENTS, rng).id : null,
    });
  }
  return { rounds, ctx };
}

// Rounds after the first answer at `index`; unchanged unless it was a wrong key
export function afterAnswer(stats, settings, rounds, index, target, answered) {
  if (answered === null || answered % 12 === target) return rounds;
  const ctx = { prev: target, followUp: { pair: [target, answered % 12], left: FOLLOW_UP_ROUNDS } };
  const upcoming = gymRounds(stats, settings, rounds.length - index - 1, ctx, index + 1).rounds;
  return [...rounds.slice(0, index + 1), ...upcoming];
}
