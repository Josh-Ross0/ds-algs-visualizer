export const MAX_VERTICES = 10;

export type Vertex = { id: string; x: number; y: number };
export type Edge = { u: string; v: string; w?: number };
export type Graph = {
  directed: boolean;
  vertices: Vertex[];
  edges: Edge[];
  adjOrder: Record<string, string[]>;
};

export function compareLabels(a: string, b: string): number {
  return a.localeCompare(b, 'en', { numeric: true });
}

export function vertexIds(g: Graph): string[] {
  return g.vertices.map((v) => v.id).sort(compareLabels);
}

export function edgeKey(g: Graph, u: string, v: string): string {
  if (g.directed) return `${u}->${v}`;
  return compareLabels(u, v) <= 0 ? `${u}--${v}` : `${v}--${u}`;
}

export function hasEdge(g: Graph, u: string, v: string): boolean {
  const key = edgeKey(g, u, v);
  return g.edges.some((e) => edgeKey(g, e.u, e.v) === key);
}

function neighborsByLabel(g: Graph, u: string): string[] {
  const out: string[] = [];
  for (const e of g.edges) {
    if (e.u === u) out.push(e.v);
    else if (!g.directed && e.v === u) out.push(e.u);
  }
  return out.sort(compareLabels);
}

export function adjacency(g: Graph, u: string): string[] {
  const natural = neighborsByLabel(g, u);
  const custom = (g.adjOrder[u] ?? []).filter((x) => natural.includes(x));
  return [...custom, ...natural.filter((x) => !custom.includes(x))];
}

export function canAddVertex(g: Graph): boolean {
  return g.vertices.length < MAX_VERTICES;
}

export function nextLabel(g: Graph): string {
  const ids = g.vertices.map((v) => v.id);
  const counts = new Map<string, number>();
  const max = new Map<string, number>();
  for (const id of ids) {
    const m = /^(\D*)(\d+)$/.exec(id);
    if (!m) continue;
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
    max.set(m[1], Math.max(max.get(m[1]) ?? 0, Number(m[2])));
  }
  if (counts.size > 0) {
    const prefix = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    return `${prefix}${max.get(prefix)! + 1}`;
  }
  for (const c of 'abcdefghijklmnopqrstuvwxyz') if (!ids.includes(c)) return c;
  throw new Error('No free vertex label');
}

export function addVertex(g: Graph, x: number, y: number): Graph {
  if (!canAddVertex(g)) throw new Error(`At most ${MAX_VERTICES} vertices`);
  return { ...g, vertices: [...g.vertices, { id: nextLabel(g), x, y }] };
}

export function removeVertex(g: Graph, id: string): Graph {
  const adjOrder: Record<string, string[]> = {};
  for (const [u, list] of Object.entries(g.adjOrder)) {
    if (u !== id) adjOrder[u] = list.filter((x) => x !== id);
  }
  return {
    ...g,
    vertices: g.vertices.filter((v) => v.id !== id),
    edges: g.edges.filter((e) => e.u !== id && e.v !== id),
    adjOrder,
  };
}

export function addEdge(g: Graph, u: string, v: string, w?: number): Graph {
  if (u === v || hasEdge(g, u, v)) return g;
  const edge: Edge = w === undefined ? { u, v } : { u, v, w };
  return { ...g, edges: [...g.edges, edge] };
}

export function removeEdge(g: Graph, u: string, v: string): Graph {
  const key = edgeKey(g, u, v);
  return { ...g, edges: g.edges.filter((e) => edgeKey(g, e.u, e.v) !== key) };
}

export function moveVertex(g: Graph, id: string, x: number, y: number): Graph {
  return { ...g, vertices: g.vertices.map((v) => (v.id === id ? { id, x, y } : v)) };
}

export function setDirected(g: Graph, directed: boolean): Graph {
  const next: Graph = { ...g, directed, edges: [], adjOrder: {} };
  for (const e of g.edges) {
    if (!hasEdge(next, e.u, e.v)) next.edges.push(e);
  }
  return next;
}

export function moveInAdjacency(g: Graph, u: string, index: number, delta: number): Graph {
  const list = adjacency(g, u);
  const target = index + delta;
  if (target < 0 || target >= list.length) return g;
  [list[index], list[target]] = [list[target], list[index]];
  return { ...g, adjOrder: { ...g.adjOrder, [u]: list } };
}

export function resetAdjacency(g: Graph): Graph {
  return { ...g, adjOrder: {} };
}
