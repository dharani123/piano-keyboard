import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { bySemitone } from '../../data/keymap.js';
import {
  loadStats, saveStats, recordAnswer, localDay, level, topConfusions, streak, todayRounds,
} from '../../ear/stats.js';
import { gymRounds, afterAnswer } from '../../ear/gym.js';
import EarExercise from '../lessons/EarExercise.jsx';
import NoteGrid from './NoteGrid.jsx';

const SESSION = 20;
const ALL = Object.keys(bySemitone).map(Number);
const LEVELS = ['new', 'weak', 'ok', 'mastered'];
const name = s => bySemitone[s].note.replace('#', '♯');

// Daily ear practice: 20 adaptive rounds, per-note accuracy and confusions
export default function EarGym({ piano }) {
  const [stats, setStats] = useState(loadStats);
  const [session, setSession] = useState(null); // { rounds, key, before, confusions }
  const [result, setResult] = useState(null);
  const answered = useRef(0);
  const today = localDay();
  const { settings } = stats;

  useEffect(() => { piano.setStatus(session ? 'EAR GYM' : 'EAR GYM READY'); }, [session]);
  useEffect(() => () => piano.setStatus(null), []);

  function update(next) {
    setStats(next);
    saveStats(next);
  }
  const setSetting = (k, v) => update({ ...stats, settings: { ...settings, [k]: v } });

  function start() {
    answered.current = 0;
    setResult(null);
    setSession({
      rounds: gymRounds(stats, settings, SESSION, { prev: null, followUp: null }, 0).rounds,
      key: Date.now(),
      before: Object.fromEntries(ALL.map(s => [s, level(stats, s)])),
      confusions: {},
    });
  }

  // EarExercise calls this once per round, after a render, so `stats` is current
  function onAnswer(target, heard) {
    const index = answered.current++;
    const next = recordAnswer(stats, target, heard, today);
    update(next);
    const wrongKey = heard !== null && heard % 12 !== target ? `${target}>${heard % 12}` : null;
    setSession(sess => sess && {
      ...sess,
      rounds: afterAnswer(next, settings, sess.rounds, index, target, heard),
      confusions: wrongKey ? { ...sess.confusions, [wrongKey]: (sess.confusions[wrongKey] ?? 0) + 1 } : sess.confusions,
    });
  }

  function finish({ mistakes }) {
    const improved = ALL.filter(s => LEVELS.indexOf(level(stats, s)) > LEVELS.indexOf(session.before[s]) && session.before[s] !== 'new');
    const [top] = Object.entries(session.confusions).sort((a, b) => b[1] - a[1]);
    setResult({ score: SESSION - mistakes, improved, top: top && { pair: top[0].split('>').map(Number), count: top[1] } });
    setSession(null);
  }

  const customPool = settings.pool === 'auto' ? ALL : settings.pool;
  const togglePool = s => {
    const pool = customPool.includes(s) ? customPool.filter(x => x !== s) : [...customPool, s].sort((a, b) => a - b);
    setSetting('pool', pool);
  };

  const active = session && piano.slot && createPortal(
    <div className="slot-inner">
      <div className="slot-head">
        <span className="lesson-num">Ear Gym</span> <b>Name that note</b>
        <button className="link" onClick={() => setSession(null)}>Stop</button>
      </div>
      <EarExercise
        key={session.key}
        exercise={{ type: 'ear', reference: settings.reference, prompt: 'Listen, then press the note you heard' }}
        rounds={session.rounds}
        piano={piano}
        onAnswer={onAnswer}
        onProgress={text => piano.setStatus(`EAR GYM ${text}`)}
        onComplete={finish}
      />
    </div>,
    piano.slot
  );

  const confusions = topConfusions(stats);
  return (
    <div className="gym">
      <div className="gym-main">
        <div className="gym-stats">
          <span>🔥 <b>{streak(stats, today)}</b> day streak</span>
          <span><b>{todayRounds(stats, today)}</b> notes today</span>
        </div>
        <NoteGrid stats={stats} />
        <div className="gym-legend">
          <span className="new">new</span><span className="weak">under 60%</span><span className="ok">60–89%</span><span className="mastered">mastered 90%+</span>
        </div>
        <div className="panel-title">Most confused</div>
        {confusions.length
          ? <ul className="gym-confusions">{confusions.map(c => <li key={`${c.target}>${c.heardAs}`}><b>{name(c.target)}</b> heard as <b>{name(c.heardAs)}</b> · {c.count}×</li>)}</ul>
          : <p className="muted">No mix-ups yet.</p>}
      </div>

      <div className="gym-side">
        {result && (
          <div className="gym-result">
            <div className="result-msg">{result.score} / {SESSION}</div>
            {result.improved.length > 0 && <p>Improved: {result.improved.map(name).join(', ')} 🎉</p>}
            {result.top && <p>Top mix-up: <b>{name(result.pair[0])}</b> heard as <b>{name(result.pair[1])}</b> ({result.top.count}×)</p>}
          </div>
        )}
        <div className="panel-title">Settings</div>
        <label className="gym-field">Notes
          <select value={settings.pool === 'auto' ? 'auto' : 'custom'} onChange={e => setSetting('pool', e.target.value === 'auto' ? 'auto' : ALL)}>
            <option value="auto">All 12 (auto)</option>
            <option value="custom">Pick notes…</option>
          </select>
        </label>
        {settings.pool !== 'auto' && (
          <div className="gym-pool">
            {ALL.map(s => (
              <button key={s} className={customPool.includes(s) ? 'on' : ''} onClick={() => togglePool(s)}>{name(s)}</button>
            ))}
          </div>
        )}
        <label className="gym-field">Reference C
          <select value={settings.reference} onChange={e => setSetting('reference', e.target.value)}>
            <option value="every">Every note</option>
            <option value="sometimes">Sometimes</option>
            <option value="start">Only at the start</option>
          </select>
        </label>
        <label className="gym-field">Octaves
          <select value={settings.octaves} onChange={e => setSetting('octaves', e.target.value)}>
            <option value="one">Just this one</option>
            <option value="three">Three octaves</option>
          </select>
        </label>
        <label className="gym-field check">
          <input type="checkbox" checked={settings.randomVoice} onChange={e => setSetting('randomVoice', e.target.checked)} />
          Random instrument
        </label>
        <button className="primary big" disabled={!!session} onClick={() => { start(); requestAnimationFrame(() => piano.slot?.scrollIntoView({ block: 'end', behavior: 'smooth' })); }}>
          {session ? 'Session running at the piano ↑' : `Start (${SESSION} notes)`}
        </button>
      </div>
      {active}
    </div>
  );
}
