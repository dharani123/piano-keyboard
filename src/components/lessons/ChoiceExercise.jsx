import { useEffect, useState } from 'react';
import { starsForMistakes } from '../../lessons/stepTrainer.js';
import RichText from './RichText.jsx';
import Staff from '../sheet/Staff.jsx';

// Multiple-choice questions, optionally about a staff picture.
// exercise = { type: 'choice', make: () => [{ prompt, staff?, options: [...], answer, why? }] }
// `answer` is the correct option's text. A wrong pick counts as a mistake and
// shows `why`; the question stays until the right option is picked.
export default function ChoiceExercise({ exercise, onProgress, onComplete }) {
  const [questions] = useState(() => exercise.make());
  const [index, setIndex] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [wrong, setWrong] = useState([]); // options already tried on this question
  const [right, setRight] = useState(false);
  const q = questions[index];
  const total = questions.length;

  useEffect(() => { onProgress(`${Math.min(index + 1, total)}/${total}`); }, [index]);

  function pick(option) {
    if (right || wrong.includes(option)) return;
    if (option !== q.answer) {
      setWrong(w => [...w, option]);
      setMistakes(m => m + 1);
      return;
    }
    setRight(true);
    setTimeout(() => {
      if (index + 1 >= total) {
        onComplete({
          stars: starsForMistakes(mistakes, total),
          detail: mistakes === 0 ? 'No mistakes, perfect!' : `${mistakes} wrong ${mistakes === 1 ? 'answer' : 'answers'}`,
        });
        return;
      }
      setIndex(index + 1);
      setWrong([]);
      setRight(false);
    }, wrong.length ? 1400 : 650);
  }

  return (
    <div className="exercise choice">
      <div className="prompt"><RichText text={q.prompt} /></div>
      {q.staff && <Staff {...q.staff} scale={1.9} />}
      <div className="choice-options">
        {q.options.map(o => (
          <button
            key={o}
            className={'choice-option' + (wrong.includes(o) ? ' wrong' : '') + (right && o === q.answer ? ' right' : '')}
            onClick={() => pick(o)}
          >
            <RichText text={o} />
          </button>
        ))}
      </div>
      <div className="exercise-hint">
        {wrong.length > 0 && q.why ? <RichText text={q.why} /> : right ? '✔ Right!' : ' '}
      </div>
      <div className="exercise-actions">
        <span className="counter">{index + 1} / {total} · mistakes {mistakes}</span>
      </div>
      <div className="progress"><div className="progress-bar" style={{ width: `${(index / total) * 100}%` }} /></div>
    </div>
  );
}
