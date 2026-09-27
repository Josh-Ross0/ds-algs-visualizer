import type { Question } from '../../engine/trace';

export const bfsQuestionTypes = [
  { type: 'bfs.dequeue', label: 'Which vertex Dequeue returns' },
  { type: 'bfs.distance', label: 'New value of v.d' },
];

export function dequeueQuestion(u: string): Question {
  return {
    type: 'bfs.dequeue',
    prompt: 'Line 3: which vertex does Dequeue(Q) return?',
    answer: { kind: 'vertex', value: u },
    explain: `Q is a FIFO queue, so Dequeue returns its head: ${u}.`,
  };
}

export function distanceQuestion(u: string, v: string, ud: number): Question {
  return {
    type: 'bfs.distance',
    prompt: `Line 7: what value is assigned to ${v}.d?`,
    answer: { kind: 'number', value: ud + 1 },
    explain: `${v}.d = ${u}.d + 1 = ${ud} + 1 = ${ud + 1}.`,
  };
}
