import { formatValue, type Question, type Value } from '../../engine/trace';

export const dijkstraQuestionTypes = [
  { type: 'dijkstra.extract', label: 'Which vertex Extract_Min returns' },
  { type: 'dijkstra.relax', label: 'Does Relax update v.d' },
];

export function extractQuestion(u: string, d: Value, tiedWith: string[]): Question {
  const tie = tiedWith.length > 0 ? `; it ties with ${tiedWith.join(', ')} and ties break by label` : '';
  return {
    type: 'dijkstra.extract',
    prompt: 'Line 4: which vertex does Extract_Min(Q) return?',
    answer: { kind: 'vertex', value: u },
    explain: `${u}.d = ${formatValue(d)} is the smallest d in Q${tie}.`,
  };
}
