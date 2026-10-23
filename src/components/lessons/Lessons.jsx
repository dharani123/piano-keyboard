import { useState } from 'react';
import { UNITS, LESSONS } from '../../lessons/curriculum.js';
import { loadProgress, saveProgress, hasPassed } from '../../lessons/progress.js';
import LessonPage from './LessonPage.jsx';
import EarGym from '../ear/EarGym.jsx';
import SongsMode from '../songs/SongsMode.jsx';
import RelaxMode from '../songs/RelaxMode.jsx';

export default function Lessons({ piano }) {
  const [progress, setProgress] = useState(loadProgress);
  const isUnlocked = i => progress.unlockAll || i === 0 || hasPassed(progress, LESSONS[i - 1].id);
  const [selected, setSelected] = useState(() => {
    const next = LESSONS.findIndex(l => !hasPassed(progress, l.id));
    return next === -1 ? 0 : next;
  });
  const lesson = LESSONS[selected];
  const [tab, setTab] = useState('lessons');
  const gymOpen = progress.unlockAll || hasPassed(progress, 'ear-quick');

  function update(next) {
    setProgress(next);
    saveProgress(next);
  }

  function finish(stars) {
    const best = Math.max(stars, progress.stars[lesson.id] ?? 0);
    update({ ...progress, stars: { ...progress.stars, [lesson.id]: best } });
  }

  const done = LESSONS.filter(l => hasPassed(progress, l.id)).length;

  return (
    <div className="panel learn">
      <div className="learn-tabs">
        <button className={tab === 'lessons' ? 'active' : ''} onClick={() => setTab('lessons')}>Lessons</button>
        <button
          className={tab === 'gym' ? 'active' : ''}
          disabled={!gymOpen}
          title={gymOpen ? 'Daily ear practice' : 'Pass Ear training to open'}
          onClick={() => setTab('gym')}
        >
          Ear Gym {gymOpen ? '🎧' : '🔒'}
        </button>
        <button className={tab === 'western' ? 'active' : ''} onClick={() => setTab('western')}>Western Music 🎵</button>
        <button className={tab === 'carnatic' ? 'active' : ''} onClick={() => setTab('carnatic')}>Carnatic Music 🪕</button>
        <button className={tab === 'relax' ? 'active' : ''} onClick={() => setTab('relax')}>Carnatic Relax 🌿</button>
        {!gymOpen && <span className="learn-tabs-note">Pass Ear training to open</span>}
      </div>
      {tab === 'relax' ? <RelaxMode piano={piano} /> : tab === 'western' || tab === 'carnatic' ? <SongsMode key={tab} kind={tab} piano={piano} /> : tab === 'gym' && gymOpen ? <EarGym piano={piano} /> : (
      <div className="lessons">
        <aside className="course">
          <div className="panel-title">Lessons · {done}/{LESSONS.length} passed</div>
          <div className="pass-rule">Get ★★ to unlock the next lesson</div>
          {UNITS.map((unit, u) => (
            <div key={u} className="unit">
              <div className="unit-title">{u + 1}. {unit.title}</div>
              {LESSONS.map((l, i) => l.unit !== u ? null : (
                <button
                  key={l.id}
                  className={'lesson-link' + (i === selected ? ' active' : '')}
                  disabled={!isUnlocked(i)}
                  onClick={() => setSelected(i)}
                >
                  <span className="lesson-link-num">{l.num}</span>
                  <span className="lesson-link-title">{l.title}</span>
                  <span className="lesson-link-stars">
                    {!isUnlocked(i) ? '🔒' : progress.stars[l.id] ? '★'.repeat(progress.stars[l.id]) : ''}
                  </span>
                </button>
              ))}
            </div>
          ))}
          <label className="unlock">
            <input type="checkbox" checked={progress.unlockAll} onChange={e => update({ ...progress, unlockAll: e.target.checked })} />
            Unlock all lessons
          </label>
        </aside>

        <LessonPage
          key={lesson.id}
          lesson={lesson}
          bestStars={progress.stars[lesson.id] ?? 0}
          hasNext={selected < LESSONS.length - 1}
          piano={piano}
          onFinish={finish}
          onNext={() => setSelected(selected + 1)}
        />
      </div>
      )}
    </div>
  );
}
