import { edgeKey, vertexIds, weightOf, type Graph } from '../../engine/graph';
import {
  treeEdgesFromPi, type DSView, type Question, type Step, type Value, type VertexState,
} from '../../engine/trace';
import { newDistanceQuestion, relaxNote, relaxUpdateQuestion, sumText } from './questions';
import { INIT, RELAX } from './shared';

export type EmitOptions = {
  bigStep?: boolean;
  vertices?: string[];
  edges?: string[];
  note?: string;
  question?: Question;
};

// Question types to attach inside Relax; a missing one is not asked.
export type RelaxQuestions = { update?: string; value?: string };

export type Tracer = {
  steps: Step[];
  st: VertexState;
  // Caller-owned: set before emitting; Relax steps show whatever is here.
  vars: Record<string, Value>;
  emit(proc: string, line: number, o?: EmitOptions): void;
  initializeSingleSource(): void;
  relax(u: string, v: string, ask: RelaxQuestions): void;
};

export function createTracer(
  g: Graph,
  s: string,
  dsOf: (st: VertexState) => DSView[],
  settledOf: (st: VertexState) => string[] = () => [],
): Tracer {
  const st: VertexState = {};
  for (const v of vertexIds(g)) st[v] = {};
  const t: Tracer = {
    steps: [],
    st,
    vars: { s },
    emit(proc, line, o = {}) {
      t.steps.push(structuredClone({
        proc,
        line,
        bigStep: o.bigStep ?? false,
        vertexState: st,
        vars: t.vars,
        ds: dsOf(st),
        highlight: { vertices: o.vertices, edges: o.edges, treeEdges: treeEdgesFromPi(g, st), settled: settledOf(st) },
        note: o.note,
        question: o.question,
      }));
    },
    initializeSingleSource() {
      const outer = t.vars;
      for (const v of vertexIds(g)) {
        t.vars = { ...outer, v };
        t.emit(INIT, 1, { vertices: [v] });
        st[v].d = Infinity;
        t.emit(INIT, 2, { vertices: [v] });
        st[v].pi = null;
        t.emit(INIT, 3, { vertices: [v] });
      }
      t.vars = outer;
      st[s].d = 0;
      t.emit(INIT, 4, { vertices: [s] });
    },
    relax(u, v, ask) {
      const hl = { vertices: [u, v], edges: [edgeKey(g, u, v)] };
      const w = weightOf(g, u, v);
      const ud = st[u].d as number;
      const vd = st[v].d as number;
      t.emit(RELAX, 1, {
        ...hl,
        note: relaxNote(u, v, ud, w, vd),
        question: ask.update ? relaxUpdateQuestion(ask.update, u, v, ud, w, vd) : undefined,
      });
      if (!(vd > ud + w)) return;
      st[v].d = ud + w;
      t.emit(RELAX, 2, {
        ...hl,
        note: `${v}.d = ${u}.d + w(${u}, ${v}) = ${sumText(ud, w)}.`,
        question: ask.value ? newDistanceQuestion(ask.value, u, v, ud, w) : undefined,
      });
      st[v].pi = u;
      t.emit(RELAX, 3, hl);
    },
  };
  return t;
}
