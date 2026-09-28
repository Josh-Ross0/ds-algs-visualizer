import { edgeKey, type Graph } from './graph';

export type Value = string | number | null | undefined;
export type VertexState = Record<string, Record<string, Value>>;
export type DSView =
  | { kind: 'queue'; name: string; items: string[] }
  | { kind: 'stack'; name: string; items: string[] };
export type Answer =
  | { kind: 'vertex'; value: string }
  | { kind: 'number'; value: number }
  | { kind: 'yesno'; value: boolean }
  | { kind: 'choice'; value: string; options: string[] };
export type Question = { type: string; prompt: string; answer: Answer; explain: string };
export type Highlight = { vertices?: string[]; edges?: string[]; treeEdges?: string[] };
export type Step = {
  proc: string;
  line: number;
  bigStep: boolean;
  vertexState: VertexState;
  vars: Record<string, Value>;
  ds: DSView[];
  highlight: Highlight;
  note?: string;
  question?: Question;
};

export function formatValue(v: Value): string {
  if (v === undefined) return '';
  if (v === null) return 'NIL';
  if (v === Infinity) return '∞';
  return String(v);
}

export function formatAnswer(a: Answer): string {
  if (a.kind === 'yesno') return a.value ? 'yes' : 'no';
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
