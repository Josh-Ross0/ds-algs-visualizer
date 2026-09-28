import type { Question } from '../../engine/trace';

export type EdgeType = 'tree' | 'back' | 'forward' | 'crossing';

export const dfsQuestionTypes = [
  { type: 'dfs.discover', label: 'Which vertex is discovered next' },
  { type: 'dfs.edgeType', label: 'Type of each non-tree edge' },
  { type: 'dfs.finish', label: 'Value of u.f' },
];

export function discoverQuestion(v: string, explain: string): Question {
  return {
    type: 'dfs.discover',
    prompt: 'Which vertex will DFS discover next?',
    answer: { kind: 'vertex', value: v },
    explain,
  };
}

export function finishQuestion(u: string, t: number): Question {
  return {
    type: 'dfs.finish',
    prompt: `Lines 9–10: what value will ${u}.f get?`,
    answer: { kind: 'number', value: t },
    explain: `time was ${t - 1}; line 9 increments it to ${t} and line 10 sets ${u}.f = ${t}.`,
  };
}

export function edgeTypeQuestion(
  u: string, v: string, type: EdgeType, ud: number, vd: number | undefined, directed: boolean,
): Question {
  const why: Record<EdgeType, string> = {
    tree: `${v} is white, so ${v} is discovered from ${u}.`,
    back: `${v} is gray, so ${v} is an ancestor of ${u} that is still being explored.`,
    forward: `${v} is black and ${u}.d = ${ud} < ${v}.d = ${vd}, so ${v} is a descendant of ${u}.`,
    crossing: `${v} is black and ${u}.d = ${ud} > ${v}.d = ${vd}, so ${v} was retracted before ${u} was discovered.`,
  };
  return {
    type: 'dfs.edgeType',
    prompt: `Line 5 explores the edge (${u}, ${v}) for the first time. What type is it?`,
    answer: {
      kind: 'choice',
      value: type,
      options: directed ? ['tree', 'back', 'forward', 'crossing'] : ['tree', 'back'],
    },
    explain: why[type],
  };
}
