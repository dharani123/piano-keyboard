// Ear Gym stats (this browser only) and the adaptive "what to play next" pick.
//
// { notes: { semitone: { recent: [bool] (last 50, newest last), right, wrong } },
//   confusions: { target: { heardAs: count } }, days: ['YYYY-MM-DD'],
//   today: { day, rounds }, settings }
import { isCorrect } from './rounds.js';

const KEY = 'desk-piano-ear';
const RECENT_KEPT = 50;
const WINDOW = 20; // answers that count towards accuracy / level

export const DEFAULT_SETTINGS = { pool: 'auto', reference: 'every', octaves: 'one', randomVoice: false };

export function emptyStats() {
  return { notes: {}, confusions: {}, days: [], settings: { ...DEFAULT_SETTINGS } };
}

export function loadStats() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.notes === 'object') {
      return { ...emptyStats(), ...saved, settings: { ...DEFAULT_SETTINGS, ...saved.settings } };
    }
  } catch { /* storage unavailable or corrupt */ }
  return emptyStats();
}

export function saveStats(stats) {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch { /* storage unavailable */ }
}

export function localDay(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// answered: semitone pressed, or null when time ran out
export function recordAnswer(stats, target, answered, today) {
  const ok = answered !== null && isCorrect(target, answered);
  const note = stats.notes[target] ?? { recent: [], right: 0, wrong: 0 };
  const notes = {
    ...stats.notes,
    [target]: {
      recent: [...note.recent, ok].slice(-RECENT_KEPT),
      right: note.right + (ok ? 1 : 0),
      wrong: note.wrong + (ok ? 0 : 1),
    },
  };
  let confusions = stats.confusions;
  if (!ok && answered !== null) {
    const heardAs = ((answered % 12) + 12) % 12;
    const row = confusions[target] ?? {};
    confusions = { ...confusions, [target]: { ...row, [heardAs]: (row[heardAs] ?? 0) + 1 } };
  }
  const days = stats.days.includes(today) ? stats.days : [...stats.days, today].sort();
  const rounds = stats.today?.day === today ? stats.today.rounds : 0;
  return { ...stats, notes, confusions, days, today: { day: today, rounds: rounds + 1 } };
}

export const todayRounds = (stats, today) => (stats.today?.day === today ? stats.today.rounds : 0);

export function accuracy(stats, semitone) {
  const recent = (stats.notes[semitone]?.recent ?? []).slice(-WINDOW);
  return { rate: recent.length ? recent.filter(Boolean).length / recent.length : 0, n: recent.length };
}

export function level(stats, semitone) {
  const { rate, n } = accuracy(stats, semitone);
  if (n < 5) return 'new';
  if (rate < 0.6) return 'weak';
  if (rate < 0.9) return 'ok';
  return 'mastered';
}

export function topConfusions(stats, k = 3) {
  return Object.entries(stats.confusions)
    .flatMap(([target, row]) => Object.entries(row).map(([heardAs, count]) => ({ target: +target, heardAs: +heardAs, count })))
    .sort((a, b) => b.count - a.count)
    .slice(0, k);
}

const addDays = (day, n) => {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
};

// Consecutive practice days ending today (or yesterday, if today isn't done yet)
export function streak(stats, today) {
  const days = new Set(stats.days);
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}

export function weightFor(stats, semitone) {
  const note = stats.notes[semitone];
  const { rate, n } = accuracy(stats, semitone);
  const errorRate = n ? 1 - rate : 0;
  const fresh = (note ? note.right + note.wrong : 0) < 10 ? 1 : 0;
  return 1 + 3 * errorRate + fresh;
}

// ctx.followUp = { pair: [target, heardAs], left } is set by the caller after a
// wrong answer, so the confused pair comes up again straight away.
export function pickNext(stats, pool, ctx, rng = Math.random) {
  const { prev, followUp } = ctx;
  let target;
  if (followUp && rng() < 0.5) {
    target = followUp.pair[Math.floor(rng() * 2)];
  } else {
    const choices = pool.length > 1 ? pool.filter(s => s !== prev) : pool;
    const weights = choices.map(s => weightFor(stats, s));
    let r = rng() * weights.reduce((a, b) => a + b, 0);
    target = choices.find((_, i) => (r -= weights[i]) < 0) ?? choices.at(-1);
  }
  const left = followUp ? followUp.left - 1 : 0;
  return { target, ctx: { prev: target, followUp: followUp && left > 0 ? { ...followUp, left } : null } };
}
