import { edgeKey, type Graph } from './graph';

export type Value = string | number | null | undefined;
export type VertexState = Record<string, Record<string, Value>>;
export type DSView =
  | { kind: 'queue'; name: string; items: string[] }
  | { kind: 'stack'; name: string; items: string[] }
  // An ordered edge list; `current` is the index being scanned, if any.
  // `label` overrides the default "(scan order)" orientation label (e.g. Kruskal's T).
  | { kind: 'edges'; name: string; items: string[]; current: number | null; label?: string }
  // A set shown sorted by one attribute (e.g. Dijkstra's Q by d).
  | { kind: 'keyed'; name: string; key: string; items: { id: string; value: Value }[] };
export type Answer =
  | { kind: 'vertex'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'yesno'; value: boolean }
  | { kind: 'choice'; value: string; options: string[] }
  // A tree node picked by id (label = its key as shown); value null means NIL.
  | { kind: 'node'; value: string | null; label: string; nil: boolean };
export type Question = { type: string; prompt: string; answer: Answer; explain: string };
export type Highlight = {
  vertices?: string[];
  edges?: string[];
  treeEdges?: string[];
  settled?: string[];
  // Edges of the cycle a rejected edge would close (Kruskal).
  cycle?: string[];
};
// What the player, questions and pseudocode panel need from any step.
export type StepCore = {
  proc: string;
  line: number;
  bigStep: boolean;
  vars: Record<string, Value>;
  note?: string;
  question?: Question;
};
export type Step = StepCore & {
  vertexState: VertexState;
  ds: DSView[];
  highlight: Highlight;
};

export function formatValue(v: Value): string {
  if (v === undefined) return '';
  if (v === null) return 'NIL';
  if (v === Infinity) return '∞';
  if (v === -Infinity) return '−∞';
  return String(v);
}

export function formatAnswer(a: Answer): string {
  if (a.kind === 'yesno') return a.value ? 'yes' : 'no';
  if (a.kind === 'node') return a.label;
  return formatValue(a.value);
}

export function checkAnswer(q: Question, given: Answer): boolean {
  return q.answer.kind === given.kind && q.answer.value === given.value;
}

export function treeEdgesFromPi(g: Graph, st: VertexState): string[] {
  const out: string[] = [];
  for (const [v, attrs] of Object.entries(st)) {
    const p = attrs.pi;
    if (typeof p === 'string') out.push(edgeKey(g, p, v));
  }
  return out;
}
