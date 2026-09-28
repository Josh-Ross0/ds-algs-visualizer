import type { Proc } from '../types';

export const DFS_MAIN = 'DFS';
export const DFS_VISIT = 'DFS_Visit';

export const dfsProcs: Proc[] = [
  {
    name: DFS_MAIN,
    signature: 'DFS(G)',
    lines: [
      'for all u ∈ G.V do',
      '    u.color = white',
      '    u.π = NIL',
      'time = 0',
      'for all u ∈ G.V do',
      '    if u.color == white then',
      '        DFS_Visit(G, u)',
    ],
  },
  {
    name: DFS_VISIT,
    signature: 'DFS_Visit(G, u)',
    lines: [
      'time = time + 1',
      'u.d = time',
      'u.color = gray',
      'for all v ∈ G.Adj[u] do',
      '    if v.color == white then',
      '        v.π = u',
      '        DFS_Visit(G, v)',
      'u.color = black',
      'time = time + 1',
      'u.f = time',
    ],
  },
];
