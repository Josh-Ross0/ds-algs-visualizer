import { adjacency, edgeKey, vertexIds, type Graph } from '../../engine/graph';
import type { Step } from '../../engine/trace';
import { extractMin, extractMinQuestion, keyedQ } from '../extractMin';
import { createTracer } from '../sssp/tracer';
import type { Params } from '../types';
import { DIJKSTRA } from './pseudocode';

export function runDijkstra(g: Graph, params: Params): Step[] {
  const s = params.s;
  let Q: string[] = [];
  const t = createTracer(
    g,
    s,
    (st) => [keyedQ(Q, st, 'd')],
    (st) => vertexIds(g).filter((v) => st[v].inQ === 'no'),
  );

  t.emit(DIJKSTRA, 1, { vertices: [s] });
  t.initializeSingleSource();
  Q = vertexIds(g);
  for (const v of Q) t.st[v].inQ = 'yes';
  t.emit(DIJKSTRA, 2);

  for (;;) {
    t.vars = { s };
    if (Q.length === 0) {
      t.emit(DIJKSTRA, 3, { note: 'Q = ∅, so the loop ends.' });
      break;
    }
    t.emit(DIJKSTRA, 3);
    const { u, tied } = extractMin(Q, t.st, 'd');
    Q = Q.filter((x) => x !== u);
    t.st[u].inQ = 'no';
    t.vars = { s, u };
    t.emit(DIJKSTRA, 4, { bigStep: true, vertices: [u], question: extractMinQuestion('dijkstra.extract', 4, u, 'd', t.st, tied) });
    for (const v of adjacency(g, u)) {
      t.vars = { s, u, v };
      const hl = { vertices: [u, v], edges: [edgeKey(g, u, v)] };
      t.emit(DIJKSTRA, 5, hl);
      t.emit(DIJKSTRA, 6, hl);
      t.relax(u, v, { update: 'dijkstra.relax' });
    }
  }
  return t.steps;
}
