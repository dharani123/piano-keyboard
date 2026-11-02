import { useState } from 'react';
import { hasPassed } from '../../lessons/progress.js';
import LessonPage from './LessonPage.jsx';

// A course: the unit/lesson list on the left and the open lesson on the right.
// Used by Lessons and Sheet Reading; both keep their stars in the same
// progress store (lesson ids are unique across courses).
export default function Course({ units, lessons, progress, update, piano, title = 'Lessons' }) {
  // a unit marked openStart can be started without finishing the units before it
  const opensUnit = i => lessons[i].unit !== lessons[i - 1].unit && units[lessons[i].unit].openStart;
  const isUnlocked = i => progress.unlockAll || i === 0 || opensUnit(i) || hasPassed(progress, lessons[i - 1].id);
  const [selected, setSelected] = useState(() => {
    const next = lessons.findIndex(l => !hasPassed(progress, l.id));
    return next === -1 ? 0 : next;
  });
  const lesson = lessons[selected];

  function finish(stars) {
    const best = Math.max(stars, progress.stars[lesson.id] ?? 0);
    update({ ...progress, stars: { ...progress.stars, [lesson.id]: best } });
  }

  const done = lessons.filter(l => hasPassed(progress, l.id)).length;

  return (
    <div className="lessons">
      <aside className="course">
        <div className="panel-title">{title} · {done}/{lessons.length} passed</div>
        <div className="pass-rule">Get ★★ to unlock the next lesson</div>
        {units.map((unit, u) => (
          <div key={u} className="unit">
            <div className="unit-title">{u + 1}. {unit.title}</div>
            {lessons.map((l, i) => l.unit !== u ? null : (
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
        hasNext={selected < lessons.length - 1}
        piano={piano}
        onFinish={finish}
        onNext={() => setSelected(selected + 1)}
      />
    </div>
  );
}
