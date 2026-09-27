import { useState } from 'react';
import { formatAnswer, type Answer, type Question } from '../engine/trace';

type Props = { question: Question; vertices: string[]; onAnswer(a: Answer): void; onSkip(): void };

export function QuestionOverlay({ question, vertices, onAnswer, onSkip }: Props) {
  const [text, setText] = useState('');
  const kind = question.answer.kind;
  return (
    <div className="question" role="dialog" aria-label="Predict the next step">
      <p className="question-prompt">{question.prompt}</p>
      {kind === 'vertex' && (
        <>
          <p className="muted">Click a vertex in the graph or choose below.</p>
          <div className="choices">
            {vertices.map((v) => (
              <button key={v} type="button" onClick={() => onAnswer({ kind: 'vertex', value: v })}>{v}</button>
            ))}
          </div>
        </>
      )}
      {kind === 'number' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            onAnswer({ kind: 'number', value: t === '∞' || t.toLowerCase() === 'inf' ? Infinity : Number(t) });
          }}
        >
          <input aria-label="Your answer" value={text} onChange={(e) => setText(e.target.value)} inputMode="numeric" />
          <button type="submit">Check</button>
        </form>
      )}
      {kind === 'yesno' && (
        <div className="choices">
          <button type="button" onClick={() => onAnswer({ kind: 'yesno', value: true })}>Yes</button>
          <button type="button" onClick={() => onAnswer({ kind: 'yesno', value: false })}>No</button>
        </div>
      )}
      <button type="button" className="skip" onClick={onSkip}>Skip</button>
    </div>
  );
}

export function Feedback({ correct, question }: { correct: boolean; question: Question }) {
  return (
    <p role="status" className={correct ? 'feedback good' : 'feedback bad'}>
      {correct ? `Correct. ${question.explain}` : `Not quite. The answer is ${formatAnswer(question.answer)}. ${question.explain}`}
    </p>
  );
}
