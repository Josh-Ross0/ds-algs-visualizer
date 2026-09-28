import { DEFAULT_WEIGHT, edgeKey, edgeList, edgeName, type Edge, type Graph } from '../../engine/graph';
import type { Question, Step, Value } from '../../engine/trace';
import { forestPath } from './forest';
import { KRUSKAL } from './pseudocode';
import { acceptQuestion } from './questions';

type EmitOptions = { bigStep?: boolean; edges?: string[]; cycle?: string[]; note?: string; question?: Question };

const weight = (e: Edge) => e.w ?? DEFAULT_WEIGHT;

export function runKruskal(g: Graph): Step[] {
  const steps: Step[] = [];
  let A: Edge[] = [];
  let T: Edge[] = [];
  let current: number | null = null;
  let vars: Record<string, Value> = {};
  const key = (e: Edge) => edgeKey(g, e.u, e.v);
  const emit = (line: number, o: EmitOptions = {}) => {
    steps.push(structuredClone({
      proc: KRUSKAL,
      line,
      bigStep: o.bigStep ?? false,
      vertexState: {},
      vars,
      ds: [
        { kind: 'edges' as const, name: 'A', items: A.map((e) => `${edgeName(g, e)}: ${weight(e)}`), current },
        { kind: 'edges' as const, name: 'T', items: T.map((e) => edgeName(g, e)), current: null },
      ],
      highlight: { edges: o.edges, treeEdges: T.map(key), cycle: o.cycle },
      note: o.note,
      question: o.question,
    }));
  };

  A = edgeList(g);
  emit(1);
  // Array.prototype.sort is stable: equal weights keep their G.E order.
  A = [...A].sort((x, y) => weight(x) - weight(y));
  emit(2, { note: 'Edges of equal weight keep their order from G.E.' });
  emit(3);

  for (let i = 1; i <= A.length; i++) {
    current = i - 1;
    vars = { i };
    emit(4, { bigStep: true });
    const e = A[i - 1];
    const name = edgeName(g, e);
    vars = { i, e: name };
    emit(5, { edges: [key(e)] });
    const path = forestPath(T, e.u, e.v);
    const cycle = path === null
      ? undefined
      : [...path.slice(1).map((x, k) => edgeKey(g, path[k], x)), key(e)];
    emit(6, {
      edges: [key(e)],
      cycle,
      note: path === null
        ? `T has no path between ${e.u} and ${e.v}, so T ∪ {${name}} is cycle free.`
        : `T ∪ {${name}} has the cycle ${[...path, path[0]].join(' – ')}.`,
      question: acceptQuestion(name, e.u, e.v, path),
    });
    if (path !== null) continue;
    T = [...T, e];
    emit(7, { edges: [key(e)] });
  }

  current = null;
  vars = {};
  const total = T.reduce((s, e) => s + weight(e), 0);
  emit(8, { note: `T has ${T.length} edges with total weight ${total}.` });
  return steps;
}
