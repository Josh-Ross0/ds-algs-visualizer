import { addEdge, vertexIds, type Graph } from '../../engine/graph';

// Test helpers: an independent shortest-path reference and random weighted digraphs.

export function weightedDigraphForTest(edges: [string, string, number][]): Graph {
  const ids = [...new Set(edges.flatMap(([u, v]) => [u, v]).concat('s'))];
  return {
    directed: true,
    vertices: ids.map((id, i) => ({ id, x: 40 + i * 50, y: 100 })),
    edges: edges.map(([u, v, w]) => ({ u, v, w })),
    adjOrder: {},
  };
}

// mulberry32: tiny deterministic PRNG, no new dependency.
export function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1–10 vertices a, b, …; random edges with integer weights in [minW, minW + 12].
export function randomWeightedDigraph(rand: () => number, minW: number): Graph {
  const n = 1 + Math.floor(rand() * 10);
  const vertices = Array.from({ length: n }, (_, i) => ({ id: String.fromCharCode(97 + i), x: 40 + i * 50, y: 100 }));
  let g: Graph = { directed: true, vertices, edges: [], adjOrder: {} };
  const ids = vertices.map((v) => v.id);
  const target = Math.floor(rand() * (n * (n - 1) + 1));
  for (let tries = 0; tries < n * n * 4 && g.edges.length < target; tries++) {
    const u = ids[Math.floor(rand() * n)];
    const v = ids[Math.floor(rand() * n)];
    g = addEdge(g, u, v, minW + Math.floor(rand() * 13));
  }
  return g;
}

// Floyd–Warshall from s, plus whether a negative cycle is reachable from s.
export function shortestFrom(g: Graph, s: string): { d: Record<string, number>; negativeCycle: boolean } {
  const V = vertexIds(g);
  const dist: Record<string, Record<string, number>> = {};
  for (const a of V) {
    dist[a] = {};
    for (const b of V) dist[a][b] = a === b ? 0 : Infinity;
  }
  for (const e of g.edges) dist[e.u][e.v] = Math.min(dist[e.u][e.v], e.w!);
  for (const k of V) {
    for (const i of V) {
      for (const j of V) {
        if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
      }
    }
  }
  const negativeCycle = V.some((v) => dist[s][v] < Infinity && dist[v][v] < 0);
  return { d: dist[s], negativeCycle };
}
