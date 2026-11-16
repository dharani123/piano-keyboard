import { useEffect, useState } from 'react';
import { hasPassed } from '../../lessons/progress.js';
import LessonPage from './LessonPage.jsx';

// A course: the unit/lesson list on the left and the open lesson on the right.
// Used by Lessons and Sheet Reading; both keep their stars in the same
// progress store (lesson ids are unique across courses).

// A lesson with opensOn = 'YYYY-MM-DD' stays locked until that day (local time), even with
// Unlock all or in an allOpen unit: it paces the course a week at a time on purpose.
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const notYet = lesson => lesson.opensOn && lesson.opensOn > today();
const opensLabel = lesson => new Date(`${lesson.opensOn}T00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function remembered(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

// storageKey = where the open lesson and unit are remembered across reloads.
export default function Course({ units, lessons, progress, update, piano, title = 'Lessons', storageKey }) {
  // a unit marked openStart can be started without finishing the units before it
  const opensUnit = i => lessons[i].unit !== lessons[i - 1].unit && units[lessons[i].unit].openStart;
  // a unit marked allOpen has no locks at all: play its lessons in any order
  const isUnlocked = i => !notYet(lessons[i]) && (progress.unlockAll || i === 0 || units[lessons[i].unit].allOpen || opensUnit(i) || hasPassed(progress, lessons[i - 1].id));
  const [selected, setSelected] = useState(() => {
    const saved = lessons.findIndex(l => l.id === remembered(storageKey));
    if (saved !== -1 && isUnlocked(saved)) return saved;
    const next = lessons.findIndex((l, i) => !hasPassed(progress, l.id) && isUnlocked(i));
    return next === -1 ? 0 : next;
  });
  const lesson = lessons[selected];
  // Which unit's lessons the list shows; the unit names live in their own nav on the left
  // (in the empty page space on wide screens, like the raga list in Carnatic Music)
  const [viewUnit, setViewUnit] = useState(() => {
    const saved = parseInt(remembered(`${storageKey}-unit`), 10);
    return units[saved] ? saved : lesson.unit;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, lesson.id);
      localStorage.setItem(`${storageKey}-unit`, String(viewUnit));
    } catch { /* storage blocked */ }
  }, [lesson.id, viewUnit]);

  function openLesson(i) {
    setSelected(i);
    setViewUnit(lessons[i].unit);
  }

  function pickUnit(u) {
    setViewUnit(u);
    const inUnit = lessons.map((l, i) => i).filter(i => lessons[i].unit === u);
    const open = inUnit.filter(isUnlocked);
    if (open.length) setSelected(open.find(i => !hasPassed(progress, lessons[i].id)) ?? open[0]);
  }

  // a lesson marked unscored (Ear Training patterns) keeps no stars and doesn't count as passed
  function finish(stars) {
    if (lesson.unscored) return;
    const best = Math.max(stars, progress.stars[lesson.id] ?? 0);
    update({ ...progress, stars: { ...progress.stars, [lesson.id]: best } });
  }

  const scored = lessons.filter(l => !l.unscored);
  const done = scored.filter(l => hasPassed(progress, l.id)).length;

  return (
    <div className="lessons with-units">
      <nav className="raga-nav unit-nav">
        <div className="unit-title sub">{title} · {done}/{scored.length}</div>
        {units.map((unit, u) => {
          const inUnit = lessons.map((l, i) => i).filter(i => lessons[i].unit === u);
          const counted = inUnit.filter(i => !lessons[i].unscored);
          const passed = counted.filter(i => hasPassed(progress, lessons[i].id)).length;
          const locked = !inUnit.some(isUnlocked);
          return (
            <button
              key={u}
              className={'lesson-link unit-link' + (u === viewUnit ? ' active' : '')}
              onClick={() => pickUnit(u)}
            >
              <span className="lesson-link-num">{u + 1}</span>
              <span className="lesson-link-title">{unit.title}</span>
              <span className="lesson-link-stars">{locked ? '🔒' : `${passed}/${counted.length}`}</span>
            </button>
          );
        })}
      </nav>
      <aside className="course">
        <div className="panel-title">{title} · {done}/{scored.length} passed</div>
        <div className="pass-rule">{units[viewUnit].allOpen ? 'Play these in any order' : 'Get ★★ to unlock the next lesson'}</div>
        {units.map((unit, u) => u !== viewUnit ? null : (
          <div key={u} className="unit">
            <div className="unit-title">{u + 1}. {unit.title}</div>
            {lessons.map((l, i) => l.unit !== u ? null : (
              <button
                key={l.id}
                className={'lesson-link' + (i === selected ? ' active' : '')}
                disabled={!isUnlocked(i)}
                title={notYet(l) ? `Opens on ${opensLabel(l)}` : undefined}
                onClick={() => setSelected(i)}
              >
                <span className="lesson-link-num">{l.num}</span>
                <span className="lesson-link-title">{l.title}</span>
                <span className={'lesson-link-stars' + (notYet(l) ? ' opens' : '')}>
                  {notYet(l) ? `🔒 ${opensLabel(l)}` : !isUnlocked(i) ? '🔒' : !l.unscored && progress.stars[l.id] ? '★'.repeat(progress.stars[l.id]) : ''}
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
        bestStars={lesson.unscored ? 0 : progress.stars[lesson.id] ?? 0}
        hasNext={selected < lessons.length - 1 && !notYet(lessons[selected + 1])}
        piano={piano}
        onFinish={finish}
        onNext={() => openLesson(selected + 1)}
      />
    </div>
  );
}
