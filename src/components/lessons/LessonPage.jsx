import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Theory from './Theory.jsx';
import StepExercise from './StepExercise.jsx';
import RhythmExercise from './RhythmExercise.jsx';
import EarExercise from './EarExercise.jsx';
import ChoiceExercise from './ChoiceExercise.jsx';
import PlaylistExercise from './PlaylistExercise.jsx';
import { playingViewDelta } from '../../lessons/playingView.js';
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

  // A lesson can need a keyboard layout (the Scales tab slides the keys so each scale fits)
  useEffect(() => {
    if (lesson.layout == null) return;
    piano.setLayout(lesson.layout);
    return () => piano.setLayout(null);
  }, [lesson.layout]);

  // Exercises render under the piano so the glowing keys and the prompt are
  // on screen together; bring that area into view when one starts.
  function show(next, scrollTo) {
    setPhase(next);
    requestAnimationFrame(() => scrollTo?.scrollIntoView({ block: next === 'theory' ? 'start' : 'end', behavior: 'smooth' }));
  }

  // Sheet Reading exercises need the keys and the staff in view together
  const isSheet = lesson.id.startsWith('sr-');
  function scrollToPlayingView() {
    const keys = piano.slot?.parentElement.querySelector('.piano');
    if (!keys) return;
    const delta = playingViewDelta({
      keysTop: keys.getBoundingClientRect().top,
      panelBottom: piano.slot.getBoundingClientRect().bottom,
      windowHeight: window.innerHeight,
    });
    window.scrollBy({ top: delta, behavior: 'smooth' });
  }
  function goToExercise() {
    // next frame, so a just-opened exercise has its full height
    requestAnimationFrame(() => {
      if (isSheet) scrollToPlayingView();
      else piano.slot?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    });
  }
  function startExercise() {
    setPhase('exercise');
    goToExercise();
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

  // N = Next lesson, live only while its button shows (N plays no note)
  const canNext = phase === 'result' && Math.max(result?.stars ?? 0, bestStars) >= PASS_STARS && hasNext;
  const next = () => { onNext(); pageRef.current?.scrollIntoView({ behavior: 'smooth' }); };
  const shortcuts = useRef({});
  shortcuts.current = { KeyN: canNext ? next : null };
  useEffect(() => {
    const onKey = e => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input, textarea')) return;
      shortcuts.current[e.code]?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Space (or a left Shift tap) = Start exercise / Stop / Try again. During an exercise, one
  // with its own start (rhythm) can take it over through registerStartStop; otherwise
  // it stops the exercise and goes back to the lesson notes.
  const exerciseStartStop = useRef(null);
  const registerStartStop = fn => { exerciseStartStop.current = fn; return () => { if (exerciseStartStop.current === fn) exerciseStartStop.current = null; }; };
  const startStop = useRef();
  startStop.current = phase === 'theory' ? startExercise
    : phase === 'result' ? retry
    : () => (exerciseStartStop.current ? exerciseStartStop.current() : show('theory', pageRef.current));
  useEffect(() => piano.onStartStop(() => startStop.current()), []);

  const Exercise = { rhythm: RhythmExercise, ear: EarExercise, choice: ChoiceExercise, playlist: PlaylistExercise }[lesson.exercise.type] ?? StepExercise;
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
          registerStartStop={registerStartStop}
          {...(isSheet && { onStart: goToExercise })}
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
            <button onClick={retry}>↻ Try again <kbd>Space</kbd></button>
            <button onClick={backToNotes}>Review notes</button>
            {canNext && <button className="primary" onClick={next}>Next lesson → <kbd>N</kbd></button>}
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
        ? <button className="primary big" onClick={startExercise}>Start exercise ↑ <kbd>Space</kbd></button>
        : <button className="big" onClick={goToExercise}>Exercise in progress at the piano ↑</button>}
      {active}
    </div>
  );
}
