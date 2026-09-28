import { formatValue, type Question } from '../../engine/trace';

// "u.d + w" worked out, with a negative weight in parentheses: "2 + (-1) = 1".
function sumText(ud: number, w: number): string {
  return `${formatValue(ud)} + ${w < 0 ? `(${w})` : w} = ${formatValue(ud + w)}`;
}

export function relaxNote(u: string, v: string, ud: number, w: number, vd: number): string {
  return `${v}.d = ${formatValue(vd)} ${vd > ud + w ? '>' : '≤'} ${u}.d + w(${u}, ${v}) = ${sumText(ud, w)}.`;
}

export function relaxUpdateQuestion(type: string, u: string, v: string, ud: number, w: number, vd: number): Question {
  const yes = vd > ud + w;
  return {
    type,
    prompt: `Relax line 1: is ${v}.d > ${u}.d + w(${u}, ${v})?`,
    answer: { kind: 'yesno', value: yes },
    explain: `${v}.d = ${formatValue(vd)} and ${u}.d + w(${u}, ${v}) = ${sumText(ud, w)}, so ${
      yes ? `${v}.d and ${v}.π are updated` : 'nothing changes'
    }.`,
  };
}

export function newDistanceQuestion(type: string, u: string, v: string, ud: number, w: number): Question {
  return {
    type,
    prompt: `Relax line 2: what value is assigned to ${v}.d?`,
    answer: { kind: 'number', value: ud + w },
    explain: `${v}.d = ${u}.d + w(${u}, ${v}) = ${sumText(ud, w)}.`,
  };
}
