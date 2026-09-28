import type { Proc } from '../types';

export const PRIM = 'Prim';

// MST slide 11.
export const primProcs: Proc[] = [
  {
    name: PRIM,
    signature: 'Prim(G, w)',
    lines: [
      'for all u ∈ G.V do',
      '    u.π = NIL',
      '    u.key = ∞',
      'pick an arbitrary vertex r ∈ G.V',
      'r.key = 0',
      'Q = G.V',
      'while Q ≠ ∅ do',
      '    u = Extract_Min(Q)    ▷ minimum w.r.t. key',
      '    for all v ∈ G.Adj[u] do',
      '        if v ∈ Q and w(u, v) < v.key then',
      '            v.key = w(u, v)',
      '            v.π = u',
    ],
  },
];
