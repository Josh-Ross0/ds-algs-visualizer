import { initProc, relaxProc } from '../sssp/shared';
import type { Proc } from '../types';

export const BF = 'Bellman_Ford';

// Shortest Paths slide 29.
export const bellmanFordProcs: Proc[] = [
  {
    name: BF,
    signature: 'Bellman_Ford(G, w, s)',
    lines: [
      'Initialize_Single_Source(G, s)',
      'for i = 1, …, |G.V| − 1 do',
      '    for all (u, v) ∈ G.E do',
      '        Relax(u, v, w)',
      'for all (u, v) ∈ G.E do',
      '    if v.d > u.d + w(u, v) then',
      '        error: “negative weight cycle”',
    ],
  },
  initProc,
  relaxProc,
];
