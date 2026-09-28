import { edgeKey, edgeList, vertexIds, weightOf, type Graph } from '../../engine/graph';
import type { Step } from '../../engine/trace';
import { relaxNote } from '../sssp/questions';
import { createTracer } from '../sssp/tracer';
import type { Params } from '../types';
import { BF } from './pseudocode';

export function runBellmanFord(g: Graph, params: Params): Step[] {
  const s = params.s;
  const E = edgeList(g);
  const names = E.map((e) => `(${e.u}, ${e.v})`);
  let current: number | null = null;
  const t = createTracer(g, s, () => [{ kind: 'edges', name: 'G.E', items: names, current }]);

  t.emit(BF, 1, { vertices: [s] });
  t.initializeSingleSource();

  const n = vertexIds(g).length;
  for (let i = 1; i <= n - 1; i++) {
    current = null;
    t.vars = { s, i };
    t.emit(BF, 2, { bigStep: true });
    E.forEach((e, k) => {
      current = k;
      t.vars = { s, i, u: e.u, v: e.v };
      const hl = { vertices: [e.u, e.v], edges: [edgeKey(g, e.u, e.v)] };
      t.emit(BF, 3, hl);
      t.emit(BF, 4, hl);
      // Staff decision: "does Relax update" only in the first pass; the new v.d at every update.
      t.relax(e.u, e.v, i === 1 ? { update: 'bf.relax', value: 'bf.distance' } : { value: 'bf.distance' });
    });
  }

  for (const [k, e] of E.entries()) {
    current = k;
    t.vars = { s, u: e.u, v: e.v };
    const hl = { vertices: [e.u, e.v], edges: [edgeKey(g, e.u, e.v)] };
    t.emit(BF, 5, { ...hl, bigStep: k === 0 });
    const ud = t.st[e.u].d as number;
    const vd = t.st[e.v].d as number;
    const w = weightOf(g, e.u, e.v);
    const fails = vd > ud + w;
    const lastEdge = k === E.length - 1;
    const done = !fails && lastEdge ? ' No edge fails the check, so there is no negative weight cycle reachable from s.' : '';
    t.emit(BF, 6, { ...hl, note: relaxNote(e.u, e.v, ud, w, vd) + done });
    if (fails) {
      t.emit(BF, 7, { ...hl, note: 'error: “negative weight cycle”. The algorithm stops here.' });
      break;
    }
  }
  return t.steps;
}
