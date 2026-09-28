import type { Question } from '../../engine/trace';

export const kruskalQuestionTypes = [{ type: 'kruskal.accept', label: 'Is T ∪ {e} cycle free' }];

// path: the vertices from u to v already joined in T, or null.
export function acceptQuestion(e: string, u: string, v: string, path: string[] | null): Question {
  return {
    type: 'kruskal.accept',
    prompt: `Line 6: is (G.V, T ∪ {${e}}) cycle free?`,
    answer: { kind: 'yesno', value: path === null },
    explain: path === null
      ? `T has no path between ${u} and ${v}, so adding ${e} closes no cycle.`
      : `T already has the path ${path.join(' – ')}, so ${e} would close a cycle.`,
  };
}
