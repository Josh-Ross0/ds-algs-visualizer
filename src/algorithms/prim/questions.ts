import { formatValue, type Question } from '../../engine/trace';

export const primQuestionTypes = [
  { type: 'prim.extract', label: 'Which vertex Extract_Min returns' },
  { type: 'prim.key', label: 'Value of v.key after lines 10–12' },
];

// Asked only when v ∈ Q, so the answer is min(v.key, w(u, v)).
export function keyQuestion(u: string, v: string, w: number, oldKey: number): Question {
  const updates = w < oldKey;
  return {
    type: 'prim.key',
    prompt: `Lines 10–12: what is ${v}.key after this check?`,
    answer: { kind: 'number', value: updates ? w : oldKey },
    explain: updates
      ? `${v} ∈ Q and w(${u}, ${v}) = ${w} < ${v}.key = ${formatValue(oldKey)}, so ${v}.key becomes ${w} and ${v}.π = ${u}.`
      : `w(${u}, ${v}) = ${w} is not less than ${v}.key = ${formatValue(oldKey)}, so ${v}.key stays ${formatValue(oldKey)}.`,
  };
}
