import { useEffect, useRef, useState } from 'react';
import { formatAnswer, type Answer, type Question } from '../engine/trace';

type Props = {
  question: Question;
  vertices: string[];
  nodes?: { id: string; label: string }[];
  onAnswer(a: Answer): void;
  onSkip(): void;
};

export function QuestionOverlay({ question, vertices, nodes = [], onAnswer, onSkip }: Props) {
  const [text, setText] = useState('');
  const kind = question.answer.kind;
  const answer = question.answer;
  const firstControlRef = useRef<HTMLButtonElement | HTMLInputElement | null>(null);
  const setFirstControl = (el: HTMLButtonElement | HTMLInputElement | null) => {
    firstControlRef.current = el;
  };
  useEffect(() => {
    firstControlRef.current?.focus();
  }, []);
  const isValidNumber = () => {
    const t = text.trim();
    return t !== '' && (t === '∞' || t.toLowerCase() === 'inf' || Number.isFinite(Number(t)));
  };
  return (
    <div className="question" role="dialog" aria-label="Predict the next step">
      <p className="question-prompt">{question.prompt}</p>
      {kind === 'vertex' && (
        <>
          <p className="muted">Click a vertex in the graph or choose below.</p>
          <div className="choices">
            {vertices.map((v, i) => (
              <button
                key={v}
                ref={i === 0 ? setFirstControl : undefined}
                type="button"
                onClick={() => onAnswer({ kind: 'vertex', value: v })}
              >{v}</button>
            ))}
          </div>
        </>
      )}
      {kind === 'number' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!isValidNumber()) return;
            const t = text.trim();
            onAnswer({ kind: 'number', value: t === '∞' || t.toLowerCase() === 'inf' ? Infinity : Number(t) });
          }}
        >
          <input
            ref={setFirstControl}
            aria-label="Your answer"
            value={text}
            onChange={(e) => setText(e.target.value)}
            inputMode="numeric"
          />
          <button type="submit" disabled={!isValidNumber()}>Check</button>
        </form>
      )}
      {kind === 'yesno' && (
        <div className="choices">
          <button ref={setFirstControl} type="button" onClick={() => onAnswer({ kind: 'yesno', value: true })}>Yes</button>
          <button type="button" onClick={() => onAnswer({ kind: 'yesno', value: false })}>No</button>
        </div>
      )}
      {answer.kind === 'node' && (
        <>
          <p className="muted">Click a node in the tree or choose below.</p>
          <div className="choices">
            {nodes.map((n, i) => (
              <button
                key={n.id}
                ref={i === 0 ? setFirstControl : undefined}
                type="button"
                onClick={() => onAnswer({ kind: 'node', value: n.id, label: n.label, nil: answer.nil })}
              >{n.label}</button>
            ))}
            {answer.nil && (
              <button type="button" onClick={() => onAnswer({ kind: 'node', value: null, label: 'NIL', nil: true })}>NIL</button>
            )}
          </div>
        </>
      )}
      {answer.kind === 'choice' && (
        <div className="choices">
          {answer.options.map((o, i) => (
            <button
              key={o}
              ref={i === 0 ? setFirstControl : undefined}
              type="button"
              onClick={() => onAnswer({ kind: 'choice', value: o, options: answer.options })}
            >{o}</button>
          ))}
        </div>
      )}
      <button type="button" className="skip" onClick={onSkip}>Skip</button>
    </div>
  );
}

type FeedbackProps = { correct: boolean; question: Question; onContinue(): void };

export function Feedback({ correct, question, onContinue }: FeedbackProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    continueRef.current?.focus();
  }, []);
  return (
    <div className={correct ? 'feedback result good' : 'feedback result bad'}>
      <p role="status">
        {correct ? `Correct. ${question.explain}` : `Not quite. The answer is ${formatAnswer(question.answer)}. ${question.explain}`}
      </p>
      <button ref={continueRef} type="button" className="primary" onClick={onContinue}>Continue</button>
    </div>
  );
}
