import type { Proc } from '../types';

export const BFS_MAIN = 'BFS';
export const BFS_INIT = 'BFS Initialization';

export const bfsProcs: Proc[] = [
  {
    name: BFS_MAIN,
    signature: 'BFS(G, s)',
    lines: [
      'BFS Initialization(G, s, Q)',
      'while Q ≠ ∅ do',
      '    u = Dequeue(Q)',
      '    for all v ∈ G.Adj[u] do',
      '        if v.color == white then',
      '            v.color = gray',
      '            v.d = u.d + 1',
      '            v.π = u',
      '            Enqueue(Q, v)',
      '    u.color = black',
    ],
  },
  {
    name: BFS_INIT,
    signature: 'BFS Initialization(G, s, Q)',
    lines: [
      'for all v ∈ G.V − {s} do',
      '    v.color = white',
      '    v.d = ∞',
      '    v.π = NIL',
      's.color = gray',
      's.d = 0',
      's.π = NIL',
      'Q = ∅',
      'Enqueue(Q, s)',
    ],
  },
];
