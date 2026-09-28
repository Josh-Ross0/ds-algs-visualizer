import type { Proc } from '../types';

export const KRUSKAL = 'Kruskal';

// MST slide 20.
export const kruskalProcs: Proc[] = [
  {
    name: KRUSKAL,
    signature: 'Kruskal(G, w)',
    lines: [
      'copy the edges in G.E into array A[1 … m]',
      'sort A w.r.t. the edge weights',
      'T = ∅',
      'for i = 1, … m do',
      '    e = A[i]',
      '    if (G.V, T ∪ {e}) is cycle free then',
      '        T = T ∪ {e}',
      'return T',
    ],
  },
];
