import type { Question } from '../../engine/trace';

export const BST_QUESTION_TYPES = [
  { type: 'bst.search', label: 'Tree_Search: stop, left or right' },
  { type: 'bst.minimum', label: 'Which node Tree_Minimum returns' },
  { type: 'bst.successor', label: 'Which node Tree_Successor returns' },
  { type: 'bst.insert', label: 'Tree_Insert: does z go left or right' },
  { type: 'bst.deleteCase', label: 'Which delete case applies' },
];

export type SearchMove = 'stop here' | 'go left' | 'go right';

export function searchQuestion(xKey: number | null, k: number, move: SearchMove): Question {
  const at = xKey === null ? 'x = NIL' : `x.key = ${xKey}`;
  const why: Record<SearchMove, string> = {
    'stop here': xKey === null ? 'x == nil, so Tree_Search returns NIL.' : `x.key == k = ${k}, so Tree_Search returns x.`,
    'go left': `k = ${k} < x.key = ${xKey}, so the search continues in x.left.`,
    'go right': `k = ${k} > x.key = ${xKey}, so the search continues in x.right.`,
  };
  return {
    type: 'bst.search',
    prompt: `Tree_Search(x, ${k}) with ${at}: stop here, go left, or go right?`,
    answer: { kind: 'choice', value: move, options: ['stop here', 'go left', 'go right'] },
    explain: why[move],
  };
}

export function nodeQuestion(type: string, prompt: string, id: string | null, label: string, nil: boolean, explain: string): Question {
  return { type, prompt, answer: { kind: 'node', value: id, label, nil }, explain };
}
