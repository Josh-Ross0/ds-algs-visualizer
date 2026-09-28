import { isConnected, type Graph } from '../../engine/graph';

export function weightedGraph(vertices: Graph['vertices'], edges: [string, string, number][]): Graph {
  return { directed: false, vertices, edges: edges.map(([u, v, w]) => ({ u, v, w })), adjOrder: {} };
}

export function connectedErrors(g: Graph): string[] {
  if (g.vertices.length === 0) return ['Add at least one vertex.'];
  return isConnected(g)
    ? []
    : ['This graph is not connected. An MST needs a connected graph: add edges or remove the isolated part.'];
}

// The 9-vertex graph of MST slides 12 and 21. The slides name only r; the rest are
// lettered left to right (a, b, c, …) so labels stay short.
export const MST_VERTICES: Graph['vertices'] = [
  { id: 'r', x: 40, y: 210 },
  { id: 'a', x: 87, y: 50 },
  { id: 'b', x: 135, y: 372 },
  { id: 'c', x: 230, y: 130 },
  { id: 'd', x: 230, y: 290 },
  { id: 'e', x: 324, y: 50 },
  { id: 'f', x: 372, y: 292 },
  { id: 'g', x: 515, y: 372 },
  { id: 'h', x: 562, y: 130 },
];
