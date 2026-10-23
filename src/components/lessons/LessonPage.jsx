import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Theory from './Theory.jsx';
import StepExercise from './StepExercise.jsx';
import RhythmExercise from './RhythmExercise.jsx';
import EarExercise from './EarExercise.jsx';
import { PASS_STARS } from '../../lessons/progress.js';

const MESSAGES = [
  'Not quite yet. Have another go!',
  `Getting there! You need ${'★'.repeat(PASS_STARS)} to unlock the next lesson.`,
  'Passed, nice work!',
  'Perfect! ⭐',
];

export default function LessonPage({ lesson, bestStars, hasNext, piano, onFinish, onNext }) {
  const [phase, setPhase] = useState('theory'); // theory | exercise | result
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const pageRef = useRef(null);
  const title = `L${lesson.num} ${lesson.title.toUpperCase()}`;

  useEffect(() => { if (phase !== 'exercise') piano.setStatus(title); }, [phase]);

  // Exercises render under the piano so the glowing keys and the prompt are
  // on screen together; bring that area into view when one starts.
  function show(next, scrollTo) {
    setPhase(next);
    requestAnimationFrame(() => scrollTo?.scrollIntoView({ block: next === 'theory' ? 'start' : 'end', behavior: 'smooth' }));
  }

  function complete(r) {
    setResult(r);
    show('result', piano.slot);
    onFinish(r.stars);
  }

  function retry() {
    setAttempt(a => a + 1);
    setPhase('exercise');
  }

  const Exercise = { rhythm: RhythmExercise, ear: EarExercise }[lesson.exercise.type] ?? StepExercise;
  const backToNotes = () => show('theory', pageRef.current);

  const active = phase !== 'theory' && piano.slot && createPortal(
    <div className="slot-inner">
      <div className="slot-head">
        <span className="lesson-num">Lesson {lesson.num}</span> <b>{lesson.title}</b>
        <button className="link" onClick={backToNotes}>Lesson notes ↓</button>
      </div>
      {phase === 'exercise' && (
        <Exercise
          key={attempt}
          exercise={lesson.exercise}
          piano={piano}
          onProgress={text => piano.setStatus(`${title} ${text}`)}
          onComplete={complete}
        />
      )}
      {phase === 'result' && (
        <div className="result">
          <div className="result-stars">
            {[0, 1, 2].map(i => <span key={i} className={i < result.stars ? 'on' : ''}>★</span>)}
          </div>
          <p className="result-msg">{MESSAGES[result.stars]}</p>
          <p className="result-detail">{result.detail}</p>
          <div className="result-actions">
            <button onClick={retry}>↻ Try again</button>
            <button onClick={backToNotes}>Review notes</button>
            {Math.max(result.stars, bestStars) >= PASS_STARS && hasNext && <button className="primary" onClick={() => { onNext(); pageRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>Next lesson →</button>}
          </div>
        </div>
      )}
    </div>,
    piano.slot
  );

  return (
    <div className="lesson" ref={pageRef}>
      <div className="lesson-head">
        <span className="lesson-num">Lesson {lesson.num}</span>
        <h2>{lesson.title}</h2>
        {bestStars > 0 && <span className="stars">{'★'.repeat(bestStars)}{'☆'.repeat(3 - bestStars)}</span>}
      </div>
      <Theory blocks={lesson.theory} />
      {phase === 'theory'
        ? <button className="primary big" onClick={() => show('exercise', piano.slot)}>Start exercise ↑</button>
        : <button className="big" onClick={() => piano.slot?.scrollIntoView({ block: 'end', behavior: 'smooth' })}>Exercise in progress at the piano ↑</button>}
      {active}
    </div>
  );
}
