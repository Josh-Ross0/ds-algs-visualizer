export const MAX_VERTICES = 10;

// Weight of an edge that has none (new edges in a weighted editor start here too).
export const DEFAULT_WEIGHT = 1;

export type Vertex = { id: string; x: number; y: number };
export type Edge = { u: string; v: string; w?: number };
export type Graph = {
  directed: boolean;
  vertices: Vertex[];
  edges: Edge[];
  adjOrder: Record<string, string[]>;
  // Displayed order of G.E as edge keys (Bellman-Ford scans edges in this order).
  edgeOrder?: string[];
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

function findEdge(g: Graph, u: string, v: string): Edge | undefined {
  const key = edgeKey(g, u, v);
  return g.edges.find((e) => edgeKey(g, e.u, e.v) === key);
}

export function weightOf(g: Graph, u: string, v: string): number {
  const e = findEdge(g, u, v);
  if (!e) throw new Error(`No edge ${edgeKey(g, u, v)}`);
  return e.w ?? DEFAULT_WEIGHT;
}

export function setWeight(g: Graph, u: string, v: string, w: number): Graph {
  const key = edgeKey(g, u, v);
  return { ...g, edges: g.edges.map((e) => (edgeKey(g, e.u, e.v) === key ? { ...e, w } : e)) };
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
  const edges = g.edges.filter((e) => e.u !== id && e.v !== id);
  const kept = new Set(edges.map((e) => edgeKey(g, e.u, e.v)));
  return {
    ...g,
    vertices: g.vertices.filter((v) => v.id !== id),
    edges,
    adjOrder,
    edgeOrder: g.edgeOrder?.filter((k) => kept.has(k)),
  };
}

export function addEdge(g: Graph, u: string, v: string, w?: number): Graph {
  if (u === v || hasEdge(g, u, v)) return g;
  const edge: Edge = w === undefined ? { u, v } : { u, v, w };
  return { ...g, edges: [...g.edges, edge] };
}

export function removeEdge(g: Graph, u: string, v: string): Graph {
  const key = edgeKey(g, u, v);
  return {
    ...g,
    edges: g.edges.filter((e) => edgeKey(g, e.u, e.v) !== key),
    edgeOrder: g.edgeOrder?.filter((k) => k !== key),
  };
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

function endpointsByLabel(g: Graph, e: Edge): [string, string] {
  if (g.directed || compareLabels(e.u, e.v) <= 0) return [e.u, e.v];
  return [e.v, e.u];
}

// G.E in displayed order: the custom order first, then any other edges by label.
export function edgeList(g: Graph): Edge[] {
  const byKey = new Map(g.edges.map((e) => [edgeKey(g, e.u, e.v), e]));
  const custom = (g.edgeOrder ?? []).flatMap((k) => byKey.get(k) ?? []);
  const natural = [...g.edges].sort((a, b) => {
    const [a1, a2] = endpointsByLabel(g, a);
    const [b1, b2] = endpointsByLabel(g, b);
    return compareLabels(a1, b1) || compareLabels(a2, b2);
  });
  return [...custom, ...natural.filter((e) => !custom.includes(e))];
}

export function moveInEdgeList(g: Graph, index: number, delta: number): Graph {
  const list = edgeList(g).map((e) => edgeKey(g, e.u, e.v));
  const target = index + delta;
  if (target < 0 || target >= list.length) return g;
  [list[index], list[target]] = [list[target], list[index]];
  return { ...g, edgeOrder: list };
}

export function resetEdgeOrder(g: Graph): Graph {
  return { ...g, edgeOrder: undefined };
}

// "(u, v)" as the lecture writes an edge; undirected endpoints in label order.
export function edgeName(g: Graph, e: Edge): string {
  const [a, b] = endpointsByLabel(g, e);
  return `(${a}, ${b})`;
}

// True when every vertex is reachable from every other, ignoring edge direction.
export function isConnected(g: Graph): boolean {
  const ids = vertexIds(g);
  if (ids.length === 0) return true;
  const seen = new Set([ids[0]]);
  const stack = [ids[0]];
  while (stack.length > 0) {
    const x = stack.pop()!;
    for (const e of g.edges) {
      const y = e.u === x ? e.v : e.v === x ? e.u : null;
      if (y !== null && !seen.has(y)) {
        seen.add(y);
        stack.push(y);
      }
    }
  }
  return seen.size === ids.length;
}
