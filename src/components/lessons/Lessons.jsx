import { useEffect, useState } from 'react';
import { UNITS, LESSONS } from '../../lessons/curriculum.js';
import { loadProgress, saveProgress, hasPassed } from '../../lessons/progress.js';
import Course from './Course.jsx';
import { SHEET_UNITS, SHEET_LESSONS } from '../../sheet/curriculum.js';
import EarGym from '../ear/EarGym.jsx';
import SongsMode from '../songs/SongsMode.jsx';
import RelaxMode from '../songs/RelaxMode.jsx';

const CARNATIC_MODE_KEY = 'desk-piano-carnatic-mode';
const TAB_KEY = 'desk-piano-tab';
const TABS = ['carnatic', 'lessons', 'gym', 'western', 'decoded', 'sheet'];

export default function Lessons({ piano }) {
  const [progress, setProgress] = useState(loadProgress);
  const [tab, setTab] = useState(() => {
    try {
      const saved = localStorage.getItem(TAB_KEY);
      return TABS.includes(saved) ? saved : 'carnatic';
    } catch { return 'carnatic'; }
  });
  useEffect(() => {
    try { localStorage.setItem(TAB_KEY, tab); } catch { /* storage blocked */ }
  }, [tab]);
  // The Carnatic tab has two ways in: Relax (no scores) or Practice (stars, locks)
  const [carnaticMode, setCarnaticMode] = useState(() => {
    try { return localStorage.getItem(CARNATIC_MODE_KEY) === 'practice' ? 'practice' : 'relax'; } catch { return 'relax'; }
  });
  function pickCarnaticMode(mode) {
    setCarnaticMode(mode);
    try { localStorage.setItem(CARNATIC_MODE_KEY, mode); } catch { /* storage blocked */ }
  }
  const gymOpen = progress.unlockAll || hasPassed(progress, 'ear-quick');

  function update(next) {
    setProgress(next);
    saveProgress(next);
  }

  // Shown by Relax and Practice among their own settings
  const modeSwitch = (
    <div className="song-option">
      <span className="option-label">Mode</span>
      {[['relax', 'Relax 🌿'], ['practice', 'Practice ★']].map(([mode, label]) => (
        <button key={mode} className={carnaticMode === mode ? 'active' : ''} onClick={() => pickCarnaticMode(mode)}>
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="panel learn">
      <div className="learn-tabs">
        <button className={tab === 'carnatic' ? 'active' : ''} onClick={() => setTab('carnatic')}>Carnatic 🪕</button>
        <button className={tab === 'lessons' ? 'active' : ''} onClick={() => setTab('lessons')}>Lessons 📚</button>
        <button
          className={tab === 'gym' ? 'active' : ''}
          disabled={!gymOpen}
          title={gymOpen ? 'Daily ear practice' : 'Pass Ear training to open'}
          onClick={() => setTab('gym')}
        >
          Ear Gym {gymOpen ? '🎧' : '🔒'}
        </button>
        <button className={tab === 'western' ? 'active' : ''} onClick={() => setTab('western')}>Western Music 🎵</button>
        <button className={tab === 'decoded' ? 'active' : ''} onClick={() => setTab('decoded')}>Decoded Songs 🎼</button>
        <button className={tab === 'sheet' ? 'active' : ''} onClick={() => setTab('sheet')}>Sheet Reading 📜</button>
        {!gymOpen && <span className="learn-tabs-note">Pass Ear training to open</span>}
      </div>
      {tab === 'carnatic' && carnaticMode === 'relax' ? <RelaxMode piano={piano} modeSwitch={modeSwitch} /> : tab === 'western' || tab === 'decoded' || tab === 'carnatic' ? <SongsMode key={tab} kind={tab} piano={piano} modeSwitch={tab === 'carnatic' ? modeSwitch : null} /> : tab === 'gym' && gymOpen ? <EarGym piano={piano} /> : (
      tab === 'sheet'
        ? <Course key="sheet" storageKey="desk-piano-open-sheet-lesson" title="Sheet reading" units={SHEET_UNITS} lessons={SHEET_LESSONS} progress={progress} update={update} piano={piano} />
        : <Course key="lessons" storageKey="desk-piano-open-lesson" units={UNITS} lessons={LESSONS} progress={progress} update={update} piano={piano} />
      )}
    </div>
  );
}
