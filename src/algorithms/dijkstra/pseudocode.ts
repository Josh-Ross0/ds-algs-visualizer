import { initProc, relaxProc } from '../sssp/shared';
import type { Proc } from '../types';

export const DIJKSTRA = 'Dijkstra';

// Shortest Paths slide 39.
export const dijkstraProcs: Proc[] = [
  {
    name: DIJKSTRA,
    signature: 'Dijkstra(G, w, s)',
    lines: [
      'Initialize_Single_Source(G, s)',
      'Q = G.V',
      'while Q ≠ ∅ do',
      '    u = Extract_Min(Q)    ▷ minimum w.r.t. d',
      '    for all v ∈ G.Adj[u] do',
      '        Relax(u, v, w)',
    ],
  },
  initProc,
  relaxProc,
];
