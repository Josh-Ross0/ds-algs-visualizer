import { adjacency, edgeKey, vertexIds, type Graph } from '../../engine/graph';
import {
  treeEdgesFromPi, type Question, type Step, type Value, type VertexState,
} from '../../engine/trace';
import type { Params } from '../types';
import { BFS_INIT, BFS_MAIN } from './pseudocode';
import { dequeueQuestion, distanceQuestion } from './questions';

type EmitOptions = {
  bigStep?: boolean;
  vertices?: string[];
  edges?: string[];
  note?: string;
  question?: Question;
};

export function runBfs(g: Graph, params: Params): Step[] {
  const s = params.s;
  const V = vertexIds(g);
  const steps: Step[] = [];
  const st: VertexState = {};
  for (const v of V) st[v] = {};
  const Q: string[] = [];
  let vars: Record<string, Value> = { s };

  const emit = (proc: string, line: number, o: EmitOptions = {}) => {
    steps.push(structuredClone({
      proc,
      line,
      bigStep: o.bigStep ?? false,
      vertexState: st,
      vars,
      ds: [{ kind: 'queue' as const, name: 'Q', items: Q }],
      highlight: { vertices: o.vertices, edges: o.edges, treeEdges: treeEdgesFromPi(g, st) },
      note: o.note,
      question: o.question,
    }));
  };

  // BFS line 1 → BFS_Initialization
  emit(BFS_MAIN, 1, { vertices: [s] });
  for (const v of V.filter((x) => x !== s)) {
    vars = { s, v };
    emit(BFS_INIT, 1, { vertices: [v] });
    st[v].color = 'white';
    emit(BFS_INIT, 2, { vertices: [v] });
    st[v].d = Infinity;
    emit(BFS_INIT, 3, { vertices: [v] });
    st[v].pi = null;
    emit(BFS_INIT, 4, { vertices: [v] });
  }
  vars = { s };
  st[s].color = 'gray';
  emit(BFS_INIT, 5, { vertices: [s] });
  st[s].d = 0;
  emit(BFS_INIT, 6, { vertices: [s] });
  st[s].pi = null;
  emit(BFS_INIT, 7, { vertices: [s] });
  emit(BFS_INIT, 8);
  Q.push(s);
  emit(BFS_INIT, 9, { vertices: [s] });

  for (;;) {
    vars = { s };
    if (Q.length === 0) {
      emit(BFS_MAIN, 2, { note: 'Q = ∅, so the loop ends.' });
      break;
    }
    emit(BFS_MAIN, 2);
    const u = Q.shift()!;
    vars = { s, u };
    emit(BFS_MAIN, 3, { bigStep: true, vertices: [u], question: dequeueQuestion(u) });
    for (const v of adjacency(g, u)) {
      vars = { s, u, v };
      const hl = { vertices: [u, v], edges: [edgeKey(g, u, v)] };
      emit(BFS_MAIN, 4, hl);
      emit(BFS_MAIN, 5, { ...hl, note: `${v}.color is ${st[v].color}.` });
      if (st[v].color !== 'white') continue;
      st[v].color = 'gray';
      emit(BFS_MAIN, 6, hl);
      const ud = st[u].d as number;
      st[v].d = ud + 1;
      emit(BFS_MAIN, 7, { ...hl, question: distanceQuestion(u, v, ud) });
      st[v].pi = u;
      emit(BFS_MAIN, 8, hl);
      Q.push(v);
      emit(BFS_MAIN, 9, hl);
    }
    vars = { s, u };
    st[u].color = 'black';
    emit(BFS_MAIN, 10, { vertices: [u] });
  }
  return steps;
}
