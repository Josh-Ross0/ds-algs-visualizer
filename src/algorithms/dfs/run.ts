import { adjacency, edgeKey, vertexIds, type Graph } from '../../engine/graph';
import {
  treeEdgesFromPi, type Question, type Step, type Value, type VertexState,
} from '../../engine/trace';
import { DFS_MAIN, DFS_VISIT } from './pseudocode';
import { discoverQuestion, edgeTypeQuestion, finishQuestion, type EdgeType } from './questions';

type EmitOptions = {
  bigStep?: boolean;
  vertices?: string[];
  edges?: string[];
  note?: string;
  question?: Question;
};

export function runDfs(g: Graph): Step[] {
  const V = vertexIds(g);
  const steps: Step[] = [];
  const st: VertexState = {};
  for (const v of V) st[v] = {};
  // Edges already explored; an undirected edge is classified by the direction explored first.
  const explored = new Set<string>();
  const stack: string[] = ['DFS(G)'];
  let time: number | undefined;
  let frame: Record<string, Value> = {};

  const emit = (proc: string, line: number, o: EmitOptions = {}) => {
    steps.push(structuredClone({
      proc,
      line,
      bigStep: o.bigStep ?? false,
      vertexState: st,
      vars: { ...frame, time },
      ds: [{ kind: 'stack' as const, name: 'Call stack', items: stack }],
      highlight: { vertices: o.vertices, edges: o.edges, treeEdges: treeEdgesFromPi(g, st) },
      note: o.note,
      question: o.question,
    }));
  };

  // Lecture, "Classification in real-time": decided by v's color when (u, v) is explored.
  const classify = (u: string, v: string): EdgeType => {
    const c = st[v].color;
    if (c === 'white') return 'tree';
    if (c === 'gray') return 'back';
    return (st[u].d as number) < (st[v].d as number) ? 'forward' : 'crossing';
  };

  const visit = (u: string) => {
    stack.push(`DFS_Visit(G, ${u})`);
    frame = { u };
    time = time! + 1;
    emit(DFS_VISIT, 1, { vertices: [u] });
    st[u].d = time;
    emit(DFS_VISIT, 2, { bigStep: true, vertices: [u], note: `${u} is discovered at time ${time}.` });
    st[u].color = 'gray';
    emit(DFS_VISIT, 3, { vertices: [u] });
    for (const v of adjacency(g, u)) {
      frame = { u, v };
      const key = edgeKey(g, u, v);
      const hl = { vertices: [u, v], edges: [key] };
      const isWhite = st[v].color === 'white';
      emit(DFS_VISIT, 4, {
        ...hl,
        question: isWhite
          ? discoverQuestion(v, `${v} is the next white vertex in G.Adj[${u}], so DFS_Visit(G, ${v}) is called.`)
          : undefined,
      });
      let question: Question | undefined;
      if (!explored.has(key)) {
        explored.add(key);
        const t = classify(u, v);
        // Staff decision, 2026-09-28: only non-tree edges are asked about.
        if (t !== 'tree') {
          question = edgeTypeQuestion(u, v, t, st[u].d as number, st[v].d as number | undefined, g.directed);
        }
      }
      emit(DFS_VISIT, 5, { ...hl, note: `${v}.color is ${st[v].color}.`, question });
      if (!isWhite) continue;
      st[v].pi = u;
      emit(DFS_VISIT, 6, hl);
      emit(DFS_VISIT, 7, hl);
      visit(v);
    }
    frame = { u };
    st[u].color = 'black';
    emit(DFS_VISIT, 8, { vertices: [u] });
    time = time! + 1;
    emit(DFS_VISIT, 9, { vertices: [u], question: finishQuestion(u, time) });
    st[u].f = time;
    emit(DFS_VISIT, 10, { bigStep: true, vertices: [u], note: `${u} is retracted at time ${time}.` });
    stack.pop();
  };

  for (const u of V) {
    frame = { u };
    emit(DFS_MAIN, 1, { vertices: [u] });
    st[u].color = 'white';
    emit(DFS_MAIN, 2, { vertices: [u] });
    st[u].pi = null;
    emit(DFS_MAIN, 3, { vertices: [u] });
  }
  frame = {};
  time = 0;
  emit(DFS_MAIN, 4);
  for (const u of V) {
    frame = { u };
    const isWhite = st[u].color === 'white';
    emit(DFS_MAIN, 5, {
      vertices: [u],
      question: isWhite
        ? discoverQuestion(u, `${u} is the next white vertex of G.V in label order, so DFS_Visit(G, ${u}) is called.`)
        : undefined,
    });
    emit(DFS_MAIN, 6, { vertices: [u], note: `${u}.color is ${st[u].color}.` });
    if (!isWhite) continue;
    emit(DFS_MAIN, 7, { vertices: [u] });
    visit(u);
  }
  return steps;
}
