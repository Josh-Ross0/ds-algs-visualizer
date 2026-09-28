import { adjacency, edgeKey, vertexIds, weightOf, type Graph } from '../../engine/graph';
import {
  formatValue, treeEdgesFromPi, type Question, type Step, type Value, type VertexState,
} from '../../engine/trace';
import { extractMin, extractMinQuestion, keyedQ } from '../extractMin';
import type { Params } from '../types';
import { PRIM } from './pseudocode';
import { keyQuestion } from './questions';

type EmitOptions = { bigStep?: boolean; vertices?: string[]; edges?: string[]; note?: string; question?: Question };

export function runPrim(g: Graph, params: Params): Step[] {
  const r = params.r;
  const V = vertexIds(g);
  const steps: Step[] = [];
  const st: VertexState = {};
  for (const v of V) st[v] = {};
  let Q: string[] = [];
  let vars: Record<string, Value> = {};
  const emit = (line: number, o: EmitOptions = {}) => {
    steps.push(structuredClone({
      proc: PRIM,
      line,
      bigStep: o.bigStep ?? false,
      vertexState: st,
      vars,
      ds: [keyedQ(Q, st, 'key')],
      highlight: {
        vertices: o.vertices,
        edges: o.edges,
        treeEdges: treeEdgesFromPi(g, st),
        settled: V.filter((v) => st[v].inQ === 'no'),
      },
      note: o.note,
      question: o.question,
    }));
  };

  for (const u of V) {
    vars = { u };
    emit(1, { vertices: [u] });
    st[u].pi = null;
    emit(2, { vertices: [u] });
    st[u].key = Infinity;
    emit(3, { vertices: [u] });
  }
  vars = { r };
  emit(4, { vertices: [r], note: `r = ${r}, the root chosen above the graph.` });
  st[r].key = 0;
  emit(5, { vertices: [r] });
  Q = [...V];
  for (const v of V) st[v].inQ = 'yes';
  emit(6);

  for (;;) {
    vars = { r };
    if (Q.length === 0) {
      emit(7, { note: 'Q = ∅, so the loop ends.' });
      break;
    }
    emit(7);
    const { u, tied } = extractMin(Q, st, 'key');
    Q = Q.filter((x) => x !== u);
    st[u].inQ = 'no';
    vars = { r, u };
    emit(8, { bigStep: true, vertices: [u], question: extractMinQuestion('prim.extract', 8, u, 'key', st, tied) });
    for (const v of adjacency(g, u)) {
      vars = { r, u, v };
      const hl = { vertices: [u, v], edges: [edgeKey(g, u, v)] };
      emit(9, hl);
      const w = weightOf(g, u, v);
      const inQ = Q.includes(v);
      const oldKey = st[v].key as number;
      const updates = inQ && w < oldKey;
      emit(10, {
        ...hl,
        note: inQ
          ? `${v} ∈ Q and w(${u}, ${v}) = ${w} ${updates ? '<' : '≥'} ${v}.key = ${formatValue(oldKey)}.`
          : `${v} ∉ Q.`,
        question: inQ ? keyQuestion(u, v, w, oldKey) : undefined,
      });
      if (!updates) continue;
      st[v].key = w;
      emit(11, hl);
      st[v].pi = u;
      emit(12, hl);
    }
  }
  return steps;
}
