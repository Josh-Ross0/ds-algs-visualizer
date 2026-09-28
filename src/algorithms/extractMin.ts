import { compareLabels } from '../engine/graph';
import { formatValue, type DSView, type Question, type VertexState } from '../engine/trace';

// Extract_Min order: by the key attribute, ties by label (∞ − ∞ is NaN, which falls through to the label).
export function byKey(st: VertexState, attr: string) {
  return (a: string, b: string) => (st[a][attr] as number) - (st[b][attr] as number) || compareLabels(a, b);
}

// Extract_Min on Q: the minimum, and the other vertices with the same key.
export function extractMin(Q: string[], st: VertexState, attr: string): { u: string; tied: string[] } {
  const [u, ...rest] = [...Q].sort(byKey(st, attr));
  return { u, tied: rest.filter((x) => st[x][attr] === st[u][attr]) };
}

// The abstract set Q, listed in Extract_Min order.
export function keyedQ(Q: string[], st: VertexState, attr: string): DSView {
  return { kind: 'keyed', name: 'Q', key: attr, items: [...Q].sort(byKey(st, attr)).map((id) => ({ id, value: st[id][attr] })) };
}

export function extractMinQuestion(
  type: string, line: number, u: string, attr: string, st: VertexState, tied: string[],
): Question {
  const tie = tied.length > 0 ? `; it ties with ${tied.join(', ')} and ties break by label` : '';
  return {
    type,
    prompt: `Line ${line}: which vertex does Extract_Min(Q) return?`,
    answer: { kind: 'vertex', value: u },
    explain: `${u}.${attr} = ${formatValue(st[u][attr])} is the smallest ${attr} in Q${tie}.`,
  };
}
