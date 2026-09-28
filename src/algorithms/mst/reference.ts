import { addEdge, isConnected, type Edge, type Graph } from '../../engine/graph';

// Random undirected graph on 1–6 vertices a, b, …, with integer weights 1–9 (may be disconnected).
export function randomWeightedGraph(rand: () => number): Graph {
  const n = 1 + Math.floor(rand() * 6);
  const vertices = Array.from({ length: n }, (_, i) => ({ id: String.fromCharCode(97 + i), x: 40 + i * 80, y: 100 }));
  let g: Graph = { directed: false, vertices, edges: [], adjOrder: {} };
  const ids = vertices.map((v) => v.id);
  const target = Math.floor(rand() * ((n * (n - 1)) / 2 + 1));
  for (let tries = 0; tries < n * n * 4 && g.edges.length < target; tries++) {
    g = addEdge(g, ids[Math.floor(rand() * n)], ids[Math.floor(rand() * n)], 1 + Math.floor(rand() * 9));
  }
  return g;
}

// Minimum total weight over all spanning trees, by trying every (n − 1)-edge subset.
export function bruteForceMstWeight(g: Graph): number {
  const need = g.vertices.length - 1;
  let best = Infinity;
  const pick = (start: number, chosen: Edge[]) => {
    if (chosen.length === need) {
      if (isConnected({ ...g, edges: chosen })) best = Math.min(best, chosen.reduce((s, e) => s + e.w!, 0));
      return;
    }
    for (let i = start; i < g.edges.length; i++) pick(i + 1, [...chosen, g.edges[i]]);
  };
  pick(0, []);
  return best;
}
