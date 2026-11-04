import { useEffect, useRef, useState } from 'react';
import StepExercise from './StepExercise.jsx';

// Plays a list of lessons one after another, with a counted-down break between them.
// The next lesson starts by itself; the keys stay free to play during the break.
export default function PlaylistExercise({ exercise, piano, onProgress, onComplete }) {
  const { lessons, breakSeconds } = exercise;
  const [index, setIndex] = useState(0);
  const [restLeft, setRestLeft] = useState(null); // seconds left in the break, null while playing
  const stars = useRef([]);
  const current = lessons[index];
  const next = lessons[index + 1];

  useEffect(() => {
    if (restLeft === null) return;
    if (restLeft === 0) {
      setRestLeft(null);
      setIndex(i => i + 1);
      return;
    }
    onProgress(`BREAK ${restLeft}S`);
    const t = setTimeout(() => setRestLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [restLeft]);

  function finishLesson(result) {
    stars.current.push(result.stars);
    if (next) {
      setRestLeft(breakSeconds);
      return;
    }
    const total = stars.current.reduce((sum, s) => sum + s, 0);
    onComplete({
      stars: Math.round(total / lessons.length),
      detail: `All ${lessons.length} lessons played, one after another.`,
    });
  }

  if (restLeft !== null) {
    return (
      <div className="exercise">
        <div className="prompt">✨ Break… next: {next.title} in {restLeft}s</div>
        <div className="exercise-hint">{index + 1} of {lessons.length} done. Rest your hands, or play freely.</div>
      </div>
    );
  }

  return (
    <div className="playlist">
      <div className="exercise-hint">{index + 1} of {lessons.length}: <b>{current.title}</b></div>
      <StepExercise
        key={index}
        exercise={current.exercise}
        piano={piano}
        onProgress={text => onProgress(`${index + 1}/${lessons.length} ${text}`)}
        onComplete={finishLesson}
      />
    </div>
  );
}
