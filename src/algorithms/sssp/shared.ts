import type { Graph } from '../../engine/graph';
import type { Params, Proc } from '../types';

export const INIT = 'Initialize_Single_Source';
export const RELAX = 'Relax';

// Shortest Paths slide 9.
export const initProc: Proc = {
  name: INIT,
  signature: 'Initialize_Single_Source(G, s)',
  lines: [
    'for all v ∈ G.V do',
    '    v.d = ∞',
    '    v.π = NIL',
    's.d = 0',
  ],
};

// Shortest Paths slide 12.
export const relaxProc: Proc = {
  name: RELAX,
  signature: 'Relax(u, v, w)',
  lines: [
    'if v.d > u.d + w(u, v) then',
    '    v.d = u.d + w(u, v)',
    '    v.π = u',
  ],
};

export function weightedDigraph(vertices: Graph['vertices'], edges: [string, string, number][]): Graph {
  return { directed: true, vertices, edges: edges.map(([u, v, w]) => ({ u, v, w })), adjOrder: {} };
}

export function sourceErrors(g: Graph, p: Params): string[] {
  const ok = p.s !== undefined && g.vertices.some((v) => v.id === p.s);
  return ok ? [] : ['Choose a source vertex s.'];
}
