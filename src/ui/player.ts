import { checkAnswer, type Answer, type Question, type Step } from '../engine/trace';

export type Outcome = 'correct' | 'wrong' | 'skipped';
export type PlayerState = {
  index: number;
  playing: boolean;
  pending: number | null;
  outcomes: Record<number, Outcome>;
  feedback: { correct: boolean; question: Question } | null;
};
export type PlayerAction =
  | { type: 'next' | 'prev' | 'bigNext' | 'bigPrev' | 'play' | 'pause' | 'tick' | 'skip' }
  | { type: 'seek'; index: number }
  | { type: 'answer'; answer: Answer };

export function initialPlayerState(): PlayerState {
  return { index: 0, playing: false, pending: null, outcomes: {}, feedback: null };
}

export function score(s: PlayerState): { correct: number; answered: number } {
  const all = Object.values(s.outcomes);
  return {
    correct: all.filter((o) => o === 'correct').length,
    answered: all.filter((o) => o !== 'skipped').length,
  };
}

export function createPlayerReducer(steps: Step[], asked: (q: Question) => boolean) {
  const last = steps.length - 1;
  const needsAsk = (s: PlayerState, i: number) => {
    const q = steps[i].question;
    return q !== undefined && asked(q) && s.outcomes[i] === undefined;
  };
  const moveTo = (s: PlayerState, i: number): PlayerState => ({ ...s, index: i, feedback: null });
  const forwardTo = (s: PlayerState, i: number): PlayerState =>
    needsAsk(s, i) ? { ...s, pending: i, feedback: null } : moveTo(s, i);

  return function reducer(s: PlayerState, a: PlayerAction): PlayerState {
    if (s.pending !== null && !['answer', 'skip', 'play', 'pause'].includes(a.type)) return s;
    switch (a.type) {
      case 'next':
      case 'tick':
        if (s.index >= last) return { ...s, playing: false };
        return forwardTo(s, s.index + 1);
      case 'prev':
        return moveTo(s, Math.max(0, s.index - 1));
      case 'bigNext': {
        if (s.index >= last) return s;
        let i = s.index + 1;
        while (i < last && !steps[i].bigStep && !needsAsk(s, i)) i++;
        return forwardTo(s, i);
      }
      case 'bigPrev': {
        let i = s.index - 1;
        while (i > 0 && !steps[i].bigStep) i--;
        return moveTo(s, Math.max(0, i));
      }
      case 'seek':
        return moveTo(s, Math.min(last, Math.max(0, a.index)));
      case 'play':
        return { ...s, playing: true };
      case 'pause':
        return { ...s, playing: false };
      case 'answer': {
        if (s.pending === null) return s;
        const question = steps[s.pending].question!;
        const correct = checkAnswer(question, a.answer);
        return {
          ...s,
          index: s.pending,
          pending: null,
          playing: correct && s.playing,
          outcomes: { ...s.outcomes, [s.pending]: correct ? 'correct' : 'wrong' },
          feedback: { correct, question },
        };
      }
      case 'skip':
        if (s.pending === null) return s;
        return {
          ...s,
          index: s.pending,
          pending: null,
          outcomes: { ...s.outcomes, [s.pending]: 'skipped' },
          feedback: null,
        };
    }
  };
}
